const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  // Firebase Authentication
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/user-not-found': 'Akun tidak ditemukan. Periksa email Anda atau daftar terlebih dahulu.',
  'auth/wrong-password': 'Password salah. Silakan coba lagi.',
  'auth/invalid-credential': 'Email atau password salah.',
  'auth/invalid-login-credentials': 'Email atau password salah.',
  'auth/email-already-in-use': 'Email sudah terdaftar. Gunakan email lain atau masuk dengan email tersebut.',
  'auth/weak-password': 'Password terlalu lemah. Gunakan minimal 6 karakter.',
  'auth/missing-password': 'Password wajib diisi.',
  'auth/missing-email': 'Email wajib diisi.',
  'auth/network-request-failed': 'Koneksi internet bermasalah. Periksa jaringan lalu coba lagi.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.',
  'auth/user-disabled': 'Akun ini dinonaktifkan. Hubungi asisten.',
  'auth/user-token-expired': 'Sesi login telah berakhir. Silakan masuk kembali.',
  'auth/requires-recent-login': 'Sesi login sudah terlalu lama. Silakan masuk kembali.',
  'auth/operation-not-allowed': 'Metode login email/password belum diaktifkan pada project Firebase.',
  'auth/invalid-api-key': 'Konfigurasi Firebase tidak valid (API key). Periksa file .env.',
  'auth/api-key-not-valid': 'Konfigurasi Firebase tidak valid (API key). Periksa file .env.',
  'auth/configuration-not-found': 'Konfigurasi Firebase tidak ditemukan. Periksa project dan file .env.',
  'auth/already-initialized': 'Layanan autentikasi sudah diinisialisasi. Muat ulang aplikasi.',
  'auth/internal-error': 'Layanan autentikasi mengalami gangguan. Coba lagi.',

  // Cloud Firestore
  'permission-denied': 'Anda tidak memiliki izin untuk melakukan aksi ini.',
  unauthenticated: 'Sesi login tidak valid. Silakan masuk kembali.',
  unavailable: 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.',
  'deadline-exceeded': 'Permintaan melebihi batas waktu. Coba lagi.',
  'not-found': 'Data yang diminta tidak ditemukan.',
  'already-exists': 'Data sudah ada. Muat ulang lalu coba lagi.',
  'failed-precondition': 'Operasi tidak dapat dilakukan saat ini. Muat ulang lalu coba lagi.',
  aborted: 'Operasi dibatalkan karena ada perubahan data. Coba lagi.',
  cancelled: 'Operasi dibatalkan.',
  'resource-exhausted': 'Terlalu banyak permintaan. Tunggu beberapa saat lalu coba lagi.',
  'invalid-argument': 'Data yang dikirim tidak valid.',
  'data-loss': 'Terjadi kehilangan data. Hubungi asisten.',
  internal: 'Server mengalami gangguan. Coba lagi.',
};

function getErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.trim().length > 0) {
      return code.trim();
    }
  }

  return null;
}

/**
 * Memetakan error Firebase Auth/Firestore ke pesan Bahasa Indonesia.
 * Tidak pernah melempar exception; error tak dikenal memakai pesan umum.
 */
export function mapFirebaseError(error: unknown): string {
  const code = getErrorCode(error);

  if (code) {
    const normalizedCode = code.startsWith('firestore/')
      ? code.slice('firestore/'.length)
      : code;
    const mapped = FIREBASE_ERROR_MESSAGES[normalizedCode];
    if (mapped) {
      return mapped;
    }
  }

  const rawMessage = error instanceof Error ? error.message : '';
  const lowerMessage = rawMessage.toLowerCase();

  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('offline') ||
    lowerMessage.includes('failed to fetch')
  ) {
    return 'Koneksi internet bermasalah. Periksa jaringan lalu coba lagi.';
  }

  if (lowerMessage.includes('permission') || lowerMessage.includes('insufficient')) {
    return 'Anda tidak memiliki izin untuk melakukan aksi ini.';
  }

  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'Permintaan melebihi batas waktu. Coba lagi.';
  }

  return 'Terjadi kesalahan. Silakan coba lagi.';
}

