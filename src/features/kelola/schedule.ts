import type { Sesi } from '@/types';

export type Schedule = Pick<Sesi, 'lab' | 'tanggal' | 'jamMulai' | 'jamSelesai'>;
export type ScheduleSelection = { lab: string; date: Date | null; start: number | null; end: number | null };
const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
const calendarDate = /^(?!0000)\d{4}-\d{2}-\d{2}$/;
const pad = (value: number) => String(value).padStart(2, '0');

export function dateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDate(value: string): Date | null {
  if (!calendarDate.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(2000, 0, 1, 12);
  date.setFullYear(year, month - 1, day);
  return dateKey(date) === value ? date : null;
}

export function timeMinutes(value: string): number | null {
  return clock.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : null;
}

export function formatMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function pickerMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function pickerTime(minutes: number): Date {
  return new Date(2000, 0, 15, Math.floor(minutes / 60), minutes % 60);
}

export function scheduleFromSelection(input: ScheduleSelection): Schedule | string {
  if (!input.date || !Number.isFinite(input.date.getTime()) || !calendarDate.test(dateKey(input.date))) {
    return 'Pilih tanggal sesi yang valid.';
  }
  const { start, end } = input;
  if (start === null || end === null || ![start, end].every(value => Number.isInteger(value) && value >= 0 && value < 1440)) {
    return 'Pilih jam mulai dan jam selesai yang valid.';
  }
  if (start >= end) return 'Jam selesai harus setelah jam mulai.';
  if (!input.lab.trim()) return 'Laboratorium wajib diisi.';
  return { lab: input.lab.trim(), tanggal: dateKey(input.date), jamMulai: formatMinutes(start), jamSelesai: formatMinutes(end) };
}

export function schedulesOverlap(a: Schedule, b: Schedule): boolean {
  const start = timeMinutes(b.jamMulai);
  const end = timeMinutes(b.jamSelesai);
  return start !== null && end !== null && start < end && a.tanggal === b.tanggal
    && a.jamMulai < b.jamSelesai && a.jamSelesai > b.jamMulai;
}

export function validateSchedule(schedule: Schedule): string | null {
  if (typeof schedule.lab !== 'string' || !schedule.lab.trim()) return 'Laboratorium wajib diisi.';
  const date = schedule.tanggal;
  if (typeof date !== 'string' || !calendarDate.test(date)) {
    return 'Gunakan tanggal dengan format YYYY-MM-DD.';
  }
  const day = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
    return 'Tanggal tersebut tidak ada dalam kalender.';
  }
  if (timeMinutes(schedule.jamMulai) === null) return 'Jam mulai harus dalam format HH:mm (00:00–23:59).';
  if (timeMinutes(schedule.jamSelesai) === null) return 'Jam selesai harus dalam format HH:mm (00:00–23:59).';
  if (schedule.jamSelesai <= schedule.jamMulai) return 'Jam selesai harus setelah jam mulai.';
  return null;
}

export const EMPTY_DAY = '0'.repeat(24 * 60);

export function reserveMinutes(minutes: string, start: string, end: string, open: boolean) {
  const from = timeMinutes(start);
  const to = timeMinutes(end);
  if (from === null || to === null || from >= to) return null;
  const segment = minutes.slice(from, to);
  if (segment !== (open ? '0' : '1').repeat(to - from)) return null;
  return minutes.slice(0, from) + (open ? '1' : '0').repeat(to - from) + minutes.slice(to);
}
