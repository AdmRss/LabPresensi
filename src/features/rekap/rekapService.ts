import { collection, doc, documentId, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, Izin, Presensi, Sesi } from '@/types';
import { readPresensi } from '@/features/jadwal/services/jadwalService';

type Identity = Pick<AppUser, 'nama' | 'nim'>;
export function attendanceTime(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString('id-ID') : 'Waktu tidak tersedia';
}

export function recapRows(uids: string[], profiles: Map<string, Identity | null>, attendance: Presensi[], leave: Izin[]) {
  const present = new Map(attendance.map(row => [row.praktikanUid, row]));
  const excused = new Map(leave.filter(row => row.status === 'DITERIMA').map(row => [row.praktikanUid, row]));
  return [...new Set(uids)].map(uid => {
    const record = present.get(uid);
    const identity = profiles.get(uid) ?? record ?? excused.get(uid);
    return { uid, nama: identity?.nama ?? uid, nim: identity?.nim ?? '–',
      status: record ? 'Hadir' : excused.has(uid) ? 'Izin' : 'Belum Hadir', time: record?.timestamp };
  });
}

async function loadMissing<T>(kind: string, ids: string[], cache: Map<string, T | null>) {
  const missing = [...new Set(ids)].filter(id => !cache.has(id));
  for (let i = 0; i < missing.length; i += 30) {
    const batch = missing.slice(i, i + 30);
    const snapshot = await getDocs(query(collection(db, kind), where(documentId(), 'in', batch)));
    snapshot.docs.forEach(row => cache.set(row.id, row.data() as T));
    batch.forEach(id => { if (!cache.has(id)) cache.set(id, null); });
  }
}

export function subscribeRecap(sesi: Sesi, onRows: (rows: ReturnType<typeof recapRows>) => void,
  onError: (error: unknown) => void) {
  let live = true;
  let generation = 0;
  let roster: string[] | undefined;
  let attendance: Presensi[] | undefined;
  let leave: Izin[] | undefined;
  const profiles = new Map<string, Identity | null>();
  function publish() {
    if (live && roster && attendance && leave) onRows(recapRows(roster, profiles, attendance, leave));
  }
  const records = (kind: string) => query(collection(db, kind), where('asistenId', '==', sesi.asistenId),
    where('sesiId', '==', sesi.id));
  const stops = [
    onSnapshot(doc(db, 'kelas', sesi.kelasId), async snapshot => {
      const version = ++generation;
      const data = snapshot.data();
      if (!Array.isArray(data?.pesertaUids) || data.asistenId !== sesi.asistenId) {
        onError(new Error('ROSTER_MISSING'));
        return;
      }
      const ids: string[] = data.pesertaUids;
      roster = undefined;
      try {
        await loadMissing('users', ids, profiles);
        if (live && version === generation) { roster = ids; publish(); }
      } catch (error) { if (live && version === generation) onError(error); }
    }, onError),
    onSnapshot(records('presensi'), { includeMetadataChanges: true }, snap => {
      if (!snap.metadata.hasPendingWrites) { attendance = snap.docs.map(row => readPresensi(row.data())); publish(); }
    }, onError),
    onSnapshot(records('izin'), { includeMetadataChanges: true }, snap => {
      if (!snap.metadata.hasPendingWrites) { leave = snap.docs.map(row => row.data() as Izin); publish(); }
    }, onError),
  ];
  return () => { live = false; stops.forEach(stop => stop()); };
}

export type HistoryRow = { id: string; label: string; date: string; time: string };
export function subscribeHistory(uid: string, onRows: (rows: HistoryRow[]) => void, onError: (error: unknown) => void) {
  let generation = 0;
  const sessions = new Map<string, Sesi | null>();
  const stop = onSnapshot(query(collection(db, 'presensi'), where('praktikanUid', '==', uid)),
    { includeMetadataChanges: true }, async snap => {
      const version = ++generation;
      const records = snap.docs.filter(row => !row.metadata.hasPendingWrites)
        .map(row => readPresensi(row.data()));
      try {
        await loadMissing('sesi', records.map(row => row.sesiId), sessions);
        if (version !== generation) return;
        onRows(records.map(row => {
          const sesi = sessions.get(row.sesiId);
          return { id: row.id, label: sesi?.praktikum ?? 'Sesi ' + row.sesiId,
            date: sesi?.tanggal ?? 'Tanggal sesi tidak tersedia', time: row.timestamp };
        }).sort((a, b) => String(b.time).localeCompare(String(a.time))));
      } catch (error) { if (version === generation) onError(error); }
    }, onError);
  return () => { generation++; stop(); };
}
