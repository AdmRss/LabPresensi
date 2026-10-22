import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

export type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  error?: string | null;
};

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  pending = false,
  error = null,
}: ConfirmSheetProps) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} statusBarTranslucent transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              disabled={pending}
              onPress={onCancel}
              style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              disabled={pending}
              onPress={onConfirm}
              style={({ pressed }) => [styles.button, styles.confirmButton, pressed && styles.pressed]}
            >
              {pending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 12,
    maxWidth: 440,
    padding: 20,
    width: '100%',
  },
  title: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  message: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
    padding: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  button: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelButton: {
    borderColor: '#D1D5DB',
    borderWidth: 1,
  },
  confirmButton: {
    backgroundColor: '#2563EB',
  },
  cancelText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
