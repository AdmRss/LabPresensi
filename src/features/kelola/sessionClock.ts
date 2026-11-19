import type { Sesi } from '@/types';
import { parseDate } from './schedule';

const dayInWib = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function todayWib(now = new Date()): Date {
  const parts = dayInWib.formatToParts(now);
  const part = (key: string) => parts.find(value => value.type === key)?.value;
  return parseDate(part('year') + '-' + part('month') + '-' + part('day')) ?? now;
}

export const scheduledTime = (date: string, clock: string) => Date.parse(date + 'T' + clock + ':00+07:00');

export function effectiveSessionStatus(session: Sesi, now = Date.now()): Sesi['status'] {
  if (session.status === 'DITUTUP' || !session.startAt || !session.endAt) return session.status;
  if (now >= session.endAt.toMillis()) return 'DITUTUP';
  return now >= session.startAt.toMillis() ? 'DIBUKA' : 'BELUM_DIBUKA';
}
