import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Action, Field, Notice, ScreenHeading } from '@/components/Interface';
import { Sheet } from '@/components/Sheet';
import { color, space, type } from '@/constants/design';
import { checkCatalogPair, latestCatalogClass, loadCatalogNims, lookupCatalogStudents, rosterTokens, saveCatalogEntry,
  saveClassCatalogByNim, subscribeCatalog, type KatalogKelas, type LokasiPraktikum } from './kelolaService';

type Entry = { id?: string; kind: 'katalogKelas' | 'lokasiPraktikum'; nama: string; praktikum: string; roster: string };
const empty = { nama: '', praktikum: '', roster: '' };

function NimFeedback({ roster }: { roster: string }) {
  const lookups = useRef(new Map<string, ReturnType<typeof lookupCatalogStudents>>());
  const displayed = useRef(new Set(rosterTokens(roster)));
  const [notice, setNotice] = useState<{ message: string }>();
  const [error, setError] = useState('');
  const tokens = rosterTokens(roster);
  const hasDuplicates = new Set(tokens).size !== tokens.length;

  useEffect(() => {
    let current = true;
    const tokens = rosterTokens(roster);
    const complete = [...new Set(tokens.filter(nim => /^[0-9]{14}$/.test(nim)))];
    displayed.current.forEach(nim => { if (!tokens.includes(nim)) displayed.current.delete(nim); });
    lookups.current.forEach((_, nim) => { if (!complete.includes(nim)) lookups.current.delete(nim); });
    const pending = complete.map(nim => {
      let lookup = lookups.current.get(nim);
      if (!lookup) {
        lookup = lookupCatalogStudents([nim]);
        lookups.current.set(nim, lookup);
      }
      return lookup;
    });
    void Promise.all(pending).then(results => {
      if (!current) return;
      const failures = results.flatMap(result => !result.ok ? [result.message] : []);
      setError(failures.at(-1) ?? '');
      const additions = results.flatMap(result => result.ok ? result.data : [])
        .filter(student => !displayed.current.has(student.nim));
      additions.forEach(student => displayed.current.add(student.nim));
      if (additions.length && new Set(tokens).size === tokens.length) {
        setNotice({ message: additions.map(student => student.nama).join(', ') + ' berhasil ditambahkan.' });
      }
    });
    return () => { current = false; };
  }, [roster]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(undefined), 2800);
    return () => clearTimeout(timer);
  }, [notice]);

  return <>
    {hasDuplicates ? <Notice message="NIM yang sama hanya boleh dimasukkan satu kali." /> : null}
    {error ? <Notice message={error} /> : null}
    {notice && !hasDuplicates ? <Notice message={notice.message} tone="success" /> : null}
  </>;
}

export function AdminCatalog({ initialClass }: { initialClass?: KatalogKelas }) {
  const [classes, setClasses] = useState<KatalogKelas[]>([]);
  const [locations, setLocations] = useState<LokasiPraktikum[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Entry>();
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(initialClass?.id);
  const latestClass = latestCatalogClass(classes);
  useEffect(() => subscribeCatalog('katalogKelas', setClasses, setError), []);
  useEffect(() => subscribeCatalog('lokasiPraktikum', setLocations, setError), []);
  useEffect(() => {
    if (!initialClass) return;
    let current = true;
    void loadCatalogNims(initialClass.pesertaUids).then(roster => {
      if (!current) return;
      setLoadingRoster(undefined);
      if (roster.ok) setEditing({ ...initialClass, kind: 'katalogKelas', roster: roster.data.join('\n') });
      else setError(roster.message);
    });
    return () => { current = false; };
  }, [initialClass]);
  const isClass = editing?.kind === 'katalogKelas';
  const [pairCheck, setPairCheck] = useState<{ key: string; message: string }>();
  const nama = isClass ? editing.nama.trim() : '';
  const praktikum = isClass ? editing.praktikum.trim() : '';
  const entryId = editing?.id;
  const pairKey = nama && praktikum ? JSON.stringify([entryId ?? '', nama, praktikum]) : '';
  const checkingPair = Boolean(pairKey && pairCheck?.key !== pairKey);
  const pairError = pairCheck?.key === pairKey ? pairCheck.message : '';
  const hasDuplicates = editing ? new Set(rosterTokens(editing.roster)).size !== rosterTokens(editing.roster).length : false;

  useEffect(() => {
    if (!pairKey) return;
    let current = true;
    const timer = setTimeout(() => void checkCatalogPair(entryId, { nama, praktikum }).then(result => {
      if (current) setPairCheck({ key: pairKey, message: result.ok ? '' : result.message });
    }), 350);
    return () => { current = false; clearTimeout(timer); };
  }, [entryId, nama, praktikum, pairKey]);

  const open = (entry: Entry) => { setFormError(''); setPairCheck(undefined); setEditing(entry); };
  const editClass = async (row: KatalogKelas) => {
    if (loadingRoster) return;
    setLoadingRoster(row.id);
    setError('');
    const roster = await loadCatalogNims(row.pesertaUids);
    setLoadingRoster(undefined);
    if (!roster.ok) {
      setError(roster.message);
      return;
    }
    open({ ...row, kind: 'katalogKelas', roster: roster.data.join('\n') });
  };
  const close = () => { if (!saving) setEditing(undefined); };
  const save = async () => {
    if (!editing || saving || (isClass && (checkingPair || pairError || hasDuplicates))) return;
    const nama = editing.nama.trim();
    const praktikum = editing.praktikum.trim();
    if (!nama || (isClass && !praktikum)) {
      setFormError('Lengkapi nama dan praktikum.');
      return;
    }
    setSaving(true);
    setFormError('');
    const result = isClass
      ? await saveClassCatalogByNim(editing.id, { nama, praktikum, roster: editing.roster })
      : await saveCatalogEntry('lokasiPraktikum', editing.id, { nama });
    setSaving(false);
    if (result.ok) setEditing(undefined);
    else setFormError(result.message);
  };

  return <>
    <ScrollView contentContainerStyle={{ padding: space.gutter, gap: space.md }}>
      <ScreenHeading title="Katalog praktikum" />
      {error ? <Notice message={error} /> : null}
      <Text style={type.heading}>Kelas dan praktikum</Text>
      <Action label="+ Tambah katalog kelas" disabled={Boolean(loadingRoster)} onPress={() => open({ ...empty, kind: 'katalogKelas' })} />
      {latestClass ? <View style={{ gap: space.xs }}>
        <Text style={type.body}>{latestClass.nama} · {latestClass.praktikum} · {latestClass.pesertaUids.length} mahasiswa</Text>
        <Action label="Edit katalog kelas" variant="secondary" disabled={Boolean(loadingRoster)}
          busy={loadingRoster === latestClass.id} onPress={() => void editClass(latestClass)} />
      </View> : null}
      <Text style={type.heading}>Lokasi lab</Text>
      <Action label="+ Tambah lokasi" disabled={Boolean(loadingRoster)} onPress={() => open({ ...empty, kind: 'lokasiPraktikum' })} />
      {locations.map(row => <View key={row.id} style={{ gap: space.xs }}>
        <Text style={type.body}>{row.nama}</Text>
        <Action label="Edit lokasi" variant="secondary" disabled={Boolean(loadingRoster)}
          onPress={() => open({ ...empty, ...row, kind: 'lokasiPraktikum' })} />
      </View>)}
    </ScrollView>
    {editing ? <Sheet visible title={isClass ? 'Katalog kelas' : 'Lokasi lab'} onClose={close} footer={<>
      <Action label="Batal" variant="secondary" disabled={saving} onPress={close} />
      <Action label="Simpan" busy={saving} disabled={isClass && (!pairKey || checkingPair || Boolean(pairError) || hasDuplicates)} onPress={() => void save()} />
    </>}>
      <Field accessibilityLabel="Nama" placeholder={isClass ? 'Nama kelas' : 'Nama lokasi'} value={editing.nama}
        editable={!saving} onChangeText={nama => setEditing({ ...editing, nama })} />
      {isClass ? <>
        <Field accessibilityLabel="Nama praktikum" placeholder="Nama praktikum" editable={!saving}
          value={editing.praktikum} onChangeText={praktikum => setEditing({ ...editing, praktikum })} />
        {checkingPair ? <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <ActivityIndicator color={color.cobalt} />
          <Text style={type.muted}>Memeriksa nama kelas dan praktikum…</Text>
        </View> : null}
        {pairError ? <Notice message={pairError} /> : null}
        <Text style={type.label}>NIM mahasiswa</Text>
        <Text style={type.muted}>Masukkan NIM 14 digit, satu per baris.</Text>
        <Field accessibilityLabel="NIM mahasiswa" multiline autoCapitalize="none" autoCorrect={false}
          value={editing.roster} editable={!saving} onChangeText={roster => setEditing({ ...editing, roster })} />
        <NimFeedback roster={editing.roster} />
      </> : null}
      {formError ? <Notice message={formError} /> : null}
    </Sheet> : null}
  </>;
}
