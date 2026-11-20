import { useEffect, useState, type ReactNode } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeading, ScreenState, Stamp } from '@/components/Interface';
import { Dropdown } from '@/components/Dropdown';
import { color, radius, space, surface, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { subscribeSesiList } from '@/features/kelola/sesiService';
import { mapFirebaseError } from '@/utils/firebaseError';
import type { Sesi } from '@/types';
import { attendanceTime, recapRows, subscribeRecap } from './rekapService';

function SessionRecap({ sesi, controls }: { sesi: Sesi; controls: ReactNode }) {
  const [rows, setRows] = useState<ReturnType<typeof recapRows>>();
  const [error, setError] = useState('');
  useEffect(() => subscribeRecap(sesi, next => { setError(''); setRows(next); }, reason => setError(
    reason instanceof Error && reason.message === 'ROSTER_MISSING' ? 'Daftar peserta kelas tidak tersedia.' : mapFirebaseError(reason)
  )), [sesi]);
  return <FlatList data={error ? [] : rows ?? []} keyExtractor={row => row.uid} contentContainerStyle={[surface.page, styles.list]}
    ListHeaderComponent={<View style={styles.header}>
      {controls}
      {rows && !error ? <View style={styles.summary}>
        <View style={styles.summaryCopy}>
          <Text accessibilityRole="header" style={[type.title, styles.onBlue]}>Kehadiran sesi</Text>
          <Text style={[type.muted, styles.onBlue]}>{rows.length} peserta terdaftar</Text>
        </View>
        <View style={styles.total}>
          <Text style={[type.display, styles.onBlue]}>{rows.filter(row => row.status === 'Hadir').length}</Text>
          <Text style={[type.label, styles.onBlue]}>Hadir</Text>
        </View>
      </View> : null}
      {rows?.length && !error ? <Text accessibilityRole="header" style={type.heading}>Daftar peserta</Text> : null}
    </View>}
    ListEmptyComponent={error ? <ScreenState title="Rekap sesi tidak tersedia" description={error} tone="danger" />
      : !rows ? <ScreenState title="Memuat peserta dan presensi…" loading tone="info" />
        : <ScreenState title="Belum ada peserta di kelas ini" />}
    renderItem={({ item }) => <View style={styles.row}>
      <View style={styles.person}>
        <Text style={type.title}>{item.nama}</Text>
        <Text style={type.mono}>NIM {item.nim}</Text>
      </View>
      <View style={styles.rowResult}>
        <Stamp label={item.status} tone={item.status === 'Hadir' ? 'success' : item.status === 'Izin' ? 'warning' : 'neutral'} />
        {item.time ? <Text style={type.mono}>{attendanceTime(item.time)}</Text> : null}
      </View>
    </View>} />;
}

export function RekapTab() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [sessions, setSessions] = useState<Sesi[]>();
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [classId, setClassId] = useState('');
  useEffect(() => uid ? subscribeSesiList(uid, rows => setSessions(rows.filter(row => !row.archived)), setError)
    : undefined, [uid]);
  const classes = [...new Map(sessions?.map(row => [row.kelasId, { id: row.kelasId, label: row.kelasNama }])).values()];
  const visible = sessions?.filter(row => !classId || row.kelasId === classId);
  const sesi = visible?.find(row => row.id === selected);
  const controls = <View style={styles.header}>
    <ScreenHeading title="Rekap kehadiran" />
    {error ? <ScreenState title="Rekap tidak tersedia" description={error} tone="danger" /> : !sessions ? <ScreenState title="Memuat sesi…" loading /> : !sessions.length ? <ScreenState title="Belum ada sesi" /> : <View style={[surface.panel, styles.filters]}>
      <Dropdown label="Filter kelas" value={classId} onChange={id => { setClassId(id); setSelected(''); }}
        options={[{ id: '', label: 'Semua kelas' }, ...classes]} />
      <Dropdown label="Sesi praktikum" value={selected} onChange={setSelected}
        options={(visible ?? []).map(row => ({ id: row.id, label: `${row.praktikum} · ${row.kelasNama}\n${row.tanggal} · ${row.jamMulai} · ${row.lab}` }))} />
    </View>}
  </View>;
  return sesi && !error ? <SessionRecap key={sesi.id} sesi={sesi} controls={controls} /> :
    <ScrollView contentContainerStyle={surface.page}>
      {controls}
      {Boolean(visible?.length) && !error ? <ScreenState title="Pilih sesi untuk melihat rekap" /> : null}
    </ScrollView>;
}

const styles = StyleSheet.create({
  header: { gap: space.inset },
  list: { gap: space.sm },
  filters: { padding: space.md, gap: space.md },
  summary: {
    backgroundColor: color.blueInk, borderRadius: radius, borderLeftWidth: 4, borderLeftColor: color.cobalt,
    padding: space.inset, gap: space.md, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
  },
  summaryCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 150, gap: space.xs },
  total: { alignItems: 'center', minWidth: 64 },
  onBlue: { color: color.onAccent },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, borderBottomWidth: 1, borderBottomColor: color.line, paddingBottom: space.md },
  person: { flexGrow: 1, flexShrink: 1, flexBasis: 150, gap: space.xs },
  rowResult: { gap: space.xs },
});
