import {
  collection,
  doc,
  serverTimestamp,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { confirmedDuplicate, ownSessionQuery } from './submission';
import { effectiveSessionStatus } from '@/features/kelola/sessionClock';
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
  onClasses?: (classes: Kelas[]) => void,
  onClassCache?: (fromCache: boolean) => void,
): Unsubscribe {
  let sessionUnsubscribes: Unsubscribe[] = [];
  let generation = 0;
  let membership: string[] | undefined;

  const unsubscribeClasses = onSnapshot(
    query(collection(db, 'kelas'), where('pesertaUids', 'array-contains', uid)),
    { includeMetadataChanges: true },
    (classSnapshot) => {
      onClassCache?.(classSnapshot.metadata.fromCache);
      const classes = classSnapshot.docs.map(item => ({ ...item.data() as Kelas, id: item.id }))
        .filter(kelas => !kelas.archived);
      onClasses?.(classes);
      const classIds = classes.map(kelas => kelas.id);
      if (membership && membership.length === classIds.length &&
          membership.every((id, index) => id === classIds[index])) return;
      membership = classIds;
      generation += 1;
      const currentGeneration = generation;
      sessionUnsubscribes.forEach(unsubscribe => unsubscribe());
      sessionUnsubscribes = [];
      onLoadingChange(classIds.length > 0);
      onSessions([]);

      if (classIds.length === 0) return;

      const sessionsByBatch = new Map<number, Sesi[]>();
      const batches = chunks(classIds, SESSION_QUERY_BATCH_SIZE);
      const completedBatchIndexes = new Set<number>();

      batches.forEach((batch, batchIndex) => {
        const unsubscribe = onSnapshot(
          query(collection(db, 'sesi'), where('kelasId', 'in', batch)),
          (sessionSnapshot) => {
            if (currentGeneration !== generation) return;
            sessionsByBatch.set(batchIndex, readSessions(sessionSnapshot.docs.map(item => ({ ...item.data(), id: item.id }))).filter(row => !row.archived));
            const sessions = sortSessions(
              [...sessionsByBatch.values()].flatMap((batchSessions) => batchSessions),
            );
            onSessions(sessions);
            completedBatchIndexes.add(batchIndex);
            if (completedBatchIndexes.size === batches.length) onLoadingChange(false);
          },
          error => { if (currentGeneration === generation) onError(error); },
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
  if (sesi.archived || effectiveSessionStatus(sesi) !== 'DIBUKA') {
    return { ok: false, code: 'SESSION_NOT_OPEN', message: 'Presensi hanya tersedia saat sesi dibuka.' };
  }

  const presensiId = `${sesi.id}_${user.uid}`;
  const presensiRef = doc(db, 'presensi', presensiId);
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
  try {
    await setDoc(presensiRef, { ...data, recordedAt: serverTimestamp() });
  } catch (error) {
    if (await confirmedDuplicate(error, 'presensi', presensiId)) {
      return { ok: false, code: 'ALREADY_CHECKED_IN', message: 'Anda sudah melakukan presensi pada sesi ini.' };
    }
    throw error;
  }
  return { ok: true, data };
}

export function subscribeToPresensi(
  sesiId: string,
  uid: string,
  onPresensi: (presensi: Presensi | null, pending: boolean) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(ownSessionQuery('presensi', uid, sesiId), { includeMetadataChanges: true }, snapshot => {
    const row = snapshot.docs[0];
    onPresensi(row && !row.metadata.hasPendingWrites ? readPresensi(row.data()) : null,
      snapshot.metadata.hasPendingWrites);
  }, onError);
}

export function readPresensi(data: DocumentData): Presensi {
  const serverTime = data.recordedAt?.toDate?.();
  return { ...data, timestamp: serverTime?.toISOString() ?? data.timestamp } as Presensi;
}

export async function getStudentClasses(uid: string): Promise<Kelas[]> {
  const snapshot = await getDocs(query(collection(db, 'kelas'), where('pesertaUids', 'array-contains', uid)));
  return snapshot.docs.map(row => row.data() as Kelas).filter(row => !row.archived);
}
