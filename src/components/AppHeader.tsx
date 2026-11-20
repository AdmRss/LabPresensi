import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Action } from '@/components/Interface';
import { color, radius, space, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { mapFirebaseError } from '@/utils/firebaseError';

export function AppHeader() {
  const { user, logout } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const role = user.role === 'ASISTEN' ? 'Asisten' : user.role === 'ADMIN' ? 'Admin' : 'Praktikan';

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
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.brand}>
          <Text allowFontScaling={false} style={styles.brandText}>LP</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={type.title}>{user.nama}</Text>
          <View style={styles.userMeta}>
            <Text style={[type.label, styles.role]}>{role}</Text>
            {user.nim ? <Text style={type.mono}>NIM {user.nim}</Text> : null}
          </View>
        </View>
        <Action
          label="Keluar"
          accessibilityLabel={`Keluar dari akun ${user.nama}`}
          variant="quiet"
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
    alignItems: 'center', backgroundColor: color.sheet, borderBottomColor: color.line,
    borderBottomWidth: 1, flexDirection: 'row', gap: space.sm, paddingLeft: space.gutter, paddingRight: space.sm, paddingVertical: space.md,
  },
  brand: { backgroundColor: color.blueInk, borderRadius: radius, borderBottomWidth: 3, borderBottomColor: color.cobalt, justifyContent: 'center', alignItems: 'center', width: 44, height: 44 },
  brandText: { color: color.onAccent, fontSize: 18, fontWeight: '800', letterSpacing: -0.7 },
  userInfo: { flex: 1, minWidth: 0, gap: space.xs },
  userMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, rowGap: space.xs },
  role: { color: color.cobalt },
});
