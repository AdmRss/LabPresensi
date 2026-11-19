import { ScrollView, StyleSheet } from 'react-native';
import { ScreenHeading, ScreenState } from '@/components/Interface';
import { space } from '@/constants/design';

export function RiwayatTab() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeading title="Riwayat presensi" />
      <ScreenState title="Riwayat belum tersedia" description="Status presensi bisa dilihat dari detail sesi di tab Jadwal." />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: space.gutter, gap: space.gutter } });
