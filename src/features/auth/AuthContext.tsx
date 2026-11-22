import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { waitForRegistration } from './authService';
import { auth, db } from '@/lib/firebase';
import type { AppUser } from '@/types';
import { mapFirebaseError } from '@/utils/firebaseError';

export type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  /** Pesan error terakhir, mis. profil users/{uid} tidak ditemukan. */
  notice: string | null;
  clearNotice: () => void;
  /** Muat ulang profil, dipakai layar login saat pemuatan profil gagal. */
  refreshProfile: () => Promise<void>;
};

type ProfileLoadResult =
  | { state: 'found'; profile: AppUser }
  | { state: 'missing' }
  | { state: 'error'; error: unknown };

const PROFILE_RETRY_DELAYS_MS = [0, 300, 700];
const PROFILE_MISSING_MESSAGE =
  'Profil pengguna tidak ditemukan atau tidak valid. Anda telah dikeluarkan. Silakan daftar ulang atau hubungi asisten.';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function parseAppUser(uid: string, raw: unknown): AppUser | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const nama = typeof data.nama === 'string' ? data.nama.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const role = data.role === 'ASISTEN' || data.role === 'PRAKTIKAN' || data.role === 'ADMIN' ? data.role : null;
  const nim = typeof data.nim === 'string' && data.nim.trim().length > 0 ? data.nim.trim() : null;

  if (!nama || !email || !role) {
    return null;
  }

  if (role === 'PRAKTIKAN' && !nim) {
    return null;
  }

  return {
    uid,
    nama,
    email,
    role,
    nim,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
  };
}

/**
 * Register menulis users/{uid} sesudah akun Auth dibuat, sehingga listener
 * Auth bisa berjalan lebih dulu. Beberapa percobaan singkat mencegah user
 * yang baru mendaftar langsung dikeluarkan karena profil belum terlihat.
 */
async function readProfileWithRetry(uid: string): Promise<ProfileLoadResult> {
  for (const delayMs of PROFILE_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await wait(delayMs);
    }

    try {
      const snapshot = await getDoc(doc(db, 'users', uid));

      if (snapshot.exists()) {
        const profile = parseAppUser(uid, snapshot.data());
        return profile ? { state: 'found', profile } : { state: 'missing' };
      }
      if (snapshot.metadata.fromCache) return { state: 'error', error: { code: 'unavailable' } };
    } catch (error) {
      return { state: 'error', error };
    }
  }

  return { state: 'missing' };
}

export function AuthProvider({ children, wrapSignOut }: {
  children: ReactNode;
  wrapSignOut?: (uid: string, leave: () => Promise<void>) => Promise<void>;
}) {
  const leave = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (uid && wrapSignOut) return wrapSignOut(uid, () => signOut(auth));
    await signOut(auth);
  }, [wrapSignOut]);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const loadProfile = useCallback(
    async (firebaseUser: FirebaseUser, isCurrent: () => boolean) => {
      setLoading(true);

      await waitForRegistration();
      if (!isCurrent()) return;
      const result = await readProfileWithRetry(firebaseUser.uid);
      if (!isCurrent()) {
        return;
      }

      if (result.state === 'found') {
        setUser(result.profile);
        setNotice(null);
        setLoading(false);
        return;
      }

      if (result.state === 'missing') {
        setUser(null);
        setNotice(PROFILE_MISSING_MESSAGE);
        setLoading(false);

        try {
          await leave();
        } catch {
          // Bila signOut gagal, listener tetap menampilkan layar login.
        }
        return;
      }

      // Gagal memuat profil (mis. offline). Jangan keluarkan user; beri
      // kesempatan "Coba Lagi" lewat refreshProfile().
      setUser(null);
      setNotice(mapFirebaseError(result.error));
      setLoading(false);
    },
    [leave],
  );

  useEffect(() => {
    isMountedRef.current = true;
    let generation = 0;

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        const currentGeneration = ++generation;
        const isCurrent = () => isMountedRef.current && currentGeneration === generation;

        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        void loadProfile(firebaseUser, isCurrent);
      },
      (error) => {
        if (!isMountedRef.current) {
          return;
        }

        setUser(null);
        setLoading(false);
        setNotice(mapFirebaseError(error));
      },
    );

    return () => {
      isMountedRef.current = false;
      generation += 1;
      unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    await loadProfile(firebaseUser, () => isMountedRef.current && auth.currentUser?.uid === firebaseUser.uid);
  }, [loadProfile]);

  const logout = useCallback(async () => {
    try {
      await leave();
      setUser(null);
      setNotice(null);
    } catch (error) {
      throw new Error(mapFirebaseError(error));
    }
  }, [leave]);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      logout,
      notice,
      clearNotice,
      refreshProfile,
    }),
    [user, loading, logout, notice, clearNotice, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}


