import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { AppUser, Kelas, Presensi, Sesi } from '@/types';

export type JadwalTabProps = {
  user: AppUser | null;
};

function messageFromError(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    if (code.includes('permission-denied')) return 'Anda tidak memiliki akses ke data ini.';
    if (code.includes('unavailable')) return 'Jaringan sedang tidak tersedia.';
  }
  return 'Data tidak dapat dimuat. Silakan coba lagi.';
}

function sortSessions(sessions: Sesi[]) {
  return [...sessions].sort((a, b) =>
    `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`),
  );
}

export function JadwalTab({ user }: JadwalTabProps) {
  const [sessions, setSessions] = useState<Sesi[]>([]);
  const [selectedSession, setSelectedSession] = useState<Sesi | null>(null);
  const [attendance, setAttendance] = useState<Presensi | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'PRAKTIKAN') {
      return;
    }

    let active = true;
    let sessionUnsubscribes: Unsubscribe[] = [];

    const classesQuery = query(
      collection(db, 'kelas'),
      where('pesertaUids', 'array-contains', user.uid),
    );
    const unsubscribeClasses = onSnapshot(
      classesQuery,
      (snapshot) => {
        sessionUnsubscribes.forEach((unsubscribe) => unsubscribe());
        sessionUnsubscribes = [];
        const kelas = snapshot.docs.map((item) => item.data() as Kelas);

        if (kelas.length === 0) {
          setSessions([]);
          setLoading(false);
          return;
        }

        const sessionsByClassId = new Map<string, Map<string, Sesi>>();
        let completed = 0;
        const updateSessions = () => {
          if (!active) return;
          setSessions(
            sortSessions(
              [...sessionsByClassId.values()].flatMap((classSessions) => [
                ...classSessions.values(),
              ]),
            ),
          );
          completed += 1;
          if (completed === kelas.length) setLoading(false);
        };

        kelas.forEach((kelasItem) => {
          const sesiQuery = query(
            collection(db, 'sesi'),
            where('kelasId', '==', kelasItem.id),
          );
          const unsubscribe = onSnapshot(
            sesiQuery,
            (sesiSnapshot) => {
              const classSessions = new Map<string, Sesi>();
              sesiSnapshot.docs.forEach((item) => {
                classSessions.set(item.id, item.data() as Sesi);
              });
              sessionsByClassId.set(kelasItem.id, classSessions);
              updateSessions();
            },
            (snapshotError) => {
              if (!active) return;
              setError(messageFromError(snapshotError));
              setLoading(false);
            },
          );
          sessionUnsubscribes.push(unsubscribe);
        });
      },
      (snapshotError) => {
        if (!active) return;
        setError(messageFromError(snapshotError));
        setLoading(false);
      },
    );

    return () => {
      active = false;
      unsubscribeClasses();
      sessionUnsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  useEffect(() => {
    if (!selectedSession || !user) return;

    const attendanceRef = doc(db, 'presensi', `${selectedSession.id}_${user.uid}`);
    return onSnapshot(
      attendanceRef,
      (snapshot) => setAttendance(snapshot.exists() ? (snapshot.data() as Presensi) : null),
      (snapshotError) => setError(messageFromError(snapshotError)),
    );
  }, [selectedSession, user]);

  const visibleSessions = useMemo(() => sortSessions(sessions), [sessions]);

  const submitAttendance = async () => {
    if (!user || user.role !== 'PRAKTIKAN' || !selectedSession) return;
    if (selectedSession.status !== 'DIBUKA') {
      setFeedback('Presensi hanya tersedia ketika sesi dibuka.');
      return;
    }
    if (attendance) {
      setFeedback('Anda sudah melakukan presensi pada sesi ini.');
      return;
    }

    setAttendanceLoading(true);
    setFeedback(null);
    try {
      const attendanceRef = doc(db, 'presensi', `${selectedSession.id}_${user.uid}`);
      const existing = await getDoc(attendanceRef);
      if (existing.exists()) {
        setFeedback('Anda sudah melakukan presensi pada sesi ini.');
        return;
      }

      const record: Presensi = {
        id: `${selectedSession.id}_${user.uid}`,
        sesiId: selectedSession.id,
        kelasId: selectedSession.kelasId,
        asistenId: selectedSession.asistenId,
        praktikanUid: user.uid,
        nama: user.nama,
        nim: user.nim ?? '',
        timestamp: new Date().toISOString(),
      };
      await setDoc(attendanceRef, record);
      setFeedback('Presensi berhasil dicatat.');
    } catch (submitError) {
      setFeedback(messageFromError(submitError));
    } finally {
      setAttendanceLoading(false);
    }
  };

  if (!user || user.role !== 'PRAKTIKAN') {
    return <StateView title="Akses praktikan diperlukan" description="Masuk sebagai praktikan untuk melihat jadwal." />;
  }
  if (loading) return <StateView title="Memuat jadwal..." description="Mengambil jadwal terbaru." loading />;
  if (error) return <StateView title="Jadwal tidak tersedia" description={error} />;
  if (!selectedSession) {
    return (
      <FlatList
        contentContainerStyle={[styles.list, visibleSessions.length === 0 && styles.emptyList]}
        data={visibleSessions}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <StateView title="Anda belum terdaftar di kelas" description="Jadwal akan muncul setelah Anda mengikuti kelas." />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => { setAttendance(null); setSelectedSession(item); }} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.praktikum}</Text>
              <StatusLabel status={item.status} />
            </View>
            <Text style={styles.detail}>Kelas {item.kelasNama} · {item.lab}</Text>
            <Text style={styles.detail}>{item.tanggal} · {item.jamMulai} - {item.jamSelesai}</Text>
          </Pressable>
        )}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.detailScreen}>
      <Pressable onPress={() => setSelectedSession(null)} style={styles.backButton}>
        <Text style={styles.backText}>‹ Kembali ke jadwal</Text>
      </Pressable>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title}>{selectedSession.praktikum}</Text>
          <StatusLabel status={selectedSession.status} />
        </View>
        <Text style={styles.detail}>Kelas: {selectedSession.kelasNama}</Text>
        <Text style={styles.detail}>Laboratorium: {selectedSession.lab}</Text>
        <Text style={styles.detail}>Tanggal: {selectedSession.tanggal}</Text>
        <Text style={styles.detail}>Waktu: {selectedSession.jamMulai} - {selectedSession.jamSelesai}</Text>
      </View>
      {attendance ? (
        <Text style={styles.success}>Anda sudah melakukan presensi pada sesi ini.</Text>
      ) : (
        <Pressable
          disabled={selectedSession.status !== 'DIBUKA' || attendanceLoading}
          onPress={submitAttendance}
          style={[styles.button, (selectedSession.status !== 'DIBUKA' || attendanceLoading) && styles.disabled]}
        >
          {attendanceLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Presensi Sekarang</Text>}
        </Pressable>
      )}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </ScrollView>
  );
}

function StatusLabel({ status }: { status: Sesi['status'] }) {
  const label = status === 'DIBUKA' ? 'Dibuka' : status === 'DITUTUP' ? 'Ditutup' : 'Belum dibuka';
  return <Text style={[styles.status, status === 'DIBUKA' ? styles.open : status === 'DITUTUP' ? styles.closed : styles.pending]}>{label}</Text>;
}

function StateView({ title, description, loading = false }: { title: string; description: string; loading?: boolean }) {
  return (
    <View style={styles.state}>
      {loading ? <ActivityIndicator size="large" /> : null}
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.detail}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, padding: 16 },
  emptyList: { flexGrow: 1 },
  detailScreen: { gap: 16, padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 16, borderWidth: 1, gap: 8, padding: 16 },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  title: { color: '#111827', flex: 1, fontSize: 18, fontWeight: '700' },
  detail: { color: '#6B7280', fontSize: 14, lineHeight: 20 },
  status: { borderRadius: 999, fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  open: { backgroundColor: '#DCFCE7', color: '#166534' },
  closed: { backgroundColor: '#E5E7EB', color: '#374151' },
  pending: { backgroundColor: '#FEF3C7', color: '#92400E' },
  backButton: { paddingVertical: 8 },
  backText: { color: '#2563EB', fontWeight: '700' },
  button: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 12, minHeight: 48, justifyContent: 'center', padding: 12 },
  disabled: { backgroundColor: '#9CA3AF' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  success: { backgroundColor: '#DCFCE7', borderRadius: 10, color: '#166534', padding: 12 },
  feedback: { color: '#374151', fontSize: 14 },
  state: { alignItems: 'center', flex: 1, gap: 8, justifyContent: 'center', padding: 24 },
  stateTitle: { color: '#111827', fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
