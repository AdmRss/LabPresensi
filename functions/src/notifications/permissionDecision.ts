import { isDocumentId, type DocumentChange, type NotificationDraft } from './types';

export function permissionDecision(change: DocumentChange): NotificationDraft | null {
  const { before, after } = change;
  const recipientUid = after.praktikanUid;
  if (before.status !== 'MENUNGGU' || before.praktikanUid !== recipientUid || !isDocumentId(recipientUid)
    || (after.status !== 'DITERIMA' && after.status !== 'DITOLAK')) return null;

  return {
    sourceEventId: change.sourceEventId,
    eventType: after.status === 'DITERIMA' ? 'PERMISSION_APPROVED' : 'PERMISSION_REJECTED',
    sourceDocumentPath: `izin/${change.documentId}`,
    relatedDocumentId: change.documentId,
    recipientUids: [recipientUid],
  };
}
