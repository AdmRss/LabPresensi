import { StyleSheet, Text, View } from 'react-native';

export type SessionStatus = 'BELUM_DIBUKA' | 'DIBUKA' | 'DITUTUP';

export type StatusBadgeProps = {
  status: SessionStatus;
};

const statusPresentation: Record<
  SessionStatus,
  { backgroundColor: string; color: string; label: string }
> = {
  BELUM_DIBUKA: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    label: 'Belum Dibuka',
  },
  DIBUKA: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
    label: 'Dibuka',
  },
  DITUTUP: {
    backgroundColor: '#E5E7EB',
    color: '#374151',
    label: 'Ditutup',
  },
};

export function getSessionStatusLabel(status: SessionStatus) {
  return statusPresentation[status].label;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const presentation = statusPresentation[status];

  return (
    <View
      accessibilityLabel={`Status sesi: ${presentation.label}`}
      style={[styles.badge, { backgroundColor: presentation.backgroundColor }]}
    >
      <Text style={[styles.label, { color: presentation.color }]}>
        {presentation.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
