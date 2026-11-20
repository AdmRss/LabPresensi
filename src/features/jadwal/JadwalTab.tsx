import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';

import { effectiveSessionStatus } from '@/features/kelola/sessionClock';
import { sessionSections } from '@/features/kelola/sessionPresentation';
import { useScheduleClock } from '@/features/kelola/useScheduleClock';
import { Action, Notice, ScreenHeading, ScreenState, type Tone } from '@/components/Interface';
import { StatusBadge } from '@/components/StatusBadge';
import { color, space, surface, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { attendanceTime } from '@/features/rekap/rekapService';
import type { AppUser, Kelas, Presensi, Sesi } from '@/types';
import { mapFirebaseError } from '@/utils/firebaseError';
import { createPresensi, subscribeToPresensi, subscribeToStudentSessions } from './services/jadwalService';

const shortDate = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const checkInBySessionStatus = {
  BELUM_DIBUKA: { title: 'Presensi belum dibuka', tone: 'warning', description: 'Presensi tersedia setelah asisten membuka sesi.' },
  DIBUKA: { title: 'Presensi tersedia', tone: 'info' },
  DITUTUP: { title: 'Presensi ditutup', tone: 'neutral', description: 'Sesi ini sudah ditutup.' },
} as const;

function formatDate(value: string, formatter: Intl.DateTimeFormat) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : formatter.format(date);
}

export function JadwalTab() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Sesi[]>([]);
  const now = useScheduleClock();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedSession = sessions.find((session) => session.id === selectedId);

  useEffect(() => {
    if (authLoading || !user || user.role !== 'PRAKTIKAN') return;
    return subscribeToStudentSessions(
      user.uid,
      rows => { setSessions(rows); setError(null); },
      (snapshotError) => {
        setError(mapFirebaseError(snapshotError));
        setLoading(false);
      },
      setLoading,
      setClasses,
      setFromCache,
    );
  }, [authLoading, user]);

  if (selectedSession && user?.role === 'PRAKTIKAN' && !error) {
    return <SessionDetail key={user.uid + '/' + selectedSession.id} user={user}
      selectedSession={{ ...selectedSession, status: effectiveSessionStatus(selectedSession, now) }} onBack={() => setSelectedId(null)} />;
  }

  const scheduledClassIds = new Set(sessions.map(session => session.kelasId));
  const classesWithoutSessions = classes.filter(kelas => !scheduledClassIds.has(kelas.id));
  const header = <ScreenHeading title="Jadwal praktikum" />;
  if (authLoading || loading || !user || user.role !== 'PRAKTIKAN' || error) {
    return (
      <ScrollView contentContainerStyle={surface.page}>
        {header}
        {!authLoading && (!user || user.role !== 'PRAKTIKAN')
          ? <ScreenState title="Akses praktikan diperlukan" />
          : error
            ? <ScreenState title="Jadwal tidak tersedia" description={error} tone="danger" />
            : <ScreenState title="Memuat jadwal…" loading />}
      </ScrollView>
    );
  }

  return (
    <SectionList
      contentContainerStyle={[surface.page, surface.groupedList]}
      sections={sessionSections(sessions, now)}
      stickySectionHeadersEnabled={false}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<View style={styles.section}>
        {header}
        {fromCache ? <Notice message="Daftar kelas menunggu sinkronisasi. Periksa koneksi internet." tone="warning" /> : null}
      </View>}
      renderSectionHeader={({ section }) => <Text accessibilityRole="header" style={[type.heading, surface.groupTitle]}>{section.title}</Text>}
      ListEmptyComponent={classes.length ? undefined : <ScreenState
        title={fromCache ? 'Jadwal belum tersedia dari server' : 'Anda belum terdaftar di kelas'}
        description="Kelas akan tampil setelah asisten menambahkan Anda sebagai peserta." />}
      ListFooterComponent={classesWithoutSessions.length ? (
        <View style={styles.classes}>
          <Text accessibilityRole="header" style={type.heading}>Kelas tanpa sesi</Text>
          {classesWithoutSessions.map(kelas => (
            <View key={kelas.id} style={[surface.panel, styles.classRow]}>
              <Text style={type.title}>{kelas.nama}</Text>
              <Text style={type.body}>{kelas.praktikum}</Text>
              <Text style={type.muted}>Asisten belum menambahkan sesi praktikum.</Text>
            </View>
          ))}
        </View>
      ) : undefined}
      renderItem={({ item }) => {
        const status = effectiveSessionStatus(item, now);
        const open = status === 'DIBUKA';
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Buka detail sesi"
            onPress={() => setSelectedId(item.id)}
            style={({ pressed }) => [surface.panel, surface.groupItem, styles.scheduleRow, open && styles.openRow, pressed && styles.rowPressed]}>
            <View style={[styles.datePlate, open && styles.openDate]}>
              <Text style={[type.mono, styles.dateText]}>{formatDate(item.tanggal, shortDate).toUpperCase()}</Text>
            </View>
            <View style={styles.scheduleBody}>
              <Text style={type.title}>{item.praktikum}</Text>
              <Text style={type.muted}>{item.kelasNama} · {item.lab}</Text>
              <View style={styles.scheduleMeta}>
                <Text style={type.mono}>{item.jamMulai}–{item.jamSelesai}</Text>
                <StatusBadge status={status} />
              </View>
            </View>
            <Text aria-hidden style={styles.arrow}>›</Text>
          </Pressable>
        );
      }}
    />
  );
}

function SessionDetail({ user, selectedSession, onBack }: { user: AppUser; selectedSession: Sesi; onBack: () => void }) {
  const [attendance, setAttendance] = useState<Presensi | null>(null);
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  const busy = useRef(false);
  useEffect(() => subscribeToPresensi(selectedSession.id, user.uid, (record, localPending) => {
    setAttendance(record);
    setPending(localPending);
    setReading(false);
  }, error => { setFeedback({ message: mapFirebaseError(error), ok: false }); setReading(false); }), [selectedSession.id, user.uid]);

  const submitAttendance = async () => {
    if (busy.current || pending || reading) return;
    busy.current = true;
    setAttendanceLoading(true);
    setFeedback(null);
    try {
      const result = await createPresensi(selectedSession, user);
      setFeedback(result.ok ? { ok: true, message: 'Presensi berhasil dicatat.' } : result);
    } catch (submitError) {
      setFeedback({ message: mapFirebaseError(submitError), ok: false });
    } finally {
      busy.current = false;
      setAttendanceLoading(false);
    }
  };

  const details = [
    ['Kelas', selectedSession.kelasNama],
    ['Laboratorium', selectedSession.lab],
    ['Tanggal', formatDate(selectedSession.tanggal, fullDate)],
    ['Waktu', `${selectedSession.jamMulai}–${selectedSession.jamSelesai}`],
  ];

  const awaitingServer = pending || attendanceLoading;
  const confirmed = Boolean(attendance || feedback?.ok);
  const failure = feedback && !feedback.ok ? feedback.message : undefined;
  let status: { title: string; tone: Tone; description?: string } = checkInBySessionStatus[selectedSession.status];
  if (awaitingServer) {
    status = { title: 'Menunggu konfirmasi server', tone: 'info' };
  } else if (confirmed) {
    status = { title: 'Presensi tercatat', tone: 'success',
      description: attendance ? `Waktu presensi ${attendanceTime(attendance.timestamp)}` : feedback?.message };
  } else if (reading) {
    status = { title: 'Memeriksa presensi…', tone: 'info' };
  } else if (failure) {
    status = { title: 'Presensi belum dapat dikonfirmasi', tone: 'danger', description: failure };
  }

  return (
    <ScrollView contentContainerStyle={surface.page}>
      <Action label="‹ Kembali ke jadwal" variant="quiet" style={styles.back} onPress={onBack} />
      <View style={[surface.panel, styles.ticket]}>
        <View style={styles.ticketHeading}>
          <Text accessibilityRole="header" style={[type.display, styles.ticketTitle]}>{selectedSession.praktikum}</Text>
          <StatusBadge status={selectedSession.status} />
        </View>
        <View style={styles.details}>
          {details.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={[type.label, styles.detailLabel]}>{label}</Text>
              <Text style={[type.body, styles.detailValue]}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
      <ScreenState title={status.title} tone={status.tone} description={status.description} loading={reading || (pending && !attendanceLoading)}>
        {failure && (confirmed || reading || awaitingServer) ? <Notice message={failure} /> : null}
        {!attendance ? <Action label="Presensi sekarang" style={styles.attendanceAction}
          disabled={selectedSession.status !== 'DIBUKA' || pending || reading} busy={attendanceLoading} tactile onPress={() => void submitAttendance()} /> : null}
      </ScreenState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md, marginBottom: space.md },
  classes: { gap: space.md },
  classRow: { padding: space.inset, gap: space.xs },
  scheduleRow: { flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' },
  openRow: { borderColor: color.blueLine },
  rowPressed: { backgroundColor: color.blueWash },
  datePlate: { width: '22%', maxWidth: 92, backgroundColor: color.cream, padding: space.sm, justifyContent: 'center' },
  openDate: { backgroundColor: color.blueWash },
  dateText: { color: color.blueInk, fontWeight: '700', textAlign: 'center' },
  scheduleBody: { flex: 1, minWidth: 0, padding: space.md, gap: space.xs },
  scheduleMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.md, rowGap: space.xs, marginTop: space.xs },
  arrow: { color: color.cobalt, fontSize: 22, alignSelf: 'center', paddingRight: space.md },
  back: { alignSelf: 'flex-start' },
  ticket: { overflow: 'hidden' },
  ticketHeading: { backgroundColor: color.blueInk, borderBottomWidth: 3, borderBottomColor: color.cobalt, padding: space.gutter, gap: space.md },
  ticketTitle: { color: color.onAccent },
  details: { paddingHorizontal: space.gutter },
  detailRow: { minHeight: 46, flexDirection: 'row', gap: space.md, alignItems: 'center', borderTopWidth: 1, borderTopColor: color.line, paddingVertical: space.sm },
  detailLabel: { flex: 2 },
  detailValue: { flex: 3 },
  attendanceAction: { alignSelf: 'stretch', marginTop: space.xs },
});
