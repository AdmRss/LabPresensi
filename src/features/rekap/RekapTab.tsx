import type { JSX } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function RekapTab(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Rekap
      </Text>
      <Text style={styles.description}>
        Modul rekap kehadiran akan diimplementasikan oleh Programmer 2 (SRS-007).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    padding: 24,
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  description: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
});
