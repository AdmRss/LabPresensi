// ============================================================
// SHARED TYPES - SPRINT 2
// Kontrak bersama P1, P2, dan P3.
// Jangan mengubah struktur tanpa persetujuan tim.
// ============================================================

// ------------------------------------------------------------
// ENUMS / STATUS
// ------------------------------------------------------------

export type Role = "ASISTEN" | "PRAKTIKAN";

export type SessionStatus = "BELUM_DIBUKA" | "DIBUKA" | "DITUTUP";

export type IzinStatus = "MENUNGGU" | "DITERIMA" | "DITOLAK";

// ------------------------------------------------------------
// FIRESTORE TYPES - SPRINT 2
// ------------------------------------------------------------

// Collection: users/{uid}
export type AppUser = {
  uid: string;
  nama: string;
  email: string;
  role: Role;
  nim: string | null;
  createdAt: string;
};

// Collection: kelas/{kelasId}
export type Kelas = {
  id: string;
  nama: string;
  praktikum: string;
  asistenId: string;
  pesertaUids: string[];
  createdAt: string;
};

// Collection: sesi/{sesiId}
export type Sesi = {
  id: string;
  kelasId: string;
  kelasNama: string;
  praktikum: string;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  asistenId: string;
  status: SessionStatus;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
};

// Collection: presensi/{sesiId}_{praktikanUid}
export type Presensi = {
  id: string;
  sesiId: string;
  kelasId: string;
  asistenId: string;
  praktikanUid: string;
  nama: string;
  nim: string;
  timestamp: string;
};

// Collection: izin/{sesiId}_{praktikanUid}
export type Izin = {
  id: string;
  sesiId: string;
  kelasId: string;
  asistenId: string;
  praktikanUid: string;
  nama: string;
  nim: string;
  sesiLabel: string;
  alasan: string;
  kategoriAI: string | null;
  status: IzinStatus;
  diputuskanOleh: string | null;
  waktuKeputusan: string | null;
  createdAt: string;
};

// Standard operation result
export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

// ------------------------------------------------------------
// SPRINT 1 LEGACY TYPES
// Dipertahankan sementara agar kode lama tidak rusak.
// Hapus setelah migrasi Sprint 2 selesai.
// ------------------------------------------------------------

export type Assistant = {
  id: string;
  nama: string;
  email: string;
  role: "ASISTEN";
};

export type Praktikan = {
  id: string;
  nama: string;
  nim: string;
  kelas: string;
  role: "PRAKTIKAN";
};

export type ActiveUser = Assistant | Praktikan;

export type PracticumSession = {
  id: string;
  namaPraktikum: string;
  kelas: string;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  asistenId: string;
  status: SessionStatus;
  openedAt?: string;
  closedAt?: string;
};

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  praktikanId: string;
  nama: string;
  nim: string;
  kelas: string;
  timestamp: string;
};

export type ScreenState =
  | "ROLE_SELECT"
  | "SCHEDULE"
  | "SESSION_DETAIL"
  | "RECAP"
  | "MY_ATTENDANCE";

export type SessionActionResult =
  | { ok: true }
  | { ok: false; code?: string; message?: string };

export type CheckInResult =
  | { ok: true; record: AttendanceRecord }
  | { ok: false; code: string; message?: string };
