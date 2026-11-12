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
    nama: 'Adam Mulya Rasyid',
    nim: '24060124140179',
    kelas: 'A',
    role: 'PRAKTIKAN',
  },
  {
    id: 'prakt-2',
    nama: 'Nawaal Hanif Mumtaz Arriye',
    nim: '24060124120041',
    kelas: 'A',
    role: 'PRAKTIKAN',
  },
  {
    id: 'prakt-3',
    nama: 'Muhammad Fahri',
    nim: '24060124120037',
    kelas: 'B',
    role: 'PRAKTIKAN',
  },
  {
    id: 'prakt-4',
    nama: 'Arga Yura Danendra',
    nim: '24060124149191',
    kelas: 'B',
    role: 'PRAKTIKAN',
  },
  {
    id: 'prakt-5',
    nama: 'Agil Yudis Wibawa',
    nim: '24060124120045',
    kelas: 'C',
    role: 'PRAKTIKAN',
  },
  {
    id: 'prakt-6',
    nama: 'An Al Rivaldi',
    nim: '24060124120030',
    kelas: 'C',
    role: 'PRAKTIKAN',
  },
];

export const initialSessions: PracticumSession[] = [
  {
    id: 'sess-1',
    namaPraktikum: 'Pengembangan Platform Khusus',
    kelas: 'A',
    lab: 'Lab Komputer 1',
    tanggal: '2026-10-25',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    asistenId: 'asst-1',
    status: 'BELUM_DIBUKA',
  },
  {
    id: 'sess-2',
    namaPraktikum: 'Basis Data',
    kelas: 'B',
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
    kelas: 'C',
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
