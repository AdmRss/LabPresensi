import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { ScreenState } from '@/components/Interface';
import { color, space, surface } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { AppErrorBoundary } from '@/navigation/AppErrorBoundary';
import { AdminClasses } from '@/features/kelola/AdminClasses';
import { AsistenTabs } from '@/navigation/AsistenTabs';
import { PraktikanTabs } from '@/navigation/PraktikanTabs';

type NotificationTarget = { key: string; uid: string; sesiId?: string; izinId?: string };

export function AppRouter({ notificationTarget }: { notificationTarget?: NotificationTarget } = {}) {
  return (
    <AppErrorBoundary>
      <AppRouterContent notificationTarget={notificationTarget} />
    </AppErrorBoundary>
  );
}

function AppRouterContent({ notificationTarget }: { notificationTarget?: NotificationTarget }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <View style={surface.column}><ScreenState title="Memuat profil…" loading /></View>
      </SafeAreaView>
    );
  }

  if (!user) return <AuthScreen />;
  const target = notificationTarget?.uid === user.uid ? notificationTarget : undefined;

  return (
    <SafeAreaView key={user.uid} style={styles.safeArea}>
      <View style={[surface.column, styles.workspace]}>
        <AppHeader />
        {user.role === 'ADMIN' ? <AdminClasses /> : user.role === 'ASISTEN'
          ? <AsistenTabs key={target?.sesiId ? target.key : undefined} notificationSessionId={target?.sesiId} />
          : <PraktikanTabs key={target?.key} notificationSessionId={target?.sesiId} notificationPermissionId={target?.izinId} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: color.sheet, flex: 1 },
  workspace: { backgroundColor: color.paper, flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: color.line },
  centered: { backgroundColor: color.paper, justifyContent: 'center', paddingHorizontal: space.gutter },
});
