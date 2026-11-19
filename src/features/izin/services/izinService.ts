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

import { classifyReason } from '@/features/ai/aiService';
import { confirmedDuplicate } from '@/features/jadwal/services/submission';
import { subscribeToStudentSessions } from '@/features/jadwal/services/jadwalService';
import { effectiveSessionStatus } from '@/features/kelola/sessionClock';
import { db } from '@/lib/firebase';
import type { AppUser, Izin, Kelas, Result, Sesi } from '@/types';

export function subscribeToEligibleSessions(
  uid: string,
  onSessions: (sessions: Sesi[]) => void,
  onError: (error: unknown) => void,
  onLoadingChange: (loading: boolean) => void,
  onClassCache?: (fromCache: boolean) => void,
): Unsubscribe {
  return subscribeToStudentSessions(uid, rows => onSessions(rows.filter(row => row.status === 'BELUM_DIBUKA')),
    onError, onLoadingChange, undefined, onClassCache);
}

export function subscribeToMyIzin(
  uid: string,
  onRequests: (requests: Izin[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'izin'), where('praktikanUid', '==', uid)),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;
      onRequests(
        snapshot.docs
          .map((item) => item.data() as Izin)
          .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))),
      );
    },
    onError,
  );
}

export function validReason(alasan: string) {
  const length = Array.from(alasan.trim()).length;
  return length >= 10 && length <= 500;
}

export async function submitIzin(sesi: Sesi, user: AppUser, alasan: string): Promise<Result<Izin>> {
  if (!validReason(alasan)) {
    return { ok: false, code: 'INVALID_REASON', message: 'Alasan harus berisi 10 sampai 500 karakter.' };
  }
  const prediction = await classifyReason(alasan);
  return createIzin(sesi, user, alasan, prediction.ok ? prediction.kategori : null);
}

export async function createIzin(
  sesi: Sesi,
  user: AppUser,
  alasan: string,
  kategoriAI: string | null,
): Promise<Result<Izin>> {
  alasan = alasan.trim();
  if (!validReason(alasan)) {
    return { ok: false, code: 'INVALID_REASON', message: 'Alasan harus berisi 10 sampai 500 karakter.' };
  }
  const kelasSnapshot = await getDoc(doc(db, 'kelas', sesi.kelasId));
  const kelas = kelasSnapshot.exists() ? (kelasSnapshot.data() as Kelas) : null;
  if (!kelas || kelas.archived || !kelas.pesertaUids.includes(user.uid)) {
    return { ok: false, code: 'NOT_MEMBER', message: 'Anda bukan peserta kelas sesi ini.' };
  }
  if (sesi.archived || effectiveSessionStatus(sesi) !== 'BELUM_DIBUKA') {
    return { ok: false, code: 'SESSION_NOT_AVAILABLE', message: 'Izin hanya dapat diajukan sebelum sesi dibuka.' };
  }

  const izinId = `${sesi.id}_${user.uid}`;
  const izinRef = doc(db, 'izin', izinId);
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
  try {
    await setDoc(izinRef, data);
  } catch (error) {
    if (await confirmedDuplicate(error, 'izin', izinId)) {
      return { ok: false, code: 'ALREADY_EXISTS', message: 'Pengajuan izin untuk sesi ini sudah ada.' };
    }
    throw error;
  }
  return { ok: true, data };
}

export function subscribeToAsistenIzin(
  uid: string,
  onRequests: (requests: Izin[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'izin'), where('asistenId', '==', uid)),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;
      onRequests(
        snapshot.docs
          .map((item) => item.data() as Izin)
          .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))),
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
