import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { effectiveSessionStatus } from '@/features/kelola/sessionClock';
import { useScheduleClock } from '@/features/kelola/useScheduleClock';
import { Action, Notice, ScreenHeading, ScreenState } from '@/components/Interface';
import { StatusBadge } from '@/components/StatusBadge';
import { color, space, surface, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import type { AppUser, Kelas, Presensi, Sesi } from '@/types';
import { mapFirebaseError } from '@/utils/firebaseError';
import { createPresensi, subscribeToPresensi, subscribeToStudentSessions } from './services/jadwalService';

const shortDate = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

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
      <ScrollView contentContainerStyle={styles.content}>
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
    <FlatList
      contentContainerStyle={styles.content}
      data={sessions}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<>
        {header}
        {fromCache ? <Notice message="Daftar kelas menunggu sinkronisasi. Periksa koneksi internet." tone="warning" /> : null}
      </>}
      ListEmptyComponent={classes.length ? undefined : <ScreenState
        title={fromCache ? 'Jadwal belum tersedia dari server' : 'Anda belum terdaftar di kelas'}
        description="Kelas akan tampil setelah asisten menambahkan Anda sebagai peserta." />}
      ListFooterComponent={classesWithoutSessions.length ? (
        <View style={styles.classes}>
          <Text accessibilityRole="header" style={type.heading}>Kelas tanpa sesi</Text>
          {classesWithoutSessions.map(kelas => (
            <View key={kelas.id} style={styles.ticket}>
              <Text style={type.title}>{kelas.nama}</Text>
              <Text style={type.body}>{kelas.praktikum}</Text>
              <Text style={type.muted}>Asisten belum menambahkan sesi praktikum.</Text>
            </View>
          ))}
        </View>
      ) : undefined}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Buka detail sesi"
          onPress={() => setSelectedId(item.id)}
          style={({ pressed }) => [surface.outline, styles.scheduleRow, pressed && styles.rowPressed]}>
          <View style={styles.datePlate}>
            <Text style={[type.mono, styles.dateText]}>{formatDate(item.tanggal, shortDate).toUpperCase()}</Text>
          </View>
          <View style={styles.scheduleBody}>
            <Text style={type.title}>{item.praktikum}</Text>
            <Text style={type.muted}>Kelas {item.kelasNama} · {item.lab}</Text>
            <Text style={type.mono}>{item.jamMulai}–{item.jamSelesai}</Text>
            <StatusBadge status={effectiveSessionStatus(item, now)} />
          </View>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.arrow}>›</Text>
        </Pressable>
      )}
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

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Action label="‹ Kembali ke jadwal" variant="secondary" style={styles.back} onPress={onBack} />
      <View style={styles.ticket}>
        <View style={styles.ticketHeading}>
          <StatusBadge status={selectedSession.status} />
          <Text accessibilityRole="header" style={[type.display, styles.ticketTitle]}>{selectedSession.praktikum}</Text>
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
      {attendance ? (
        <Notice tone="success" message="Presensi Anda sudah tercatat untuk sesi ini." />
      ) : (
        <>
          <Action label="Presensi sekarang" disabled={selectedSession.status !== 'DIBUKA' || pending || reading} busy={attendanceLoading} tactile onPress={() => void submitAttendance()} />
          {selectedSession.status !== 'DIBUKA' ? (
            <Text style={type.muted}>{selectedSession.status === 'DITUTUP' ? 'Sesi ini sudah ditutup.' : 'Presensi tersedia setelah asisten membuka sesi.'}</Text>
          ) : null}
        </>
      )}
      {pending || attendanceLoading ? <Notice tone="info" message="Menunggu konfirmasi server." /> : null}
      {feedback ? <Notice message={feedback.message} tone={feedback.ok ? 'success' : 'danger'} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  classes: { paddingTop: space.md, gap: space.md },
  content: { gap: space.gutter, padding: space.gutter },
  scheduleRow: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: color.sheet },
  rowPressed: { backgroundColor: color.blueWash },
  datePlate: { width: 72, backgroundColor: color.cream, borderRightWidth: 1, borderRightColor: color.ink, padding: space.sm, justifyContent: 'center' },
  dateText: { color: color.ink, fontWeight: '800', textAlign: 'center' },
  scheduleBody: { flex: 1, minWidth: 0, padding: space.md, gap: space.xs },
  arrow: { color: color.cobalt, fontSize: 26, alignSelf: 'center', paddingRight: space.md },
  back: { alignSelf: 'flex-start' },
  ticket: { backgroundColor: color.sheet, borderWidth: 1, borderColor: color.ink },
  ticketHeading: { backgroundColor: color.cobalt, padding: space.gutter, gap: space.md },
  ticketTitle: { color: color.onAccent },
  details: { paddingHorizontal: space.gutter },
  detailRow: { minHeight: 46, flexDirection: 'row', gap: space.md, alignItems: 'center', borderTopWidth: 1, borderTopColor: color.line, paddingVertical: space.sm },
  detailLabel: { flex: 2 },
  detailValue: { flex: 3 },
});
