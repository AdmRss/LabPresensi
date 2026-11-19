import {
  collection,
  doc,
  getDocFromServer,
  serverTimestamp,
  Timestamp,
  type DocumentReference,
  type Transaction,
  getDocsFromServer,
  query,
  where,
  onSnapshot,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  EMPTY_DAY, reserveMinutes, scheduleFromSelection, schedulesOverlap, validateSchedule,
  type Schedule, type ScheduleSelection,
} from './schedule';
import { effectiveSessionStatus, scheduledTime } from './sessionClock';
import { mapFirebaseError } from '@/utils/firebaseError';
import { auth, db } from '@/lib/firebase';
import type { Sesi, Result } from '@/types';

export function subscribeSesiList(
  asistenId: string,
  onData: (sesiList: Sesi[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  if (!asistenId) {
    onData([]);
    return () => {};
  }
  const q = query(collection(db, 'sesi'), where('asistenId', '==', asistenId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Sesi[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as Sesi);
      });
      onData(list);
    },
    (error) => {
      onError(mapFirebaseError(error));
    },
  );
}

type ScheduleInput = (Schedule | ScheduleSelection) & { lokasiId?: string };

function prepareSchedule(input: ScheduleInput): Schedule | string {
  if ('date' in input) return scheduleFromSelection(input);
  return validateSchedule(input) ?? {
    lab: input.lab.trim(), tanggal: input.tanggal, jamMulai: input.jamMulai, jamSelesai: input.jamSelesai,
  };
}

function scheduleWindow(input: Schedule) {
  const start = scheduledTime(input.tanggal, input.jamMulai);
  const end = scheduledTime(input.tanggal, input.jamSelesai);
  if (end - start !== 2 * 60 * 60 * 1000) return 'Durasi sesi harus tepat 2 jam.';
  if (start <= Date.now()) return 'Waktu mulai sesi harus di masa mendatang.';
  return { startAt: Timestamp.fromMillis(start), endAt: Timestamp.fromMillis(end) };
}

async function readLocation(tx: Transaction, id: string | undefined) {
  if (!id) return null;
  const location = (await tx.get(doc(db, 'lokasiPraktikum', id))).data();
  return location && !location.archived && typeof location.nama === 'string' ? location.nama : null;
}

function scheduleDay(uid: string, date: string) {
  return doc(db, 'users', uid, 'jadwalSesi', date);
}

type ReadDay = (ref: DocumentReference) => Promise<string | undefined>;

class ScheduleReservationReadDenied extends Error {}

function scheduleFailure(error: unknown, code: string) {
  if (error instanceof ScheduleReservationReadDenied) {
    return {
      ok: false as const,
      code: 'SCHEDULE_RESERVATION_DENIED',
      message: 'Firestore menolak akses reservasi jadwal. Minta admin memeriksa Firestore Rules jadwal dan peran akun asisten.',
    };
  }
  return { ok: false as const, code, message: mapFirebaseError(error) };
}

async function scheduleTransaction<T>(write: (tx: Transaction, readDay: ReadDay) => Promise<T>): Promise<T> {
  const observed = new Map<DocumentReference, string | undefined>();
  const run = () => runTransaction(db, async tx => {
    observed.clear();
    return write(tx, async ref => {
      try {
        const minutes: string | undefined = (await tx.get(ref)).data()?.minutes;
        observed.set(ref, minutes);
        return minutes;
      } catch (error) {
        if ((error as { code?: string })?.code === 'permission-denied') {
          throw new ScheduleReservationReadDenied();
        }
        throw error;
      }
    });
  });
  try {
    return await run();
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code !== 'permission-denied' && code !== 'already-exists') throw error;
    // Rules may see the winning commit before Firestore retries a stale read.
    // Replay once only if a day read by this transaction has actually changed.
    const days = await Promise.allSettled([...observed].map(async ([ref, previous]) =>
      (await getDocFromServer(ref)).data()?.minutes !== previous));
    if (!days.some(day => day.status === 'fulfilled' && day.value)) throw error;
    return run();
  }
}

async function reserveSchedule(tx: Transaction, readDay: ReadDay, uid: string, id: string, data: Schedule, previous?: Sesi) {
  const day = scheduleDay(uid, data.tanggal);
  const current = await readDay(day) ?? EMPTY_DAY;
  const oldDay = previous?.jadwalTerdaftar ? scheduleDay(uid, previous.tanggal) : null;
  const sameDay = oldDay?.id === day.id;
  let released: string | undefined;
  if (oldDay && previous) {
    const previousMinutes = sameDay ? current : await readDay(oldDay) ?? EMPTY_DAY;
    const next = reserveMinutes(previousMinutes, previous.jamMulai, previous.jamSelesai, false);
    if (next === null) throw new Error('Invalid existing schedule reservation');
    released = next;
  }

  // The day document serializes concurrent writes. The server query also finds sessions
  // created before reservations were introduced and supplies the conflict label.
  const existing = await getDocsFromServer(query(collection(db, 'sesi'),
    where('asistenId', '==', uid), where('tanggal', '==', data.tanggal)));
  const conflict = existing.docs.find(row => {
    const session = row.data() as Sesi;
    return row.id !== id && !session.archived && schedulesOverlap(data, session);
  })?.data() as Sesi | undefined;
  if (conflict) return 'Jadwal bentrok dengan sesi ' + conflict.praktikum
    + ' (' + conflict.jamMulai + '\u2013' + conflict.jamSelesai + ').';

  const minutes = reserveMinutes(sameDay ? released ?? current : current, data.jamMulai, data.jamSelesai, true);
  if (minutes === null) return 'Jadwal bentrok dengan sesi lain pada tanggal tersebut.';
  if (oldDay && !sameDay) tx.set(oldDay, { minutes: released, sesiId: id, updatedAt: serverTimestamp() });
  tx.set(day, { minutes, sesiId: id, updatedAt: serverTimestamp(), ...(sameDay ? { released } : {}) });
  return null;
}

export async function createSesi(input: ScheduleInput & { kelasId: string; asistenId: string }): Promise<Result<string>> {
  const uid = input.asistenId;
  if (!uid || auth.currentUser?.uid !== uid) {
    return { ok: false, code: 'INVALID_ASISTEN', message: 'Identitas asisten tidak sesuai.' };
  }
  const schedule = prepareSchedule(input);
  if (typeof schedule === 'string') return { ok: false, code: 'INVALID_INPUT', message: schedule };
  if (!input.kelasId) return { ok: false, code: 'INVALID_CLASS', message: 'Pilih kelas.' };

  const window = scheduleWindow(schedule);
  if (typeof window === 'string') return { ok: false, code: 'INVALID_INPUT', message: window };
  const ref = doc(collection(db, 'sesi'));
  try {
    return await scheduleTransaction(async (tx, readDay) => {
      const kelas = (await tx.get(doc(db, 'kelas', input.kelasId))).data();
      if (!kelas || kelas.archived || kelas.asistenId !== uid) {
        return { ok: false, code: 'INVALID_CLASS', message: 'Kelas aktif milik asisten tidak ditemukan.' };
      }
      const catalog = kelas.katalogId ? (await tx.get(doc(db, 'katalogKelas', kelas.katalogId))).data() : undefined;
      if (!catalog || catalog.archived) return { ok: false, code: 'INVALID_CLASS', message: 'Pilih kelas yang terhubung dengan katalog aktif.' };
      const lab = await readLocation(tx, input.lokasiId);
      if (!lab) return { ok: false, code: 'INVALID_LOCATION', message: 'Pilih lokasi dari katalog aktif.' };
      const conflict = await reserveSchedule(tx, readDay, uid, ref.id, schedule);
      if (conflict) return { ok: false, code: 'SESSION_CONFLICT', message: conflict };
      tx.set(ref, {
        ...schedule, ...window, lab, lokasiId: input.lokasiId,
        id: ref.id,
        kelasId: input.kelasId,
        kelasNama: kelas.nama,
        praktikum: kelas.praktikum,
        asistenId: uid,
        status: 'BELUM_DIBUKA',
        openedAt: null,
        closedAt: null,
        createdAt: new Date().toISOString(),
        jadwalTerdaftar: true,
      });
      return { ok: true, data: ref.id };
    });
  } catch (error) {
    return scheduleFailure(error, 'CREATE_FAILED');
  }
}

export async function updateSesi(id: string, uid: string, input: ScheduleInput): Promise<Result> {
  if (!uid || auth.currentUser?.uid !== uid) return { ok: false, code: 'INVALID_ASISTEN', message: 'Identitas asisten tidak sesuai.' };
  const schedule = prepareSchedule(input);
  if (typeof schedule === 'string') return { ok: false, code: 'INVALID_INPUT', message: schedule };
  const window = scheduleWindow(schedule);
  if (typeof window === 'string') return { ok: false, code: 'INVALID_INPUT', message: window };
  try {
    return await scheduleTransaction(async (tx, readDay) => {
      const ref = doc(db, 'sesi', id);
      const sesi = (await tx.get(ref)).data() as Sesi | undefined;
      if (!sesi || sesi.asistenId !== uid || sesi.archived || effectiveSessionStatus(sesi) !== 'BELUM_DIBUKA') {
        return { ok: false, code: 'INVALID_STATUS', message: 'Hanya jadwal aktif yang belum dibuka dapat diedit.' };
      }
      const lab = await readLocation(tx, input.lokasiId);
      if (!lab) return { ok: false, code: 'INVALID_LOCATION', message: 'Pilih lokasi dari katalog aktif.' };
      const conflict = await reserveSchedule(tx, readDay, uid, id, schedule, sesi);
      if (conflict) return { ok: false, code: 'SESSION_CONFLICT', message: conflict };
      tx.update(ref, { ...schedule, ...window, lab, lokasiId: input.lokasiId, jadwalTerdaftar: true });
      return { ok: true, data: undefined };
    });
  } catch (error) {
    return scheduleFailure(error, 'UPDATE_FAILED');
  }
}

async function transition(id: string, uid: string, opening: boolean): Promise<Result> {
  try {
    // Sesi yang sudah terbuka sebelum ledger diperkenalkan tetap dapat ditutup.
    const legacy = opening ? (await getDocsFromServer(query(collection(db, 'sesi'),
      where('asistenId', '==', uid), where('status', '==', 'DIBUKA'))))
      .docs.map(row => row.data() as Sesi).filter(row => !row.slotTerdaftar && !row.archived) : [];
    return await runTransaction(db, async tx => {
      const ref = doc(db, 'sesi', id);
      const sesi = (await tx.get(ref)).data() as Sesi | undefined;
      if (sesi?.startAt && sesi.asistenId === uid && !sesi.archived) {
        if (opening || effectiveSessionStatus(sesi) !== 'DIBUKA') {
          return { ok: false, code: 'INVALID_STATUS', message: 'Sesi mengikuti jadwal yang ditetapkan.' };
        }
        tx.update(ref, { status: 'DITUTUP', closedAt: new Date().toISOString() });
        return { ok: true, data: undefined };
      }
      if (!sesi || sesi.asistenId !== uid || sesi.archived ||
          sesi.status !== (opening ? 'BELUM_DIBUKA' : 'DIBUKA')) {
        return { ok: false, code: 'INVALID_STATUS', message: 'Status atau pemilik sesi sudah berubah.' };
      }
      if (opening) {
        const invalid = validateSchedule(sesi);
        if (invalid) return { ok: false, code: 'INVALID_INPUT', message: invalid };
      }
      if (opening || sesi.slotTerdaftar) {
        const day = doc(db, 'users', uid, 'jadwalAktif', sesi.tanggal);
        const ledger = (await tx.get(day)).data();
        const next = reserveMinutes(ledger?.minutes ?? EMPTY_DAY, sesi.jamMulai, sesi.jamSelesai, opening);
        if (next === null || legacy.some(row => row.tanggal === sesi.tanggal &&
            row.jamMulai < sesi.jamSelesai && sesi.jamMulai < row.jamSelesai)) {
          return { ok: false, code: 'SESSION_CONFLICT', message: 'Ada sesi terbuka pada waktu yang bertabrakan. Tutup sesi tersebut terlebih dahulu.' };
        }
        tx.set(day, { minutes: next, sesiId: id, opening });
      }
      const now = new Date().toISOString();
      tx.update(ref, opening ? { status: 'DIBUKA', openedAt: now, slotTerdaftar: true }
        : { status: 'DITUTUP', closedAt: now });
      return { ok: true, data: undefined };
    });
  } catch (error) {
    return { ok: false, code: 'TRANSITION_FAILED', message: mapFirebaseError(error) };
  }
}

export const openSesi = (id: string, uid: string) => transition(id, uid, true);
export const closeSesi = (id: string, uid: string) => transition(id, uid, false);

export async function markAssistantPresent(session: Sesi, uid: string): Promise<Result> {
  if (auth.currentUser?.uid !== uid || session.asistenId !== uid || effectiveSessionStatus(session) !== 'DIBUKA') {
    return { ok: false, code: 'INVALID_STATUS', message: 'Presensi asisten hanya tersedia saat sesi milik Anda terbuka.' };
  }
  const ref = doc(db, 'presensiAsisten', session.id);
  try {
    await runTransaction(db, async tx => {
      if (!(await tx.get(ref)).exists()) {
        tx.set(ref, { sesiId: session.id, asistenId: uid, recordedAt: serverTimestamp() });
      }
    });
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, code: 'ATTENDANCE_FAILED', message: mapFirebaseError(error) };
  }
}
