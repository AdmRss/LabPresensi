import { hashIdentifier } from './hash';
import { claimDelivery, deliveryState, finishDelivery, summarizeEvent,
  type Delivery, type NotificationEvent, type SendOutcome } from './idempotency';
import type { FirestoreData, NotificationPayload, NotificationToken, Timestamp } from './types';

type Snapshot = { data(): FirestoreData | undefined };
type DocumentRef = { get(): Promise<Snapshot> };
type QuerySnapshot = { docs: Snapshot[] };

type Transaction<Ref, Query> = {
  get(ref: Ref): Promise<Snapshot>;
  get(query: Query): Promise<QuerySnapshot>;
  set(ref: Ref, data: FirestoreData): unknown;
};

type Firestore<Ref, Query> = {
  doc(path: string): Ref;
  collection(path: string): { where(field: string, op: '==', value: string): Query };
  runTransaction<T>(update: (transaction: Transaction<Ref, Query>) => Promise<T>): Promise<T>;
};

type DeliveryClaim = { state: 'wait' | 'done' } | { state: 'send'; token: NotificationToken; attempt: number };

function bindingVersion(token: NotificationToken) {
  return hashIdentifier(token.uid, token.token, String(token.updatedAt.toMillis()));
}

export function createFirestoreNotificationStore<Ref extends DocumentRef, Query>(
  firestore: Firestore<Ref, Query>,
  now: () => Timestamp,
) {
  const tokenRef = (tokenId: string) => firestore.doc(`notificationTokens/${tokenId}`);
  const eventRef = (eventId: string) => firestore.doc(`notificationEvents/${eventId}`);

  async function readClass(kelasId: string) {
    return (await firestore.doc(`kelas/${kelasId}`).get()).data();
  }

  async function freezeAudience(sourceKey: string, eligibleUids: string[]): Promise<string[]> {
    const ref = firestore.doc(`notificationEvents/${sourceKey}/audience/initial`);
    const initial = await firestore.runTransaction(async (transaction) => {
      const existing = (await transaction.get(ref)).data();
      if (Array.isArray(existing?.uids)) return existing.uids as string[];
      transaction.set(ref, { uids: eligibleUids, createdAt: now() });
      return eligibleUids;
    });

    const eligible = new Set(eligibleUids);
    return initial.filter((uid) => eligible.has(uid));
  }

  async function upsertToken(uid: string, installationKey: string, revision: number, token: string) {
    const id = hashIdentifier(installationKey);
    const ref = tokenRef(id);
    const matchingTokens = firestore.collection('notificationTokens').where('token', '==', token);

    return firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      const previous = current.data() as NotificationToken | undefined;
      const sameBinding = previous?.uid === uid && previous.token === token && previous.isActive;
      if (revision <= (previous?.revision ?? 0)) {
        return revision === previous?.revision && sameBinding ? 'REGISTERED' : 'STALE_OPERATION';
      }

      const matches = await transaction.get(matchingTokens);
      const occupied = matches.docs.some((snapshot) => {
        const data = snapshot.data();
        return data && data.id !== id;
      });
      if (occupied) return 'TOKEN_ALREADY_BOUND';

      const timestamp = now();
      const next: NotificationToken = { id, uid, token, revision, platform: 'android', deviceId: id, isActive: true,
        createdAt: previous?.createdAt ?? timestamp, updatedAt: sameBinding ? previous.updatedAt : timestamp,
        lastUsedAt: timestamp };
      transaction.set(ref, next);
      return 'REGISTERED';
    });
  }

  async function revokeToken(uid: string, installationKey: string, revision: number): Promise<boolean> {
    const id = hashIdentifier(installationKey);
    const ref = tokenRef(id);

    return firestore.runTransaction(async (transaction) => {
      const current = (await transaction.get(ref)).data() as NotificationToken | undefined;
      if (current && current.uid !== uid) return true;
      if (current && revision <= (current.revision ?? 0)) return !current.isActive;

      const timestamp = now();
      const next: NotificationToken = { id, uid, revision, deviceId: id, platform: 'android', isActive: false,
        token: current?.token ?? '', createdAt: current?.createdAt ?? timestamp, updatedAt: timestamp,
        lastUsedAt: current?.lastUsedAt ?? timestamp };
      transaction.set(ref, next);
      return true;
    });
  }

  async function prepareEvent(payload: NotificationPayload, sourceDocumentPath: string): Promise<string[]> {
    const ref = eventRef(payload.eventId);
    const records = firestore.collection('notificationTokens').where('uid', '==', payload.recipientUid);

    return firestore.runTransaction(async (transaction) => {
      const existing = (await transaction.get(ref)).data() as NotificationEvent | undefined;
      if (existing) return Object.keys(existing.deliveries);

      const tokens = (await transaction.get(records)).docs.flatMap((snapshot) => {
        const data = snapshot.data() as NotificationToken | undefined;
        return data?.isActive && data.platform === 'android' ? [data] : [];
      });
      const deliveries: Record<string, Delivery> = Object.fromEntries(tokens.map((token) => [token.id, {
        status: 'READY', attempts: 0, nextCheckAt: 0, bindingVersion: bindingVersion(token),
      }]));
      const event: NotificationEvent = { ...payload, id: payload.eventId, sourceDocumentPath, payload,
        createdAt: now(), status: tokens.length ? 'PENDING' : 'FAILED', attempts: 0, deliveries };
      transaction.set(ref, event);
      return Object.keys(deliveries);
    });
  }

  async function claim(eventId: string, tokenId: string): Promise<DeliveryClaim> {
    const ref = eventRef(eventId);

    return firestore.runTransaction(async (transaction): Promise<DeliveryClaim> => {
      const event = (await transaction.get(ref)).data() as NotificationEvent | undefined;
      const delivery = event?.deliveries[tokenId];
      if (!event || !delivery) return { state: 'done' };

      const timestamp = now().toMillis();
      const state = deliveryState(delivery, timestamp);
      if (state === 'wait' || state === 'done') return { state };
      if (state === 'finish') {
        transaction.set(ref, summarizeEvent(event, tokenId, finishDelivery(delivery, 'FAILED', timestamp)));
        return { state: 'done' };
      }

      const token = (await transaction.get(tokenRef(tokenId))).data() as NotificationToken | undefined;
      if (!token?.isActive || token.uid !== event.recipientUid || bindingVersion(token) !== delivery.bindingVersion) {
        transaction.set(ref, summarizeEvent(event, tokenId, { ...delivery, status: 'SKIPPED' }));
        return { state: 'done' };
      }

      const claimed = claimDelivery(delivery, timestamp);
      transaction.set(ref, summarizeEvent(event, tokenId, claimed));
      return { state: 'send', token, attempt: claimed.attempts };
    });
  }

  async function finish(eventId: string, token: NotificationToken, attempt: number, outcome: SendOutcome): Promise<boolean> {
    const ref = eventRef(eventId);

    return firestore.runTransaction(async (transaction) => {
      const event = (await transaction.get(ref)).data() as NotificationEvent | undefined;
      const delivery = event?.deliveries[token.id];
      if (!event || delivery?.status !== 'SENDING' || delivery.attempts !== attempt) return false;

      const timestamp = now();
      if (outcome === 'INVALID_TOKEN') {
        const ref = tokenRef(token.id);
        const current = (await transaction.get(ref)).data() as NotificationToken | undefined;
        if (current?.isActive && bindingVersion(current) === delivery.bindingVersion) {
          transaction.set(ref, { ...current, isActive: false, updatedAt: timestamp });
        }
      }

      const next = finishDelivery(delivery, outcome, timestamp.toMillis());
      transaction.set(ref, summarizeEvent(event, token.id, next));
      return next.status === 'RETRY';
    });
  }

  return { readClass, freezeAudience, upsertToken, revokeToken, prepareEvent, claim, finish };
}

export type NotificationStore = ReturnType<typeof createFirestoreNotificationStore>;
