import React, { type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

/**
 * Error boundary global (SRS-011): kegagalan render tak terduga menampilkan
 * pesan yang bisa dibaca, bukan layar putih/crash.
 */
export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          Terjadi kesalahan
        </Text>
        <Text style={styles.message}>
          Aplikasi mengalami kesalahan tak terduga. Data Anda tidak diubah. Silakan coba muat
          ulang tampilan ini.
        </Text>
        {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
        <Pressable
          accessibilityRole="button"
          onPress={this.handleReset}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonLabel}>Coba Lagi</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 420,
    textAlign: 'center',
  },
  detail: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    color: '#B91C1C',
    fontSize: 12,
    maxWidth: 420,
    padding: 10,
    width: '100%',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
