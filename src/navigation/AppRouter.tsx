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

export function AppRouter() {
  return (
    <AppErrorBoundary>
      <AppRouterContent />
    </AppErrorBoundary>
  );
}

function AppRouterContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <View style={surface.column}><ScreenState title="Memuat profil…" loading /></View>
      </SafeAreaView>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <SafeAreaView key={user.uid} style={styles.safeArea}>
      <View style={[surface.column, styles.workspace]}>
        <AppHeader />
        {user.role === 'ADMIN' ? <AdminClasses /> : user.role === 'ASISTEN' ? <AsistenTabs /> : <PraktikanTabs />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: color.cream, flex: 1 },
  workspace: { backgroundColor: color.paper, flex: 1 },
  centered: { backgroundColor: color.paper, justifyContent: 'center', paddingHorizontal: space.gutter },
});
