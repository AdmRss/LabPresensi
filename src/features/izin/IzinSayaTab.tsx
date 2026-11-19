import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Action, Field, Notice, ScreenHeading, ScreenState } from '@/components/Interface';
import { PermitBadge } from '@/components/StatusBadge';
import { color, space, surface, touch, type } from '@/constants/design';
import { classifyReason } from '@/features/ai/aiService';
import { useAuth } from '@/features/auth/AuthContext';
import type { Izin, Sesi } from '@/types';
import { mapFirebaseError } from '@/utils/firebaseError';
import { createIzin, subscribeToEligibleSessions, subscribeToMyIzin } from './services/izinService';

export function IzinSayaTab() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Sesi[]>([]);
  const [requests, setRequests] = useState<Izin[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);

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
      setFeedback({ ok: false, message: 'Pilih sesi yang akan diajukan izinnya.' });
      return;
    }
    if (alasan.length < 10 || alasan.length > 500) {
      setFeedback({ ok: false, message: 'Alasan harus berisi 10 sampai 500 karakter.' });
      return;
    }
    if (requests.some((item) => item.id === `${sesi.id}_${user.uid}`)) {
      setFeedback({ ok: false, message: 'Pengajuan izin untuk sesi ini sudah ada.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    let kategoriAI: string | null = null;
    try {
      const classification = await classifyReason(alasan);
      if (classification.ok) kategoriAI = classification.kategori;
    } catch {
      // Submit the request when classification is unavailable.
    }

    try {
      const result = await createIzin(sesi, user, alasan, kategoriAI);
      if (!result.ok) {
        setFeedback(result);
        return;
      }
      setReason('');
      setSelectedSessionId('');
      setFeedback({
        ok: true,
        message: kategoriAI ? 'Izin berhasil diajukan.' : 'Izin berhasil diajukan. Prediksi AI tidak tersedia.',
      });
    } catch (submitError) {
      setFeedback({ ok: false, message: mapFirebaseError(submitError) });
    } finally {
      setSubmitting(false);
    }
  };

  const canView = user?.role === 'PRAKTIKAN';
  const state = error
    ? <ScreenState title="Data izin tidak tersedia" description={error} tone="danger" />
    : authLoading || (canView && loading)
      ? <ScreenState title="Memuat data izin…" loading />
      : !canView ? <ScreenState title="Akses praktikan diperlukan" /> : null;

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={state ? [] : requests}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => item.id}
      ListHeaderComponent={(
        <View style={styles.header}>
          <ScreenHeading title="Izin saya" />
          {state ?? (
            <>
              <View style={[surface.outline, styles.form]}>
                <Text accessibilityRole="header" style={type.heading}>Ajukan izin</Text>
                {!sessions.length ? (
                  <Text style={type.muted}>Izin dapat diajukan sebelum sesi dibuka. Saat ini belum ada sesi yang tersedia.</Text>
                ) : (
                  <>
                    <Text style={type.label}>Pilih sesi</Text>
                    <View accessibilityRole="radiogroup" style={styles.options}>
                      {sessions.map((sesi) => {
                        const selected = selectedSessionId === sesi.id;
                        return (
                          <Pressable
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected, disabled: submitting }}
                            disabled={submitting}
                            key={sesi.id}
                            onPress={() => setSelectedSessionId(sesi.id)}
                            style={({ pressed }) => [surface.outline, styles.option, selected && styles.selected, pressed && styles.selected]}>
                            <View style={[styles.radio, selected && styles.radioSelected]} />
                            <View style={styles.optionBody}>
                              <Text style={type.label}>{sesi.praktikum}</Text>
                              <Text style={type.mono}>{sesi.tanggal} · Kelas {sesi.kelasNama}</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.reason}>
                      <Text style={type.label}>Alasan</Text>
                      <Field accessibilityLabel="Alasan izin" editable={!submitting} maxLength={500} multiline onChangeText={setReason} placeholder="Jelaskan alasan izin (10–500 karakter)" value={reason} />
                      <Text style={[type.mono, styles.counter]}>{reason.trim().length}/500</Text>
                    </View>
                    <Text style={type.muted}>Prediksi kategori AI disertakan sebagai informasi pendukung.</Text>
                    <Action label="Kirim pengajuan" tactile busy={submitting} onPress={() => void submit()} />
                  </>
                )}
                {feedback ? <Notice message={feedback.message} tone={feedback.ok ? 'success' : 'danger'} /> : null}
              </View>
              <Text accessibilityRole="header" style={type.heading}>Pengajuan saya</Text>
            </>
          )}
        </View>
      )}
      ListEmptyComponent={state ? undefined : <ScreenState title="Belum ada pengajuan izin" />}
      renderItem={({ item }) => (
        <View style={styles.request}>
          <View style={styles.requestHeading}>
            <Text style={[type.title, styles.requestTitle]}>{item.sesiLabel}</Text>
            <PermitBadge status={item.status} />
          </View>
          <Text style={type.body}>{item.alasan}</Text>
          <Text style={type.mono}>Prediksi AI · {item.kategoriAI ?? 'Tidak tersedia'}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { gap: space.md, padding: space.gutter },
  header: { gap: space.lg },
  form: { backgroundColor: color.cream, padding: space.md, gap: space.md },
  options: { gap: space.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, backgroundColor: color.sheet, minHeight: touch },
  selected: { borderColor: color.cobalt, backgroundColor: color.blueWash },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: color.ink },
  radioSelected: { borderColor: color.cobalt, borderWidth: 5, backgroundColor: color.onAccent },
  optionBody: { flex: 1, minWidth: 0 },
  reason: { gap: space.xs },
  counter: { alignSelf: 'flex-end' },
  request: { borderTopColor: color.ink, borderTopWidth: 1, paddingVertical: space.md, gap: space.sm },
  requestHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: space.sm },
  requestTitle: { flexGrow: 1, flexShrink: 1, minWidth: 140 },
});
