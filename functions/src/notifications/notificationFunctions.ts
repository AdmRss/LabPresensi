import type { NotificationStore } from './firestoreNotificationStore';
import { eventIdFor, type SendOutcome } from './idempotency';
import { permissionDecision } from './permissionDecision';
import { scheduleChanged } from './scheduleChanged';
import { sessionOpened } from './sessionOpened';
import { isDocumentId, type DocumentChange, type FirestoreData, type NotificationDraft,
  type NotificationPayload } from './types';

const ANDROID_CHANNEL = 'labpresensi-activities';
const NOTIFICATION_TITLE = 'LabPresensi';
const NOTIFICATION_BODY = 'Buka aplikasi untuk melihat pembaruan praktikum.';
const RETRY_CODES = new Set([
  'messaging/server-unavailable', 'messaging/message-rate-exceeded', 'messaging/device-message-rate-exceeded',
]);
const INVALID_TOKEN_CODES = new Set(['messaging/invalid-registration-token', 'messaging/registration-token-not-registered']);

type Messaging = {
  send(message: { token: string; data: NotificationPayload; notification: { title: string; body: string };
    android: { ttl: number; notification: { channelId: string; tag: string; visibility: 'private' } } }): Promise<string>;
};

type FirestoreEvent = {
  id: string;
  data?: { before: { data(): FirestoreData | undefined }; after: { data(): FirestoreData | undefined } };
};

type CallableRequest = { auth?: { uid: string }; data: unknown };

function getChange(event: FirestoreEvent, documentId: string): DocumentChange | null {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  return before && after && isDocumentId(documentId)
    ? { sourceEventId: event.id, documentId, before, after } : null;
}

function sendOutcome(error: unknown): SendOutcome {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (typeof code === 'string' && INVALID_TOKEN_CODES.has(code)) return 'INVALID_TOKEN';
  if (typeof code === 'string' && RETRY_CODES.has(code)) return 'RETRY';
  return 'FAILED';
}

function bindingOperation(data: unknown, uid: string) {
  if (!data || typeof data !== 'object' || !('expectedUid' in data) || data.expectedUid !== uid
    || !('installationKey' in data) || !('revision' in data)) return null;
  const { installationKey: key, revision } = data;
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1) return null;
  return typeof key === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)
    ? { installationKey: key.toLowerCase(), revision } : null;
}

export function createNotificationFunctions(store: NotificationStore, messaging: Messaging) {
  async function dispatch(draft: NotificationDraft) {
    let needsRetry = false;

    for (const recipientUid of draft.recipientUids) {
      const eventId = eventIdFor(draft.sourceEventId, draft.sourceDocumentPath, draft.eventType, recipientUid);
      const payload: NotificationPayload = {
        eventId, eventType: draft.eventType, recipientUid, relatedDocumentId: draft.relatedDocumentId,
      };

      for (const tokenId of await store.prepareEvent(payload, draft.sourceDocumentPath)) {
        const claim = await store.claim(eventId, tokenId);
        if (claim.state !== 'send') {
          if (claim.state === 'wait') needsRetry = true;
          continue;
        }

        let outcome: SendOutcome = 'SENT';
        try {
          await messaging.send({ token: claim.token.token, data: payload,
            notification: { title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY },
            android: { ttl: 60 * 60_000, notification: { channelId: ANDROID_CHANNEL, tag: eventId, visibility: 'private' } } });
        } catch (error) {
          outcome = sendOutcome(error);
        }

        if (await store.finish(eventId, claim.token, claim.attempt, outcome)) needsRetry = true;
      }
    }

    return needsRetry;
  }

  return {
    async onSessionUpdated(event: FirestoreEvent & { params: { sesiId: string } }) {
      const change = getChange(event, event.params.sesiId);
      if (!change) return;

      const opened = await sessionOpened(change, store.readClass);
      const schedule = await scheduleChanged(change, store.readClass);
      const openedPending = opened && await dispatch(opened);
      const schedulePending = schedule && await dispatch(schedule);
      if (openedPending || schedulePending) throw new Error('Notification delivery is pending.');
    },

    async onPermissionUpdated(event: FirestoreEvent & { params: { izinId: string } }) {
      const change = getChange(event, event.params.izinId);
      const draft = change && permissionDecision(change);
      if (draft && await dispatch(draft)) throw new Error('Notification delivery is pending.');
    },

    async registerNotificationToken(request: CallableRequest) {
      const uid = request.auth?.uid;
      if (!isDocumentId(uid)) return { ok: false as const, code: 'UNAUTHENTICATED' };

      const { data } = request;
      const operation = bindingOperation(data, uid);
      if (!operation || !data || typeof data !== 'object' || !('platform' in data) || data.platform !== 'android'
        || !('token' in data) || typeof data.token !== 'string' || !/^[\x21-\x7E]{1,1024}$/.test(data.token)) {
        return { ok: false as const, code: 'INVALID_ARGUMENT' };
      }

      const result = await store.upsertToken(uid, operation.installationKey, operation.revision, data.token);
      return result === 'REGISTERED' ? { ok: true as const } : { ok: false as const, code: result };
    },

    async revokeNotificationToken(request: CallableRequest) {
      const uid = request.auth?.uid;
      if (!isDocumentId(uid)) return { ok: false as const, code: 'UNAUTHENTICATED' };
      const operation = bindingOperation(request.data, uid);
      if (!operation) return { ok: false as const, code: 'INVALID_ARGUMENT' };

      const revoked = await store.revokeToken(uid, operation.installationKey, operation.revision);
      return revoked ? { ok: true as const } : { ok: false as const, code: 'STALE_OPERATION' };
    },
  };
}
