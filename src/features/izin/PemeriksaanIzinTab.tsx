import { useEffect, useMemo, useState, type JSX } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { mapFirebaseError } from '@/utils/firebaseError';
import type { Izin } from '@/types';
import { decideIzin, subscribeToAsistenIzin } from './services/izinService';

export function PemeriksaanIzinTab(): JSX.Element {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<Izin[]>([]);
  const [filter, setFilter] = useState<'MENUNGGU' | 'SEMUA'>('MENUNGGU');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || user.role !== 'ASISTEN') return;
    return subscribeToAsistenIzin(
      user.uid,
      setRequests,
      (snapshotError) => {
        setError(mapFirebaseError(snapshotError));
        setLoading(false);
      },
    );
  }, [authLoading, user]);

  const visibleRequests = useMemo(
    () => filter === 'MENUNGGU' ? requests.filter((request) => request.status === 'MENUNGGU') : requests,
    [filter, requests],
  );

  const confirmDecision = (request: Izin, status: 'DITERIMA' | 'DITOLAK') => {
    const action = status === 'DITERIMA' ? 'menerima' : 'menolak';
    Alert.alert(`Konfirmasi ${action}`, `Yakin ingin ${action} pengajuan ini?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya', onPress: () => void applyDecision(request, status) },
    ]);
  };

  const applyDecision = async (request: Izin, status: 'DITERIMA' | 'DITOLAK') => {
    if (!user || user.role !== 'ASISTEN' || request.status !== 'MENUNGGU' || processingId) return;
    setProcessingId(request.id);
    setFeedback(null);
    try {
      const result = await decideIzin(request, user.uid, status);
      setFeedback(result.ok ? 'Keputusan izin berhasil disimpan.' : result.message);
    } catch (decisionError) {
      setFeedback(mapFirebaseError(decisionError));
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || loading) return <State title="Memuat pengajuan izin..." loading />;
  if (!user || user.role !== 'ASISTEN') return <State title="Akses asisten diperlukan" />;
  if (error) return <State title={error} />;

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={visibleRequests}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.heading}>Pemeriksaan izin</Text>
          <View style={styles.filters}>
            {(['MENUNGGU', 'SEMUA'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setFilter(value)}
                style={[styles.filter, filter === value && styles.activeFilter]}
              >
                <Text style={filter === value ? styles.activeFilterText : styles.filterText}>
                  {value === 'MENUNGGU' ? 'Menunggu' : 'Semua'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.muted}>Tidak ada pengajuan izin.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.nama} · {item.nim}</Text>
          <Text style={styles.muted}>{item.sesiLabel}</Text>
          <Text style={styles.muted}>Alasan: {item.alasan}</Text>
          <Text style={styles.muted}>Kategori AI: {item.kategoriAI ?? '–'}</Text>
          <Text style={styles.status}>Status: {item.status}</Text>
          {item.status === 'MENUNGGU' ? (
            <View style={styles.actions}>
              <Pressable disabled={processingId !== null} onPress={() => confirmDecision(item, 'DITERIMA')} style={[styles.accept, processingId !== null && styles.disabled]}>
                <Text style={styles.actionText}>Terima</Text>
              </Pressable>
              <Pressable disabled={processingId !== null} onPress={() => confirmDecision(item, 'DITOLAK')} style={[styles.reject, processingId !== null && styles.disabled]}>
                <Text style={styles.actionText}>Tolak</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
      ListFooterComponent={feedback ? <Text style={styles.feedback}>{feedback}</Text> : undefined}
    />
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
  header: { gap: 12 },
  heading: { color: '#111827', fontSize: 20, fontWeight: '800' },
  filters: { flexDirection: 'row', gap: 8 },
  filter: { borderColor: '#D1D5DB', borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  activeFilter: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText: { color: '#374151', fontWeight: '700' },
  activeFilterText: { color: '#FFFFFF', fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 12, borderWidth: 1, gap: 6, padding: 14 },
  cardTitle: { color: '#111827', fontWeight: '700' },
  muted: { color: '#6B7280', fontSize: 14, lineHeight: 20 },
  status: { color: '#1D4ED8', fontWeight: '700' },
  feedback: { color: '#374151' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  accept: { backgroundColor: '#16A34A', borderRadius: 8, padding: 10 },
  reject: { backgroundColor: '#DC2626', borderRadius: 8, padding: 10 },
  actionText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  state: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 24 },
});
