import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { ScreenHeading, ScreenState, Stamp } from '@/components/Interface';
import { Dropdown } from '@/components/Dropdown';
import { color, space, surface, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { subscribeSesiList } from '@/features/kelola/sesiService';
import { mapFirebaseError } from '@/utils/firebaseError';
import type { Sesi } from '@/types';
import { attendanceTime, recapRows, subscribeRecap } from './rekapService';

function SessionRecap({ sesi }: { sesi: Sesi }) {
  const [rows, setRows] = useState<ReturnType<typeof recapRows>>();
  const [error, setError] = useState('');
  useEffect(() => subscribeRecap(sesi, next => { setError(''); setRows(next); }, reason => setError(
    reason instanceof Error && reason.message === 'ROSTER_MISSING' ? 'Daftar peserta kelas tidak tersedia.' : mapFirebaseError(reason)
  )), [sesi]);
  if (error || !rows) return <ScreenState title={error || 'Memuat peserta dan presensi…'} loading={!error} />;
  return <FlatList data={rows} keyExtractor={row => row.uid}
    ListHeaderComponent={<Text style={type.heading}>Hadir {rows.filter(row => row.status === 'Hadir').length}/{rows.length} peserta</Text>}
    ListEmptyComponent={<ScreenState title="Belum ada peserta di kelas ini" />}
    renderItem={({ item }) => <View style={[surface.outline, { padding: space.md, marginTop: space.sm, gap: space.xs }]}>
      <Text style={type.title}>{item.nama} · {item.nim}</Text>
      <Stamp label={item.status} tone={item.status === 'Hadir' ? 'success' : item.status === 'Izin' ? 'warning' : 'neutral'} />
      {item.time ? <Text style={type.mono}>{attendanceTime(item.time)}</Text> : null}
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
  return <View style={{ flex: 1, padding: space.gutter, gap: space.md }}>
    <ScreenHeading title="Rekap kehadiran" />
    {error ? <ScreenState title="Rekap tidak tersedia" description={error} tone="danger" /> : !sessions ? <ScreenState title="Memuat sesi…" loading /> : !sessions.length ? <ScreenState title="Belum ada sesi" /> : <>
      <Dropdown label="Filter kelas" value={classId} onChange={id => { setClassId(id); setSelected(''); }}
        options={[{ id: '', label: 'Semua kelas' }, ...classes]} />
      <Text style={type.label}>Pilih sesi</Text>
      <View><ScrollView horizontal>{visible?.map(row =>
        <Pressable key={row.id} accessibilityRole="button" accessibilityState={{ selected: selected === row.id }}
          onPress={() => setSelected(row.id)} style={[surface.outline, { padding: space.md, marginRight: space.sm, backgroundColor: selected === row.id ? color.blueWash : color.sheet }]}>
          <Text style={type.label}>{row.praktikum} · {row.kelasNama}</Text><Text style={type.mono}>{row.tanggal} · {row.jamMulai} · {row.lab}</Text>
        </Pressable>)}</ScrollView></View>
      {sesi ? <View style={{ flex: 1 }}><SessionRecap key={sesi.id} sesi={sesi} /></View> : null}
    </>}
  </View>;
}
