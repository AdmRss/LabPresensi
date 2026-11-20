import React, { type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Action, Notice, ScreenState } from '@/components/Interface';
import { color, surface } from '@/constants/design';

export class AppErrorBoundary extends React.Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={[surface.page, styles.centered]}>
          <View style={surface.column}>
            <ScreenState title="Terjadi kesalahan" description="Coba muat ulang tampilan ini." tone="danger">
              {__DEV__ ? <Notice message={error.message} /> : null}
              <Action label="Coba lagi" onPress={() => this.setState({ error: null })} />
            </ScreenState>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { backgroundColor: color.paper, flex: 1 },
  centered: { flexGrow: 1, justifyContent: 'center' },
});
