export type Role = 'ASISTEN' | 'PRAKTIKAN';

export type Assistant = {
  id: string;
  nama: string;
  email: string;
  role: 'ASISTEN';
};

export type Praktikan = {
  id: string;
  nama: string;
  nim: string;
  kelas: string;
  role: 'PRAKTIKAN';
};

export type ActiveUser = Assistant | Praktikan;

export type SessionStatus = 'BELUM_DIBUKA' | 'DIBUKA' | 'DITUTUP';

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
  | 'ROLE_SELECT'
  | 'SCHEDULE'
  | 'SESSION_DETAIL'
  | 'RECAP'
  | 'MY_ATTENDANCE';

export type SessionActionResult =
  | { ok: true }
  | { ok: false; code?: string; message?: string };

export type CheckInResult =
  | { ok: true; record: AttendanceRecord }
  | { ok: false; code: string; message?: string };
