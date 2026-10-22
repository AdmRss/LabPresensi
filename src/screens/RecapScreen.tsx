import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useApp } from '@/store/AppContext';
import { useNav } from '@/navigation/NavContext';

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function RecapScreen() {
  const { sessions, attendance } = useApp();
  const { selectedSessionId, goBack } = useNav();

  const session = sessions.find(
    (item) => item.id === selectedSessionId,
  );

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Sesi tidak ditemukan</Text>

        <Pressable
          accessibilityRole="button"
          onPress={goBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  // Only records for the selected session belong in this recap.
  // slice() ensures sorting doesn't mutate the shared state array.
  const records = attendance
    .filter((record) => record.sessionId === session.id)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime(),
    );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kembali dari rekap"
        onPress={goBack}
        style={styles.backButton}
      >
        <Text style={styles.backText}>Kembali</Text>
      </Pressable>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Rekap Presensi
        </Text>

        <Text style={styles.sessionName}>
          {session.namaPraktikum}
        </Text>

        <Text style={styles.meta}>
          Kelas {session.kelas} · Lab {session.lab}
        </Text>

        <Text style={styles.meta}>
          Tanggal sesi: {session.tanggal}
        </Text>

        <View style={styles.countBox}>
          <Text style={styles.countText}>
            Total hadir: {records.length} praktikan
          </Text>
        </View>

        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Belum ada praktikan yang presensi
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {records.map((record, index) => (
              <View key={record.id} style={styles.record}>
                <Text style={styles.index}>
                  {index + 1}.
                </Text>

                <View style={styles.recordInfo}>
                  <Text style={styles.name}>
                    {record.nama}
                  </Text>

                  <Text style={styles.meta}>
                    NIM: {record.nim}
                  </Text>

                  <Text style={styles.meta}>
                    Kelas: {record.kelas}
                  </Text>
                </View>

                <Text style={styles.time}>
                  {formatTime(record.timestamp)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  title: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '800',
  },
  sessionName: {
    color: '#1F2937',
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    color: '#6B7280',
    fontSize: 13,
  },
  countBox: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  countText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  record: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  index: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  recordInfo: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  time: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    color: '#4B5563',
    fontSize: 14,
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backText: {
    color: '#374151',
    fontWeight: '700',
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
});