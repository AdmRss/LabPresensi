import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import type { AppUser, Result, Role } from '@/types';
import { mapFirebaseError } from '@/utils/firebaseError';

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  nama: string;
  email: string;
  password: string;
  role: Role;
  nim: string | null;
};

function getFirebaseCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.length > 0) {
      return code;
    }
  }

  return 'unknown';
}

export function validateCredentials(input: LoginInput, registration?: RegisterInput): string | null {
  if (!input.email.trim()) return 'Email wajib diisi.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return 'Format email tidak valid.';
  if (!input.password) return 'Password wajib diisi.';
  if (registration) {
    if (!registration.nama.trim()) return 'Nama wajib diisi.';
    if (!['ASISTEN', 'PRAKTIKAN'].includes(registration.role)) return 'Pilih peran yang valid.';
    if (!/^[0-9]{14}$/.test(registration.nim ?? '')) return 'NIM harus terdiri dari 14 angka.';
    if (input.password.length < 6) return 'Password minimal 6 karakter.';
  }
  return null;
}

/**
 * Login dengan Firebase Auth. Profil `users/{uid}` dimuat oleh AuthContext
 * sehingga penanganan profil hilang/invalid hanya ada di satu tempat.
 */
export async function loginAccount(input: LoginInput): Promise<Result<void>> {
  const message = validateCredentials(input);
  if (message) return { ok: false, code: 'INVALID_INPUT', message };
  try {
    await signInWithEmailAndPassword(auth, input.email.trim(), input.password);
    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      code: getFirebaseCode(error),
      message: mapFirebaseError(error),
    };
  }
}

/**
 * Register Firebase Auth lalu menulis profil `users/{uid}`.
 * Jika penulisan profil gagal, akun Auth yang baru dibuat dihapus agar tidak
 * meninggalkan akun tanpa profil.
 */
// Auth bisa mengumumkan UID baru sebelum penulisan profil selesai.
let pendingRegistration: Promise<Result<AppUser>> | null = null;

export async function waitForRegistration() {
  await pendingRegistration;
}

export async function registerAccount(input: RegisterInput): Promise<Result<AppUser>> {
  if (pendingRegistration) return { ok: false, code: 'BUSY', message: 'Pendaftaran sedang berlangsung.' };
  pendingRegistration = createAccountAndProfile(input);
  try { return await pendingRegistration; }
  finally { pendingRegistration = null; }
}

async function createAccountAndProfile(input: RegisterInput): Promise<Result<AppUser>> {
  const message = validateCredentials(input, input);
  if (message) return { ok: false, code: 'INVALID_INPUT', message };
  const email = input.email.trim();
  const nama = input.nama.trim();
  const nim = input.nim;

  let createdUser: FirebaseUser | null = null;

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, input.password);
    createdUser = credential.user;

    const profile: AppUser = {
      uid: credential.user.uid,
      nama,
      email,
      role: input.role,
      nim: nim && nim.length > 0 ? nim : null,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', credential.user.uid), profile);

    return { ok: true, data: profile };
  } catch (error) {
    if (createdUser) {
      try {
        await deleteUser(createdUser);
      } catch {
        // Best effort: bila rollback gagal, AuthContext akan mengeluarkan user
        // karena profil users/{uid} tidak ditemukan.
      }
    }

    return {
      ok: false,
      code: getFirebaseCode(error),
      message: mapFirebaseError(error),
    };
  }
}

export async function logoutAccount(): Promise<Result<void>> {
  try {
    await signOut(auth);
    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      code: getFirebaseCode(error),
      message: mapFirebaseError(error),
    };
  }
}
