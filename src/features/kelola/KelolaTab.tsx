import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Action, Field, Notice, ScreenHeading, ScreenState, Segments, Stamp } from '@/components/Interface';
import { Sheet } from '@/components/Sheet';
import { color, space, type } from '@/constants/design';
import type { AppUser, Kelas } from '@/types';
import { addPeserta, createKelas, deleteKelas, getKelasList, getPraktikanList, removePeserta, updateKelas } from './kelolaService';
import { SesiTab } from './SesiTab';

const TABS = [
  { key: 'KELAS', label: 'Kelas & peserta' },
  { key: 'SESI', label: 'Sesi praktikum' },
] as const;

export interface KelolaTabProps {
  asistenId?: string;
}

export function KelolaTab({ asistenId }: KelolaTabProps) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('KELAS');
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(Boolean(asistenId));
  const [error, setError] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [namaInput, setNamaInput] = useState('');
  const [praktikumInput, setPraktikumInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deletingKelas, setDeletingKelas] = useState<Kelas | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedKelasId, setSelectedKelasId] = useState<string | null>(null);
  const [allPraktikan, setAllPraktikan] = useState<AppUser[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [pendingParticipant, setPendingParticipant] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const activeKelas = kelasList.find((kelas) => kelas.id === selectedKelasId);

  const fetchKelas = useCallback(async () => {
    if (!asistenId) return;
    setError(null);
    setLoading(true);
    const result = await getKelasList(asistenId);
    if (result.ok) setKelasList(result.data);
    else setError(result.message);
    setLoading(false);
  }, [asistenId]);

  useEffect(() => {
    let mounted = true;
    if (asistenId) {
      void getKelasList(asistenId).then((result) => {
        if (!mounted) return;
        if (result.ok) setKelasList(result.data);
        else setError(result.message);
        setLoading(false);
      });
    }
    return () => { mounted = false; };
  }, [asistenId]);

  const openForm = (kelas: Kelas | null) => {
    setEditingKelas(kelas);
    setNamaInput(kelas?.nama ?? '');
    setPraktikumInput(kelas?.praktikum ?? '');
    setFormError(null);
    setFormVisible(true);
  };

  const saveKelas = async () => {
    if (!asistenId || submitting) return;
    if (!namaInput.trim() || !praktikumInput.trim()) {
      setFormError('Nama kelas dan praktikum wajib diisi.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const input = { nama: namaInput, praktikum: praktikumInput };
    const result = editingKelas ? await updateKelas(editingKelas.id, input) : await createKelas({ ...input, asistenId });
    setSubmitting(false);
    if (result.ok) {
      setFormVisible(false);
      void fetchKelas();
    } else {
      setFormError(result.message);
    }
  };

  const removeKelas = async () => {
    if (!deletingKelas || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteKelas(deletingKelas.id);
    setDeleting(false);
    if (result.ok) {
      setDeletingKelas(null);
      void fetchKelas();
    } else {
      setDeleteError(result.message);
    }
  };

  const loadParticipants = async () => {
    if (participantsLoading) return;
    setParticipantsLoading(true);
    setParticipantError(null);
    const result = await getPraktikanList();
    if (result.ok) setAllPraktikan(result.data);
    else setParticipantError(result.message);
    setParticipantsLoading(false);
  };

  const openParticipants = (kelas: Kelas) => {
    setSearchQuery('');
    setAllPraktikan([]);
    setSelectedKelasId(kelas.id);
    void loadParticipants();
  };

  const changeParticipant = async (uid: string, enrolled: boolean) => {
    if (!activeKelas || pendingParticipant) return;
    const kelasId = activeKelas.id;
    setPendingParticipant(uid);
    setParticipantError(null);
    const result = enrolled ? await removePeserta(kelasId, uid) : await addPeserta(kelasId, uid);
    if (result.ok) {
      setKelasList((current) => current.map((kelas) => {
        if (kelas.id !== kelasId) return kelas;
        const pesertaUids = enrolled
          ? kelas.pesertaUids.filter((id) => id !== uid)
          : [...new Set([...kelas.pesertaUids, uid])];
        return { ...kelas, pesertaUids };
      }));
    } else {
      setParticipantError(result.message);
    }
    setPendingParticipant(null);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPraktikan = allPraktikan.filter(
    (item) => item.nama.toLowerCase().includes(normalizedQuery) || item.nim?.toLowerCase().includes(normalizedQuery),
  );

  return (
    <View style={styles.container}>
      <View style={styles.switcher}>
        <Segments items={TABS} selected={activeTab} onChange={setActiveTab} label="Bagian kelola" />
      </View>
      {!asistenId ? (
        <View style={styles.content}><ScreenState title="Akses asisten diperlukan" tone="danger" /></View>
      ) : activeTab === 'SESI' ? (
        <SesiTab asistenId={asistenId} />
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={loading ? [] : kelasList}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={(
            <View style={styles.listHeader}>
              <ScreenHeading title="Kelas praktikum">
                <Action label="+ Tambah kelas" style={styles.start} tactile onPress={() => openForm(null)} />
              </ScreenHeading>
              {error ? <Notice message={error} /> : null}
            </View>
          )}
          ListEmptyComponent={loading
            ? <ScreenState title="Memuat kelas…" loading />
            : error
              ? <ScreenState title="Daftar kelas tidak tersedia" tone="danger"><Action label="Muat ulang" variant="secondary" onPress={() => void fetchKelas()} /></ScreenState>
              : <ScreenState title="Belum ada kelas" description="Tambahkan kelas untuk mengatur peserta dan membuat sesi praktikum." />}
          renderItem={({ item }) => (
            <View style={styles.classRow}>
              <View style={styles.rowTop}>
                <View style={styles.rowTitle}>
                  <Text style={type.title}>{item.nama}</Text>
                  <Text style={type.body}>{item.praktikum}</Text>
                </View>
                <Stamp label={`${item.pesertaUids.length} peserta`} />
              </View>
              <View style={styles.actions}>
                <Action label="Atur peserta" variant="secondary" onPress={() => openParticipants(item)} />
                <Action label="Edit" variant="secondary" onPress={() => openForm(item)} />
                <Action label="Hapus" variant="danger" onPress={() => { setDeleteError(null); setDeletingKelas(item); }} />
              </View>
            </View>
          )}
        />
      )}

      <Sheet
        title={editingKelas ? 'Edit kelas' : 'Tambah kelas'}
        visible={formVisible}
        onClose={() => { if (!submitting) setFormVisible(false); }}
        footer={(
          <>
            <Action label="Batal" variant="secondary" disabled={submitting} onPress={() => setFormVisible(false)} />
            <Action label="Simpan kelas" busy={submitting} onPress={() => void saveKelas()} />
          </>
        )}>
        {formError ? <Notice message={formError} /> : null}
        <View style={styles.field}>
          <Text style={type.label}>Nama kelas</Text>
          <Field accessibilityLabel="Nama kelas" editable={!submitting} onChangeText={setNamaInput} placeholder="Contoh 3A atau IF-1" value={namaInput} />
        </View>
        <View style={styles.field}>
          <Text style={type.label}>Nama praktikum</Text>
          <Field accessibilityLabel="Nama praktikum" editable={!submitting} onChangeText={setPraktikumInput} placeholder="Contoh Pemrograman Perangkat Bergerak" value={praktikumInput} />
        </View>
      </Sheet>

      {activeKelas ? (
        <Sheet
          list
          title={`Peserta · ${activeKelas.nama}`}
          visible
          onClose={() => { if (!pendingParticipant) setSelectedKelasId(null); }}
          footer={<Action label="Selesai" disabled={Boolean(pendingParticipant)} onPress={() => setSelectedKelasId(null)} />}>
          <Text style={type.body}>{activeKelas.praktikum} · {activeKelas.pesertaUids.length} peserta</Text>
          <Field accessibilityLabel="Cari praktikan" autoCorrect={false} onChangeText={setSearchQuery} placeholder="Cari nama atau NIM" value={searchQuery} />
          {participantError ? <Notice message={participantError} /> : null}
          {participantsLoading ? (
            <ScreenState title="Memuat peserta…" loading />
          ) : (
            <FlatList
              data={filteredPraktikan}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.uid}
              ListEmptyComponent={participantError
                ? <Action label="Muat ulang" variant="secondary" onPress={() => void loadParticipants()} />
                : <Text style={type.muted}>{normalizedQuery ? 'Tidak ada praktikan yang cocok.' : 'Belum ada praktikan terdaftar.'}</Text>}
              renderItem={({ item }) => {
                const enrolled = activeKelas.pesertaUids.includes(item.uid);
                const action = enrolled ? 'Cabut' : 'Tambah';
                return (
                  <View style={styles.participant}>
                    <View style={styles.rowTitle}>
                      <Text style={type.label}>{item.nama}</Text>
                      <Text style={type.mono}>NIM {item.nim || '—'}</Text>
                    </View>
                    <Action label={action} accessibilityLabel={`${action} ${item.nama}`} variant={enrolled ? 'danger' : 'secondary'} busy={pendingParticipant === item.uid} disabled={Boolean(pendingParticipant)} onPress={() => void changeParticipant(item.uid, enrolled)} />
                  </View>
                );
              }}
            />
          )}
        </Sheet>
      ) : null}

      {deletingKelas ? (
        <ConfirmSheet
          visible pending={deleting} error={deleteError} destructive
          title="Hapus kelas?"
          message={`Kelas ${deletingKelas.nama} · ${deletingKelas.praktikum} akan dihapus.`}
          confirmLabel="Hapus kelas"
          onCancel={() => setDeletingKelas(null)}
          onConfirm={() => void removeKelas()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  switcher: { paddingHorizontal: space.gutter, paddingTop: space.md },
  content: { padding: space.gutter, gap: space.md },
  listHeader: { gap: space.md },
  start: { alignSelf: 'flex-start' },
  classRow: { backgroundColor: color.sheet, borderTopWidth: 2, borderTopColor: color.ink, padding: space.md, gap: space.md },
  rowTop: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'flex-start' },
  rowTitle: { flexGrow: 1, flexShrink: 1, minWidth: 100, gap: space.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  field: { gap: space.xs },
  participant: {
    borderTopColor: color.line, borderTopWidth: 1, paddingVertical: space.sm,
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm,
  },
});
