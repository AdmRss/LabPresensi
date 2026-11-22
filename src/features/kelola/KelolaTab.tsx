import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Dropdown } from '@/components/Dropdown';
import { Action, Notice, ScreenHeading, ScreenState, Segments, Stamp } from '@/components/Interface';
import { Sheet } from '@/components/Sheet';
import { color, space, surface, type } from '@/constants/design';
import type { AppUser, Kelas } from '@/types';
import { addPeserta, createKelas, getPraktikanList, removePeserta, subscribeCatalog, subscribeKelas,
  type KatalogKelas } from './kelolaService';
import { SesiTab } from './SesiTab';

const TABS = [{ key: 'KELAS', label: 'Kelas & peserta' }, { key: 'SESI', label: 'Sesi praktikum' }] as const;

export function KelolaTab({ asistenId, notificationSessionId }: { asistenId?: string; notificationSessionId?: string }) {
  const [tab, setTab] = useState<'KELAS' | 'SESI'>(notificationSessionId ? 'SESI' : 'KELAS');
  const [classes, setClasses] = useState<Kelas[]>();
  const [catalog, setCatalog] = useState<KatalogKelas[]>([]);
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [creating, setCreating] = useState(false);
  const [className, setClassName] = useState('');
  const [catalogId, setCatalogId] = useState('');
  const [rosterClass, setRosterClass] = useState<Kelas>();
  const [participants, setParticipants] = useState<AppUser[]>();
  const [participant, setParticipant] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const liveClass = classes?.find(row => row.id === rosterClass?.id);
  const enrolled = liveClass?.pesertaUids.includes(participant);
  useEffect(() => asistenId ? subscribeKelas(asistenId, setClasses, setError) : undefined, [asistenId]);
  useEffect(() => subscribeCatalog('katalogKelas', setCatalog, setCatalogError), []);

  useEffect(() => {
    if (!rosterClass) return;
    let current = true;
    void getPraktikanList(rosterClass).then(result => {
      if (!current) return;
      setParticipants(result.ok ? result.data : []);
      if (!result.ok) setFormError(result.message);
    });
    return () => { current = false; };
  }, [rosterClass]);

  const openRoster = (row: Kelas) => {
    setParticipant('');
    setParticipants(undefined);
    setFormError('');
    setRosterClass(row);
  };

  const save = async () => {
    if (!asistenId || saving || !catalogId) return;
    setSaving(true);
    setFormError('');
    const result = await createKelas({ asistenId, katalogId: catalogId });
    setSaving(false);
    if (result.ok) setCreating(false);
    else setFormError(result.message);
  };

  const changeParticipant = async () => {
    if (!liveClass || !participant || saving) return;
    setSaving(true);
    setFormError('');
    const result = await (enrolled ? removePeserta : addPeserta)(liveClass.id, participant);
    setSaving(false);
    if (!result.ok) setFormError(result.message);
  };

  function close() {
    if (saving) return;
    setCreating(false);
    setRosterClass(undefined);
    setFormError('');
  }

  return <View style={styles.container}>
    <View style={styles.tabs}><Segments items={TABS} selected={tab} onChange={setTab} label="Bagian kelola" /></View>
    {tab === 'SESI' ? <SesiTab asistenId={asistenId} kelasList={classes ?? []} notificationSessionId={notificationSessionId} /> : (
      <FlatList data={classes ?? []} keyExtractor={row => row.id} contentContainerStyle={surface.page}
        ListHeaderComponent={<ScreenHeading title="Kelas praktikum">
          <Action label="+ Tambah kelas" style={styles.start} tactile onPress={() => {
            setClassName(''); setCatalogId(''); setFormError(''); setCreating(true);
          }} />
          {error ? <Notice message={error} /> : null}
        </ScreenHeading>}
        ListEmptyComponent={error ? undefined : <ScreenState title={classes ? 'Belum ada kelas' : 'Memuat kelas…'} loading={!classes} />}
        renderItem={({ item }) => <View style={[surface.panel, styles.card]}>
          <View style={styles.classIdentity}>
            <Text style={type.title}>{item.praktikum}</Text>
            <Text style={type.body}>{item.nama}</Text>
          </View>
          <View style={styles.classActions}>
            <Stamp label={String(item.pesertaUids.length) + ' peserta'} />
            <Action label="Atur peserta" accessibilityLabel={`Atur peserta ${item.nama} · ${item.praktikum}`} variant="quiet" onPress={() => openRoster(item)} />
          </View>
        </View>} />
    )}
    {creating || rosterClass ? <Sheet visible title={rosterClass ? 'Peserta ' + rosterClass.nama : 'Tambah kelas'}
      onClose={close} footer={<>
        <Action label={rosterClass ? 'Selesai' : 'Batal'} disabled={saving} variant="secondary" onPress={close} />
        {rosterClass ? <Action label={enrolled ? 'Cabut peserta' : 'Tambah peserta'} variant={enrolled ? 'danger' : 'primary'} busy={saving}
          disabled={!participant || !liveClass} onPress={() => void changeParticipant()} />
          : <Action label="Simpan kelas" busy={saving} disabled={!catalogId} onPress={() => void save()} />}
      </>}>
      {formError ? <Notice message={formError} /> : null}
      {rosterClass ? <>
        <View style={[surface.panel, styles.classIdentity]}>
          <Text style={type.title}>{rosterClass.praktikum}</Text>
          {liveClass ? <Text style={type.muted}>{liveClass.pesertaUids.length} peserta terdaftar</Text> : null}
        </View>
        {!liveClass ? <Notice message="Kelas sudah tidak tersedia." /> : null}
        {!rosterClass.katalogId ? <Notice tone="warning" message="Minta admin menghubungkan kelas ini dengan katalog untuk menambah peserta." /> : null}
        {participants ? <Dropdown label="Mahasiswa" value={participant} disabled={saving} onChange={setParticipant}
          options={participants.map(row => ({ id: row.uid, label: row.nama + ' · ' + (row.nim ?? '—')
            + (liveClass?.pesertaUids.includes(row.uid) ? ' · Terdaftar' : '') }))} />
          : <ScreenState title="Memuat peserta…" loading />}
      </> : <>
        {catalogError ? <Notice message={catalogError} /> : null}
        <Dropdown label="Nama kelas" value={className} disabled={saving}
          options={[...new Set(catalog.map(row => row.nama))].map(nama => ({ id: nama, label: nama }))}
          onChange={nama => { setClassName(nama); setCatalogId(''); }} />
        <Dropdown label="Nama praktikum" value={catalogId} disabled={saving}
          options={catalog.filter(row => row.nama === className).map(row => ({ id: row.id, label: row.praktikum }))}
          onChange={setCatalogId} />
      </>}
    </Sheet> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { paddingHorizontal: space.gutter, paddingTop: space.md },
  start: { alignSelf: 'flex-start', maxWidth: '100%' },
  card: { overflow: 'hidden' },
  classIdentity: { padding: space.inset, gap: space.xs },
  classActions: {
    borderTopWidth: 1, borderTopColor: color.line, paddingHorizontal: space.inset, paddingVertical: space.xs,
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.xs,
  },
});
