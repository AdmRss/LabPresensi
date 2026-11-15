import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { AppUser, Izin } from '@/types';

export type PemeriksaanIzinTabProps = { user: AppUser | null };

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error && String(error.code).includes('permission-denied')) return 'Anda tidak memiliki akses ke data ini.';
  return 'Operasi tidak dapat dilakukan. Silakan coba lagi.';
}

export function PemeriksaanIzinTab({ user }: PemeriksaanIzinTabProps) {
  const [requests, setRequests] = useState<Izin[]>([]);
  const [filter, setFilter] = useState<'MENUNGGU' | 'SEMUA'>('MENUNGGU');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'ASISTEN') {
      return;
    }
    return onSnapshot(
      query(collection(db, 'izin'), where('asistenId', '==', user.uid)),
      (snapshot) => {
        setRequests(snapshot.docs.map((item) => item.data() as Izin).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setLoading(false);
      },
      (snapshotError) => {
        setError(errorMessage(snapshotError));
        setLoading(false);
      },
    );
  }, [user]);

  const visibleRequests = useMemo(
    () => filter === 'MENUNGGU' ? requests.filter((request) => request.status === 'MENUNGGU') : requests,
    [filter, requests],
  );

  const decide = (request: Izin, status: 'DITERIMA' | 'DITOLAK') => {
    const action = status === 'DITERIMA' ? 'menerima' : 'menolak';
    Alert.alert(`Konfirmasi ${action}`, `Yakin ingin ${action} pengajuan ini?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya', onPress: () => void applyDecision(request, status) },
    ]);
  };

  const applyDecision = async (request: Izin, status: 'DITERIMA' | 'DITOLAK') => {
    if (!user || request.status !== 'MENUNGGU') return;
    setProcessingId(request.id);
    try {
      await updateDoc(doc(db, 'izin', request.id), {
        status,
        diputuskanOleh: user.uid,
        waktuKeputusan: new Date().toISOString(),
      });
    } catch (decisionError) {
      setError(errorMessage(decisionError));
    } finally {
      setProcessingId(null);
    }
  };

  if (!user || user.role !== 'ASISTEN') return <State title="Akses asisten diperlukan" />;
  if (loading) return <State title="Memuat pengajuan izin..." loading />;
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
              <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.activeFilter]}>
                <Text style={filter === value ? styles.activeFilterText : styles.filterText}>{value === 'MENUNGGU' ? 'Menunggu' : 'Semua'}</Text>
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
              <Pressable disabled={processingId === item.id} onPress={() => decide(item, 'DITERIMA')} style={[styles.accept, processingId === item.id && styles.disabled]}>
                <Text style={styles.actionText}>Terima</Text>
              </Pressable>
              <Pressable disabled={processingId === item.id} onPress={() => decide(item, 'DITOLAK')} style={[styles.reject, processingId === item.id && styles.disabled]}>
                <Text style={styles.actionText}>Tolak</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    />
  );
}

function State({ title, loading = false }: { title: string; loading?: boolean }) {
  return <View style={styles.state}>{loading ? <ActivityIndicator size="large" /> : null}<Text style={styles.heading}>{title}</Text></View>;
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  accept: { backgroundColor: '#16A34A', borderRadius: 8, padding: 10 },
  reject: { backgroundColor: '#DC2626', borderRadius: 8, padding: 10 },
  actionText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  state: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 24 },
});
