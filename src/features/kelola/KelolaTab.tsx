import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Dropdown } from '@/components/Dropdown';
import { Action, Notice, ScreenHeading, ScreenState, Segments, Stamp } from '@/components/Interface';
import { Sheet } from '@/components/Sheet';
import { color, space, type } from '@/constants/design';
import type { AppUser, Kelas } from '@/types';
import { addPeserta, createKelas, getPraktikanList, removePeserta, subscribeCatalog, subscribeKelas,
  type KatalogKelas } from './kelolaService';
import { SesiTab } from './SesiTab';

const TABS = [{ key: 'KELAS', label: 'Kelas & peserta' }, { key: 'SESI', label: 'Sesi praktikum' }] as const;

export function KelolaTab({ asistenId }: { asistenId?: string }) {
  const [tab, setTab] = useState<'KELAS' | 'SESI'>('KELAS');
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

  const container = { padding: space.gutter, gap: space.md };
  return <View style={{ flex: 1 }}>
    <View style={container}><Segments items={TABS} selected={tab} onChange={setTab} label="Bagian kelola" /></View>
    {tab === 'SESI' ? <SesiTab asistenId={asistenId} kelasList={classes ?? []} /> : (
      <FlatList data={classes ?? []} keyExtractor={row => row.id} contentContainerStyle={container}
        ListHeaderComponent={<ScreenHeading title="Kelas praktikum">
          <Action label="+ Tambah kelas" tactile onPress={() => {
            setClassName(''); setCatalogId(''); setFormError(''); setCreating(true);
          }} />
          {error ? <Notice message={error} /> : null}
        </ScreenHeading>}
        ListEmptyComponent={<ScreenState title={classes ? 'Belum ada kelas' : 'Memuat kelas…'} loading={!classes && !error} />}
        renderItem={({ item }) => <View style={{ backgroundColor: color.sheet, padding: space.md, gap: space.sm }}>
          <Text style={type.title}>{item.nama}</Text>
          <Text style={type.body}>{item.praktikum}</Text>
          <Stamp label={String(item.pesertaUids.length) + ' peserta'} />
          <Action label="Atur peserta" variant="secondary" onPress={() => openRoster(item)} />
        </View>} />
    )}
    {creating || rosterClass ? <Sheet visible title={rosterClass ? 'Peserta ' + rosterClass.nama : 'Tambah kelas'}
      onClose={close} footer={<>
        <Action label={rosterClass ? 'Selesai' : 'Batal'} disabled={saving} variant="secondary" onPress={close} />
        {rosterClass ? <Action label={enrolled ? 'Cabut peserta' : 'Tambah peserta'} busy={saving}
          disabled={!participant || !liveClass} onPress={() => void changeParticipant()} />
          : <Action label="Simpan kelas" busy={saving} disabled={!catalogId} onPress={() => void save()} />}
      </>}>
      {formError ? <Notice message={formError} /> : null}
      {rosterClass ? <>
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
