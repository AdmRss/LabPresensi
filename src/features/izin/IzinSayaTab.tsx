import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { collection, doc, getDoc, onSnapshot, query, setDoc, where, type Unsubscribe } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { AppUser, Izin, Kelas, Result, Sesi } from '@/types';

export type IzinClassifier = (reason: string) => Promise<Result<string>>;
export type IzinSayaTabProps = { user: AppUser | null; classifyReason?: IzinClassifier };

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error && String(error.code).includes('permission-denied')) {
    return 'Anda tidak memiliki akses ke data ini.';
  }
  return 'Operasi tidak dapat dilakukan. Silakan coba lagi.';
}

export function IzinSayaTab({ user, classifyReason }: IzinSayaTabProps) {
  const [sessions, setSessions] = useState<Sesi[]>([]);
  const [requests, setRequests] = useState<Izin[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'PRAKTIKAN') {
      return;
    }
    let sessionUnsubscribes: Unsubscribe[] = [];
    const unsubscribeClasses = onSnapshot(
      query(collection(db, 'kelas'), where('pesertaUids', 'array-contains', user.uid)),
      (classSnapshot) => {
        sessionUnsubscribes.forEach((unsubscribe) => unsubscribe());
        sessionUnsubscribes = [];
        const allSessions = new Map<string, Sesi>();
        const kelas = classSnapshot.docs.map((item) => item.data() as Kelas);
        if (kelas.length === 0) {
          setSessions([]);
          setLoading(false);
          return;
        }
        let completed = 0;
        kelas.forEach((kelasItem) => {
          const unsubscribe = onSnapshot(
            query(collection(db, 'sesi'), where('kelasId', '==', kelasItem.id)),
            (snapshot) => {
              snapshot.docs.forEach((item) => allSessions.set(item.id, item.data() as Sesi));
              completed += 1;
              setSessions([...allSessions.values()].filter((item) => item.status === 'BELUM_DIBUKA').sort((a, b) => `${a.tanggal}${a.jamMulai}`.localeCompare(`${b.tanggal}${b.jamMulai}`)));
              if (completed === kelas.length) setLoading(false);
            },
            (snapshotError) => {
              setError(errorMessage(snapshotError));
              setLoading(false);
            },
          );
          sessionUnsubscribes.push(unsubscribe);
        });
      },
      (snapshotError) => {
        setError(errorMessage(snapshotError));
        setLoading(false);
      },
    );
    return () => {
      unsubscribeClasses();
      sessionUnsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, 'izin'), where('praktikanUid', '==', user.uid)),
      (snapshot) => setRequests(snapshot.docs.map((item) => item.data() as Izin).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      (snapshotError) => setError(errorMessage(snapshotError)),
    );
  }, [user]);

  const submit = async () => {
    if (!user || user.role !== 'PRAKTIKAN') return;
    const trimmedReason = reason.trim();
    const session = sessions.find((item) => item.id === selectedSessionId);
    if (!session) return setFeedback('Pilih sesi yang akan diajukan izinnya.');
    if (trimmedReason.length < 10 || trimmedReason.length > 500) return setFeedback('Alasan harus berisi 10 sampai 500 karakter.');
    if (requests.some((item) => item.id === `${session.id}_${user.uid}`)) return setFeedback('Pengajuan izin untuk sesi ini sudah ada.');

    setSubmitting(true);
    setFeedback(null);
    let kategoriAI: string | null = null;
    let aiUnavailable = false;
    if (classifyReason) {
      try {
        const result = await classifyReason(trimmedReason);
        if (result.ok) kategoriAI = result.data;
        else aiUnavailable = true;
      } catch {
        aiUnavailable = true;
      }
    }
    try {
      const izin: Izin = {
        id: `${session.id}_${user.uid}`,
        sesiId: session.id,
        kelasId: session.kelasId,
        asistenId: session.asistenId,
        praktikanUid: user.uid,
        nama: user.nama,
        nim: user.nim ?? '',
        sesiLabel: `${session.praktikum} - ${session.tanggal}`,
        alasan: trimmedReason,
        kategoriAI,
        status: 'MENUNGGU',
        diputuskanOleh: null,
        waktuKeputusan: null,
        createdAt: new Date().toISOString(),
      };
      const izinRef = doc(db, 'izin', izin.id);
      const existing = await getDoc(izinRef);
      if (existing.exists()) {
        setFeedback('Pengajuan izin untuk sesi ini sudah ada.');
        return;
      }
      await setDoc(izinRef, izin);
      setReason('');
      setSelectedSessionId('');
      setFeedback(aiUnavailable ? 'Izin berhasil diajukan. Prediksi AI tidak tersedia.' : 'Izin berhasil diajukan.');
    } catch (submitError) {
      setFeedback(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== 'PRAKTIKAN') return <State title="Akses praktikan diperlukan" />;
  if (loading) return <State title="Memuat data izin..." loading />;
  if (error) return <State title={error} />;

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={requests}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.heading}>Ajukan izin praktikum</Text>
          <Text style={styles.label}>Sesi (hanya sesi belum dibuka)</Text>
          {sessions.length === 0 ? <Text style={styles.muted}>Tidak ada sesi yang tersedia.</Text> : sessions.map((session) => (
            <Pressable key={session.id} onPress={() => setSelectedSessionId(session.id)} style={[styles.option, selectedSessionId === session.id && styles.selected]}>
              <Text style={styles.optionText}>{session.praktikum} · {session.tanggal} · Kelas {session.kelasNama}</Text>
            </Pressable>
          ))}
          <Text style={styles.label}>Alasan</Text>
          <TextInput maxLength={500} multiline onChangeText={setReason} placeholder="Jelaskan alasan izin (10-500 karakter)" style={styles.input} value={reason} />
          <Text style={styles.muted}>{reason.trim().length}/500 karakter</Text>
          <Text style={styles.muted}>Prediksi AI (informasi pendukung)</Text>
          <Pressable disabled={submitting} onPress={submit} style={[styles.button, submitting && styles.disabled]}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Kirim pengajuan</Text>}
          </Pressable>
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          <Text style={styles.heading}>Izin saya</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.muted}>Belum ada pengajuan izin.</Text>}
      renderItem={({ item }) => <RequestCard request={item} />}
    />
  );
}

function RequestCard({ request }: { request: Izin }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{request.sesiLabel}</Text>
      <Text style={styles.muted}>Alasan: {request.alasan}</Text>
      <Text style={styles.muted}>Prediksi AI: {request.kategoriAI ?? '–'}</Text>
      <Text style={styles.status}>Status: {request.status}</Text>
    </View>
  );
}

function State({ title, loading = false }: { title: string; loading?: boolean }) {
  return <View style={styles.state}>{loading ? <ActivityIndicator size="large" /> : null}<Text style={styles.heading}>{title}</Text></View>;
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 16 },
  form: { gap: 10 },
  heading: { color: '#111827', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  label: { color: '#374151', fontSize: 14, fontWeight: '700' },
  muted: { color: '#6B7280', fontSize: 14, lineHeight: 20 },
  option: { borderColor: '#D1D5DB', borderRadius: 10, borderWidth: 1, padding: 12 },
  selected: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  optionText: { color: '#1F2937', fontSize: 14 },
  input: { borderColor: '#D1D5DB', borderRadius: 10, borderWidth: 1, minHeight: 96, padding: 12, textAlignVertical: 'top' },
  button: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 10, justifyContent: 'center', minHeight: 48, padding: 12 },
  disabled: { backgroundColor: '#9CA3AF' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  feedback: { color: '#374151' },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 12, borderWidth: 1, gap: 6, padding: 14 },
  cardTitle: { color: '#111827', fontWeight: '700' },
  status: { color: '#1D4ED8', fontWeight: '700' },
  state: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 24 },
});
