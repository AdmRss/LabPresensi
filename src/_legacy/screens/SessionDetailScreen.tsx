import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AssistantSessionActions,
  type SessionActionCallback,
} from '@/components/AssistantSessionActions';
import type { ActiveUser, PracticumSession } from '@/components/SessionCard';
import { StatusBadge } from '@/components/StatusBadge';

export type SessionDetailScreenProps = {
  activeUser: ActiveUser | null;
  closeSession: SessionActionCallback;
  onBack: () => void;
  onOpenRecap?: (sessionId: string) => void;
  openSession: SessionActionCallback;
  renderCheckIn?: (session: PracticumSession) => ReactNode;
  sessionId: string;
  sessions: readonly PracticumSession[];
};

export function SessionDetailScreen({
  activeUser,
  closeSession,
  onBack,
  onOpenRecap,
  openSession,
  renderCheckIn,
  sessionId,
  sessions,
}: SessionDetailScreenProps) {
  const session = sessions.find((candidate) => candidate.id === sessionId);

  if (!activeUser) {
    return (
      <DetailState
        description="Muat identitas pengguna sebelum membuka detail sesi."
        onBack={onBack}
        title="Identitas pengguna belum tersedia"
      />
    );
  }

  if (!session) {
    return (
      <DetailState
        description="Sesi mungkin telah dihapus atau ID sesi tidak valid."
        onBack={onBack}
        title="Sesi tidak ditemukan"
      />
    );
  }

  const canAccessSession =
    activeUser.role === 'ASISTEN'
      ? session.asistenId === activeUser.id
      : session.kelas === activeUser.kelas;

  if (!canAccessSession) {
    return (
      <DetailState
        description="Sesi ini tidak termasuk jadwal yang dapat Anda akses."
        onBack={onBack}
        title="Akses sesi ditolak"
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.screen}
    >
      <View style={styles.content}>
        <Pressable
          accessibilityLabel="Kembali dari detail sesi"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.backButtonText}>Kembali</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text accessibilityRole="header" style={styles.title}>
                {session.namaPraktikum}
              </Text>
              <Text style={styles.classText}>Kelas {session.kelas}</Text>
            </View>
            <StatusBadge status={session.status} />
          </View>

          <View style={styles.details}>
            <DetailRow label="Lab" value={session.lab} />
            <DetailRow label="Tanggal" value={session.tanggal} />
            <DetailRow
              label="Waktu"
              value={`${session.jamMulai} - ${session.jamSelesai}`}
            />
          </View>
        </View>

        {activeUser.role === 'ASISTEN' ? (
          <View style={styles.actionSection}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Pengelolaan Sesi
            </Text>
            <AssistantSessionActions
              closeSession={closeSession}
              openSession={openSession}
              sessionId={session.id}
              sessionName={session.namaPraktikum}
              status={session.status}
            />

            {onOpenRecap ? (
              <Pressable
                accessibilityLabel={`Lihat rekap ${session.namaPraktikum}`}
                accessibilityRole="button"
                onPress={() => onOpenRecap(session.id)}
                style={({ pressed }) => [
                  styles.recapButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.recapButtonText}>Lihat Rekap</Text>
              </Pressable>
            ) : (
              <UnavailableIntegration message="Rekap belum tersedia." />
            )}
          </View>
        ) : (
          <View style={styles.actionSection}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Presensi
            </Text>
            {renderCheckIn ? (
              renderCheckIn(session)
            ) : (
              <UnavailableIntegration message="Fitur presensi belum tersedia." />
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

type DetailStateProps = {
  description: string;
  onBack: () => void;
  title: string;
};

function DetailState({ description, onBack, title }: DetailStateProps) {
  return (
    <View style={styles.stateScreen}>
      <Text accessibilityRole="alert" style={styles.stateTitle}>
        {title}
      </Text>
      <Text style={styles.stateDescription}>{description}</Text>
      <Pressable
        accessibilityLabel="Kembali"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.recapButton, pressed && styles.buttonPressed]}
      >
        <Text style={styles.recapButtonText}>Kembali</Text>
      </Pressable>
    </View>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function UnavailableIntegration({ message }: { message: string }) {
  return (
    <View style={styles.unavailableBox}>
      <Text style={styles.unavailableText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    padding: 16,
  },
  content: {
    gap: 16,
    maxWidth: 720,
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    gap: 20,
    padding: 16,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexGrow: 1,
    flexShrink: 1,
    gap: 4,
    minWidth: 180,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  classText: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
  },
  details: {
    gap: 10,
  },
  detailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  detailLabel: {
    color: '#6B7280',
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    width: 72,
  },
  detailValue: {
    color: '#1F2937',
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionSection: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  recapButton: {
    alignItems: 'center',
    borderColor: '#2563EB',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recapButtonText: {
    color: '#1D4ED8',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  unavailableBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
  },
  unavailableText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  stateScreen: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 24,
  },
  stateTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
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
