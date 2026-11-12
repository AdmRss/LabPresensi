import { StyleSheet, Text, View } from 'react-native';

// Placeholder scaffold: form login/register asli dibuat pada M1 (P1).
export function AuthScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        LabPresensi
      </Text>
      <Text style={styles.description}>
        Layar autentikasi akan diimplementasikan oleh Programmer 1 pada M1 (SRS-001).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
  },
  description: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
