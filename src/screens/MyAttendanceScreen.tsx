import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useApp } from '@/store/AppContext';

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function MyAttendanceScreen() {
  const { activeUser, sessions, attendance } = useApp();

  if (!activeUser || activeUser.role !== 'PRAKTIKAN') {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>
          Riwayat hanya tersedia untuk praktikan
        </Text>
      </View>
    );
  }

  // Filter using the active Praktikan's ID, not just their class.
  const records = attendance
    .filter((record) => record.praktikanId === activeUser.id)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime(),
    );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Riwayat Kehadiran
        </Text>

        <Text style={styles.subtitle}>
          Catatan presensi untuk {activeUser.nama}
        </Text>

        <Text style={styles.subtitle}>
          NIM: {activeUser.nim}
        </Text>
      </View>

      {records.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            Belum ada catatan kehadiran
          </Text>

          <Text style={styles.subtitle}>
            Presensi yang berhasil akan muncul di sini.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {records.map((record) => {
            const session = sessions.find(
              (item) => item.id === record.sessionId,
            );

            return (
              <View key={record.id} style={styles.card}>
                <Text style={styles.sessionName}>
                  {session?.namaPraktikum ??
                    'Praktikum tidak ditemukan'}
                </Text>

                <Text style={styles.meta}>
                  Kelas: {session?.kelas ?? record.kelas}
                </Text>

                <Text style={styles.meta}>
                  Lab: {session?.lab ?? '-'}
                </Text>

                <Text style={styles.meta}>
                  Tanggal sesi: {session?.tanggal ?? '-'}
                </Text>

                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>
                    ✔ Hadir pukul {formatTime(record.timestamp)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 16,
    padding: 16,
  },
  heading: {
    gap: 5,
  },
  title: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    gap: 9,
    padding: 16,
  },
  sessionName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: '#6B7280',
    fontSize: 13,
  },
  timeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  timeText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});