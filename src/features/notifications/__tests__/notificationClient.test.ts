import assert from 'node:assert/strict';
import test from 'node:test';

import { connectNotificationLifecycle } from '../notificationLifecycle';
import { getNotificationPermission } from '../services/notificationPermissionService';
import { createInstallationKeyProvider, createNotificationTokenService } from '../services/notificationTokenService';
import type { NotificationPayload } from '../types';

test('P3-T05 logout blocks foreground registration until the Auth transition completes', async () => {
  let uid: string | null = 'old';
  const pending = Promise.withResolvers<void>();
  let starts = 0;
  const service = createNotificationTokenService({
    platform: 'android', getCurrentUid: () => uid,
    installation: { nextOperation: async () => ({ installationKey: 'device', revision: 1 }) },
    getPermission: async () => { starts++; return { canReceive: true, message: null }; },
    getDevicePushTokenAsync: async () => ({ type: 'android', data: 'token' }),
    addPushTokenListener: () => ({ remove() {} }), upsertToken: async () => {},
    revokeToken: () => pending.promise,
  });
  const logout = service.revokeBeforeLogout('old');
  service.start('old', false, () => {});
  pending.resolve();
  assert.equal((await logout).ok, true);
  service.start('old', false, () => {});
  assert.equal(starts, 0);
  uid = null;
  service.finishLogout('old');
  uid = 'new';
  const stop = service.start('new', false, () => {});
  assert.equal(starts, 1);
  stop();
});

test('P3-T01/T02 permission menyiapkan channel, meminta akses bila perlu, dan menampilkan fallback', async () => {
  const calls: string[] = [];
  const permission = {
    prepareChannel: async () => { calls.push('channel'); },
    getPermissionsAsync: async () => ({ status: 'undetermined' as const, canAskAgain: true }),
    requestPermissionsAsync: async () => { calls.push('prompt'); return { status: 'granted' as const, canAskAgain: true }; },
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
  };
  assert.equal((await getNotificationPermission(permission, true)).canReceive, true);
  assert.deepEqual(calls, ['channel', 'prompt']);

  const denied = await getNotificationPermission({ ...permission,
    getPermissionsAsync: async () => ({ status: 'denied', canAskAgain: false }),
  }, true);
  assert.equal(denied.status, 'denied');
  assert.equal(denied.canReceive, false);
  assert.match(denied.message ?? '', /pengaturan perangkat/);
  assert.deepEqual(calls, ['channel', 'prompt', 'channel']);
});

test('P3-T04/T05 rotasi menang terhadap pembacaan token awal dan logout menunggu pelepasan binding', async () => {
  const key = 'installation';
  let stored: string | null = null;
  let uid = 'p1';
  let listener: ((value: { type: string; data: unknown }) => void) | undefined;
  let latest: string | null = null;
  let subscriptionRemoved = 0;
  const registration = Promise.withResolvers<void>();
  const initialToken = Promise.withResolvers<{ type: string; data: unknown }>();
  const listenerReady = Promise.withResolvers<void>();
  const installation = createInstallationKeyProvider({
    getItem: async () => stored,
    setItem: async (_, value) => { stored = value; },
  }, () => key);
  const service = createNotificationTokenService({
    platform: 'android', getCurrentUid: () => uid, installation,
    getPermission: async () => ({ canReceive: true, message: null }),
    getDevicePushTokenAsync: () => initialToken.promise,
    addPushTokenListener(callback) {
      listener = callback;
      listenerReady.resolve();
      return { remove() { subscriptionRemoved += 1; } };
    },
    async upsertToken(input) {
      assert.equal(input.installationKey, key);
      assert.equal(input.expectedUid, uid);
      latest = input.token;
    },
    async revokeToken(input) {
      assert.deepEqual(input, { installationKey: key, expectedUid: 'p1', revision: 2 });
      latest = null;
    },
  });
  service.start(uid, false, (result) => {
    assert.ok(result.ok);
    if (result.data.state === 'registered') registration.resolve();
  });
  await listenerReady.promise;
  assert.ok(listener);
  listener({ type: 'android', data: 'rotation' });
  initialToken.resolve({ type: 'android', data: 'old' });
  await registration.promise;
  assert.equal(latest, 'rotation');
  assert.deepEqual(await service.revokeBeforeLogout(uid), { ok: true, data: undefined });
  assert.equal(subscriptionRemoved, 1);
  assert.equal(latest, null);

  uid = 'p2';
  const nextRegistration = Promise.withResolvers<void>();
  const stop = service.start(uid, false, (result) => {
    if (result.ok && result.data.state === 'registered') nextRegistration.resolve();
  });
  await nextRegistration.promise;
  assert.equal(latest, 'old');
  stop();
});

type LifecycleApi = Parameters<typeof connectNotificationLifecycle>[0];
type ResponseListener = Parameters<LifecycleApi['addNotificationResponseReceivedListener']>[0];

function response(payload: NotificationPayload): Parameters<ResponseListener>[0] {
  return { actionIdentifier: 'default', notification: { request: { content: { data: payload } } } };
}

test('P3-T13 keeps the tap until navigation succeeds', () => {
  let cleared = 0;
  let attempts = 0;
  const lifecycle = connectNotificationLifecycle({
    DEFAULT_ACTION_IDENTIFIER: 'default', setNotificationHandler() {},
    addNotificationResponseReceivedListener: () => ({ remove() {} }),
    getLastNotificationResponse: () => response({
      eventId: 'tap', eventType: 'SESSION_OPENED', recipientUid: 'p1', relatedDocumentId: 's1',
    }),
    clearLastNotificationResponse() { cleared++; },
  }, () => ({ viewer: { uid: 'p1', role: 'PRAKTIKAN' }, authLoading: false, navigationReady: true }), () => {
    if (++attempts === 1) throw new Error('Navigator is remounting');
  });
  assert.equal(cleared, 0);
  lifecycle.flush();
  assert.equal(attempts, 2);
  assert.equal(cleared, 1);
  lifecycle.disconnect();
});

test('P3-T11/T12/T13 handler menyaring akun, menunggu auth dan membuka tujuan dari cold start sekali', async () => {
  const payload: NotificationPayload = { eventId: 'd1', eventType: 'PERMISSION_APPROVED', recipientUid: 'p1', relatedDocumentId: 'sesi1_p1' };
  let current: ReturnType<Parameters<typeof connectNotificationLifecycle>[1]> = {
    viewer: null, authLoading: true, navigationReady: false,
  };
  let cleared = 0;
  let handler: Parameters<LifecycleApi['setNotificationHandler']>[0] = null;
  let listener: ResponseListener | undefined;
  let removed = false;
  const navigation: unknown[] = [];
  const lifecycle = connectNotificationLifecycle({
    DEFAULT_ACTION_IDENTIFIER: 'default',
    setNotificationHandler(value) { handler = value; },
    addNotificationResponseReceivedListener(value) { listener = value; return { remove() { removed = true; } }; },
    getLastNotificationResponse: () => response(payload),
    clearLastNotificationResponse() { cleared += 1; },
  }, () => current, (href) => navigation.push(href));
  assert.equal(navigation.length, 0);

  current = { viewer: { uid: 'p1', role: 'PRAKTIKAN' }, authLoading: false, navigationReady: true };
  lifecycle.flush();
  assert.deepEqual(navigation, [{ pathname: '/', params: { izinId: 'sesi1_p1', notificationEventId: 'd1', notificationUid: 'p1' } }]);
  assert.ok(listener);
  listener(response(payload));
  assert.equal(navigation.length, 1);
  assert.equal(cleared, 2);

  const foreground = handler as Parameters<LifecycleApi['setNotificationHandler']>[0];
  assert.ok(foreground);
  assert.equal((await foreground.handleNotification(response(payload).notification)).shouldShowBanner, true);
  assert.equal((await foreground.handleNotification(response({ ...payload, recipientUid: 'p2' }).notification)).shouldShowBanner, false);
  listener(response({ ...payload, eventId: 'd2', eventType: 'SCHEDULE_CHANGED', relatedDocumentId: 'sesi2' }));
  assert.deepEqual(navigation[1], { pathname: '/', params: { sesiId: 'sesi2', notificationEventId: 'd2', notificationUid: 'p1' } });
  listener(response({ ...payload, eventId: 'd3', relatedDocumentId: 'other/path' }));
  assert.equal(navigation.length, 2);
  lifecycle.disconnect();
  assert.equal(removed, true);
  assert.equal(handler, null);
});
