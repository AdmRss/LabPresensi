import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Action, Field, FieldGroup, Notice, ScreenHeading, ScreenState, Segments } from '@/components/Interface';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Sheet } from '@/components/Sheet';
import { Dropdown } from '@/components/Dropdown';
import { color, space, surface, touch, type } from '@/constants/design';
import type { Kelas } from '@/types';
import { AdminCatalog } from './AdminCatalog';
import { archiveAdminClasses, loadRosterPreview, saveUniqueClassCatalog, subscribeAdminClasses,
  subscribeCatalog, updateKelas, type AdminClassTarget, type KatalogKelas } from './kelolaService';

const ADMIN_TABS = [{ key: 'kelas', label: 'Kelas' }, { key: 'katalog', label: 'Katalog' }] as const;
const VISIBLE_STUDENTS = 5;

type ClassRow = AdminClassTarget & Pick<Kelas, 'nama' | 'praktikum' | 'pesertaUids' | 'katalogId'>;
const rowKey = (row: AdminClassTarget) => row.kind + '/' + row.id;

function ClassPreview({ row, catalogRoster, selecting, checked, disabled, expanded, onEdit, onToggle, onToggleRoster }: {
  row: ClassRow;
  catalogRoster?: string[];
  selecting: boolean;
  checked: boolean;
  disabled: boolean;
  expanded: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onToggleRoster: () => void;
}) {
  const { roster, missing } = useMemo(() => {
    const enrolled = new Set(row.kind === 'kelas' ? row.pesertaUids : []);
    const missing = new Set(catalogRoster?.filter(uid => !enrolled.has(uid)));
    return { roster: [...missing, ...enrolled], missing };
  }, [catalogRoster, row.kind, row.pesertaUids]);
  const [previewHeight, setPreviewHeight] = useState<number>();
  const [loaded, setLoaded] = useState<{ roster: string[]; result: Awaited<ReturnType<typeof loadRosterPreview>> }>();
  const preview = loaded?.roster === roster ? loaded.result : undefined;
  const students = preview?.ok ? preview.data : undefined;
  const previewError = preview && !preview.ok ? preview.message : '';
  const scrollable = Boolean(students && students.length > VISIBLE_STUDENTS);
  useEffect(() => {
    if (!expanded || !roster.length || preview) return;
    let current = true;
    void loadRosterPreview(roster).then(result => {
      if (current) setLoaded({ roster, result });
    });
    return () => { current = false; };
  }, [expanded, preview, roster]);

  const renderStudents = (entries: NonNullable<typeof students>, offset = 0) => entries.map((student, index) => (
    <View key={student.id} style={styles.student}>
      <Text style={[type.mono, styles.studentIndex]}>{offset + index + 1}.</Text>
      <View style={styles.studentInfo}>
        <Text style={[type.body, styles.studentName]}>{student.nama}</Text>
        {missing.has(student.id) ? (
          <Text accessibilityLabel="Belum ditambahkan" numberOfLines={1} style={[type.label, styles.studentStatus]}>Belum</Text>
        ) : null}
      </View>
    </View>
  ));

  return <View style={[surface.panel, styles.card, checked && styles.selectedCard]}>
    <View style={styles.classInfo}>
      <View style={styles.titleRow}>
        <Text style={[type.title, styles.heading]}>{row.praktikum}</Text>
        <Action label="Edit" accessibilityLabel={`Edit ${row.nama}, ${row.praktikum}`}
          variant="quiet" disabled={disabled} onPress={onEdit} />
      </View>
      <View style={styles.row}>
        <View style={styles.heading}>
          <Text style={type.body}>{row.nama}</Text>
          {catalogRoster ? <Text style={type.muted}>{missing.size} mahasiswa belum ditambahkan oleh asisten</Text> : null}
        </View>
        {selecting ? <Pressable accessibilityRole="checkbox" accessibilityLabel={'Pilih ' + row.nama + ' ' + row.praktikum}
          accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onToggle}
          style={[surface.outline, styles.checkbox, checked && styles.checked]}>
          <Text style={checked ? styles.checkmark : type.label}>{checked ? '✓' : ' '}</Text>
        </Pressable> : null}
      </View>
    </View>
    <View style={styles.roster}>
      <Pressable accessibilityRole="button" aria-expanded={expanded}
        accessibilityLabel={`${roster.length} mahasiswa, ${row.nama}, ${row.praktikum}`}
        onPress={onToggleRoster}
        style={({ pressed }) => [surface.outline, styles.rosterToggle, (expanded || pressed) && styles.rosterToggleActive]}>
        <Text style={[type.label, styles.rosterCount]}>{roster.length} mahasiswa</Text>
        <Text aria-hidden style={styles.rosterCaret}>{expanded ? '▴' : '▾'}</Text>
      </Pressable>
      {expanded ? (
        <View style={[surface.panel, styles.rosterMenu]}>
          {previewError ? <Notice message={previewError} /> : null}
          {!roster.length ? <Text style={type.muted}>Belum ada mahasiswa.</Text> : null}
          {roster.length && !students && !previewError ? <Text style={type.muted}>Memuat mahasiswa…</Text> : null}
          {roster.length && students ? (
            <ScrollView nestedScrollEnabled persistentScrollbar={scrollable} scrollEnabled={scrollable}
              style={scrollable ? [styles.preview, previewHeight !== undefined && { maxHeight: previewHeight }] : undefined}
              contentContainerStyle={styles.previewList} accessibilityLabel={'Daftar mahasiswa ' + row.nama}>
              <View onLayout={({ nativeEvent }) => setPreviewHeight(nativeEvent.layout.height)}>
                {renderStudents(students.slice(0, VISIBLE_STUDENTS))}
              </View>
              {renderStudents(students.slice(VISIBLE_STUDENTS), VISIBLE_STUDENTS)}
            </ScrollView>
          ) : null}
        </View>
      ) : null}
    </View>
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
  const [expandedRoster, setExpandedRoster] = useState<string>();
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
  const catalogById = new Map(catalog.map(row => [row.id, row]));
  const linkedCatalog = editing && catalogById.get((editing.kind === 'kelas' ? editing.katalogId : editing.id) ?? '');

  const openEdit = (row: ClassRow) => {
    setFormError('');
    setEditing(row);
  };

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
    <View style={styles.tabs}>
      <Segments items={ADMIN_TABS} selected={tab} disabled={pending} label="Bagian admin" onChange={next => {
        setTab(next); setCatalogToEdit(undefined); setSelecting(false); setSelection([]); setExpandedRoster(undefined);
      }} />
    </View>
    {tab === 'katalog' ? <AdminCatalog initialClass={catalogToEdit} /> : <>
      <FlatList data={rows} keyExtractor={rowKey} extraData={expandedRoster} contentContainerStyle={surface.page}
        ListHeaderComponent={<ScreenHeading title="Kelola kelas" action={
          <Action label={selecting ? 'Selesai' : 'Edit Kelas'} style={styles.headingAction} variant="secondary" disabled={pending} onPress={() => {
            setSelecting(!selecting); setSelection([]);
          }} />
        }>
          {error ? <Notice message={error} /> : null}
        </ScreenHeading>}
        ListEmptyComponent={error ? undefined : <ScreenState title="Belum ada kelas" />}
        renderItem={({ item }) => {
          const key = rowKey(item);
          const catalogRoster = item.kind === 'katalogKelas' ? item.pesertaUids : catalogById.get(item.katalogId ?? '')?.pesertaUids;
          return <ClassPreview row={item} catalogRoster={catalogRoster} selecting={selecting} checked={selection.includes(key)} disabled={pending}
            onEdit={() => openEdit(item)}
            expanded={expandedRoster === key} onToggleRoster={() => setExpandedRoster(current => current === key ? undefined : key)}
            onToggle={() => setSelection(current => current.includes(key)
              ? current.filter(selectedKey => selectedKey !== key) : [...current, key])} />;
        }} />
      {selecting ? <View style={styles.toolbar}>
        <Text style={type.label}>{selected.length} kelas dipilih</Text>
        <View style={styles.toolbarActions}>
          <Action label="Edit kelas" style={styles.grow} variant="secondary" disabled={selected.length !== 1 || pending}
            onPress={() => openEdit(selected[0])} />
          <Action label="Arsipkan kelas" style={styles.grow} variant="danger" disabled={!selected.length || pending}
            onPress={() => { setFormError(''); setArchiving(selected); }} />
        </View>
      </View> : null}
    </>}
    {editing ? <Sheet visible title="Edit kelas" onClose={() => { if (!pending) setEditing(undefined); }} footer={<>
      <Action label="Batal" variant="secondary" disabled={pending} onPress={() => setEditing(undefined)} />
      <Action label="Simpan kelas" busy={pending} onPress={() => void save()} />
    </>}>
      <FieldGroup label="Nama kelas">
        <Field accessibilityLabel="Nama kelas" value={editing.nama} editable={!pending}
          onChangeText={nama => setEditing({ ...editing, nama })} />
      </FieldGroup>
      <FieldGroup label="Nama praktikum">
        <Field accessibilityLabel="Nama praktikum" value={editing.praktikum} editable={!pending}
          onChangeText={praktikum => setEditing({ ...editing, praktikum })} />
      </FieldGroup>
      {editing.kind === 'kelas' ? <Dropdown label="Katalog kelas" value={editing.katalogId ?? ''} disabled={pending}
        options={catalog.map(row => ({ id: row.id, label: row.nama + ' · ' + row.praktikum }))}
        onChange={katalogId => setEditing({ ...editing, katalogId })} /> : null}
      {linkedCatalog ? <Action label="Edit daftar mahasiswa katalog" variant="secondary" disabled={pending}
        onPress={() => {
          setEditing(undefined);
          setCatalogToEdit(linkedCatalog);
          setTab('katalog');
          setExpandedRoster(undefined);
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
  tabs: { paddingHorizontal: space.gutter, paddingTop: space.md },
  headingAction: { maxWidth: '40%' },
  card: { padding: space.inset, gap: space.md },
  selectedCard: { borderColor: color.cobalt, backgroundColor: color.blueWash },
  classInfo: { gap: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  heading: { flex: 1, minWidth: 0, gap: space.xs },
  checkbox: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center', borderColor: color.fieldBorder },
  checked: { backgroundColor: color.cobalt, borderColor: color.cobalt },
  checkmark: { ...type.label, color: color.onAccent },
  roster: { borderTopWidth: 1, borderTopColor: color.line, paddingTop: space.md, gap: space.sm },
  rosterToggle: { alignSelf: 'flex-start', minHeight: touch, backgroundColor: color.cream, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.xs, gap: space.sm },
  rosterToggleActive: { backgroundColor: color.blueWash, borderColor: color.cobalt },
  rosterCount: { flexShrink: 1, color: color.blueInk },
  rosterCaret: { color: color.cobalt, fontSize: 16, fontWeight: '700' },
  rosterMenu: { padding: space.sm },
  preview: { maxHeight: VISIBLE_STUDENTS * (type.body.lineHeight + 2 * space.xs) },
  previewList: { paddingRight: space.sm },
  student: { flexDirection: 'row', gap: space.sm, paddingVertical: space.xs },
  studentIndex: { minWidth: 20 },
  studentInfo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  studentName: { flexShrink: 1, minWidth: 0 },
  studentStatus: { flexShrink: 0, backgroundColor: color.straw, color: color.amber, borderRadius: space.xs, paddingHorizontal: space.sm, fontSize: 12, lineHeight: 22 },
  toolbar: { padding: space.inset, backgroundColor: color.sheet, borderTopWidth: 1, borderTopColor: color.line, gap: space.sm },
  toolbarActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  grow: { flexGrow: 1, flexShrink: 1 },
});
