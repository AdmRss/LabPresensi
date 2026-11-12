import type { JSX } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';

// Stub scaffold: tombol Logout asli (dengan loading & error) dibuat pada M1 (P1).
export function AppHeader(): JSX.Element | null {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <Text numberOfLines={1} style={styles.nameText}>
          {user.nama}
        </Text>
        <Text style={styles.roleText}>{user.role}</Text>
      </View>
      <Text accessibilityRole="button" onPress={() => void logout()} style={styles.logoutText}>
        Logout
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    gap: 2,
    marginRight: 12,
  },
  nameText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  roleText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 8,
  },
});
