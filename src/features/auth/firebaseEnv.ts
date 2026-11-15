/**
 * Pemeriksaan konfigurasi Firebase untuk layar autentikasi (SRS-001).
 *
 * Nilai dibaca statis dari `process.env.EXPO_PUBLIC_*` agar dapat di-inline
 * Expo. Helper ini sengaja berada di folder fitur auth supaya kode P1 hanya
 * bergantung pada `auth` dan `db` dari `@/lib/firebase` (file milik PM),
 * tanpa menambah export baru pada file bersama tersebut.
 */
const firebaseEnvValues: Record<string, string> = {
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const missingFirebaseEnvKeys: string[] = Object.entries(firebaseEnvValues)
  .filter(([, value]) => value.trim().length === 0)
  .map(([key]) => key);
