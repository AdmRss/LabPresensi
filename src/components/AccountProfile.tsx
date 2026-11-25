import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeading } from '@/components/Interface';
import { LogoutAction } from '@/components/LogoutAction';
import { space, surface, type } from '@/constants/design';
import type { AppUser } from '@/types';

export function AccountProfile({ user, role }: { user: AppUser; role: string }) {
  return (
    <ScrollView contentContainerStyle={surface.page}>
      <ScreenHeading title="Profil" />
      <View style={[surface.panel, styles.card]}>
        <ProfileField label="Nama" value={user.nama} />
        {user.nim ? <ProfileField label="NIM" value={user.nim} /> : null}
        <ProfileField label="Email" value={user.email} />
        <ProfileField label="Peran" value={role} />
      </View>
      <LogoutAction variant="danger" />
    </ScrollView>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={type.muted}>{label}</Text>
      <Text selectable style={type.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.inset, padding: space.inset },
  field: { gap: space.xs },
});
