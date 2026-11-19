import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { ScreenHeading, ScreenState, Stamp } from '@/components/Interface';
import { space, surface, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { mapFirebaseError } from '@/utils/firebaseError';
import { attendanceTime, subscribeHistory, type HistoryRow } from './rekapService';

export function RiwayatTab() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [rows, setRows] = useState<HistoryRow[]>();
  const [error, setError] = useState('');
  useEffect(() => uid ? subscribeHistory(uid, setRows, e => setError(mapFirebaseError(e))) : undefined, [uid]);
  return <View style={{ flex: 1, padding: space.gutter, gap: space.md }}>
    <ScreenHeading title="Riwayat presensi saya" />
    {error ? <ScreenState title="Riwayat tidak tersedia" description={error} tone="danger" /> : !rows ?
      <ScreenState title="Memuat riwayat…" loading /> :
      <FlatList data={rows} keyExtractor={row => row.id}
        ListEmptyComponent={<ScreenState title="Belum ada presensi" />}
        renderItem={({ item }) => <View style={[surface.outline, { padding: space.md, marginBottom: space.sm, gap: space.xs }]}>
          <Text style={type.title}>{item.label}</Text>
          <Text style={type.mono}>{item.date} {attendanceTime(item.time)}</Text>
          <Stamp label="Hadir" tone="success" />
        </View>} />}
  </View>;

}
