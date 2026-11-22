import { hashIdentifier } from './hash';
import type { NotificationPayload, Timestamp } from './types';

export type DeliveryStatus = 'READY' | 'SENDING' | 'RETRY' | 'SENT' | 'FAILED' | 'SKIPPED';
export type Delivery = {
  status: DeliveryStatus;
  attempts: number;
  nextCheckAt: number;
  bindingVersion: string;
};

export type NotificationEvent = NotificationPayload & {
  id: string;
  sourceDocumentPath: string;
  createdAt: Timestamp;
  payload: NotificationPayload;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
  deliveries: Record<string, Delivery>;
};

export type SendOutcome = 'SENT' | 'INVALID_TOKEN' | 'RETRY' | 'FAILED';

const MAX_ATTEMPTS = 5;
const FIRST_RETRY_MS = 60_000;
const SEND_CHECK_MS = 5 * 60_000;

export function eventIdFor(sourceEventId: string, sourcePath: string, eventType: string, uid: string): string {
  return hashIdentifier(sourceEventId, sourcePath, eventType, uid);
}

export function deliveryState(delivery: Delivery, now: number): 'send' | 'wait' | 'finish' | 'done' {
  if (delivery.status === 'SENDING') return delivery.nextCheckAt > now ? 'wait' : 'finish';
  if (delivery.status === 'READY' || delivery.status === 'RETRY') return delivery.nextCheckAt > now ? 'wait' : 'send';
  return 'done';
}

export function claimDelivery(delivery: Delivery, now: number): Delivery {
  return { ...delivery, status: 'SENDING', attempts: delivery.attempts + 1, nextCheckAt: now + SEND_CHECK_MS };
}

export function finishDelivery(delivery: Delivery, outcome: SendOutcome, now: number): Delivery {
  if (outcome === 'RETRY' && delivery.attempts < MAX_ATTEMPTS) {
    return { ...delivery, status: 'RETRY', nextCheckAt: now + FIRST_RETRY_MS * 2 ** (delivery.attempts - 1) };
  }
  return { ...delivery, status: outcome === 'SENT' ? 'SENT' : 'FAILED', nextCheckAt: 0 };
}

export function summarizeEvent(event: NotificationEvent, tokenId: string, delivery: Delivery): NotificationEvent {
  const deliveries = { ...event.deliveries, [tokenId]: delivery };
  const states = Object.values(deliveries);
  const pending = states.some(item => item.status === 'READY' || item.status === 'RETRY' || item.status === 'SENDING');
  const sent = states.some(item => item.status === 'SENT');
  const failed = states.some(item => item.status === 'FAILED');

  return { ...event, deliveries, status: pending ? 'PENDING' : sent && !failed ? 'SENT' : 'FAILED',
    attempts: states.reduce((total, item) => total + item.attempts, 0) };
}
