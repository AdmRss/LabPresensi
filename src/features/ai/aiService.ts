export type AiClassificationResult =
  | { ok: true; kategori: string }
  | {
      ok: false;
      code: 'TIMEOUT' | 'NETWORK' | 'BAD_RESPONSE' | 'NOT_IMPLEMENTED';
      message: string;
    };

const AI_TIMEOUT_MS = 10_000;
const MOCK_MIN_DELAY_MS = 300;
const MOCK_MAX_DELAY_MS = 800;

const MOCK_CATEGORIES = ['SAKIT', 'KELUARGA', 'AKADEMIK', 'LAINNYA'] as const;
type MockCategory = (typeof MOCK_CATEGORIES)[number];

const MOCK_KEYWORDS: Record<MockCategory, string[]> = {
  LAINNYA: [],
  SAKIT: [
    'sakit',
    'demam',
    'flu',
    'batuk',
    'pilek',
    'pusing',
    'migrain',
    'rawat',
    'rumah sakit',
    'opname',
    'kecelakaan',
    'vaksin',
    'kontrol dokter',
    'hamil',
  ],
  KELUARGA: [
    'keluarga',
    'orang tua',
    'ibu',
    'ayah',
    'kakak',
    'adik',
    'saudara',
    'duka',
    'meninggal',
    'pemakaman',
    'menjenguk',
    'pernikahan',
    'nikah',
  ],
  AKADEMIK: [
    'ujian',
    'uts',
    'uas',
    'sidang',
    'seminar',
    'lomba',
    'kompetisi',
    'kuliah',
    'tugas',
    'beasiswa',
    'konferensi',
    'workshop',
    'praktikum lain',
  ],
};

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function classifyMock(alasan: string): MockCategory {
  const text = alasan.toLowerCase();
  let bestCategory: MockCategory = 'LAINNYA';
  let bestScore = 0;

  MOCK_CATEGORIES.forEach((category) => {
    const score = MOCK_KEYWORDS[category].reduce(
      (total, keyword) => (text.includes(keyword) ? total + 1 : total),
      0,
    );

    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  });

  return bestCategory;
}

async function classifyWithMock(alasan: string): Promise<AiClassificationResult> {
  const delay =
    MOCK_MIN_DELAY_MS + Math.floor(Math.random() * (MOCK_MAX_DELAY_MS - MOCK_MIN_DELAY_MS + 1));

  await wait(delay);

  return { ok: true, kategori: classifyMock(alasan) };
}

function readKategori(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const kategori = (payload as { kategori?: unknown }).kategori;
  if (typeof kategori !== 'string') {
    return null;
  }

  const trimmed = kategori.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

async function classifyWithApi(
  apiUrl: string,
  alasan: string,
): Promise<AiClassificationResult> {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, AI_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: alasan }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        code: 'BAD_RESPONSE',
        message: `Layanan AI mengembalikan respons tidak valid (HTTP ${response.status}).`,
      };
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        code: 'BAD_RESPONSE',
        message: 'Respons layanan AI tidak dapat dibaca.',
      };
    }

    const kategori = readKategori(payload);
    if (!kategori) {
      return {
        ok: false,
        code: 'BAD_RESPONSE',
        message: 'Respons layanan AI tidak berisi kategori yang valid.',
      };
    }

    return { ok: true, kategori };
  } catch (error) {
    if (timedOut || isAbortError(error)) {
      return {
        ok: false,
        code: 'TIMEOUT',
        message: 'Klasifikasi AI melebihi batas waktu 10 detik.',
      };
    }

    return {
      ok: false,
      code: 'NETWORK',
      message: 'Tidak dapat menghubungi layanan AI. Periksa koneksi jaringan Anda.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Klasifikasi alasan izin.
 *
 * - `EXPO_PUBLIC_AI_API_URL` kosong  -> mock lokal berbasis kata kunci.
 * - `EXPO_PUBLIC_AI_API_URL` terisi  -> POST { text } ke API pengajar.
 *
 * Tidak pernah melempar exception. Timeout 10 detik. Hasil AI tidak pernah
 * mengubah status izin (itu tanggung jawab pemanggil).
 */
export async function classifyReason(alasan: string): Promise<AiClassificationResult> {
  const trimmed = typeof alasan === 'string' ? alasan.trim() : '';

  if (trimmed.length === 0) {
    return {
      ok: false,
      code: 'BAD_RESPONSE',
      message: 'Alasan izin kosong sehingga tidak dapat diklasifikasi.',
    };
  }

  const apiUrl = (process.env.EXPO_PUBLIC_AI_API_URL ?? '').trim();

  if (apiUrl.length === 0) {
    return classifyWithMock(trimmed);
  }

  return classifyWithApi(apiUrl, trimmed);
}


