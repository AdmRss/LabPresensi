import type { Result } from '@/types';

export type DevicePushToken = { type: string; data: unknown };
type InstallationOperation = { installationKey: string; revision: number };
type BindingRequest = InstallationOperation & { expectedUid: string };
type TokenResult = Result<{ state: 'registered' | 'permission-required' | 'unsupported'; message?: string }>;

type TokenServiceOptions = {
  platform: string;
  getCurrentUid(): string | null;
  installation: { nextOperation(create: boolean): Promise<InstallationOperation | null> };
  getPermission(request: boolean): Promise<{ canReceive: boolean; message: string | null }>;
  getDevicePushTokenAsync(): Promise<DevicePushToken>;
  addPushTokenListener(listener: (token: DevicePushToken) => void): { remove(): void };
  upsertToken(input: BindingRequest & { platform: 'android'; token: string }): Promise<unknown>;
  revokeToken(input: BindingRequest): Promise<unknown>;
};

export function createInstallationKeyProvider(
  storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> },
  randomUUID: () => string,
) {
  const key = 'labpresensi.notificationInstallation';
  let state: InstallationOperation | undefined;

  return {
    async nextOperation(create: boolean): Promise<InstallationOperation | null> {
      if (!state) {
        const previous = await storage.getItem(key);
        if (previous) {
          const saved = JSON.parse(previous) as Partial<InstallationOperation> | null;
          if (typeof saved?.installationKey !== 'string' || typeof saved.revision !== 'number'
            || !Number.isSafeInteger(saved.revision) || saved.revision < 1) throw new Error('Invalid notification installation.');
          state = { installationKey: saved.installationKey, revision: saved.revision };
        }
      }
      if (!state && !create) return null;

      const next = { installationKey: state?.installationKey ?? randomUUID(), revision: (state?.revision ?? 0) + 1 };
      await storage.setItem(key, JSON.stringify(next));
      state = next;
      return next;
    },
  };
}

export function createNotificationTokenService(options: TokenServiceOptions) {
  let subscription: { remove(): void } | undefined;
  let generation = 0;
  let queue = Promise.resolve();

  function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const result = queue.then(action);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }

  function active(uid: string, startedAt: number) {
    return generation === startedAt && options.getCurrentUid() === uid;
  }

  function stop() {
    generation += 1;
    subscription?.remove();
    subscription = undefined;
  }

  function start(uid: string, requestPermission: boolean, onResult: (result: TokenResult) => void) {
    stop();
    const startedAt = generation;
    let tokenVersion = 0;

    const report = (result: TokenResult) => {
      if (active(uid, startedAt)) onResult(result);
    };

    const reportFailure = () => report({ ok: false, code: 'TOKEN_REGISTRATION_FAILED',
      message: 'Pendaftaran notifikasi gagal. Coba lagi.' });

    const save = (deviceToken: DevicePushToken, version: number) => enqueue(async () => {
      if (!active(uid, startedAt) || version !== tokenVersion) return;
      const { type, data } = deviceToken;
      if (type !== 'android' || typeof data !== 'string' || !data) {
        reportFailure();
        return;
      }

      const operation = await options.installation.nextOperation(true);
      if (!operation || !active(uid, startedAt) || version !== tokenVersion) return;
      await options.upsertToken({ ...operation, expectedUid: uid, platform: 'android', token: data });
      if (version === tokenVersion) report({ ok: true, data: { state: 'registered' } });
    });

    async function registerNotificationToken() {
      if (!active(uid, startedAt)) return;
      if (options.platform !== 'android') {
        report({ ok: true, data: { state: 'unsupported', message: 'Push LabPresensi tersedia di Android.' } });
        return;
      }

      const permission = await options.getPermission(requestPermission);
      if (!active(uid, startedAt)) return;
      if (!permission.canReceive) {
        await enqueue(async () => {
          const operation = await options.installation.nextOperation(false);
          if (operation && active(uid, startedAt)) await options.revokeToken({ ...operation, expectedUid: uid });
        });
        report({ ok: true, data: { state: 'permission-required', message: permission.message ?? undefined } });
        return;
      }

      const version = tokenVersion;
      subscription = options.addPushTokenListener((token) => {
        const latestVersion = ++tokenVersion;
        void save(token, latestVersion).catch(() => {
          if (latestVersion === tokenVersion) reportFailure();
        });
      });
      const token = await options.getDevicePushTokenAsync();
      await save(token, version);
    }

    void registerNotificationToken().catch(reportFailure);
    return () => {
      if (generation === startedAt) stop();
    };
  }

  async function revokeBeforeLogout(uid: string): Promise<Result> {
    stop();
    if (options.platform !== 'android') return { ok: true, data: undefined };

    return enqueue(async () => {
      try {
        const operation = await options.installation.nextOperation(false);
        if (!operation) return { ok: true, data: undefined };
        if (options.getCurrentUid() !== uid) {
          return { ok: false, code: 'AUTH_CHANGED', message: 'Akun sudah berubah sebelum token dapat dilepas.' };
        }
        await options.revokeToken({ ...operation, expectedUid: uid });
        return { ok: true, data: undefined };
      } catch {
        return { ok: false, code: 'TOKEN_REVOKE_FAILED', message: 'Token notifikasi gagal dilepas. Coba lagi.' };
      }
    });
  }

  return { start, revokeBeforeLogout };
}
