import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LogoutAction } from '@/components/LogoutAction';
import { Action } from '@/components/Interface';
import { Sheet } from '@/components/Sheet';
import { radius, space, touch, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { useNotificationFeedback } from '@/features/notifications/NotificationRuntime';

export function AppHeader() {
  const { user } = useAuth();
  const notificationFeedback = useNotificationFeedback();
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  if (!user) return null;

  const hasNotifications = user.role === 'PRAKTIKAN' || user.role === 'ASISTEN';
  const role = user.role === 'ASISTEN' ? 'Asisten' : user.role === 'ADMIN' ? 'Admin' : 'Praktikan';

  const closeNotifications = () => setNotificationsVisible(false);

  return (
    <>
      <View style={styles.header}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.brand}>
          <Text allowFontScaling={false} style={styles.brandText}>LP</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[type.title, styles.name]}>{user.nama}</Text>
          <View style={styles.userMeta}>
            <Text style={[type.label, styles.role]}>{role}</Text>
            {user.nim ? <Text style={[type.mono, styles.headerMeta]}>NIM {user.nim}</Text> : null}
          </View>
        </View>
        {hasNotifications ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifikasi"
            onPress={() => setNotificationsVisible(true)}
            style={({ pressed }) => [styles.notificationButton, pressed && styles.notificationPressed]}>
            <View aria-hidden>
              <SymbolView name={{ ios: 'bell', android: 'notifications', web: 'notifications' }} size={24} tintColor="#2446CC" />
            </View>
          </Pressable>
        ) : <LogoutAction />}
      </View>
      {hasNotifications && notificationsVisible ? (
        <Sheet title="Notifikasi" visible onClose={closeNotifications}
          footer={<Action label="Tutup" variant="secondary" onPress={closeNotifications} />}>
          <Text style={type.body}>{notificationFeedback?.message ?? 'Pembaruan praktikum dikirim sebagai notifikasi perangkat.'}</Text>
          {notificationFeedback ? <Action label="Coba notifikasi" onPress={notificationFeedback.retry} /> : null}
        </Sheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center', backgroundColor: '#FDFAF3', borderBottomColor: '#BDB6A7',
    borderBottomWidth: 1, flexDirection: 'row', gap: space.sm, paddingLeft: space.gutter, paddingRight: space.sm, paddingVertical: space.md,
  },
  brand: { backgroundColor: '#142451', borderRadius: radius, borderBottomWidth: 3, borderBottomColor: '#2446CC', justifyContent: 'center', alignItems: 'center', width: 44, height: 44 },
  brandText: { color: '#FFFCF4', fontSize: 18, fontWeight: '800', letterSpacing: -0.7 },
  userInfo: { flex: 1, minWidth: 0, gap: space.xs },
  name: { color: '#20211F' },
  userMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, rowGap: space.xs },
  role: { color: '#2446CC' },
  headerMeta: { color: '#59574F' },
  notificationButton: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius },
  notificationPressed: { backgroundColor: '#E1E8FF' },
});
