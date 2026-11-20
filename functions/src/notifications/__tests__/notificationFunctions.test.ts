import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { createFirestoreNotificationStore } from '../firestoreNotificationStore';
import { createNotificationFunctions } from '../notificationFunctions';
import type { FirestoreData } from '../types';

function createHarness(send: (token: string) => Promise<void> = async () => {}) {
  const documents = new Map<string, FirestoreData>([
    ['kelas/k1', { pesertaUids: ['p1', 'p2', 'p1'], asistenId: 'asisten' }],
  ]);
  let currentTime = 1_800_000_000_000;
  const snapshot = (data: FirestoreData | undefined) => ({ data: () => data });
  type Ref = { path: string; get(): Promise<ReturnType<typeof snapshot>> };
  type Query = { collection: string; field: string; value: string };
  type MemoryTransaction = {
    get(ref: Ref): ReturnType<Ref['get']>;
    get(query: Query): Promise<{ docs: ReturnType<typeof snapshot>[] }>;
    set(ref: Ref, data: FirestoreData): unknown;
  };
  const firestore = {
    doc: (path: string): Ref => ({ path, get: async () => snapshot(documents.get(path)) }),
    collection: (collection: string) => ({ where: (field: string, _operator: '==', value: string): Query => ({ collection, field, value }) }),
    runTransaction<T>(action: (transaction: MemoryTransaction) => Promise<T>): Promise<T> {
      const result = queue.then(() => action(transaction));
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };
  let queue = Promise.resolve();
  function get(ref: Ref): ReturnType<Ref['get']>;
  function get(query: Query): Promise<{ docs: ReturnType<typeof snapshot>[] }>;
  async function get(target: Ref | Query) {
    if ('path' in target) return target.get();
    const docs = [...documents].filter(([key, data]) => key.startsWith(`${target.collection}/`) && data[target.field] === target.value);
    return { docs: docs.map(([, data]) => snapshot(data)) };
  }
  const transaction = { get, set: (ref: Ref, data: FirestoreData) => documents.set(ref.path, data) };
  const store = createFirestoreNotificationStore(firestore, () => {
    const millis = currentTime;
    return { toMillis: () => millis };
  });
  const sent: { token: string; eventType: string; uid: string; id: string }[] = [];
  const handlers = createNotificationFunctions(store, {
    async send(message) {
      await send(message.token);
      const { eventType, recipientUid, relatedDocumentId } = message.data;
      sent.push({ token: message.token, eventType, uid: recipientUid, id: relatedDocumentId });
      return 'accepted';
    },
  });

  const revisions = new Map<string, number>();
  const nextRevision = (key: string) => {
    const revision = (revisions.get(key) ?? 0) + 1;
    revisions.set(key, revision);
    return revision;
  };
  const enroll = (uid: string, token: string, key = randomUUID(), revision = nextRevision(key)) => handlers.registerNotificationToken({
    auth: { uid }, data: { expectedUid: uid, installationKey: key, revision, platform: 'android', token },
  });
  const revoke = (uid: string, key: string) => handlers.revokeNotificationToken({
    auth: { uid }, data: { expectedUid: uid, installationKey: key, revision: nextRevision(key) },
  });
  const allRecords = (collection: string) => [...documents].filter(([path]) => path.startsWith(`${collection}/`))
    .map(([, document]) => document);
  const change = (id: string, before: FirestoreData, after: FirestoreData) => ({ id, data: { before: snapshot(before), after: snapshot(after) } });

  return { handlers, enroll, revoke, sent, allRecords, change, advance: (ms: number) => { currentTime += ms; } };
}

const session = { kelasId: 'k1', asistenId: 'asisten', tanggal: '2026-11-20', jamMulai: '09:00', jamSelesai: '11:00', status: 'BELUM_DIBUKA' };

test('P3-T03/T04/T05 binding mengikuti Auth UID, rotasi, logout, dan perpindahan akun', async () => {
  const { handlers, enroll, revoke, allRecords, advance } = createHarness();
  const key = randomUUID();
  const otherKey = randomUUID();
  assert.deepEqual(await handlers.registerNotificationToken({ data: {} }), { ok: false, code: 'UNAUTHENTICATED' });
  assert.deepEqual(await handlers.registerNotificationToken({
    auth: { uid: 'p2' }, data: { expectedUid: 'p1', installationKey: key, revision: 1, platform: 'android', token: 'original' },
  }), { ok: false, code: 'INVALID_ARGUMENT' });
  assert.deepEqual(await enroll('p1', 'original', key), { ok: true });
  assert.deepEqual(await enroll('p2', 'original', otherKey), { ok: false, code: 'TOKEN_ALREADY_BOUND' });
  advance(1);
  assert.deepEqual(await enroll('p1', 'rotated', key), { ok: true });
  let [record] = allRecords('notificationTokens');
  assert.equal(record.uid, 'p1');
  assert.equal(record.token, 'rotated');
  assert.notEqual(record.deviceId, key);
  assert.equal(allRecords('notificationTokens').length, 1);

  await revoke('p2', key);
  [record] = allRecords('notificationTokens');
  assert.equal(record.isActive, true);
  await revoke('p1', key);
  [record] = allRecords('notificationTokens');
  assert.equal(record.isActive, false);
  assert.deepEqual(await enroll('p1', 'rotated', key, 2), { ok: false, code: 'STALE_OPERATION' });
  assert.deepEqual(await enroll('p2', 'rotated', otherKey), { ok: false, code: 'TOKEN_ALREADY_BOUND' });
  assert.deepEqual(await enroll('p2', 'rotated', key), { ok: true });
  [record] = allRecords('notificationTokens');
  assert.equal(record.uid, 'p2');
  assert.equal(record.isActive, true);
});

test('P3-T05 pelepasan sebelum request registrasi terlambat menyimpan revocation', async () => {
  const { handlers, enroll, allRecords } = createHarness();
  const installationKey = randomUUID();
  await handlers.revokeNotificationToken({ auth: { uid: 'p1' }, data: { expectedUid: 'p1', installationKey, revision: 2 } });
  assert.deepEqual(await enroll('p1', 'late-registration', installationKey, 1), { ok: false, code: 'STALE_OPERATION' });
  assert.equal(allRecords('notificationTokens')[0].isActive, false);
});

test('P3-T06 sesi dibuka hanya menarget peserta dan mengabaikan update status yang sama', async () => {
  const { handlers, enroll, sent, change } = createHarness();
  for (const uid of ['p1', 'p2', 'asisten', 'outsider']) await enroll(uid, uid);
  const opened = { ...session, status: 'DIBUKA' };
  await handlers.onSessionUpdated({ ...change('open', session, opened), params: { sesiId: 'sesi1' } });
  await handlers.onSessionUpdated({ ...change('noop', opened, { ...opened, openedAt: 'later' }), params: { sesiId: 'sesi1' } });
  assert.deepEqual(sent, [
    { token: 'p1', eventType: 'SESSION_OPENED', uid: 'p1', id: 'sesi1' },
    { token: 'p2', eventType: 'SESSION_OPENED', uid: 'p2', id: 'sesi1' },
  ]);
});

test('P3-T07 perubahan jadwal WIB menarget peserta dan asisten, migrasi waktu yang setara diabaikan', async () => {
  const { handlers, enroll, sent, change } = createHarness();
  for (const uid of ['p1', 'p2', 'asisten', 'outsider']) await enroll(uid, uid);
  const startAt = { toMillis: () => Date.parse('2026-11-20T09:00:00+07:00') };
  const endAt = { toMillis: () => Date.parse('2026-11-20T11:00:00+07:00') };
  await handlers.onSessionUpdated({ ...change('migrate', session, { ...session, startAt, endAt }), params: { sesiId: 'sesi1' } });
  assert.equal(sent.length, 0);
  await handlers.onSessionUpdated({ ...change('change', session, { ...session, jamMulai: '10:00' }), params: { sesiId: 'sesi1' } });
  assert.deepEqual(sent.map(({ eventType, uid }) => [eventType, uid]), [
    ['SCHEDULE_CHANGED', 'p1'], ['SCHEDULE_CHANGED', 'p2'], ['SCHEDULE_CHANGED', 'asisten'],
  ]);
});

test('P3-T08/T09 kedua keputusan izin dikirim hanya ke pengaju', async () => {
  const { handlers, enroll, sent, change } = createHarness();
  await enroll('p1', 'requester');
  await enroll('p2', 'other');
  const before = { status: 'MENUNGGU', praktikanUid: 'p1', alasan: 'informasi privat' };
  await handlers.onPermissionUpdated({ ...change('approve', before, { ...before, status: 'DITERIMA' }), params: { izinId: 'sesi1_p1' } });
  await handlers.onPermissionUpdated({ ...change('reject', before, { ...before, status: 'DITOLAK' }), params: { izinId: 'sesi2_p1' } });
  await handlers.onPermissionUpdated({ ...change('spoof', before, { ...before, status: 'DITOLAK', praktikanUid: 'p2' }), params: { izinId: 'sesi3_p1' } });
  assert.deepEqual(sent, [
    { token: 'requester', eventType: 'PERMISSION_APPROVED', uid: 'p1', id: 'sesi1_p1' },
    { token: 'requester', eventType: 'PERMISSION_REJECTED', uid: 'p1', id: 'sesi2_p1' },
  ]);
});

test('P3-T10 replay bersamaan dan retry parsial hanya mengulang device yang gagal sementara', async () => {
  const attempts: string[] = [];
  const { handlers, enroll, sent, change, advance, allRecords } = createHarness(async (token) => {
    if (token === 'retry' && !attempts.includes(token)) {
      attempts.push(token);
      throw { code: 'messaging/server-unavailable' };
    }
    attempts.push(token);
  });
  await enroll('p1', 'success');
  await enroll('p1', 'retry');
  const event = { ...change('open', session, { ...session, status: 'DIBUKA' }), params: { sesiId: 'sesi1' } };
  const firstResults = await Promise.allSettled([handlers.onSessionUpdated(event), handlers.onSessionUpdated(event)]);
  assert.ok(firstResults.some(result => result.status === 'rejected'));
  assert.deepEqual(attempts, ['success', 'retry']);
  advance(60_000);
  await handlers.onSessionUpdated(event);
  await handlers.onSessionUpdated(event);
  assert.deepEqual(attempts, ['success', 'retry', 'retry']);
  assert.deepEqual(sent.map(item => item.token), ['success', 'retry']);
  assert.equal(allRecords('notificationEvents').find(item => item.recipientUid === 'p1')?.status, 'SENT');
});

test('P3-T10 hasil FCM ambigu tidak menghasilkan pengiriman kedua', async () => {
  let attempts = 0;
  const { handlers, enroll, change, allRecords } = createHarness(async () => {
    attempts += 1;
    throw { code: 'app/network-error' };
  });
  await enroll('p1', 'ambiguous');
  const event = { ...change('open', session, { ...session, status: 'DIBUKA' }), params: { sesiId: 'sesi1' } };
  await handlers.onSessionUpdated(event);
  await handlers.onSessionUpdated(event);
  assert.equal(attempts, 1);
  assert.equal(allRecords('notificationEvents').find(item => item.recipientUid === 'p1')?.status, 'FAILED');
});

test('P3-T10 klaim yang sudah lama tidak dipakai untuk mengirim kedua kali', async () => {
  const started = Promise.withResolvers<void>();
  const response = Promise.withResolvers<void>();
  let attempts = 0;
  const { handlers, enroll, change, advance, allRecords } = createHarness(async () => {
    attempts += 1;
    started.resolve();
    await response.promise;
  });
  await enroll('p1', 'late-response');
  const event = { ...change('open', session, { ...session, status: 'DIBUKA' }), params: { sesiId: 'sesi1' } };
  const original = handlers.onSessionUpdated(event);
  await started.promise;
  advance(5 * 60_000 + 1);
  await handlers.onSessionUpdated(event);
  response.resolve();
  await original;
  assert.equal(attempts, 1);
  assert.equal(allRecords('notificationEvents').find(item => item.recipientUid === 'p1')?.status, 'FAILED');
});

test('P3-T14 token invalid dinonaktifkan dan event lain tidak mencoba token itu lagi', async () => {
  let attempts = 0;
  const { handlers, enroll, change, allRecords } = createHarness(async () => {
    attempts += 1;
    throw { code: 'messaging/registration-token-not-registered' };
  });
  await enroll('p1', 'invalid');
  const opened = { ...session, status: 'DIBUKA' };
  await handlers.onSessionUpdated({ ...change('open1', session, opened), params: { sesiId: 'sesi1' } });
  await handlers.onSessionUpdated({ ...change('open2', session, opened), params: { sesiId: 'sesi2' } });
  assert.equal(attempts, 1);
  assert.equal(allRecords('notificationTokens')[0].isActive, false);
});

test('P3-T14 respons invalid yang terlambat tidak menonaktifkan token hasil rotasi', async () => {
  const started = Promise.withResolvers<void>();
  const staleResponse = Promise.withResolvers<void>();
  const { handlers, enroll, change, allRecords, sent } = createHarness(async (token) => {
    if (token === 'old') {
      started.resolve();
      await staleResponse.promise;
      throw { code: 'messaging/registration-token-not-registered' };
    }
  });
  const key = randomUUID();
  await enroll('p1', 'old', key);
  const opened = { ...session, status: 'DIBUKA' };
  const oldDelivery = handlers.onSessionUpdated({ ...change('open1', session, opened), params: { sesiId: 'sesi1' } });
  await started.promise;
  await enroll('p1', 'new', key);
  staleResponse.resolve();
  await oldDelivery;
  await handlers.onSessionUpdated({ ...change('open2', session, opened), params: { sesiId: 'sesi2' } });
  assert.equal(allRecords('notificationTokens')[0].isActive, true);
  assert.deepEqual(sent.map(item => item.token), ['new']);
});
