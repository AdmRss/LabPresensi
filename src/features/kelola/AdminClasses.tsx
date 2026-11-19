import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Action, Field, Notice, ScreenHeading, Segments, Stamp } from '@/components/Interface';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Sheet } from '@/components/Sheet';
import { Dropdown } from '@/components/Dropdown';
import { color, space, surface, touch, type } from '@/constants/design';
import type { Kelas } from '@/types';
import { AdminCatalog } from './AdminCatalog';
import { archiveAdminClasses, loadRosterPreview, saveUniqueClassCatalog, subscribeAdminClasses,
  subscribeCatalog, updateKelas, type AdminClassTarget, type KatalogKelas } from './kelolaService';

const ADMIN_TABS = [{ key: 'kelas', label: 'Kelas' }, { key: 'katalog', label: 'Katalog' }] as const;

type ClassRow = AdminClassTarget & Pick<Kelas, 'nama' | 'praktikum' | 'pesertaUids' | 'katalogId'>;
const rowKey = (row: AdminClassTarget) => row.kind + '/' + row.id;

function ClassPreview({ row, index, selecting, checked, disabled, onToggle }: {
  row: ClassRow;
  index: number;
  selecting: boolean;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const roster = row.pesertaUids;
  const [loaded, setLoaded] = useState<{ roster: string[]; result: Awaited<ReturnType<typeof loadRosterPreview>> }>();
  const preview = loaded?.roster === roster ? loaded.result : undefined;
  const students = preview?.ok ? preview.data : undefined;
  const previewError = preview && !preview.ok ? preview.message : '';
  useEffect(() => {
    let current = true;
    void loadRosterPreview(roster).then(result => {
      if (current) setLoaded({ roster, result });
    });
    return () => { current = false; };
  }, [roster]);

  return <View style={styles.card}>
    <View style={styles.row}>
      <View style={styles.heading}>
        <Text style={type.title}>{index + 1}. {row.nama} · {row.praktikum}</Text>
        <Stamp label={String(roster.length) + ' mahasiswa'} />
        {row.kind === 'katalogKelas' ? <Text style={type.muted}>Belum ditambahkan oleh asisten</Text> : null}
      </View>
      {selecting ? <Pressable accessibilityRole="checkbox" accessibilityLabel={'Pilih ' + row.nama + ' ' + row.praktikum}
        accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onToggle}
        style={[surface.outline, styles.checkbox, checked && styles.checked]}>
        <Text style={checked ? styles.checkmark : type.label}>{checked ? '✓' : ' '}</Text>
      </Pressable> : null}
    </View>
    {previewError ? <Notice message={previewError} /> : null}
    {!roster.length ? <Text style={type.muted}>Belum ada mahasiswa.</Text>
      : !students ? (previewError ? null : <Text style={type.muted}>Memuat mahasiswa…</Text>)
      : <ScrollView nestedScrollEnabled style={styles.preview} contentContainerStyle={styles.previewList}
          accessibilityLabel={'Daftar mahasiswa ' + row.nama}>
          {students.map((student, position) =>
            <Text key={student.id} style={type.body}>{position + 1}. {student.nama}</Text>)}
        </ScrollView>}
  </View>;
}

export function AdminClasses() {
  const [tab, setTab] = useState<'kelas' | 'katalog'>('kelas');
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [catalog, setCatalog] = useState<KatalogKelas[]>([]);
  const [catalogToEdit, setCatalogToEdit] = useState<KatalogKelas>();
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [editing, setEditing] = useState<ClassRow>();
  const [archiving, setArchiving] = useState<ClassRow[]>();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState('');
  useEffect(() => subscribeAdminClasses(setClasses, setError), []);
  useEffect(() => subscribeCatalog('katalogKelas', setCatalog, setError), []);

  const linked = new Set(classes.map(row => row.katalogId));
  const rows: ClassRow[] = [
    ...classes.filter(row => !row.archived).map(row => ({ ...row, kind: 'kelas' as const })),
    ...catalog.filter(row => !linked.has(row.id)).map(row => ({ ...row, kind: 'katalogKelas' as const })),
  ];
  rows.sort((a, b) => a.nama.localeCompare(b.nama, 'id') || a.praktikum.localeCompare(b.praktikum, 'id'));
  const selected = rows.filter(row => selection.includes(rowKey(row)));
  const linkedCatalog = editing && catalog.find(row => row.id === (editing.kind === 'kelas' ? editing.katalogId : editing.id));

  const save = async () => {
    if (pending || (!editing && !archiving)) return;
    if (editing && (!editing.nama.trim() || !editing.praktikum.trim())) {
      setFormError('Nama kelas dan nama praktikum wajib diisi.');
      return;
    }
    setPending(true);
    setFormError('');
    const result = editing
      ? editing.kind === 'kelas' ? await updateKelas(editing.id, editing)
        : await saveUniqueClassCatalog(editing.id, {
          nama: editing.nama.trim(), praktikum: editing.praktikum.trim(),
        })
      : await archiveAdminClasses(archiving ?? []);
    setPending(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setEditing(undefined);
    setArchiving(undefined);
    setSelecting(false);
    setSelection([]);
  };

  return <View style={styles.container}>
    <View style={{ padding: space.gutter }}>
      <Segments items={ADMIN_TABS} selected={tab} disabled={pending} label="Bagian admin" onChange={next => {
        setTab(next); setCatalogToEdit(undefined); setSelecting(false); setSelection([]);
      }} />
    </View>
    {tab === 'katalog' ? <AdminCatalog initialClass={catalogToEdit} /> : <>
      <FlatList data={rows} keyExtractor={rowKey} contentContainerStyle={styles.content}
        ListHeaderComponent={<ScreenHeading title="Kelola kelas">
          <Action label={selecting ? 'Selesai' : 'Edit'} variant="secondary" disabled={pending} onPress={() => {
            setSelecting(!selecting); setSelection([]);
          }} />
          {error ? <Notice message={error} /> : null}
        </ScreenHeading>}
        ListEmptyComponent={<Text style={type.muted}>Belum ada kelas.</Text>}
        renderItem={({ item, index }) => <ClassPreview row={item} index={index} selecting={selecting}
          checked={selection.includes(rowKey(item))} disabled={pending}
          onToggle={() => setSelection(current => current.includes(rowKey(item))
            ? current.filter(key => key !== rowKey(item)) : [...current, rowKey(item)])} />} />
      {selecting ? <View style={styles.toolbar}>
        <Text style={type.label}>{selected.length} kelas dipilih</Text>
        <Action label="Edit kelas" variant="secondary" disabled={selected.length !== 1 || pending}
          onPress={() => { setFormError(''); setEditing(selected[0]); }} />
        <Action label="Arsipkan kelas" variant="danger" disabled={!selected.length || pending}
          onPress={() => { setFormError(''); setArchiving(selected); }} />
      </View> : null}
    </>}
    {editing ? <Sheet visible title="Edit kelas" onClose={() => { if (!pending) setEditing(undefined); }} footer={<>
      <Action label="Batal" variant="secondary" disabled={pending} onPress={() => setEditing(undefined)} />
      <Action label="Simpan kelas" busy={pending} onPress={() => void save()} />
    </>}>
      <Field accessibilityLabel="Nama kelas" value={editing.nama} editable={!pending}
        onChangeText={nama => setEditing({ ...editing, nama })} />
      <Field accessibilityLabel="Nama praktikum" value={editing.praktikum} editable={!pending}
        onChangeText={praktikum => setEditing({ ...editing, praktikum })} />
      {editing.kind === 'kelas' ? <Dropdown label="Katalog kelas" value={editing.katalogId ?? ''} disabled={pending}
        options={catalog.map(row => ({ id: row.id, label: row.nama + ' · ' + row.praktikum }))}
        onChange={katalogId => setEditing({ ...editing, katalogId })} /> : null}
      {linkedCatalog ? <Action label="Edit daftar mahasiswa katalog" variant="secondary" disabled={pending}
        onPress={() => {
          setEditing(undefined);
          setCatalogToEdit(linkedCatalog);
          setTab('katalog');
          setSelecting(false);
          setSelection([]);
        }} /> : null}
      {formError ? <Notice message={formError} /> : null}
    </Sheet> : null}
    {archiving ? <ConfirmSheet visible destructive pending={pending} title="Arsipkan kelas?"
      message={String(archiving.length) + ' kelas yang dipilih akan diarsipkan.'} error={formError}
      onCancel={() => setArchiving(undefined)} onConfirm={() => void save()} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: space.gutter, gap: space.md },
  card: { backgroundColor: color.sheet, borderTopWidth: 2, borderTopColor: color.ink, padding: space.md, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  heading: { flex: 1, gap: space.xs },
  checkbox: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: color.ink },
  checkmark: { ...type.label, color: color.onAccent },
  preview: { maxHeight: 104 },
  previewList: { gap: space.xs },
  toolbar: { padding: space.gutter, backgroundColor: color.cream, gap: space.sm },
});
