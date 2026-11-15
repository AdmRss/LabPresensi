import { useEffect, useState, type JSX } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { classifyReason } from '@/features/ai/aiService';
import { useAuth } from '@/features/auth/AuthContext';
import { mapFirebaseError } from '@/utils/firebaseError';
import type { Izin, Sesi } from '@/types';
import { createIzin, subscribeToEligibleSessions, subscribeToMyIzin } from './services/izinService';

export function IzinSayaTab(): JSX.Element {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Sesi[]>([]);
  const [requests, setRequests] = useState<Izin[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || user.role !== 'PRAKTIKAN') return;
    return subscribeToEligibleSessions(
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
    if (authLoading || !user || user.role !== 'PRAKTIKAN') return;
    return subscribeToMyIzin(
      user.uid,
      setRequests,
      (snapshotError) => setError(mapFirebaseError(snapshotError)),
    );
  }, [authLoading, user]);

  const submit = async () => {
    if (!user || user.role !== 'PRAKTIKAN' || submitting) return;
    const alasan = reason.trim();
    const sesi = sessions.find((item) => item.id === selectedSessionId);
    if (!sesi) {
      setFeedback('Pilih sesi yang akan diajukan izinnya.');
      return;
    }
    if (alasan.length < 10 || alasan.length > 500) {
      setFeedback('Alasan harus berisi 10 sampai 500 karakter.');
      return;
    }
    if (requests.some((item) => item.id === `${sesi.id}_${user.uid}`)) {
      setFeedback('Pengajuan izin untuk sesi ini sudah ada.');
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    let kategoriAI: string | null = null;
    let aiUnavailable = false;
    try {
      const classification = await classifyReason(alasan);
      if (classification.ok) {
        kategoriAI = classification.kategori;
      } else {
        aiUnavailable = true;
      }
    } catch {
      aiUnavailable = true;
    }

    try {
      const result = await createIzin(sesi, user, alasan, kategoriAI);
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      setReason('');
      setSelectedSessionId('');
      setFeedback(
        aiUnavailable
          ? 'Izin berhasil diajukan. Prediksi AI tidak tersedia.'
          : 'Izin berhasil diajukan.',
      );
    } catch (submitError) {
      setFeedback(mapFirebaseError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <State title="Memuat data izin..." loading />;
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
          <Text style={styles.label}>Sesi yang tersedia</Text>
          {sessions.length === 0 ? (
            <Text style={styles.muted}>Tidak ada sesi yang tersedia.</Text>
          ) : (
            sessions.map((sesi) => (
              <Pressable
                key={sesi.id}
                onPress={() => setSelectedSessionId(sesi.id)}
                style={[styles.option, selectedSessionId === sesi.id && styles.selected]}
              >
                <Text style={styles.optionText}>
                  {sesi.praktikum} · {sesi.tanggal} · Kelas {sesi.kelasNama}
                </Text>
              </Pressable>
            ))
          )}
          <Text style={styles.label}>Alasan</Text>
          <TextInput
            maxLength={500}
            multiline
            onChangeText={setReason}
            placeholder="Jelaskan alasan izin (10-500 karakter)"
            style={styles.input}
            value={reason}
          />
          <Text style={styles.muted}>{reason.trim().length}/500 karakter</Text>
          <Text style={styles.muted}>Prediksi AI (informasi pendukung)</Text>
          <Pressable
            disabled={submitting}
            onPress={submit}
            style={[styles.button, submitting && styles.disabled]}
          >
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

function RequestCard({ request }: { request: Izin }): JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{request.sesiLabel}</Text>
      <Text style={styles.muted}>Alasan: {request.alasan}</Text>
      <Text style={styles.muted}>Prediksi AI: {request.kategoriAI ?? '–'}</Text>
      <Text style={styles.status}>Status: {request.status}</Text>
    </View>
  );
}

function State({ title, loading = false }: { title: string; loading?: boolean }): JSX.Element {
  return (
    <View style={styles.state}>
      {loading ? <ActivityIndicator size="large" /> : null}
      <Text style={styles.heading}>{title}</Text>
    </View>
  );
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
