import type { Sesi } from '@/types';
import { effectiveSessionStatus } from './sessionClock';

export function sessionSections(sessions: Sesi[], now: number) {
  const groups: Record<Sesi['status'], Sesi[]> = { DIBUKA: [], BELUM_DIBUKA: [], DITUTUP: [] };
  for (const session of sessions) {
    groups[effectiveSessionStatus(session, now)].push(session);
  }
  return [
    { key: 'open', title: 'Sedang dibuka', data: groups.DIBUKA },
    { key: 'upcoming', title: 'Belum dibuka', data: groups.BELUM_DIBUKA },
    { key: 'closed', title: 'Sesi ditutup', data: groups.DITUTUP },
  ].filter(section => section.data.length);
}
