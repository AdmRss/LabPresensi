import { FlatList, StyleSheet, Text, View } from 'react-native';

import {
  SessionCard,
  type ActiveUser,
  type PracticumSession,
} from '@/components/SessionCard';

export type ScheduleScreenProps = {
  activeUser: ActiveUser | null;
  onOpenSessionDetail: (sessionId: string) => void;
  sessions: readonly PracticumSession[];
};

export function ScheduleScreen({
  activeUser,
  onOpenSessionDetail,
  sessions,
}: ScheduleScreenProps) {
  if (!activeUser) {
    return (
      <View style={styles.centeredState}>
        <Text accessibilityRole="alert" style={styles.stateTitle}>
          Identitas pengguna belum tersedia
        </Text>
        <Text style={styles.stateDescription}>
          Pilih atau muat identitas pengguna untuk melihat jadwal praktikum.
        </Text>
      </View>
    );
  }

  const visibleSessions = sessions.filter((session) => {
    if (activeUser.role === 'ASISTEN') {
      return session.asistenId === activeUser.id;
    }

    return session.kelas === activeUser.kelas;
  });

  return (
    <View style={styles.screen}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Jadwal Praktikum
        </Text>
        <Text style={styles.subtitle}>
          {activeUser.role === 'ASISTEN'
            ? 'Sesi yang Anda asisteni'
            : `Jadwal untuk kelas ${activeUser.kelas}`}
        </Text>
      </View>

      <FlatList
        contentContainerStyle={[
          styles.listContent,
          visibleSessions.length === 0 && styles.emptyListContent,
        ]}
        data={visibleSessions}
        keyExtractor={(session) => session.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text accessibilityRole="alert" style={styles.stateTitle}>
              Belum ada jadwal praktikum
            </Text>
            <Text style={styles.stateDescription}>
              Jadwal yang sesuai dengan akun Anda akan muncul di sini.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            className={item.kelas}
            date={item.tanggal}
            endTime={item.jamSelesai}
            lab={item.lab}
            name={item.namaPraktikum}
            onPress={() => onOpenSessionDetail(item.id)}
            startTime={item.jamMulai}
            status={item.status}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  heading: {
    gap: 4,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  centeredState: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    minHeight: 220,
    padding: 24,
  },
  stateTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
  stateDescription: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 320,
    textAlign: 'center',
  },
});
