import { httpsCallable, type Functions } from 'firebase/functions';

import { getNotificationPermission, type NativePermission } from './services/notificationPermissionService';
import { createInstallationKeyProvider, createNotificationTokenService,
  type DevicePushToken } from './services/notificationTokenService';

type NativeRegistration = {
  AndroidImportance: { DEFAULT: number };
  IosAuthorizationStatus: { PROVISIONAL: number; EPHEMERAL: number };
  getPermissionsAsync(): Promise<NativePermission>;
  requestPermissionsAsync(): Promise<NativePermission>;
  setNotificationChannelAsync(id: string, channel: { name: string; importance: number }): Promise<unknown>;
  getDevicePushTokenAsync(): Promise<DevicePushToken>;
  addPushTokenListener(listener: (token: DevicePushToken) => void): { remove(): void };
};

type CallableResult = { ok: true } | { ok: false; code: string };
const ANDROID_CHANNEL = 'labpresensi-activities';

export function createNotificationClient(options: {
  native: NativeRegistration;
  functions: Functions;
  platform: string;
  currentUid(): string | null;
  storage: Parameters<typeof createInstallationKeyProvider>[0];
  randomUUID: () => string;
}) {
  const { native } = options;
  type BindingRequest = { installationKey: string; expectedUid: string; revision: number };
  const upsert = httpsCallable<BindingRequest & { platform: 'android'; token: string }, CallableResult>(
    options.functions, 'registerNotificationToken',
  );
  const revoke = httpsCallable<BindingRequest, CallableResult>(options.functions, 'revokeNotificationToken');

  return createNotificationTokenService({
    platform: options.platform,
    getCurrentUid: options.currentUid,
    installation: createInstallationKeyProvider(options.storage, options.randomUUID),
    getPermission: (request) => getNotificationPermission({
      getPermissionsAsync: () => native.getPermissionsAsync(),
      requestPermissionsAsync: () => native.requestPermissionsAsync(),
      IosAuthorizationStatus: native.IosAuthorizationStatus,
      async prepareChannel() {
        if (options.platform === 'android') {
          await native.setNotificationChannelAsync(ANDROID_CHANNEL, {
            name: 'Kegiatan praktikum', importance: native.AndroidImportance.DEFAULT,
          });
        }
      },
    }, request),
    getDevicePushTokenAsync: native.getDevicePushTokenAsync,
    addPushTokenListener: native.addPushTokenListener,
    async upsertToken(input) {
      const { data } = await upsert(input);
      if (!data.ok) throw new Error(data.code);
    },
    async revokeToken(input) {
      const { data } = await revoke(input);
      if (!data.ok) throw new Error(data.code);
    },
  });
}
