import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/features/auth/AuthContext';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { AsistenTabs } from '@/navigation/AsistenTabs';
import { PraktikanTabs } from '@/navigation/PraktikanTabs';

export function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.centered}>
        <ActivityIndicator color="#2563EB" size="large" />
        <Text style={styles.loadingText}>Memuat profil...</Text>
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader />
      {user.role === 'ASISTEN' ? <AsistenTabs /> : <PraktikanTabs />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '600',
  },
});
