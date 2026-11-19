import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Action, Notice, ScreenHeading, ScreenState, Segments } from '@/components/Interface';
import { PermitBadge } from '@/components/StatusBadge';
import { color, space, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import type { Izin } from '@/types';
import { mapFirebaseError } from '@/utils/firebaseError';
import { decideIzin, subscribeToAsistenIzin } from './services/izinService';

const FILTERS = [
  { key: 'MENUNGGU', label: 'Menunggu' },
  { key: 'SEMUA', label: 'Semua' },
] as const;
type Decision = { request: Izin; status: 'DITERIMA' | 'DITOLAK' };

export function PemeriksaanIzinTab() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<Izin[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('MENUNGGU');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (authLoading || !user || user.role !== 'ASISTEN') return;
    return subscribeToAsistenIzin(
      user.uid,
      (items) => { setRequests(items); setLoading(false); },
      (snapshotError) => { setError(mapFirebaseError(snapshotError)); setLoading(false); },
    );
  }, [authLoading, user]);

  const visibleRequests = useMemo(
    () => filter === 'MENUNGGU' ? requests.filter((request) => request.status === 'MENUNGGU') : requests,
    [filter, requests],
  );

  const openDecision = (request: Izin, status: Decision['status']) => {
    setDecisionError(null);
    setDecision({ request, status });
  };

  const applyDecision = async () => {
    if (!user || user.role !== 'ASISTEN' || !decision || processing) return;
    const request = requests.find((item) => item.id === decision.request.id);
    if (!request || request.status !== 'MENUNGGU') {
      setDecisionError('Pengajuan ini sudah diputuskan atau tidak tersedia.');
      return;
    }
    setProcessing(true);
    setDecisionError(null);
    setFeedback(null);
    try {
      const result = await decideIzin(request, user.uid, decision.status);
      if (result.ok) {
        setDecision(null);
        setFeedback('Keputusan izin berhasil disimpan.');
      } else {
        setDecisionError(result.message);
      }
    } catch (decisionFailure) {
      setDecisionError(mapFirebaseError(decisionFailure));
    } finally {
      setProcessing(false);
    }
  };

  const canView = user?.role === 'ASISTEN';
  const state = error
    ? <ScreenState title="Pengajuan tidak tersedia" description={error} tone="danger" />
    : authLoading || (canView && loading)
      ? <ScreenState title="Memuat pengajuan izin…" loading />
      : !canView ? <ScreenState title="Akses asisten diperlukan" /> : null;
  const rejecting = decision?.status === 'DITOLAK';

  return (
    <>
      <FlatList
        contentContainerStyle={styles.container}
        data={state ? [] : visibleRequests}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={(
          <View style={styles.header}>
            <ScreenHeading title="Pemeriksaan izin" />
            {state ?? (
              <>
                <Segments items={FILTERS} selected={filter} onChange={setFilter} label="Filter pengajuan izin" />
                {feedback ? <Notice message={feedback} tone="success" /> : null}
              </>
            )}
          </View>
        )}
        ListEmptyComponent={state ? undefined : <ScreenState title={filter === 'MENUNGGU' ? 'Tidak ada izin menunggu' : 'Belum ada pengajuan izin'} />}
        renderItem={({ item }) => (
          <View style={styles.request}>
            <View style={styles.identity}>
              <View style={styles.person}>
                <Text style={type.title}>{item.nama}</Text>
                <Text style={type.mono}>NIM {item.nim}</Text>
              </View>
              <PermitBadge status={item.status} />
            </View>
            <Text style={type.label}>{item.sesiLabel}</Text>
            <Text style={type.body}>{item.alasan}</Text>
            <Text style={type.mono}>Prediksi AI · {item.kategoriAI ?? 'Tidak tersedia'}</Text>
            {item.status === 'MENUNGGU' ? (
              <View style={styles.actions}>
                <Action label="Tolak" variant="secondary" onPress={() => openDecision(item, 'DITOLAK')} />
                <Action label="Terima" onPress={() => openDecision(item, 'DITERIMA')} />
              </View>
            ) : null}
          </View>
        )}
      />
      {decision ? (
        <ConfirmSheet
          visible
          title={rejecting ? 'Tolak pengajuan?' : 'Terima pengajuan?'}
          message={`Pengajuan ${decision.request.nama} untuk ${decision.request.sesiLabel}.`}
          confirmLabel={rejecting ? 'Tolak izin' : 'Terima izin'}
          destructive={rejecting}
          onCancel={() => setDecision(null)}
          onConfirm={() => void applyDecision()}
          pending={processing}
          error={decisionError}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.gutter, padding: space.gutter },
  header: { gap: space.md },
  request: { backgroundColor: color.sheet, borderTopWidth: 2, borderTopColor: color.ink, padding: space.md, gap: space.sm },
  identity: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: space.sm, borderBottomWidth: 1, borderBottomColor: color.line, paddingBottom: space.sm },
  person: { flexGrow: 1, flexShrink: 1, minWidth: 140 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
});
