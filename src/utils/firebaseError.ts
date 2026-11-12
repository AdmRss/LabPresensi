// Stub scaffold: pemetaan error Bahasa Indonesia dibuat pada M4 (P1, SRS-011).
export function mapFirebaseError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Terjadi kesalahan. Silakan coba lagi.';
}
