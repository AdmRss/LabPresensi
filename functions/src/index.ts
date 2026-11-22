import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { createFirestoreNotificationStore } from './notifications/firestoreNotificationStore';
import { createNotificationFunctions } from './notifications/notificationFunctions';

initializeApp();
const region = 'us-central1';
const db = getFirestore();
const handlers = createNotificationFunctions(
  createFirestoreNotificationStore(db, () => Timestamp.now()),
  getMessaging(),
);

export const registerNotificationToken = onCall({ region }, handlers.registerNotificationToken);
export const revokeNotificationToken = onCall({ region }, handlers.revokeNotificationToken);
export const notifySessionUpdated = onDocumentUpdated(
  { document: 'sesi/{sesiId}', region, retry: true }, handlers.onSessionUpdated,
);
export const notifyPermissionUpdated = onDocumentUpdated(
  { document: 'izin/{izinId}', region, retry: true }, handlers.onPermissionUpdated,
);

// Sprint 2 derives scheduled opening from timestamps without writing sesi.status.
export const notifyScheduledSessions = onSchedule({ region, schedule: '* * * * *' }, async () => {
  const now = Date.now();
  const candidates = await db.collection('sesi')
    .where('startAt', '>=', Timestamp.fromMillis(now - 20 * 60_000))
    .where('startAt', '<=', Timestamp.fromMillis(now))
    .get();
  let pending = false;
  for (const candidate of candidates.docs) {
    const session = (await candidate.ref.get()).data();
    if (!session || session.archived || session.status !== 'BELUM_DIBUKA'
      || !(session.startAt instanceof Timestamp) || !(session.endAt instanceof Timestamp)
      || session.startAt.toMillis() > now || session.startAt.toMillis() < now - 20 * 60_000
      || session.endAt.toMillis() <= now) continue;

    try {
      await handlers.onSessionUpdated({
        id: 'scheduled:' + candidate.id + ':' + session.startAt.toMillis(),
        params: { sesiId: candidate.id },
        data: { before: { data: () => session }, after: { data: () => ({ ...session, status: 'DIBUKA' }) } },
      });
    } catch {
      pending = true;
    }
  }
  if (pending) throw new Error('Scheduled session notifications are pending.');
});
