import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getSessionStatusLabel,
  StatusBadge,
  type SessionStatus,
} from './StatusBadge';

export type ActiveUser =
  | {
      id: string;
      role: 'ASISTEN';
    }
  | {
      id: string;
      kelas: string;
      role: 'PRAKTIKAN';
    };

export type PracticumSession = {
  asistenId: string;
  id: string;
  jamMulai: string;
  jamSelesai: string;
  kelas: string;
  lab: string;
  namaPraktikum: string;
  status: SessionStatus;
  tanggal: string;
};

export type SessionCardProps = {
  className: string;
  date: string;
  endTime: string;
  lab: string;
  name: string;
  onPress: () => void;
  startTime: string;
  status: SessionStatus;
};

export function SessionCard({
  className,
  date,
  endTime,
  lab,
  name,
  onPress,
  startTime,
  status,
}: SessionCardProps) {
  return (
    <Pressable
      accessibilityHint="Membuka detail sesi praktikum"
      accessibilityLabel={`${name}, kelas ${className}, ${date}, pukul ${startTime} sampai ${endTime}, status ${getSessionStatusLabel(status)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <StatusBadge status={status} />
      </View>

      <View style={styles.details}>
        <DetailRow label="Kelas" value={className} />
        <DetailRow label="Lab" value={lab} />
        <DetailRow label="Tanggal" value={date} />
        <DetailRow label="Waktu" value={`${startTime} - ${endTime}`} />
      </View>
    </Pressable>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    minHeight: 48,
    padding: 16,
    shadowColor: '#111827',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: '#F9FAFB',
    opacity: 0.88,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  name: {
    color: '#111827',
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    minWidth: 160,
  },
  details: {
    gap: 8,
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
    fontWeight: '600',
    lineHeight: 20,
    width: 64,
  },
  detailValue: {
    color: '#374151',
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
