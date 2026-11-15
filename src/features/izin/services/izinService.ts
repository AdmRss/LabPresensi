import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { AppUser, Izin, Kelas, Result, Sesi } from '@/types';

const SESSION_QUERY_BATCH_SIZE = 30;

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function sortSessions(sessions: Sesi[]): Sesi[] {
  return [...sessions].sort((a, b) =>
    `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`),
  );
}

export function subscribeToEligibleSessions(
  uid: string,
  onSessions: (sessions: Sesi[]) => void,
  onError: (error: unknown) => void,
  onLoadingChange: (loading: boolean) => void,
): Unsubscribe {
  let sessionUnsubscribes: Unsubscribe[] = [];
  let generation = 0;

  const unsubscribeClasses = onSnapshot(
    query(collection(db, 'kelas'), where('pesertaUids', 'array-contains', uid)),
    (classSnapshot) => {
      generation += 1;
      const currentGeneration = generation;
      sessionUnsubscribes.forEach((unsubscribe) => unsubscribe());
      sessionUnsubscribes = [];

      const classIds = classSnapshot.docs.map((item) => (item.data() as Kelas).id);
      if (classIds.length === 0) {
        onSessions([]);
        onLoadingChange(false);
        return;
      }

      const batches = chunks(classIds, SESSION_QUERY_BATCH_SIZE);
      const sessionsByBatch = new Map<number, Sesi[]>();
      const completedBatchIndexes = new Set<number>();
      batches.forEach((batch, batchIndex) => {
        const unsubscribe = onSnapshot(
          query(collection(db, 'sesi'), where('kelasId', 'in', batch)),
          (snapshot) => {
            if (currentGeneration !== generation) return;
            sessionsByBatch.set(
              batchIndex,
              snapshot.docs
                .map((item) => item.data() as Sesi)
                .filter((session) => session.status === 'BELUM_DIBUKA'),
            );
            onSessions(sortSessions([...sessionsByBatch.values()].flatMap((items) => items)));
            completedBatchIndexes.add(batchIndex);
            if (completedBatchIndexes.size === batches.length) onLoadingChange(false);
          },
          onError,
        );
        sessionUnsubscribes.push(unsubscribe);
      });
    },
    onError,
  );

  return () => {
    generation += 1;
    unsubscribeClasses();
    sessionUnsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

export function subscribeToMyIzin(
  uid: string,
  onRequests: (requests: Izin[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'izin'), where('praktikanUid', '==', uid)),
    (snapshot) => {
      onRequests(
        snapshot.docs
          .map((item) => item.data() as Izin)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    },
    onError,
  );
}

export async function createIzin(
  sesi: Sesi,
  user: AppUser,
  alasan: string,
  kategoriAI: string | null,
): Promise<Result<Izin>> {
  const kelasSnapshot = await getDoc(doc(db, 'kelas', sesi.kelasId));
  const kelas = kelasSnapshot.exists() ? (kelasSnapshot.data() as Kelas) : null;
  if (!kelas || !kelas.pesertaUids.includes(user.uid)) {
    return { ok: false, code: 'NOT_MEMBER', message: 'Anda bukan peserta kelas sesi ini.' };
  }
  if (sesi.status !== 'BELUM_DIBUKA') {
    return { ok: false, code: 'SESSION_NOT_AVAILABLE', message: 'Izin hanya dapat diajukan sebelum sesi dibuka.' };
  }

  const izinId = `${sesi.id}_${user.uid}`;
  const izinRef = doc(db, 'izin', izinId);
  if ((await getDoc(izinRef)).exists()) {
    return { ok: false, code: 'ALREADY_EXISTS', message: 'Pengajuan izin untuk sesi ini sudah ada.' };
  }

  const data: Izin = {
    id: izinId,
    sesiId: sesi.id,
    kelasId: sesi.kelasId,
    asistenId: sesi.asistenId,
    praktikanUid: user.uid,
    nama: user.nama,
    nim: user.nim ?? '',
    sesiLabel: `${sesi.praktikum} - ${sesi.tanggal}`,
    alasan,
    kategoriAI,
    status: 'MENUNGGU',
    diputuskanOleh: null,
    waktuKeputusan: null,
    createdAt: new Date().toISOString(),
  };
  await setDoc(izinRef, data);
  return { ok: true, data };
}

export function subscribeToAsistenIzin(
  uid: string,
  onRequests: (requests: Izin[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'izin'), where('asistenId', '==', uid)),
    (snapshot) => {
      onRequests(
        snapshot.docs
          .map((item) => item.data() as Izin)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    },
    onError,
  );
}

export async function decideIzin(
  request: Izin,
  uid: string,
  status: 'DITERIMA' | 'DITOLAK',
): Promise<Result> {
  if (request.status !== 'MENUNGGU') {
    return { ok: false, code: 'ALREADY_DECIDED', message: 'Pengajuan ini sudah diputuskan.' };
  }

  await updateDoc(doc(db, 'izin', request.id), {
    status,
    diputuskanOleh: uid,
    waktuKeputusan: new Date().toISOString(),
  });
  return { ok: true, data: undefined };
}
