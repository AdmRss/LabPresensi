export type NotificationEventType = 'SESSION_OPENED' | 'SCHEDULE_CHANGED'
  | 'PERMISSION_APPROVED' | 'PERMISSION_REJECTED';

export type FirestoreData = Record<string, unknown>;
export type DocumentChange = {
  sourceEventId: string;
  documentId: string;
  before: FirestoreData;
  after: FirestoreData;
};

export type NotificationDraft = {
  sourceEventId: string;
  eventType: NotificationEventType;
  sourceDocumentPath: string;
  relatedDocumentId: string;
  recipientUids: string[];
};

export type NotificationPayload = {
  eventId: string;
  eventType: NotificationEventType;
  recipientUid: string;
  relatedDocumentId: string;
};

export type Timestamp = { toMillis(): number };

export type NotificationToken = {
  id: string;
  uid: string;
  token: string;
  platform: 'android' | 'ios';
  deviceId: string | null;
  isActive: boolean;
  revision?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastUsedAt: Timestamp;
};

export function isDocumentId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 512
    && !value.includes('/') && value !== '.' && value !== '..';
}
