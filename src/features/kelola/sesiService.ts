import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
        list.push({ id: d.id, ...d.data() } as Sesi);
      });
      onData(list);
    },
    (error) => {
      onError(error?.message || 'Gagal memuat daftar sesi.');
    },
  );
}

export async function createSesi(data: {
  kelasId: string;
  kelasNama: string;
  praktikum: string;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  asistenId: string;
}): Promise<Result<string>> {
  if (!data.asistenId) {
    return { ok: false, code: 'INVALID_ASISTEN', message: 'Asisten ID tidak valid.' };
  }
  if (
    !data.kelasId.trim() ||
    !data.kelasNama.trim() ||
    !data.praktikum.trim() ||
    !data.lab.trim() ||
    !data.tanggal.trim() ||
    !data.jamMulai.trim() ||
    !data.jamSelesai.trim()
  ) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Semua field wajib diisi.' };
  }

  try {
    const kelasRef = doc(db, 'kelas', data.kelasId);
    const kelasSnap = await getDoc(kelasRef);
    if (!kelasSnap.exists()) {
      return { ok: false, code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan.' };
    }
    const kelasData = kelasSnap.data();
    if (kelasData.asistenId !== data.asistenId) {
      return { ok: false, code: 'UNAUTHORIZED', message: 'Anda tidak memiliki hak akses ke kelas ini.' };
    }

    const docRef = await addDoc(collection(db, 'sesi'), {
      kelasId: data.kelasId,
      kelasNama: data.kelasNama.trim(),
      praktikum: data.praktikum.trim(),
      lab: data.lab.trim(),
      tanggal: data.tanggal.trim(),
      jamMulai: data.jamMulai.trim(),
      jamSelesai: data.jamSelesai.trim(),
      asistenId: data.asistenId,
      status: 'BELUM_DIBUKA',
      openedAt: null,
      closedAt: null,
      createdAt: new Date().toISOString(),
    });

    return { ok: true, data: docRef.id };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: e?.message || 'Gagal membuat sesi.' };
  }
}

export async function updateSesi(
  sesiId: string,
  asistenId: string,
  data: {
    lab: string;
    tanggal: string;
    jamMulai: string;
    jamSelesai: string;
  },
): Promise<Result> {
  if (!asistenId) {
    return { ok: false, code: 'INVALID_ASISTEN', message: 'Asisten ID tidak valid.' };
  }
  if (!data.lab.trim() || !data.tanggal.trim() || !data.jamMulai.trim() || !data.jamSelesai.trim()) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Semua field jadwal dan lab wajib diisi.' };
  }

  try {
    const ref = doc(db, 'sesi', sesiId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { ok: false, code: 'SESSION_NOT_FOUND', message: 'Sesi tidak ditemukan.' };
    }
    const sesi = snap.data() as Sesi;
    if (sesi.asistenId !== asistenId) {
      return { ok: false, code: 'UNAUTHORIZED', message: 'Anda tidak memiliki akses ke sesi ini.' };
    }
    if (sesi.status !== 'BELUM_DIBUKA') {
      return { ok: false, code: 'INVALID_STATUS', message: 'Sesi yang sudah dibuka atau ditutup tidak dapat diubah.' };
    }

    await updateDoc(ref, {
      lab: data.lab.trim(),
      tanggal: data.tanggal.trim(),
      jamMulai: data.jamMulai.trim(),
      jamSelesai: data.jamSelesai.trim(),
    });

    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: e?.message || 'Gagal memperbarui sesi.' };
  }
}

export async function deleteSesi(sesiId: string, asistenId: string): Promise<Result> {
  if (!asistenId) {
    return { ok: false, code: 'INVALID_ASISTEN', message: 'Asisten ID tidak valid.' };
  }

  try {
    const ref = doc(db, 'sesi', sesiId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return { ok: false, code: 'SESSION_NOT_FOUND', message: 'Sesi tidak ditemukan.' };
    }
    const sesi = snap.data() as Sesi;
    if (sesi.asistenId !== asistenId) {
      return { ok: false, code: 'UNAUTHORIZED', message: 'Anda tidak memiliki akses ke sesi ini.' };
    }

    await deleteDoc(ref);
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: e?.message || 'Gagal menghapus sesi.' };
  }
}

export async function openSesi(sesiId: string, asistenId: string): Promise<Result> {
  if (!asistenId) {
    return { ok: false, code: 'INVALID_ASISTEN', message: 'Asisten ID tidak valid.' };
  }

  try {
    const ref = doc(db, 'sesi', sesiId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) {
        throw new Error('SESSION_NOT_FOUND: Sesi tidak ditemukan.');
      }
      const sesi = snap.data() as Sesi;
      if (sesi.asistenId !== asistenId) {
        throw new Error('UNAUTHORIZED: Anda tidak memiliki akses ke sesi ini.');
      }
      if (sesi.status !== 'BELUM_DIBUKA') {
        throw new Error('INVALID_STATUS: Hanya sesi yang belum dibuka yang dapat dibuka.');
      }

      transaction.update(ref, {
        status: 'DIBUKA',
        openedAt: new Date().toISOString(),
      });
    });

    return { ok: true, data: undefined };
  } catch (e: any) {
    const message = e?.message || '';
    const parts = message.split(': ');
    const code = parts.length > 1 ? parts[0] : 'UNKNOWN';
    const msg = parts.length > 1 ? parts[1] : (e?.message || 'Gagal membuka sesi.');
    return { ok: false, code, message: msg };
  }
}

export async function closeSesi(sesiId: string, asistenId: string): Promise<Result> {
  if (!asistenId) {
    return { ok: false, code: 'INVALID_ASISTEN', message: 'Asisten ID tidak valid.' };
  }

  try {
    const ref = doc(db, 'sesi', sesiId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) {
        throw new Error('SESSION_NOT_FOUND: Sesi tidak ditemukan.');
      }
      const sesi = snap.data() as Sesi;
      if (sesi.asistenId !== asistenId) {
        throw new Error('UNAUTHORIZED: Anda tidak memiliki akses ke sesi ini.');
      }
      if (sesi.status !== 'DIBUKA') {
        throw new Error('INVALID_STATUS: Hanya sesi yang sedang dibuka yang dapat ditutup.');
      }

      transaction.update(ref, {
        status: 'DITUTUP',
        closedAt: new Date().toISOString(),
      });
    });

    return { ok: true, data: undefined };
  } catch (e: any) {
    const message = e?.message || '';
    const parts = message.split(': ');
    const code = parts.length > 1 ? parts[0] : 'UNKNOWN';
    const msg = parts.length > 1 ? parts[1] : (e?.message || 'Gagal menutup sesi.');
    return { ok: false, code, message: msg };
  }
}
