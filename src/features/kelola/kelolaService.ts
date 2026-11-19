import {
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  getDocFromServer,
  documentId,
  setDoc,
  serverTimestamp,
  updateDoc,
  runTransaction,
  writeBatch,
  onSnapshot,
  query,
  where,
  arrayUnion,
  arrayRemove,
  type Timestamp,
} from 'firebase/firestore';
import { mapFirebaseError } from '@/utils/firebaseError';
import { db } from '@/lib/firebase';
import type { Kelas, AppUser, Result } from '@/types';

export async function getKelasList(uid: string): Promise<Result<Kelas[]>> {
  try {
    const snap = await getDocs(query(collection(db, 'kelas'), where('asistenId', '==', uid)));
    return { ok: true, data: snap.docs.map(row => row.data() as Kelas).filter(row => !row.archived) };
  } catch (error) {
    return { ok: false, code: 'READ_FAILED', message: mapFirebaseError(error) };
  }
}

export function subscribeKelas(uid: string, onData: (rows: Kelas[]) => void, onError: (msg: string) => void) {
  return onSnapshot(query(collection(db, 'kelas'), where('asistenId', '==', uid)), snap => {
    onData(snap.docs.map(row => row.data() as Kelas).filter(row => !row.archived));
  }, error => onError(mapFirebaseError(error)));
}

export type KatalogKelas = { id: string; nama: string; praktikum: string; pesertaUids: string[]; createdAt?: Timestamp };
export type LokasiPraktikum = { id: string; nama: string };

export function latestCatalogClass(rows: KatalogKelas[]): KatalogKelas | undefined {
  let latest: KatalogKelas | undefined;
  for (const row of rows) {
    if (row.createdAt && (!latest?.createdAt || row.createdAt.toMillis() > latest.createdAt.toMillis())) latest = row;
  }
  return latest ?? (rows.length === 1 ? rows[0] : undefined);
}

export function subscribeCatalog<T extends { id: string }>(
  kind: 'katalogKelas' | 'lokasiPraktikum', onData: (rows: T[]) => void, onError: (message: string) => void,
) {
  return onSnapshot(collection(db, kind), snapshot => onData(snapshot.docs
    .filter(row => row.data().archived !== true)
    .map(row => ({ ...row.data(), id: row.id }) as T)), error => onError(mapFirebaseError(error)));
}

export function subscribeAdminClasses(onData: (rows: Kelas[]) => void, onError: (message: string) => void) {
  return onSnapshot(collection(db, 'kelas'), snapshot => onData(snapshot.docs
    .map(row => ({ ...row.data(), id: row.id }) as Kelas)),
    error => onError(mapFirebaseError(error)));
}

export type AdminClassTarget = { id: string; kind: 'kelas' | 'katalogKelas' };

export async function archiveAdminClasses(targets: AdminClassTarget[]): Promise<Result> {
  if (!targets.length || targets.length > 450) {
    return { ok: false, code: 'INVALID_SELECTION', message: 'Pilih 1 sampai 450 kelas untuk diarsipkan sekaligus.' };
  }
  try {
    const batch = writeBatch(db);
    for (const target of targets) batch.update(doc(db, target.kind, target.id), { archived: true });
    await batch.commit();
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, code: 'ARCHIVE_FAILED', message: mapFirebaseError(error) };
  }
}

export async function createKelas(data: { katalogId: string; asistenId: string }): Promise<Result<string>> {
  if (!data.katalogId) return { ok: false, code: 'INVALID_INPUT', message: 'Pilih kelas dan praktikum dari katalog.' };
  try {
    const catalog = (await getDocFromServer(doc(db, 'katalogKelas', data.katalogId))).data();
    if (!catalog || catalog.archived) return { ok: false, code: 'INVALID_INPUT', message: 'Kelas katalog tidak tersedia.' };
    const ref = doc(collection(db, 'kelas'));
    await setDoc(ref, {
      id: ref.id, katalogId: data.katalogId, nama: catalog.nama, praktikum: catalog.praktikum,
      asistenId: data.asistenId, pesertaUids: [], createdAt: new Date().toISOString(),
    });
    return { ok: true, data: ref.id };
  } catch (error) {
    return { ok: false, code: 'CREATE_FAILED', message: mapFirebaseError(error) };
  }
}

export async function updateKelas(
  kelasId: string,
  data: { nama: string; praktikum: string; katalogId?: string },
): Promise<Result> {
  if (!data.nama.trim() || !data.praktikum.trim()) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Nama kelas dan nama praktikum tidak boleh kosong.' };
  }
  try {
    const ref = doc(db, 'kelas', kelasId);
    await updateDoc(ref, {
      nama: data.nama.trim(),
      praktikum: data.praktikum.trim(),
      ...(data.katalogId ? { katalogId: data.katalogId } : {}),
    });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: mapFirebaseError(e) };
  }
}

export async function deleteKelas(kelasId: string): Promise<Result> {
  try {
    await updateDoc(doc(db, 'kelas', kelasId), { archived: true });
    return { ok: true, data: undefined };
  } catch (e: any) {
    return { ok: false, code: e?.code || 'UNKNOWN', message: mapFirebaseError(e) };
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
    return { ok: false, code: e?.code || 'UNKNOWN', message: mapFirebaseError(e) };
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
    return { ok: false, code: e?.code || 'UNKNOWN', message: mapFirebaseError(e) };
  }
}

export async function getPraktikanList(kelas: Kelas): Promise<Result<AppUser[]>> {
  try {
    const catalog = kelas.katalogId
      ? (await getDocFromServer(doc(db, 'katalogKelas', kelas.katalogId))).data() : undefined;
    const ids = [...new Set<string>([...(catalog?.archived ? [] : catalog?.pesertaUids ?? []), ...kelas.pesertaUids])];
    const list: AppUser[] = [];
    for (let index = 0; index < ids.length; index += 30) {
      const snapshot = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', ids.slice(index, index + 30))));
      snapshot.forEach(row => {
        if (row.data().role === 'PRAKTIKAN') list.push({ ...row.data(), uid: row.id } as AppUser);
      });
    }
    return { ok: true, data: list };
  } catch (error) {
    return { ok: false, code: 'READ_FAILED', message: mapFirebaseError(error) };
  }
}

export async function saveCatalogEntry(kind: 'katalogKelas' | 'lokasiPraktikum', id: string | undefined,
  data: { nama: string; praktikum?: string; pesertaUids?: string[]; archived?: boolean }): Promise<Result> {
  try {
    const ref = id ? doc(db, kind, id) : doc(collection(db, kind));
    if (data.archived) await updateDoc(ref, { archived: true });
    else await setDoc(ref, data);
    return { ok: true, data: undefined };
  } catch (error) {
    if ((error as { code?: string })?.code === 'permission-denied') {
      return { ok: false, code: 'CATALOG_WRITE_DENIED',
        message: 'Firestore menolak penyimpanan katalog. Periksa peran ADMIN pada profil akun dan aturan katalog yang aktif.' };
    }
    return { ok: false, code: 'CATALOG_FAILED', message: mapFirebaseError(error) };
  }
}

const validNim = (nim: unknown): nim is string => typeof nim === 'string' && /^[0-9]{14}$/.test(nim);
export const rosterTokens = (value: string) => value.split(/[\s,]+/).filter(Boolean);

type CatalogNames = { nama: string; praktikum: string };
const catalogNameKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

async function catalogPairExists(id: string | undefined, names: CatalogNames) {
  const snapshot = await getDocsFromServer(collection(db, 'katalogKelas'));
  return snapshot.docs.some(row => {
    const data = row.data() as KatalogKelas & { archived?: boolean };
    return row.id !== id && !data.archived && catalogNameKey(data.nama) === catalogNameKey(names.nama)
      && catalogNameKey(data.praktikum) === catalogNameKey(names.praktikum);
  });
}

const catalogDuplicate = {
  ok: false as const, code: 'DUPLICATE_PAIR', message: 'Kombinasi nama kelas dan praktikum ini sudah ada.',
};

export async function checkCatalogPair(id: string | undefined, names: CatalogNames): Promise<Result> {
  try {
    return await catalogPairExists(id, names) ? catalogDuplicate : { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, code: 'CATALOG_CHECK_FAILED', message: mapFirebaseError(error) };
  }
}

export async function saveUniqueClassCatalog(id: string | undefined, data: CatalogNames & { pesertaUids?: string[] }): Promise<Result> {
  const ref = id ? doc(db, 'katalogKelas', id) : doc(collection(db, 'katalogKelas'));
  const lock = doc(db, 'katalogKontrol', 'kelas');
  try {
    return await runTransaction(db, async tx => {
      const previous = await tx.get(lock);
      if (await catalogPairExists(id, data)) return catalogDuplicate;
      const current = id ? await tx.get(ref) : null;
      if (current?.data()?.archived || (!current?.exists() && data.pesertaUids === undefined)) {
        return { ok: false, code: 'CATALOG_UNAVAILABLE', message: 'Katalog kelas sudah tidak tersedia.' };
      }
      if (current?.exists()) tx.update(ref, data);
      else tx.set(ref, { ...data, createdAt: serverTimestamp() });
      tx.set(lock, { revision: (previous.data()?.revision ?? 0) + 1 });
      return { ok: true, data: undefined };
    });
  } catch (error) {
    if ((error as { code?: string })?.code === 'permission-denied') {
      return { ok: false, code: 'CATALOG_WRITE_DENIED',
        message: 'Firestore menolak penyimpanan katalog. Periksa peran ADMIN dan Firestore Rules terbaru.' };
    }
    return { ok: false, code: 'CATALOG_FAILED', message: mapFirebaseError(error) };
  }
}

function catalogRosterReadFailure(error: unknown) {
  if ((error as { code?: string })?.code === 'permission-denied') {
    return { ok: false as const, code: 'CATALOG_ROSTER_READ_DENIED',
      message: 'Firestore menolak pencarian profil mahasiswa. Periksa peran ADMIN dan pastikan Firestore Rules terbaru sudah aktif.' };
  }
  return { ok: false as const, code: 'READ_FAILED', message: mapFirebaseError(error) };
}

export async function lookupCatalogStudents(nims: string[]): Promise<Result<{ uid: string; nama: string; nim: string }[]>> {
  if (!nims.every(validNim)) {
    return { ok: false, code: 'INVALID_NIM', message: 'Setiap NIM harus terdiri dari 14 angka.' };
  }
  if (new Set(nims).size !== nims.length) {
    return { ok: false, code: 'DUPLICATE_NIM', message: 'NIM yang sama hanya boleh dimasukkan satu kali.' };
  }

  try {
    const students: { uid: string; nama: string; nim: string }[] = [];
    for (let index = 0; index < nims.length; index += 30) {
      const batch = nims.slice(index, index + 30);
      const snapshot = await getDocsFromServer(query(collection(db, 'users'),
        where('role', '==', 'PRAKTIKAN'), where('nim', 'in', batch)));
      const matches = new Map<string, typeof students>();
      for (const row of snapshot.docs) {
        const nim = row.data().nim as string;
        const profiles = matches.get(nim) ?? [];
        profiles.push({ uid: row.id, nama: row.data().nama, nim });
        matches.set(nim, profiles);
      }
      for (const nim of batch) {
        const profiles = matches.get(nim);
        if (!profiles) return { ok: false, code: 'NIM_NOT_FOUND', message: 'NIM ' + nim + ' tidak terdaftar sebagai mahasiswa.' };
        if (profiles.length !== 1) {
          return { ok: false, code: 'NIM_AMBIGUOUS', message: 'NIM ' + nim + ' dipakai lebih dari satu akun mahasiswa. Periksa profilnya dulu.' };
        }
        students.push(profiles[0]);
      }
    }
    return { ok: true, data: students };
  } catch (error) {
    return catalogRosterReadFailure(error);
  }
}

export async function saveClassCatalogByNim(id: string | undefined,
  data: CatalogNames & { roster: string }): Promise<Result> {
  const students = await lookupCatalogStudents(rosterTokens(data.roster));
  if (!students.ok) return students;
  return saveUniqueClassCatalog(id, {
    nama: data.nama, praktikum: data.praktikum, pesertaUids: students.data.map(row => row.uid),
  });
}

export async function loadRosterPreview(uids: string[]): Promise<Result<{ id: string; nama: string }[]>> {
  try {
    const result: { id: string; nama: string }[] = [];
    for (let index = 0; index < uids.length; index += 30) {
      const profiles = await Promise.all(uids.slice(index, index + 30)
        .map(uid => getDocFromServer(doc(db, 'users', uid))));
      result.push(...profiles.map(row => ({ id: row.id, nama: row.data()?.nama ?? 'Profil tidak tersedia' })));
    }
    return { ok: true, data: result };
  } catch (error) {
    return catalogRosterReadFailure(error);
  }
}

export async function loadCatalogNims(uids: string[]): Promise<Result<string[]>> {
  const nims: string[] = [];
  try {
    for (let index = 0; index < uids.length; index += 30) {
      const profiles = await Promise.all(uids.slice(index, index + 30)
        .map(uid => getDocFromServer(doc(db, 'users', uid))));
      for (const profile of profiles) {
        const user = profile.data();
        if (user?.role !== 'PRAKTIKAN' || !validNim(user.nim)) {
          return { ok: false, code: 'UNRESOLVED_ROSTER',
            message: 'Ada peserta lama tanpa akun mahasiswa atau NIM 14 digit yang valid. Periksa profilnya sebelum mengedit katalog.' };
        }
        nims.push(user.nim);
      }
    }
    return { ok: true, data: nims };
  } catch (error) {
    return catalogRosterReadFailure(error);
  }
}
