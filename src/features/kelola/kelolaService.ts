import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Kelas, AppUser, Result } from '@/types';

export async function getKelasList(asistenId: string): Promise<Result<Kelas[]>> {
  try {
    const q = query(collection(db, 'kelas'), where('asistenId', '==', asistenId));
    const snapshot = await getDocs(q);
    const list: Kelas[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Kelas);
    });
    return { ok: true, data: list };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: e?.message || 'Gagal memuat daftar kelas.' };
  }
}

export async function createKelas(data: {
  nama: string;
  praktikum: string;
  asistenId: string;
}): Promise<Result<string>> {
  if (!data.nama.trim() || !data.praktikum.trim()) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Nama kelas dan nama praktikum tidak boleh kosong.' };
  }
  try {
    const docRef = await addDoc(collection(db, 'kelas'), {
      nama: data.nama.trim(),
      praktikum: data.praktikum.trim(),
      asistenId: data.asistenId,
      pesertaUids: [],
      createdAt: new Date().toISOString(),
    });
    return { ok: true, data: docRef.id };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: e?.message || 'Gagal membuat kelas.' };
  }
}

export async function updateKelas(
  kelasId: string,
  data: { nama: string; praktikum: string },
): Promise<Result> {
  if (!data.nama.trim() || !data.praktikum.trim()) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Nama kelas dan nama praktikum tidak boleh kosong.' };
  }
  try {
    const ref = doc(db, 'kelas', kelasId);
    await updateDoc(ref, {
      nama: data.nama.trim(),
      praktikum: data.praktikum.trim(),
    });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: e?.message || 'Gagal memperbarui kelas.' };
  }
}

export async function deleteKelas(kelasId: string): Promise<Result> {
  try {
    await deleteDoc(doc(db, 'kelas', kelasId));
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: e?.message || 'Gagal menghapus kelas.' };
  }
}

export async function addPeserta(kelasId: string, praktikanUid: string): Promise<Result> {
  try {
    const ref = doc(db, 'kelas', kelasId);
    await updateDoc(ref, {
      pesertaUids: arrayUnion(praktikanUid),
    });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: e?.message || 'Gagal menambahkan peserta.' };
  }
}

export async function removePeserta(kelasId: string, praktikanUid: string): Promise<Result> {
  try {
    const ref = doc(db, 'kelas', kelasId);
    await updateDoc(ref, {
      pesertaUids: arrayRemove(praktikanUid),
    });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: e?.message || 'Gagal mencabut peserta.' };
  }
}

export async function getPraktikanList(): Promise<Result<AppUser[]>> {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'PRAKTIKAN'));
    const snapshot = await getDocs(q);
    const list: AppUser[] = [];
    snapshot.forEach((d) => {
      list.push({ uid: d.id, ...d.data() } as AppUser);
    });
    return { ok: true, data: list };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: e?.message || 'Gagal memuat daftar praktikan.' };
  }
}
