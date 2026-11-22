export type NativePermission = {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  ios?: { status: number };
};

type PermissionApi = {
  prepareChannel(): Promise<void>;
  getPermissionsAsync(): Promise<NativePermission>;
  requestPermissionsAsync(): Promise<NativePermission>;
  IosAuthorizationStatus: { PROVISIONAL: number; EPHEMERAL: number };
};

export async function getNotificationPermission(api: PermissionApi, request: boolean) {
  function readStatus(permission: NativePermission) {
    const iosStatus = permission.ios?.status;
    return iosStatus === api.IosAuthorizationStatus.PROVISIONAL ? 'provisional'
      : iosStatus === api.IosAuthorizationStatus.EPHEMERAL ? 'ephemeral' : permission.status;
  }

  await api.prepareChannel();
  let permission = await api.getPermissionsAsync();
  let status = readStatus(permission);
  if (request && permission.canAskAgain && (status === 'undetermined' || status === 'denied')) {
    permission = await api.requestPermissionsAsync();
    status = readStatus(permission);
  }

  const canReceive = status === 'granted' || status === 'provisional' || status === 'ephemeral';

  return {
    status,
    canReceive,
    canAskAgain: permission.canAskAgain,
    message: canReceive ? null : permission.canAskAgain
      ? 'Izinkan notifikasi untuk menerima pembaruan praktikum.'
      : 'Aktifkan notifikasi LabPresensi di pengaturan perangkat untuk menerima pembaruan praktikum.',
  };
}
