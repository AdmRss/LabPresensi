// src/types.ts  (PM-owned, FROZEN setelah scaffold)
export type Role = 'ASISTEN' | 'PRAKTIKAN';
export type SessionStatus = 'BELUM_DIBUKA' | 'DIBUKA' | 'DITUTUP';
export type IzinStatus = 'MENUNGGU' | 'DITERIMA' | 'DITOLAK';

// users/{uid}
export type AppUser = {
  uid: string;
  nama: string;
  email: string;
  role: Role;
  nim: string | null; // wajib untuk PRAKTIKAN
  createdAt: string;
};

// kelas/{kelasId}
export type Kelas = {
  id: string;
  nama: string;
  praktikum: string;
  asistenId: string; // uid pembuat/pemilik
  pesertaUids: string[]; // uid praktikan
  createdAt: string;
};

// sesi/{sesiId}   (jadwal + sesi dalam satu dokumen)
export type Sesi = {
  id: string;
  kelasId: string;
  kelasNama: string;
  praktikum: string; // denormalisasi untuk tampilan
  lab: string;
  tanggal: string; // 'YYYY-MM-DD'
  jamMulai: string;
  jamSelesai: string; // 'HH:mm'
  asistenId: string;
  status: SessionStatus;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
};

// presensi/{sesiId}_{praktikanUid}   <- ID deterministik = anti-ganda
export type Presensi = {
  id: string;
  sesiId: string;
  kelasId: string;
  asistenId: string; // salinan dari sesi (wajib, untuk rules & query)
  praktikanUid: string;
  nama: string;
  nim: string;
  timestamp: string;
};

// izin/{sesiId}_{praktikanUid}       <- satu pengajuan per sesi
export type Izin = {
  id: string;
  sesiId: string;
  kelasId: string;
  asistenId: string; // salinan dari sesi
  praktikanUid: string;
  nama: string;
  nim: string;
  sesiLabel: string; // mis. "Basis Data • 2026-11-20"
  alasan: string;
  kategoriAI: string | null;
  status: IzinStatus; // awal: 'MENUNGGU'
  diputuskanOleh: string | null;
  waktuKeputusan: string | null;
  createdAt: string;
};

export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

