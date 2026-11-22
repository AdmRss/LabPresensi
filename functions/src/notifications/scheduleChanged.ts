import { resolveSessionRecipients, type ClassReader } from './recipientResolver';
import type { DocumentChange, FirestoreData, NotificationDraft } from './types';

function scheduledInstant(data: FirestoreData, timestampField: string, clockField: string): number | null {
  const stamp = data[timestampField];
  if (stamp && typeof stamp === 'object' && 'toMillis' in stamp && typeof stamp.toMillis === 'function') {
    const milliseconds: unknown = stamp.toMillis();
    if (typeof milliseconds === 'number' && Number.isFinite(milliseconds)) return milliseconds;
  }

  const { tanggal } = data;
  const clock = data[clockField];
  if (typeof tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)
    || typeof clock !== 'string' || !/^\d{2}:\d{2}$/.test(clock)) return null;

  const milliseconds = Date.parse(`${tanggal}T${clock}:00+07:00`);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

export async function scheduleChanged(change: DocumentChange, readClass: ClassReader): Promise<NotificationDraft | null> {
  const { before, after } = change;
  const timeChanged = scheduledInstant(before, 'startAt', 'jamMulai') !== scheduledInstant(after, 'startAt', 'jamMulai')
    || scheduledInstant(before, 'endAt', 'jamSelesai') !== scheduledInstant(after, 'endAt', 'jamSelesai');
  if (!timeChanged) return null;

  return {
    sourceEventId: change.sourceEventId,
    eventType: 'SCHEDULE_CHANGED',
    sourceDocumentPath: `sesi/${change.documentId}`,
    relatedDocumentId: change.documentId,
    recipientUids: await resolveSessionRecipients(after, readClass, true),
  };
}
