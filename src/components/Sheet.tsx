import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color, radius, space, surface, type } from '@/constants/design';

export function Sheet({
  title, visible, onClose, children, footer, list = false,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  list?: boolean;
}) {
  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}>
      <SafeAreaView style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <View accessibilityViewIsModal style={[surface.panel, styles.sheet, list && styles.listSheet]}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={[type.heading, styles.title]}>{title}</Text>
            </View>
            {list ? (
              <View style={[styles.body, styles.listBody]}>{children}</View>
            ) : (
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} style={styles.scroll}>
                {children}
              </ScrollView>
            )}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: color.overlay },
  keyboard: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: space.md, paddingTop: space.md },
  sheet: {
    width: '100%', maxWidth: 550, maxHeight: '100%', backgroundColor: color.paper, overflow: 'hidden',
    borderTopLeftRadius: radius * 2, borderTopRightRadius: radius * 2, borderTopWidth: 3, borderTopColor: color.cobalt,
  },
  listSheet: { height: '85%' },
  header: { backgroundColor: color.sheet, paddingHorizontal: space.gutter, paddingVertical: space.inset, borderBottomWidth: 1, borderBottomColor: color.line },
  title: { flexShrink: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { padding: space.gutter, gap: space.inset },
  listBody: { flex: 1, paddingBottom: 0 },
  footer: {
    backgroundColor: color.sheet, borderTopWidth: 1, borderTopColor: color.line,
    flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: space.sm, padding: space.md,
  },
});
