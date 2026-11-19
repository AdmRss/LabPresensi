import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Action, Field, Notice, ScreenHeading, ScreenState } from '@/components/Interface';
import { Sheet } from '@/components/Sheet';
import { StatusBadge } from '@/components/StatusBadge';
import { color, space, surface, touch, type } from '@/constants/design';
import type { Kelas, Sesi } from '@/types';
import { getKelasList } from './kelolaService';
import { closeSesi, createSesi, deleteSesi, openSesi, subscribeSesiList, updateSesi } from './sesiService';

const SESSION_ACTIONS = {
  open: { label: 'Buka sesi', title: 'Buka sesi?', run: openSesi },
  close: { label: 'Tutup sesi', title: 'Tutup sesi?', run: closeSesi },
  delete: { label: 'Hapus sesi', title: 'Hapus sesi?', run: deleteSesi },
} as const;

type SessionAction = keyof typeof SESSION_ACTIONS;

export interface SesiTabProps {
  asistenId?: string;
}

export function SesiTab({ asistenId }: SesiTabProps) {
  const [sesiList, setSesiList] = useState<Sesi[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(Boolean(asistenId));
  const [error, setError] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [editingSesi, setEditingSesi] = useState<Sesi | null>(null);
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [labInput, setLabInput] = useState('');
  const [tanggalInput, setTanggalInput] = useState('');
  const [jamMulaiInput, setJamMulaiInput] = useState('');
  const [jamSelesaiInput, setJamSelesaiInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmation, setConfirmation] = useState<{ session: Sesi; action: SessionAction } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (!asistenId) return;
    let mounted = true;
    void getKelasList(asistenId).then((result) => {
      if (!mounted) return;
      if (result.ok) setKelasList(result.data);
      else setError(result.message);
    });

    const unsubscribe = subscribeSesiList(
      asistenId,
      (data) => { setSesiList(data); setLoading(false); },
      (message) => { setError(message); setLoading(false); },
    );
    return () => { mounted = false; unsubscribe(); };
  }, [asistenId]);

  const openForm = (session: Sesi | null) => {
    setEditingSesi(session);
    setSelectedKelasId(session?.kelasId ?? kelasList[0]?.id ?? '');
    setLabInput(session?.lab ?? '');
    setTanggalInput(session?.tanggal ?? '');
    setJamMulaiInput(session?.jamMulai ?? '');
    setJamSelesaiInput(session?.jamSelesai ?? '');
    setFormError(null);
    setFormVisible(true);
  };

  const saveSession = async () => {
    if (!asistenId || submitting) return;

    if (!selectedKelasId || !labInput.trim() || !tanggalInput.trim() || !jamMulaiInput.trim() || !jamSelesaiInput.trim()) {
      setFormError('Pilih kelas dan lengkapi semua kolom.');
      return;
    }

    const targetKelas = kelasList.find((kelas) => kelas.id === selectedKelasId);
    if (!targetKelas) {
      setFormError('Kelas yang dipilih tidak ditemukan.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const input = { lab: labInput, tanggal: tanggalInput, jamMulai: jamMulaiInput, jamSelesai: jamSelesaiInput };
    const result = editingSesi
      ? await updateSesi(editingSesi.id, asistenId, input)
      : await createSesi({
        ...input, asistenId, kelasId: targetKelas.id, kelasNama: targetKelas.nama, praktikum: targetKelas.praktikum,
      });
    setSubmitting(false);
    if (result.ok) setFormVisible(false);
    else setFormError(result.message);
  };

  const requestAction = (session: Sesi, action: SessionAction) => {
    setActionError(null);
    setConfirmation({ session, action });
  };

  const confirmAction = async () => {
    if (!asistenId || !confirmation || actionPending) return;
    setActionPending(true);
    setActionError(null);
    const result = await SESSION_ACTIONS[confirmation.action].run(confirmation.session.id, asistenId);
    setActionPending(false);
    if (result.ok) setConfirmation(null);
    else setActionError(result.message);
  };

  const action = confirmation ? SESSION_ACTIONS[confirmation.action] : null;

  return (
    <>
      <FlatList
        contentContainerStyle={styles.content}
        data={loading ? [] : sesiList}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={(
          <View style={styles.header}>
            <ScreenHeading title="Sesi praktikum">
              <Action label="+ Tambah sesi" style={styles.start} disabled={!asistenId} tactile onPress={() => openForm(null)} />
            </ScreenHeading>
            {error ? <Notice message={error} /> : null}
          </View>
        )}
        ListEmptyComponent={!asistenId
          ? <ScreenState title="Akses asisten diperlukan" tone="danger" />
          : loading
            ? <ScreenState title="Memuat sesi…" loading />
            : error
              ? <ScreenState title="Daftar sesi tidak tersedia" tone="danger" />
              : <ScreenState title="Belum ada sesi" description="Tambahkan sesi untuk menentukan jadwal, lokasi, dan waktu presensi." />}
        renderItem={({ item }) => (
          <View style={styles.session}>
            <View style={styles.sessionMeta}>
              <Text style={type.mono}>{item.tanggal} · {item.jamMulai}–{item.jamSelesai}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={type.title}>{item.praktikum}</Text>
            <Text style={type.muted}>Kelas {item.kelasNama} · {item.lab}</Text>
            <View style={styles.actions}>
              {item.status === 'BELUM_DIBUKA' ? (
                <>
                  <Action label="Buka sesi" onPress={() => requestAction(item, 'open')} />
                  <Action label="Edit" variant="secondary" onPress={() => openForm(item)} />
                  <Action label="Hapus" variant="danger" onPress={() => requestAction(item, 'delete')} />
                </>
              ) : item.status === 'DIBUKA' ? (
                <Action label="Tutup sesi" variant="secondary" onPress={() => requestAction(item, 'close')} />
              ) : (
                <Action label="Hapus" variant="danger" onPress={() => requestAction(item, 'delete')} />
              )}
            </View>
          </View>
        )}
      />

      <Sheet
        title={editingSesi ? 'Edit sesi' : 'Tambah sesi'}
        visible={formVisible}
        onClose={() => { if (!submitting) setFormVisible(false); }}
        footer={(
          <>
            <Action label="Batal" variant="secondary" disabled={submitting} onPress={() => setFormVisible(false)} />
            <Action label="Simpan sesi" disabled={!selectedKelasId} busy={submitting} onPress={() => void saveSession()} />
          </>
        )}>
        {formError ? <Notice message={formError} /> : null}
        {!editingSesi ? (
          <View style={styles.field}>
            <Text style={type.label}>Pilih kelas</Text>
            {!kelasList.length ? (
              <Notice message="Tambahkan kelas di menu Kelas & peserta sebelum membuat sesi." tone="warning" />
            ) : (
              <View accessibilityRole="radiogroup" style={styles.field}>
                {kelasList.map((kelas) => {
                  const selected = selectedKelasId === kelas.id;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected, disabled: submitting }}
                      disabled={submitting}
                      key={kelas.id}
                      onPress={() => setSelectedKelasId(kelas.id)}
                      style={({ pressed }) => [surface.outline, styles.classOption, (selected || pressed) && styles.classOptionSelected]}>
                      <Text style={type.label}>{kelas.nama} · {kelas.praktikum}</Text>
                      {selected ? <Text style={type.mono}>Terpilih</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
        <View style={styles.field}>
          <Text style={type.label}>Lokasi lab</Text>
          <Field accessibilityLabel="Lokasi lab" editable={!submitting} onChangeText={setLabInput} placeholder="Contoh Lab RPL 1" value={labInput} />
        </View>
        <View style={styles.field}>
          <Text style={type.label}>Tanggal (YYYY-MM-DD)</Text>
          <Field accessibilityLabel="Tanggal sesi (tahun, bulan, tanggal)" editable={!submitting} onChangeText={setTanggalInput} placeholder="YYYY-MM-DD" value={tanggalInput} />
        </View>
        <View style={styles.actions}>
          <View style={[styles.field, styles.timeField]}>
            <Text style={type.label}>Jam mulai</Text>
            <Field accessibilityLabel="Jam mulai" editable={!submitting} onChangeText={setJamMulaiInput} placeholder="08:00" value={jamMulaiInput} />
          </View>
          <View style={[styles.field, styles.timeField]}>
            <Text style={type.label}>Jam selesai</Text>
            <Field accessibilityLabel="Jam selesai" editable={!submitting} onChangeText={setJamSelesaiInput} placeholder="10:00" value={jamSelesaiInput} />
          </View>
        </View>
      </Sheet>

      {confirmation && action ? (
        <ConfirmSheet
          visible pending={actionPending} error={actionError}
          title={action.title}
          message={`${confirmation.session.praktikum} · Kelas ${confirmation.session.kelasNama} · ${confirmation.session.tanggal}`}
          confirmLabel={action.label}
          destructive={confirmation.action === 'delete'}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void confirmAction()}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.gutter, gap: space.md },
  header: { gap: space.md },
  start: { alignSelf: 'flex-start' },
  session: { backgroundColor: color.sheet, borderWidth: 1, borderColor: color.ink, padding: space.md, gap: space.sm },
  sessionMeta: {
    alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', flexWrap: 'wrap',
    gap: space.xs, borderBottomColor: color.line, borderBottomWidth: 1, paddingBottom: space.sm,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  field: { gap: space.xs },
  timeField: { flexGrow: 1, flexBasis: 106 },
  classOption: { backgroundColor: color.sheet, minHeight: touch, justifyContent: 'center', padding: space.sm },
  classOptionSelected: { backgroundColor: color.blueWash, borderColor: color.cobalt },
});
