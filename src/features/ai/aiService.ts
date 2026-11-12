export type AiClassificationResult =
  | { ok: true; kategori: string }
  | {
      ok: false;
      code: 'TIMEOUT' | 'NETWORK' | 'BAD_RESPONSE' | 'NOT_IMPLEMENTED';
      message: string;
    };

// Stub scaffold: implementasi adapter + mock dibuat pada M4 (P1, SRS-009).
export async function classifyReason(_alasan: string): Promise<AiClassificationResult> {
  return {
    ok: false,
    code: 'NOT_IMPLEMENTED',
    message: 'Klasifikasi AI belum tersedia.',
  };
}
