import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ScreenHeading, ScreenState, Stamp } from '@/components/Interface';
import { color, space, surface, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { mapFirebaseError } from '@/utils/firebaseError';
import { attendanceTime, subscribeHistory, type HistoryRow } from './rekapService';

export function RiwayatTab() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [rows, setRows] = useState<HistoryRow[]>();
  const [error, setError] = useState('');
  useEffect(() => uid ? subscribeHistory(uid, setRows, e => setError(mapFirebaseError(e))) : undefined, [uid]);
  return <FlatList data={error ? [] : rows ?? []} keyExtractor={row => row.id} contentContainerStyle={surface.page}
    ListHeaderComponent={<ScreenHeading title="Riwayat presensi saya" />}
    ListEmptyComponent={error ? <ScreenState title="Riwayat tidak tersedia" description={error} tone="danger" /> : !rows ?
      <ScreenState title="Memuat riwayat…" loading /> : <ScreenState title="Belum ada presensi" />}
    renderItem={({ item }) => <View style={styles.row}>
      <View style={styles.record}>
        <Text style={type.title}>{item.label}</Text>
        <Text style={type.mono}>{item.date} · {attendanceTime(item.time)}</Text>
      </View>
      <Stamp label="Hadir" tone="success" />
    </View>} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: space.sm, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: color.line },
  record: { flexGrow: 1, flexShrink: 1, flexBasis: 155, gap: space.xs },
});
