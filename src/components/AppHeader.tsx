import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LogoutAction } from '@/components/LogoutAction';
import { Action } from '@/components/Interface';
import { Sheet } from '@/components/Sheet';
import { color, radius, space, touch, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';

export function AppHeader() {
  const { user } = useAuth();
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  if (!user) return null;

  const role = user.role === 'ASISTEN' ? 'Asisten' : user.role === 'ADMIN' ? 'Admin' : 'Praktikan';

  const closeNotifications = () => setNotificationsVisible(false);

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
        {user.role === 'PRAKTIKAN' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifikasi"
            onPress={() => setNotificationsVisible(true)}
            style={({ pressed }) => [styles.notificationButton, pressed && styles.notificationPressed]}>
            <View aria-hidden>
              <SymbolView name={{ ios: 'bell', android: 'notifications', web: 'notifications' }} size={24} tintColor={color.cobalt} />
            </View>
          </Pressable>
        ) : <LogoutAction />}
      </View>
      {user.role === 'PRAKTIKAN' && notificationsVisible ? (
        <Sheet title="Notifikasi" visible onClose={closeNotifications}
          footer={<Action label="Tutup" variant="secondary" onPress={closeNotifications} />}>
          {null}
        </Sheet>
      ) : null}
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
  notificationButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius },
  notificationPressed: { backgroundColor: color.blueWash },
});
