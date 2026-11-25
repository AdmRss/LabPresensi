import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Action, Notice, ScreenHeading, ScreenState } from '@/components/Interface';
import { StatusBadge } from '@/components/StatusBadge';
import { color, space, surface, type } from '@/constants/design';
import { dateKey } from '@/features/kelola/schedule';
import { effectiveSessionStatus, scheduledTime, todayWib } from '@/features/kelola/sessionClock';
import { useScheduleClock } from '@/features/kelola/useScheduleClock';
import { attendanceTime } from '@/features/rekap/rekapService';
import type { Sesi } from '@/types';
import { subscribeToPresensi } from './services/jadwalService';
import { useStudentSchedule } from './useStudentSchedule';

const dayLabel = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta',
});

function sessionTime(session: Sesi) {
  const day = dayLabel.format(scheduledTime(session.tanggal, '12:00'));
  return day + ' · ' + session.jamMulai + '–' + session.jamSelesai + ' WIB';
}

function CheckInAction({ sessionId, uid, onOpen }: { sessionId: string; uid: string; onOpen: () => void }) {
  const [message, setMessage] = useState('Memeriksa presensi…');
  useEffect(() => subscribeToPresensi(sessionId, uid, (record, pending) => {
    if (pending) setMessage('Menunggu konfirmasi server');
    else if (record) setMessage('Presensi tercatat · ' + attendanceTime(record.timestamp));
    else setMessage('');
  }, () => setMessage('Status presensi belum dapat dikonfirmasi.')), [sessionId, uid]);

  return <>
    {message ? <Text style={type.body}>{message}</Text> : null}
    <Action label={message ? 'Lihat detail sesi' : 'Buka presensi'} onPress={onOpen} />
  </>;
}

export function PraktikanHome({ onSchedule, onMap }: {
  onSchedule: (id?: string) => void;
  onMap: (id: string) => void;
}) {
  const { user, sessions, fromCache, error, loading, authLoading } = useStudentSchedule();
  const now = useScheduleClock();
  const today = todayWib(new Date(now));
  const todayKey = dateKey(today);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + (7 - today.getDay()) % 7);
  const weekEnd = dateKey(sunday);
  const upcoming = sessions.filter(session => effectiveSessionStatus(session, now) !== 'DITUTUP'
    && (session.endAt?.toMillis() ?? scheduledTime(session.tanggal, session.jamSelesai)) > now);
  const primary = upcoming.find(session => effectiveSessionStatus(session, now) === 'DIBUKA') ?? upcoming[0];
  const agenda = upcoming.filter(session => session.id !== primary?.id && session.tanggal <= weekEnd).slice(0, 2);
  const hasToday = sessions.some(session => session.tanggal === todayKey);
  const open = primary && effectiveSessionStatus(primary, now) === 'DIBUKA';
  const locationId = primary?.lokasiId;

  return <ScrollView contentContainerStyle={surface.page}>
    <ScreenHeading title="Beranda" />
    {error ? <ScreenState title="Jadwal tidak tersedia" description={error} tone="danger" />
      : authLoading || loading ? <ScreenState title="Memuat jadwal…" loading />
      : <>
        {fromCache ? <Notice tone="warning" message="Jadwal menunggu sinkronisasi." /> : null}
        {primary && user ? <View style={[surface.panel, styles.primary]}>
          <Text style={[type.label, styles.accent]}>{open ? 'Praktikum sedang berlangsung' : 'Praktikum berikutnya'}</Text>
          {!hasToday && !fromCache ? <Text style={type.muted}>Hari ini tidak ada praktikum.</Text> : null}
          <Text accessibilityRole="header" style={type.heading}>{primary.praktikum}</Text>
          <Text style={type.body}>{sessionTime(primary)}</Text>
          <Text style={type.muted}>{[primary.kelasNama, primary.lab].filter(Boolean).join(' · ')}</Text>
          <StatusBadge status={effectiveSessionStatus(primary, now)} />
          {open ? <CheckInAction key={user.uid + '/' + primary.id} uid={user.uid} sessionId={primary.id} onOpen={() => onSchedule(primary.id)} />
            : <Action label="Lihat detail sesi" onPress={() => onSchedule(primary.id)} />}
          {locationId ? <Action label="Lihat peta" variant="quiet" onPress={() => onMap(locationId)} /> : null}
        </View> : <ScreenState title={fromCache ? 'Menunggu jadwal dari server' : 'Belum ada praktikum mendatang'} />}
        <View style={[surface.panel, styles.agenda]}>
          <Text accessibilityRole="header" style={type.heading}>Agenda minggu ini</Text>
          {agenda.length ? agenda.map(session => <Pressable key={session.id} accessibilityRole="button"
            onPress={() => onSchedule(session.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Text style={type.title}>{session.praktikum}</Text>
            <Text style={type.muted}>{sessionTime(session)}</Text>
          </Pressable>) : <Text style={type.muted}>Belum ada sesi lain dalam agenda minggu ini.</Text>}
          <Action label="Lihat semua jadwal" variant="secondary" onPress={() => onSchedule()} />
        </View>
      </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  primary: { padding: space.inset, gap: space.sm, borderTopWidth: 3, borderTopColor: color.cobalt },
  accent: { color: color.cobalt },
  agenda: { padding: space.inset, gap: space.md },
  row: { paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: color.line, gap: space.xs },
  pressed: { backgroundColor: color.blueWash },
});
