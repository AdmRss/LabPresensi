import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Action, ScreenHeading, ScreenState } from '@/components/Interface';
import { StatusBadge } from '@/components/StatusBadge';
import { color, space, surface, type } from '@/constants/design';
import { sortSessions } from '@/features/jadwal/services/jadwalService';
import type { Sesi } from '@/types';
import { parseDate } from './schedule';
import { effectiveSessionStatus, scheduledTime } from './sessionClock';
import { subscribeSesiList } from './sesiService';
import { useScheduleClock } from './useScheduleClock';

const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

export function AsistenHome({ asistenId, onKelola, onRekap, onIzin }: {
  asistenId: string;
  onKelola: (sessionId?: string) => void;
  onRekap: () => void;
  onIzin: () => void;
}) {
  const [sessions, setSessions] = useState<Sesi[]>();
  const [error, setError] = useState<string>();
  const now = useScheduleClock();

  useEffect(() => subscribeSesiList(asistenId, rows => {
    setSessions(sortSessions(rows.filter(row => !row.archived)));
    setError(undefined);
  }, setError), [asistenId]);

  const open = sessions?.find(session => effectiveSessionStatus(session, now) === 'DIBUKA');
  const next = open ?? sessions?.find(session => effectiveSessionStatus(session, now) === 'BELUM_DIBUKA'
    && (session.endAt?.toMillis() ?? scheduledTime(session.tanggal, session.jamSelesai)) > now);
  const date = next ? parseDate(next.tanggal) : null;

  return (
    <ScrollView contentContainerStyle={surface.page}>
      <ScreenHeading title="Beranda" />
      {error ? <ScreenState title="Sesi belum bisa dimuat" description={error} tone="danger" />
        : !sessions ? <ScreenState title="Memuat sesi…" loading />
        : next ? (
          <View style={[surface.panel, styles.card, styles.session]}>
            <Text style={[type.label, styles.accent]}>{open ? 'Presensi sedang dibuka' : 'Sesi berikutnya'}</Text>
            <Text accessibilityRole="header" style={type.heading}>{next.praktikum}</Text>
            <Text style={type.body}>{date ? dateLabel.format(date) : next.tanggal} · {next.jamMulai}–{next.jamSelesai} WIB</Text>
            <Text style={type.muted}>{[next.kelasNama, next.lab].filter(Boolean).join(' · ')}</Text>
            <StatusBadge status={effectiveSessionStatus(next, now)} />
            <Action label="Kelola sesi" onPress={() => onKelola(next.id)} />
          </View>
        ) : <ScreenState title="Belum ada sesi mendatang" />}
      <View style={[surface.panel, styles.card]}>
        <Text accessibilityRole="header" style={type.heading}>Pintasan praktikum</Text>
        <Action label="Kelola kelas" variant="secondary" onPress={() => onKelola()} />
        <Action label="Lihat rekap presensi" variant="secondary" onPress={onRekap} />
        <Action label="Periksa pengajuan izin" variant="secondary" onPress={onIzin} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.inset, gap: space.sm },
  session: { borderTopWidth: 3, borderTopColor: color.cobalt },
  accent: { color: color.cobalt },
});
