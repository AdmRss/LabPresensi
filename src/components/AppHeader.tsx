import { useState, type JSX } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { useAuth } from '@/features/auth/AuthContext';
import { mapFirebaseError } from '@/utils/firebaseError';

export function AppHeader(): JSX.Element | null {
  const { user, logout } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const roleLabel = user.role === 'ASISTEN' ? 'Asisten' : 'Praktikan';
  const roleDetail =
    user.role === 'PRAKTIKAN' && user.nim ? `${roleLabel} • NIM ${user.nim}` : roleLabel;

  const openConfirm = () => {
    setError(null);
    setConfirmVisible(true);
  };

  const closeConfirm = () => {
    if (pending) {
      return;
    }

    setConfirmVisible(false);
    setError(null);
  };

  const handleConfirmLogout = async () => {
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await logout();
      setConfirmVisible(false);
    } catch (logoutError) {
      setError(
        logoutError instanceof Error ? logoutError.message : mapFirebaseError(logoutError),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text numberOfLines={1} style={styles.nameText}>
            {user.nama}
          </Text>
          <Text numberOfLines={1} style={styles.roleText}>
            {roleDetail}
          </Text>
        </View>

        <Pressable
          accessibilityLabel={`Logout dari akun ${user.nama}`}
          accessibilityRole="button"
          onPress={openConfirm}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
          <Text style={styles.logoutLabel}>Logout</Text>
        </Pressable>
      </View>

      <ConfirmSheet
        cancelLabel="Batal"
        confirmLabel="Logout"
        error={error}
        message="Anda akan kembali ke layar masuk. Data presensi tetap tersimpan."
        onCancel={closeConfirm}
        onConfirm={() => void handleConfirmLogout()}
        pending={pending}
        title="Keluar dari akun?"
        visible={confirmVisible}
      />
    </>
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
    flexShrink: 1,
    gap: 2,
    marginRight: 12,
  },
  nameText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  roleText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutLabel: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
