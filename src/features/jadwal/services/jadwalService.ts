import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { AppUser, Kelas, Presensi, Result, Sesi } from '@/types';

const SESSION_QUERY_BATCH_SIZE = 30;

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function readSessions(data: DocumentData[]): Sesi[] {
  return data.map((item) => item as Sesi);
}

export function sortSessions(sessions: Sesi[]): Sesi[] {
  return [...sessions].sort((a, b) =>
    `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`),
  );
}

/**
 * Subscribes to the student's classes and replaces session listeners whenever
 * the class membership changes. Each batch snapshot is replaced as a whole so
 * deleted sessions cannot remain in local state.
 */
export function subscribeToStudentSessions(
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

      const sessionsByBatch = new Map<number, Sesi[]>();
      const batches = chunks(classIds, SESSION_QUERY_BATCH_SIZE);
      const completedBatchIndexes = new Set<number>();

      batches.forEach((batch, batchIndex) => {
        const unsubscribe = onSnapshot(
          query(collection(db, 'sesi'), where('kelasId', 'in', batch)),
          (sessionSnapshot) => {
            if (currentGeneration !== generation) return;
            sessionsByBatch.set(batchIndex, readSessions(sessionSnapshot.docs.map((item) => item.data())));
            const sessions = sortSessions(
              [...sessionsByBatch.values()].flatMap((batchSessions) => batchSessions),
            );
            onSessions(sessions);
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

export async function createPresensi(
  sesi: Sesi,
  user: AppUser,
): Promise<Result<Presensi>> {
  const kelasSnapshot = await getDoc(doc(db, 'kelas', sesi.kelasId));
  const kelas = kelasSnapshot.exists() ? (kelasSnapshot.data() as Kelas) : null;
  if (!kelas || !kelas.pesertaUids.includes(user.uid)) {
    return { ok: false, code: 'NOT_MEMBER', message: 'Anda bukan peserta kelas sesi ini.' };
  }
  if (sesi.status !== 'DIBUKA') {
    return { ok: false, code: 'SESSION_NOT_OPEN', message: 'Presensi hanya tersedia saat sesi dibuka.' };
  }

  const presensiId = `${sesi.id}_${user.uid}`;
  const presensiRef = doc(db, 'presensi', presensiId);
  const existing = await getDoc(presensiRef);
  if (existing.exists()) {
    return { ok: false, code: 'ALREADY_CHECKED_IN', message: 'Anda sudah melakukan presensi pada sesi ini.' };
  }

  const data: Presensi = {
    id: presensiId,
    sesiId: sesi.id,
    kelasId: sesi.kelasId,
    asistenId: sesi.asistenId,
    praktikanUid: user.uid,
    nama: user.nama,
    nim: user.nim ?? '',
    timestamp: new Date().toISOString(),
  };
  await setDoc(presensiRef, data);
  return { ok: true, data };
}

export function subscribeToPresensi(
  sesiId: string,
  uid: string,
  onPresensi: (presensi: Presensi | null) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'presensi', `${sesiId}_${uid}`),
    (snapshot) => onPresensi(snapshot.exists() ? (snapshot.data() as Presensi) : null),
    onError,
  );
}

export async function getStudentClasses(uid: string): Promise<Kelas[]> {
  const snapshot = await getDocs(
    query(collection(db, 'kelas'), where('pesertaUids', 'array-contains', uid)),
  );
  return snapshot.docs.map((item) => item.data() as Kelas);
}
