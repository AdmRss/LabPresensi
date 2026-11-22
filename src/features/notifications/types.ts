import type { Timestamp } from 'firebase/firestore';

export type NotificationEventType = 'SESSION_OPENED' | 'SCHEDULE_CHANGED'
  | 'PERMISSION_APPROVED' | 'PERMISSION_REJECTED';

export type NotificationPayload = {
  eventId: string;
  eventType: NotificationEventType;
  recipientUid: string;
  relatedDocumentId: string;
};

export type NotificationEvent = NotificationPayload & {
  id: string;
  sourceDocumentPath: string;
  createdAt: Timestamp;
  payload: NotificationPayload;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
};

export type NotificationToken = {
  id: string;
  uid: string;
  token: string;
  platform: 'android' | 'ios';
  deviceId: string | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastUsedAt: Timestamp;
};
