import type { Href } from 'expo-router';

import type { AppUser } from '@/types';
import type { NotificationEventType, NotificationPayload } from './types';

type Viewer = Pick<AppUser, 'uid' | 'role'>;
const EVENT_TYPES = new Set<NotificationEventType>([
  'SESSION_OPENED', 'SCHEDULE_CHANGED', 'PERMISSION_APPROVED', 'PERMISSION_REJECTED',
]);

function isDocumentId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 512
    && !value.includes('/') && value !== '.' && value !== '..';
}

export function parseNotificationPayload(input: unknown): NotificationPayload | null {
  if (!input || typeof input !== 'object') return null;
  const { eventId, eventType, recipientUid, relatedDocumentId } = input as Partial<NotificationPayload>;
  if (!isDocumentId(eventId) || !eventType || !EVENT_TYPES.has(eventType)
    || !isDocumentId(recipientUid) || !isDocumentId(relatedDocumentId)) return null;

  return { eventId, eventType, recipientUid, relatedDocumentId };
}

export function getNotificationHref(payload: NotificationPayload, viewer: Viewer | null): Href | null {
  if (!viewer || payload.recipientUid !== viewer.uid || viewer.role === 'ADMIN') return null;
  const params = { notificationEventId: payload.eventId, notificationUid: viewer.uid };

  if (payload.eventType === 'PERMISSION_APPROVED' || payload.eventType === 'PERMISSION_REJECTED') {
    return viewer.role === 'PRAKTIKAN'
      ? { pathname: '/', params: { ...params, izinId: payload.relatedDocumentId } }
      : null;
  }
  if (payload.eventType === 'SESSION_OPENED' && viewer.role !== 'PRAKTIKAN') return null;

  return { pathname: '/', params: { ...params, sesiId: payload.relatedDocumentId } };
}
