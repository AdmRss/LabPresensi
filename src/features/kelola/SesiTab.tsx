import { useEffect, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';

import { Dropdown } from '@/components/Dropdown';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Action, Notice, ScreenHeading, ScreenState } from '@/components/Interface';
import { Sheet } from '@/components/Sheet';
import { StatusBadge } from '@/components/StatusBadge';
import { color, space, type } from '@/constants/design';
import type { Kelas, Sesi } from '@/types';
import { dateKey, formatMinutes, parseDate, pickerMinutes, pickerTime, timeMinutes } from './schedule';
import { SchedulePicker } from './SchedulePicker';
import { closeSesi, createSesi, markAssistantPresent, openSesi, subscribeSesiList, updateSesi } from './sesiService';

import { subscribeCatalog, type KatalogKelas, type LokasiPraktikum } from './kelolaService';
import { effectiveSessionStatus, scheduledTime, todayWib } from './sessionClock';
import { useScheduleClock } from './useScheduleClock';

const SESSION_ACTIONS = {
  open: { label: 'Buka sesi', title: 'Buka sesi?', run: openSesi },
  close: { label: 'Tutup sesi', title: 'Tutup sesi?', run: closeSesi },
} as const;

const dateLabel = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' });
const PICKER_LABELS = { date: 'Tanggal sesi', start: 'Jam mulai', end: 'Jam selesai' } as const;
type PickerField = keyof typeof PICKER_LABELS;

type SessionAction = keyof typeof SESSION_ACTIONS;

export interface SesiTabProps {
  asistenId?: string;
  kelasList: Kelas[];
}

export function SesiTab({ asistenId, kelasList }: SesiTabProps) {
  const [sesiList, setSesiList] = useState<Sesi[]>([]);
  const [loading, setLoading] = useState(Boolean(asistenId));
  const [error, setError] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [editingSesi, setEditingSesi] = useState<Sesi | null>(null);
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [lokasiId, setLokasiId] = useState('');
  const [locations, setLocations] = useState<LokasiPraktikum[]>([]);
  const [catalog, setCatalog] = useState<KatalogKelas[]>([]);
  const [attendance, setAttendance] = useState<string[]>([]);
  const [marking, setMarking] = useState('');
  const now = useScheduleClock();
  const availableClasses = kelasList.filter(row => catalog.some(option => option.id === row.katalogId));
  useEffect(() => subscribeCatalog('lokasiPraktikum', setLocations, setError), []);
  useEffect(() => subscribeCatalog('katalogKelas', setCatalog, setError), []);
  const [date, setDate] = useState<Date | null>(null);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [picker, setPicker] = useState<PickerField | null>(null);
  const pickerInSheet = picker !== null && Platform.OS !== 'android';
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmation, setConfirmation] = useState<{ session: Sesi; action: SessionAction } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (!asistenId) return;
    return subscribeSesiList(
      asistenId,
      (data) => { setSesiList(data); setLoading(false); },
      (message) => { setError(message); setLoading(false); },
    );
  }, [asistenId]);

  const openForm = (session: Sesi | null) => {
    setEditingSesi(session);
    setSelectedKelasId(session?.kelasId ?? availableClasses[0]?.id ?? '');
    setLokasiId(session?.lokasiId ?? '');
    setDate(session ? parseDate(session.tanggal) : null);
    setStart(session ? timeMinutes(session.jamMulai) : null);
    setEnd(session ? timeMinutes(session.jamSelesai) : null);
    setPicker(null);
    setFormError(null);
    setFormVisible(true);
  };

  const saveSession = async () => {
    if (!asistenId || submitting) return;

    const targetKelas = kelasList.find((kelas) => kelas.id === selectedKelasId);
    if (!targetKelas) {
      setFormError('Kelas yang dipilih tidak ditemukan.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const input = { lab: locations.find(row => row.id === lokasiId)?.nama ?? '', lokasiId, date, start, end };
    const result = editingSesi
      ? await updateSesi(editingSesi.id, asistenId, input)
      : await createSesi({
        ...input, asistenId, kelasId: targetKelas.id,
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

  const mark = async (session: Sesi) => {
    if (!asistenId || marking) return;
    setMarking(session.id);
    setError(null);
    const result = await markAssistantPresent(session, asistenId);
    if (result.ok) setAttendance(rows => [...rows, session.id]);
    else setError(result.message);
    setMarking('');
  };

  const action = confirmation ? SESSION_ACTIONS[confirmation.action] : null;
  const pickerControl = picker && (
    <SchedulePicker key={picker}
      mode={picker === 'date' ? 'date' : 'time'}
      minimumDate={picker === 'date' ? todayWib(new Date(now)) : undefined}
      value={picker === 'date' ? date ?? todayWib(new Date(now)) : pickerTime((picker === 'start' ? start : end) ?? 8 * 60)}
      onCancel={() => setPicker(null)}
      onConfirm={value => {
        if (!Number.isFinite(value.getTime())) {
          setFormError('Pilihan tanggal atau jam tidak valid.');
          setPicker(null);
          return;
        }
        if (picker === 'date' && dateKey(value) < dateKey(todayWib())) {
          setFormError('Tanggal sesi sudah lewat.');
          setPicker(null);
          return;
        }
        if (picker !== 'date' && date && scheduledTime(dateKey(date), formatMinutes(pickerMinutes(value))) <= Date.now()) {
          setFormError('Waktu yang dipilih sudah lewat.');
          setPicker(null);
          return;
        }
        if (picker === 'date') setDate(value);
        else if (picker === 'start') setStart(pickerMinutes(value));
        else setEnd(pickerMinutes(value));
        setFormError(null);
        setPicker(null);
      }}
    />
  );

  return (
    <>
      <FlatList
        contentContainerStyle={styles.content}
        data={loading ? [] : sesiList.filter(session => !session.archived
          && (effectiveSessionStatus(session, now) === 'DIBUKA' || kelasList.some(kelas => kelas.id === session.kelasId)))}
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
        renderItem={({ item }) => {
          const status = effectiveSessionStatus(item, now);
          return (
          <View style={styles.session}>
            <View style={styles.sessionMeta}>
              <Text style={type.mono}>{item.tanggal} · {item.jamMulai}–{item.jamSelesai}</Text>
              <StatusBadge status={status} />
            </View>
            <Text style={type.title}>{item.praktikum}</Text>
            <Text style={type.muted}>Kelas {item.kelasNama} · {item.lab}</Text>
            <View style={styles.actions}>
              {status === 'BELUM_DIBUKA' ? <>
                {!item.startAt ? <Action label="Buka sesi" onPress={() => requestAction(item, 'open')} /> : null}
                <Action label="Edit" variant="secondary" onPress={() => openForm(item)} />
              </> : null}
              {status === 'DIBUKA' ? <>
                <Action label="Tutup sesi" variant="secondary" onPress={() => requestAction(item, 'close')} />
                <Action label={attendance.includes(item.id) ? 'Sudah hadir' : 'Hadir'} busy={marking === item.id}
                  disabled={attendance.includes(item.id) || Boolean(marking)} onPress={() => void mark(item)} />
              </> : null}
            </View>
          </View>
        ); }}
      />

      <Sheet
        title={pickerInSheet ? PICKER_LABELS[picker] : editingSesi ? 'Edit sesi' : 'Tambah sesi'}
        visible={formVisible}
        onClose={() => {
          if (picker) setPicker(null);
          else if (!submitting) setFormVisible(false);
        }}
        footer={pickerInSheet ? undefined : (
          <>
            <Action label="Batal" variant="secondary" disabled={submitting} onPress={() => setFormVisible(false)} />
            <Action label="Simpan sesi" disabled={!selectedKelasId || !lokasiId} busy={submitting} onPress={() => void saveSession()} />
          </>
        )}>
        {pickerInSheet ? pickerControl : <>
          {formError ? <Notice message={formError} /> : null}
          {!editingSesi ? <Dropdown label="Kelas" value={selectedKelasId} disabled={submitting}
            options={availableClasses.map(row => ({ id: row.id, label: row.nama + ' · ' + row.praktikum }))}
            onChange={setSelectedKelasId} /> : null}
          <Dropdown label="Lokasi lab" value={lokasiId} disabled={submitting}
            options={locations.map(row => ({ id: row.id, label: row.nama }))} onChange={setLokasiId} />
          <View style={styles.field}>
            <Text style={type.label}>{PICKER_LABELS.date}</Text>
            <Action label={date ? dateLabel.format(date) : 'Pilih tanggal'} variant="secondary"
              disabled={submitting} onPress={() => setPicker('date')} />
          </View>
          <View style={styles.actions}>
            <View style={[styles.field, styles.timeField]}>
              <Text style={type.label}>{PICKER_LABELS.start}</Text>
              <Action label={start === null ? 'Pilih jam mulai' : formatMinutes(start)} variant="secondary"
                accessibilityLabel={start === null ? 'Pilih jam mulai' : 'Jam mulai ' + formatMinutes(start)}
                disabled={submitting} onPress={() => setPicker('start')} />
            </View>
            <View style={[styles.field, styles.timeField]}>
              <Text style={type.label}>{PICKER_LABELS.end}</Text>
              <Action label={end === null ? 'Pilih jam selesai' : formatMinutes(end)} variant="secondary"
                accessibilityLabel={end === null ? 'Pilih jam selesai' : 'Jam selesai ' + formatMinutes(end)}
                disabled={submitting} onPress={() => setPicker('end')} />
            </View>
          </View>
          {pickerControl}
        </>}
      </Sheet>

      {confirmation && action ? (
        <ConfirmSheet
          visible pending={actionPending} error={actionError}
          title={action.title}
          message={`${confirmation.session.praktikum} · Kelas ${confirmation.session.kelasNama} · ${confirmation.session.tanggal}`}
          confirmLabel={action.label}
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
});
