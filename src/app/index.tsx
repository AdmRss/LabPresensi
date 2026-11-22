import { useLocalSearchParams } from 'expo-router';

import { AppRouter } from '@/navigation/AppRouter';

export default function IndexScreen() {
  const { sesiId, izinId, notificationEventId, notificationUid } = useLocalSearchParams();
  const session = typeof sesiId === 'string' ? sesiId : undefined;
  const permission = typeof izinId === 'string' ? izinId : undefined;
  const target = typeof notificationEventId === 'string' && typeof notificationUid === 'string'
    ? { key: notificationEventId, uid: notificationUid, sesiId: session, izinId: permission }
    : undefined;
  return <AppRouter notificationTarget={target} />;
}
