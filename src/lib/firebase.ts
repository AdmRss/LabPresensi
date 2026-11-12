import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Konfigurasi dibaca dari environment Expo (EXPO_PUBLIC_*).
 * Nilai sebenarnya dibagikan PM lewat chat dan disimpan di `.env` (tidak di-commit).
 */
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const missingFirebaseEnvKeys = (
  [
    ['EXPO_PUBLIC_FIREBASE_API_KEY', firebaseConfig.apiKey],
    ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
    ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
    ['EXPO_PUBLIC_FIREBASE_APP_ID', firebaseConfig.appId],
  ] as const
)
  .filter(([, value]) => value.trim().length === 0)
  .map(([key]) => key);

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * Firebase JS SDK menyediakan `getReactNativePersistence` hanya pada build
 * React Native. Tipe publik `firebase/auth` (dipakai TypeScript) tidak
 * mengekspornya, jadi akses dilakukan lewat deteksi runtime agar web tetap aman.
 */
type ReactNativeAuthModule = typeof FirebaseAuth & {
  getReactNativePersistence?: (storage: unknown) => Persistence;
};

function createAuth(firebaseApp: FirebaseApp): Auth {
  const reactNativeAuth = FirebaseAuth as ReactNativeAuthModule;

  if (typeof reactNativeAuth.getReactNativePersistence === 'function') {
    try {
      return FirebaseAuth.initializeAuth(firebaseApp, {
        persistence: reactNativeAuth.getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // Auth sudah diinisialisasi (mis. Fast Refresh). Lanjutkan ke getAuth.
    }
  }

  return FirebaseAuth.getAuth(firebaseApp);
}

export const auth: Auth = createAuth(app);
export const db: Firestore = getFirestore(app);
