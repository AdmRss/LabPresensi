import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Action, Notice, ScreenHeading, ScreenState } from '@/components/Interface';
import { StatusBadge } from '@/components/StatusBadge';
import { color, space, surface, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import type { Presensi, Sesi } from '@/types';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Presensi | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  const selectedSession = sessions.find((session) => session.id === selectedId);

  useEffect(() => {
    if (authLoading || !user || user.role !== 'PRAKTIKAN') return;
    return subscribeToStudentSessions(
      user.uid,
      setSessions,
      (snapshotError) => {
        setError(mapFirebaseError(snapshotError));
        setLoading(false);
      },
      setLoading,
    );
  }, [authLoading, user]);

  useEffect(() => {
    if (!selectedId || !user || user.role !== 'PRAKTIKAN') return;
    return subscribeToPresensi(
      selectedId,
      user.uid,
      setAttendance,
      (snapshotError) => setAttendanceError(mapFirebaseError(snapshotError)),
    );
  }, [selectedId, user]);

  const openSession = (id: string) => {
    setAttendance(null);
    setAttendanceError(null);
    setFeedback(null);
    setSelectedId(id);
  };

  const submitAttendance = async () => {
    if (!user || user.role !== 'PRAKTIKAN' || !selectedSession || attendanceLoading) return;
    setAttendanceLoading(true);
    setFeedback(null);
    try {
      const result = await createPresensi(selectedSession, user);
      setFeedback(result.ok ? { ok: true, message: 'Presensi berhasil dicatat.' } : result);
    } catch (submitError) {
      setFeedback({ ok: false, message: mapFirebaseError(submitError) });
    } finally {
      setAttendanceLoading(false);
    }
  };

  if (selectedSession && !error) {
    const details = [
      ['Kelas', selectedSession.kelasNama],
      ['Laboratorium', selectedSession.lab],
      ['Tanggal', formatDate(selectedSession.tanggal, fullDate)],
      ['Waktu', `${selectedSession.jamMulai}–${selectedSession.jamSelesai}`],
    ];

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Action label="‹ Kembali ke jadwal" variant="secondary" style={styles.back} disabled={attendanceLoading} onPress={() => setSelectedId(null)} />
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
        {attendanceError ? <Notice message={attendanceError} /> : null}
        {attendance ? (
          <Notice tone="success" message="Presensi Anda sudah tercatat untuk sesi ini." />
        ) : (
          <>
            <Action label="Presensi sekarang" disabled={selectedSession.status !== 'DIBUKA'} busy={attendanceLoading} tactile onPress={() => void submitAttendance()} />
            {selectedSession.status !== 'DIBUKA' ? (
              <Text style={type.muted}>{selectedSession.status === 'DITUTUP' ? 'Sesi ini sudah ditutup.' : 'Presensi tersedia setelah asisten membuka sesi.'}</Text>
            ) : null}
          </>
        )}
        {feedback && (!feedback.ok || !attendance) ? <Notice tone={feedback.ok ? 'success' : 'danger'} message={feedback.message} /> : null}
      </ScrollView>
    );
  }

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
      ListHeaderComponent={header}
      ListEmptyComponent={<ScreenState title="Belum ada jadwal" description="Jadwal muncul setelah asisten menambahkan Anda ke kelas yang memiliki sesi praktikum." />}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Buka detail sesi"
          onPress={() => openSession(item.id)}
          style={({ pressed }) => [surface.outline, styles.scheduleRow, pressed && styles.rowPressed]}>
          <View style={styles.datePlate}>
            <Text style={[type.mono, styles.dateText]}>{formatDate(item.tanggal, shortDate).toUpperCase()}</Text>
          </View>
          <View style={styles.scheduleBody}>
            <Text style={type.title}>{item.praktikum}</Text>
            <Text style={type.muted}>Kelas {item.kelasNama} · {item.lab}</Text>
            <Text style={type.mono}>{item.jamMulai}–{item.jamSelesai}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.arrow}>›</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
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
