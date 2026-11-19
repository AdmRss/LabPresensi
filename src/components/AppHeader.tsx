import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Action } from '@/components/Interface';
import { color, space, surface, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { mapFirebaseError } from '@/utils/firebaseError';

export function AppHeader() {
  const { user, logout } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const role = user.role === 'ASISTEN' ? 'Asisten' : 'Praktikan';
  const roleDetail = user.role === 'PRAKTIKAN' && user.nim ? `${role} · NIM ${user.nim}` : role;

  const handleConfirmLogout = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await logout();
      setConfirmVisible(false);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : mapFirebaseError(logoutError));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[surface.outline, styles.brand]}>
          <Text style={styles.brandText}>LP</Text>
        </View>
        <View style={styles.userInfo}>
          <Text numberOfLines={2} style={type.title}>{user.nama}</Text>
          <Text style={type.mono}>{roleDetail}</Text>
        </View>
        <Action
          label="Keluar"
          accessibilityLabel={`Keluar dari akun ${user.nama}`}
          variant="secondary"
          onPress={() => { setError(null); setConfirmVisible(true); }}
        />
      </View>
      <ConfirmSheet
        confirmLabel="Keluar"
        destructive
        error={error}
        message="Anda akan kembali ke layar masuk. Data presensi tetap tersimpan."
        onCancel={() => setConfirmVisible(false)}
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
    alignItems: 'center', backgroundColor: color.sheet, borderBottomColor: color.ink,
    borderBottomWidth: 1, flexDirection: 'row', gap: space.md, paddingHorizontal: space.gutter, paddingVertical: space.sm,
  },
  brand: { backgroundColor: color.cobalt, justifyContent: 'center', paddingHorizontal: space.sm, minHeight: 44 },
  brandText: { color: color.onAccent, fontSize: 18, fontWeight: '900', letterSpacing: -0.9 },
  userInfo: { flex: 1, minWidth: 0 },
});
