import { resolveSessionRecipients, type ClassReader } from './recipientResolver';
import type { DocumentChange, NotificationDraft } from './types';

export async function sessionOpened(change: DocumentChange, readClass: ClassReader): Promise<NotificationDraft | null> {
  if (change.before.status === 'DIBUKA' || change.after.status !== 'DIBUKA') return null;

  return {
    sourceEventId: change.sourceEventId,
    eventType: 'SESSION_OPENED',
    sourceDocumentPath: `sesi/${change.documentId}`,
    relatedDocumentId: change.documentId,
    recipientUids: await resolveSessionRecipients(change.after, readClass, false),
  };
}
