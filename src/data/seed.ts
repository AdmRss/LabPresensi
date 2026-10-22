import type { Assistant, Praktikan, PracticumSession, AttendanceRecord } from '@/types';

export const initialAssistants: Assistant[] = [
  {
    id: 'asst-1',
    nama: 'Imam Alfarezel',
    email: 'imam@lab.ac.id',
    role: 'ASISTEN',
  },
  {
    id: 'asst-2',
    nama: 'Ikrar Maheswara',
    email: 'ikrar@lab.ac.id',
    role: 'ASISTEN',
  },
];

export const initialPraktikans: Praktikan[] = [
  {
    id: 'prakt-1',
    nama: 'Andi Pratama',
    nim: '220101001',
    kelas: '3A',
    role: 'PRAKTIKAN',
  },
  {
    id: 'prakt-2',
    nama: 'Siska Lestari',
    nim: '220101002',
    kelas: '3A',
    role: 'PRAKTIKAN',
  },
  {
    id: 'prakt-3',
    nama: 'Rian Hidayat',
    nim: '220102001',
    kelas: '3B',
    role: 'PRAKTIKAN',
  },
  {
    id: 'prakt-4',
    nama: 'Dewi Anggraini',
    nim: '220102002',
    kelas: '3B',
    role: 'PRAKTIKAN',
  },
  {
    id: 'prakt-5',
    nama: 'Joko Anwar',
    nim: '220103001',
    kelas: '4C',
    role: 'PRAKTIKAN',
  },
];

export const initialSessions: PracticumSession[] = [
  {
    id: 'sess-1',
    namaPraktikum: 'Pemrograman Perangkat Bergerak',
    kelas: '3A',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-25',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    asistenId: 'asst-1',
    status: 'BELUM_DIBUKA',
  },
  {
    id: 'sess-2',
    namaPraktikum: 'Struktur Data & Algoritma',
    kelas: '3A',
    lab: 'Lab Komputer 2',
    tanggal: '2026-10-25',
    jamMulai: '10:00',
    jamSelesai: '12:00',
    asistenId: 'asst-1',
    status: 'DIBUKA',
    openedAt: '2026-10-25T09:55:00.000Z',
  },
  {
    id: 'sess-3',
    namaPraktikum: 'Jaringan Komputer',
    kelas: '3B',
    lab: 'Lab Jaringan',
    tanggal: '2026-10-25',
    jamMulai: '13:00',
    jamSelesai: '15:00',
    asistenId: 'asst-2',
    status: 'DITUTUP',
    openedAt: '2026-10-25T12:50:00.000Z',
    closedAt: '2026-10-25T15:02:00.000Z',
  },
];

export const initialAttendance: AttendanceRecord[] = [];
