import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppContextProvider, useApp } from '@/store/AppContext';
import { NavContextProvider, useNav } from '@/navigation/NavContext';
import { AppHeader } from '@/components/AppHeader';
import { RoleSelectScreen } from '@/screens/RoleSelectScreen';
import { ScheduleScreen } from '@/screens/ScheduleScreen';
import { SessionDetailScreen } from '@/screens/SessionDetailScreen';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import type { PracticumSession, Praktikan } from '@/types';

function MainAppNavigator() {
  const { currentScreen, selectedSessionId, activeTab, setActiveTab, navigateTo, goBack } = useNav();
  const { activeUser, sessions, attendance, openSession, closeSession, checkIn } = useApp();

  // Check-in confirmation & feedback state (SRS-005)
  const [checkInConfirmSessionId, setCheckInConfirmSessionId] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkInPending, setCheckInPending] = useState(false);
  const [lastCheckInTime, setLastCheckInTime] = useState<string | null>(null);

  if (currentScreen === 'ROLE_SELECT' || !activeUser) {
    return <RoleSelectScreen />;
  }

  // Handle Praktikan tabs (Jadwal vs Riwayat)
  if (activeUser.role === 'PRAKTIKAN' && activeTab === 'RIWAYAT' && currentScreen === 'SCHEDULE') {
    const myAttendance = attendance.filter((a) => a.praktikanId === activeUser.id);

    return (
      <View style={styles.container}>
        <AppHeader />
        {/* Tab Selector */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab('SCHEDULE')}
            style={[styles.tabButton, (activeTab as string) === 'SCHEDULE' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, (activeTab as string) === 'SCHEDULE' && styles.tabTextActive]}>Jadwal</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('RIWAYAT')}
            style={[styles.tabButton, (activeTab as string) === 'RIWAYAT' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, (activeTab as string) === 'RIWAYAT' && styles.tabTextActive]}>Riwayat Kehadiran</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.screen}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              Riwayat Kehadiran
            </Text>
            <Text style={styles.subtitle}>Catatan presensi Anda selama praktikum</Text>
          </View>

          {myAttendance.length === 0 ? (
            <View style={styles.emptyState}>
              <Text accessibilityRole="alert" style={styles.stateTitle}>
                Belum ada catatan kehadiran
              </Text>
              <Text style={styles.stateDescription}>
                Anda belum melakukan presensi pada sesi praktikum manapun.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {myAttendance.map((rec) => {
                const sess = sessions.find((s) => s.id === rec.sessionId);
                const timeStr = new Date(rec.timestamp).toLocaleTimeString();
                const dateStr = new Date(rec.timestamp).toLocaleDateString();

                return (
                  <View key={rec.id} style={styles.attendanceCard}>
                    <Text style={styles.attTitle}>{sess?.namaPraktikum || 'Praktikum'}</Text>
                    <Text style={styles.attMeta}>Kelas: {rec.kelas} • Lab: {sess?.lab || '-'}</Text>
                    <Text style={styles.attMeta}>Tanggal: {dateStr}</Text>
                    <View style={styles.successBadge}>
                      <Text style={styles.successBadgeText}>✔ Hadir pukul {timeStr}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Recap Screen (SRS-006)
  if (currentScreen === 'RECAP' && selectedSessionId) {
    const session = sessions.find((s) => s.id === selectedSessionId);
    const sessionAttendance = attendance.filter((a) => a.sessionId === selectedSessionId);

    return (
      <View style={styles.container}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.screen}>
          <Pressable
            accessibilityLabel="Kembali"
            onPress={goBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backButtonText}>Kembali</Text>
          </Pressable>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>
              Rekap Presensi: {session?.namaPraktikum}
            </Text>
            <Text style={styles.subtitle}>
              Kelas {session?.kelas} • Total Hadir: <Text style={styles.bold}>{sessionAttendance.length}</Text> Praktikan
            </Text>

            {sessionAttendance.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.stateTitle}>Belum ada praktikan yang presensi</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {sessionAttendance.map((rec, idx) => {
                  const timeStr = new Date(rec.timestamp).toLocaleTimeString();
                  return (
                    <View key={rec.id} style={styles.recapItem}>
                      <Text style={styles.recapIndex}>{idx + 1}.</Text>
                      <View style={styles.recapInfo}>
                        <Text style={styles.recapName}>{rec.nama}</Text>
                        <Text style={styles.recapNim}>NIM: {rec.nim} • Kelas: {rec.kelas}</Text>
                      </View>
                      <Text style={styles.recapTime}>{timeStr}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Session Detail Screen
  if (currentScreen === 'SESSION_DETAIL' && selectedSessionId) {
    // Render check-in action component for praktikan (SRS-005)
    const renderCheckInAction = (session: PracticumSession) => {
      const praktikan = activeUser.role === 'PRAKTIKAN' ? (activeUser as Praktikan) : null;
      const existingRecord = praktikan
        ? attendance.find((a) => a.sessionId === session.id && a.praktikanId === praktikan.id)
        : null;

      if (session.status === 'BELUM_DIBUKA') {
        return (
          <View style={styles.actionBox}>
            <Text style={styles.disabledActionText}>Sesi belum dibuka</Text>
          </View>
        );
      }

      if (session.status === 'DITUTUP') {
        return (
          <View style={styles.actionBox}>
            <Text style={styles.disabledActionText}>Sesi sudah ditutup</Text>
          </View>
        );
      }

      if (existingRecord) {
        const timeStr = new Date(existingRecord.timestamp).toLocaleTimeString();
        return (
          <View style={styles.checkedInBox}>
            <Text style={styles.checkedInText}>✔ Presensi tercatat pukul {timeStr}</Text>
          </View>
        );
      }

      return (
        <View style={styles.actionBox}>
          <Pressable
            onPress={() => {
              setCheckInError(null);
              setCheckInConfirmSessionId(session.id);
            }}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>Presensi Sekarang</Text>
          </Pressable>

          <ConfirmSheet
            cancelLabel="Batal"
            confirmLabel="Ya, Presensi"
            error={checkInError}
            message={`Lakukan presensi atas nama ${praktikan?.nama} (NIM: ${praktikan?.nim}) untuk sesi ${session.namaPraktikum}?`}
            onCancel={() => {
              setCheckInConfirmSessionId(null);
              setCheckInError(null);
            }}
            onConfirm={() => {
              setCheckInPending(true);
              setCheckInError(null);
              const result = checkIn(session.id);
              setCheckInPending(false);

              if (!result.ok) {
                if (result.code === 'ALREADY_CHECKED_IN') {
                  setCheckInError('Anda sudah melakukan presensi pada sesi ini.');
                } else if (result.code === 'SESSION_NOT_OPEN') {
                  setCheckInError('Sesi belum dibuka atau sudah ditutup.');
                } else {
                  setCheckInError(result.message || 'Presensi gagal.');
                }
                return;
              }

              setCheckInConfirmSessionId(null);
              setLastCheckInTime(new Date(result.record.timestamp).toLocaleTimeString());
            }}
            pending={checkInPending}
            title="Konfirmasi Presensi"
            visible={checkInConfirmSessionId === session.id}
          />
        </View>
      );
    };

    return (
      <View style={styles.container}>
        <AppHeader />
        <SessionDetailScreen
          activeUser={activeUser}
          closeSession={closeSession}
          onBack={goBack}
          onOpenRecap={(sId) => navigateTo('RECAP', sId)}
          openSession={openSession}
          renderCheckIn={renderCheckInAction}
          sessionId={selectedSessionId}
          sessions={sessions}
        />
      </View>
    );
  }

  // Schedule Screen (Default for SCHEDULE)
  return (
    <View style={styles.container}>
      <AppHeader />
      {activeUser.role === 'PRAKTIKAN' && (
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab('SCHEDULE')}
            style={[styles.tabButton, activeTab === 'SCHEDULE' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === 'SCHEDULE' && styles.tabTextActive]}>Jadwal</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('RIWAYAT')}
            style={[styles.tabButton, activeTab === 'RIWAYAT' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === 'RIWAYAT' && styles.tabTextActive]}>Riwayat Kehadiran</Text>
          </Pressable>
        </View>
      )}
      <ScheduleScreen
        activeUser={activeUser}
        onOpenSessionDetail={(sId) => navigateTo('SESSION_DETAIL', sId)}
        sessions={sessions}
      />
    </View>
  );
}

export default function App() {
  return (
    <AppContextProvider>
      <NavContextProvider>
        <SafeAreaView style={styles.safeArea}>
          <MainAppNavigator />
        </SafeAreaView>
      </NavContextProvider>
    </AppContextProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  container: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
  },
  heading: {
    gap: 4,
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
  },
  bold: {
    fontWeight: '700',
    color: '#111827',
  },
  tabRow: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
  },
  tabButtonActive: {
    borderBottomColor: '#2563EB',
    borderBottomWidth: 2,
  },
  tabText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#2563EB',
  },
  list: {
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  stateTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateDescription: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  attendanceCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  attTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  attMeta: {
    color: '#6B7280',
    fontSize: 13,
  },
  successBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  successBadgeText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
  },
  recapItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  recapIndex: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
    width: 24,
  },
  recapInfo: {
    flex: 1,
    gap: 2,
  },
  recapName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  recapNim: {
    color: '#6B7280',
    fontSize: 12,
  },
  recapTime: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '700',
  },
  actionBox: {
    gap: 8,
  },
  disabledActionText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkedInBox: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    padding: 12,
  },
  checkedInText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    padding: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
