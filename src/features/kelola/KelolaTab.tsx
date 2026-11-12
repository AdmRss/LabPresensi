import type { JSX } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function KelolaTab(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Kelola
      </Text>
      <Text style={styles.description}>
        Modul kelola kelas dan sesi akan diimplementasikan oleh Programmer 2 (SRS-003 dan SRS-004).
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
