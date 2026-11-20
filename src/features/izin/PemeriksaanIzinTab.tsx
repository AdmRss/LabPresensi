import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Dropdown } from '@/components/Dropdown';
import { subscribeSesiList } from '@/features/kelola/sesiService';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Action, Notice, ScreenHeading, ScreenState, Segments } from '@/components/Interface';
import { Sheet } from '@/components/Sheet';
import { PermitBadge } from '@/components/StatusBadge';
import { color, space, surface, type } from '@/constants/design';
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
  const [kelasId, setKelasId] = useState('');
  const [classLabels, setClassLabels] = useState(new Map<string, string>());
  const [requests, setRequests] = useState<Izin[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('MENUNGGU');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = requests.find(request => request.id === detailId);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (authLoading || !user || user.role !== 'ASISTEN') return;
    return subscribeToAsistenIzin(
      user.uid,
      (items) => { setRequests(items); setError(null); setLoading(false); },
      (snapshotError) => { setError(mapFirebaseError(snapshotError)); setLoading(false); },
    );
  }, [authLoading, user]);

  useEffect(() => user?.role === 'ASISTEN' ? subscribeSesiList(user.uid, sessions => {
    setClassLabels(new Map(sessions.map(row => [row.kelasId, row.kelasNama])));
  }, setError) : undefined, [user]);

  const classOptions = [...new Set(requests.map(row => row.kelasId))]
    .map(id => ({ id, label: classLabels.get(id) ?? id }));

  const visibleRequests = useMemo(
    () => requests.filter(row => (filter === 'SEMUA' || row.status === 'MENUNGGU')
      && (!kelasId || row.kelasId === kelasId)),
    [filter, requests, kelasId],
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
        contentContainerStyle={surface.page}
        data={state ? [] : visibleRequests}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={(
          <View style={styles.header}>
            <ScreenHeading title="Pemeriksaan izin" />
            {state ?? (
              <>
                <View style={[surface.panel, styles.filters]}>
                  <Dropdown label="Filter kelas" value={kelasId} onChange={setKelasId}
                    options={[{ id: '', label: 'Semua kelas' }, ...classOptions]} />
                  <Segments items={FILTERS} selected={filter} onChange={setFilter} label="Filter pengajuan izin" />
                </View>
                {feedback ? <Notice message={feedback} tone="success" /> : null}
              </>
            )}
          </View>
        )}
        ListEmptyComponent={state ? undefined : <ScreenState title={filter === 'MENUNGGU' ? 'Tidak ada izin menunggu' : 'Belum ada pengajuan izin'} />}
        renderItem={({ item }) => (
          <View style={[surface.panel, styles.request, item.status === 'MENUNGGU' && styles.pendingRequest]}>
            <View style={styles.requestBody}>
              <View style={styles.identity}>
                <View style={styles.person}>
                  <Text style={type.title}>{item.nama}</Text>
                  <Text style={type.mono}>NIM {item.nim}</Text>
                </View>
                <PermitBadge status={item.status} />
              </View>
              <Text style={type.label}>{item.sesiLabel}</Text>
              <Text style={type.body} numberOfLines={3}>{item.alasan}</Text>
              <Text style={type.muted}>Prediksi AI · {item.kategoriAI ?? 'Tidak tersedia'}</Text>
            </View>
            <View style={styles.actions}>
              <Action label="Lihat detail" accessibilityLabel={`Lihat detail izin ${item.nama}`} variant="quiet" onPress={() => setDetailId(item.id)} />
              {item.status === 'MENUNGGU' ? <>
                <Action label="Tolak" variant="secondary" style={styles.decision} onPress={() => openDecision(item, 'DITOLAK')} />
                <Action label="Terima" style={styles.decision} onPress={() => openDecision(item, 'DITERIMA')} />
              </> : null}
            </View>
          </View>
        )}
      />
      {detail ? (
        <Sheet visible title={detail.nama} onClose={() => setDetailId(null)}
          footer={<Action label="Tutup" variant="secondary" onPress={() => setDetailId(null)} />}>
          <View style={styles.identity}>
            <View style={styles.person}>
              <Text style={type.mono}>NIM {detail.nim}</Text>
              <Text style={type.label}>{detail.sesiLabel}</Text>
            </View>
            <PermitBadge status={detail.status} />
          </View>
          <View style={[surface.panel, styles.requestBody]}>
            <Text accessibilityRole="header" style={type.title}>Alasan izin</Text>
            <Text style={type.body}>{detail.alasan}</Text>
          </View>
          <Text style={type.muted}>Prediksi AI · {detail.kategoriAI ?? 'Tidak tersedia'}</Text>
          {detail.waktuKeputusan ? <Text style={type.muted}>Diputuskan {new Date(detail.waktuKeputusan).toLocaleString('id-ID')}</Text> : null}
        </Sheet>
      ) : null}
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
  header: { gap: space.inset },
  filters: { padding: space.md, gap: space.md },
  request: { overflow: 'hidden' },
  pendingRequest: { borderLeftWidth: 3, borderLeftColor: color.amber },
  requestBody: { padding: space.inset, gap: space.sm },
  identity: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: space.sm, borderBottomWidth: 1, borderBottomColor: color.line, paddingBottom: space.md },
  person: { flexGrow: 1, flexShrink: 1, flexBasis: 140, minWidth: 0, gap: space.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, borderTopWidth: 1, borderTopColor: color.line, padding: space.sm },
  decision: { flexGrow: 1, flexShrink: 1 },
});
