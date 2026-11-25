import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/features/auth/AuthContext';
import { NotificationRuntime, notificationSignOut } from '@/features/notifications/NotificationRuntime';

export default function RootLayout() {
  return (
    <AuthProvider wrapSignOut={notificationSignOut}>
      <StatusBar style="dark" />
      <NotificationRuntime>
        <Slot />
      </NotificationRuntime>
    </AuthProvider>
  );
}

