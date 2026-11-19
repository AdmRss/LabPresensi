import { Stamp } from '@/components/Interface';
import type { IzinStatus, SessionStatus } from '@/types';

export type { SessionStatus } from '@/types';

export type StatusBadgeProps = { status: SessionStatus };

const sessions = {
  BELUM_DIBUKA: { label: 'Belum dibuka', tone: 'warning' },
  DIBUKA: { label: 'Dibuka', tone: 'success' },
  DITUTUP: { label: 'Ditutup', tone: 'neutral' },
} as const;

const permits = {
  MENUNGGU: { label: 'Menunggu', tone: 'warning' },
  DITERIMA: { label: 'Diterima', tone: 'success' },
  DITOLAK: { label: 'Ditolak', tone: 'danger' },
} as const;

export function getSessionStatusLabel(status: SessionStatus) {
  return sessions[status].label;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Stamp {...sessions[status]} />;
}

export function PermitBadge({ status }: { status: IzinStatus }) {
  return <Stamp {...permits[status]} />;
}
