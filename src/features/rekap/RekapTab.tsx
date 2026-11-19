import { ScrollView, StyleSheet } from 'react-native';
import { ScreenHeading, ScreenState } from '@/components/Interface';
import { space } from '@/constants/design';

export function RekapTab() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeading title="Rekap kehadiran" />
      <ScreenState title="Rekap belum tersedia" description="Rekap presensi per kelas belum tersedia pada versi ini." />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: space.gutter, gap: space.gutter } });
