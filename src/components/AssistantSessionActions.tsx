import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { SessionStatus } from './StatusBadge';

export type SessionActionResult =
  | { ok: true }
  | {
      code?: string;
      message?: string;
      ok: false;
    };

export type SessionActionCallback = (
  sessionId: string,
) => SessionActionResult | Promise<SessionActionResult>;

export type AssistantSessionActionsProps = {
  closeSession: SessionActionCallback;
  openSession: SessionActionCallback;
  sessionId: string;
  sessionName: string;
  status: SessionStatus;
};

type ActionableStatus = Extract<SessionStatus, 'BELUM_DIBUKA' | 'DIBUKA'>;

type ActionContext = {
  sessionId: string;
  status: ActionableStatus;
};

type ActionError = ActionContext & {
  message: string;
};

type ActionConfiguration = {
  actionLabel: string;
  confirmLabel: string;
  message: string;
  title: string;
};

function getActionConfiguration(status: ActionableStatus): ActionConfiguration {
  if (status === 'BELUM_DIBUKA') {
    return {
      actionLabel: 'Buka Sesi',
      confirmLabel: 'Buka Sesi',
      message: 'Sesi akan dibuka dan praktikan dapat melakukan presensi.',
      title: 'Buka sesi praktikum?',
    };
  }

  return {
    actionLabel: 'Tutup Sesi',
    confirmLabel: 'Tutup Sesi',
    message: 'Sesi akan ditutup dan praktikan tidak dapat melakukan presensi lagi.',
    title: 'Tutup sesi praktikum?',
  };
}

function isSameContext(
  context: ActionContext | null,
  sessionId: string,
  status: SessionStatus,
) {
  return context?.sessionId === sessionId && context.status === status;
}

function getFailureMessage(result: Extract<SessionActionResult, { ok: false }>) {
  if (result.code === 'INVALID_STATE') {
    return 'Status sesi sudah tidak sesuai untuk aksi ini. Periksa status terbaru lalu coba lagi.';
  }

  if (result.message?.trim()) {
    return result.message;
  }

  return 'Perubahan status sesi gagal. Silakan coba lagi.';
}

export function AssistantSessionActions(props: AssistantSessionActionsProps) {
  return (
    <AssistantSessionActionsContent
      key={`${props.sessionId}:${props.status}`}
      {...props}
    />
  );
}

function AssistantSessionActionsContent({
  closeSession,
  openSession,
  sessionId,
  sessionName,
  status,
}: AssistantSessionActionsProps) {
  const [confirmation, setConfirmation] = useState<ActionContext | null>(null);
  const [pending, setPending] = useState<ActionContext | null>(null);
  const [error, setError] = useState<ActionError | null>(null);
  const activeRequest = useRef<ActionContext | null>(null);

  if (status === 'DITUTUP') {
    return (
      <View style={styles.container}>
        <Text accessibilityRole="text" style={styles.closedText}>
          Sesi telah ditutup
        </Text>
      </View>
    );
  }

  const configuration = getActionConfiguration(status);
  const confirmationIsCurrent = isSameContext(confirmation, sessionId, status);
  const pendingIsCurrent = isSameContext(pending, sessionId, status);
  const visibleError =
    error && isSameContext(error, sessionId, status) ? error.message : null;

  const openConfirmation = () => {
    if (pendingIsCurrent) {
      return;
    }

    setError(null);
    setConfirmation({ sessionId, status });
  };

  const cancelConfirmation = () => {
    if (!pendingIsCurrent) {
      setConfirmation(null);
      setError(null);
    }
  };

  const confirmAction = async () => {
    if (
      !confirmation ||
      !confirmationIsCurrent ||
      pendingIsCurrent ||
      activeRequest.current
    ) {
      return;
    }

    const requestContext = confirmation;
    const action = status === 'BELUM_DIBUKA' ? openSession : closeSession;

    activeRequest.current = requestContext;
    setPending(requestContext);
    setError(null);

    try {
      const result = await action(sessionId);

      if (!result.ok) {
        setError({ ...requestContext, message: getFailureMessage(result) });
        return;
      }

      setConfirmation((current) =>
        isSameContext(current, requestContext.sessionId, requestContext.status) ? null : current,
      );
    } catch {
      setError({
        ...requestContext,
        message: 'Terjadi kesalahan saat memperbarui sesi. Silakan coba lagi.',
      });
    } finally {
      if (activeRequest.current === requestContext) {
        activeRequest.current = null;
        setPending(null);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={configuration.actionLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: pendingIsCurrent }}
        disabled={pendingIsCurrent}
        onPress={openConfirmation}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.buttonPressed,
          pendingIsCurrent && styles.buttonDisabled,
        ]}
      >
        {pendingIsCurrent ? (
          <View style={styles.pendingContent}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.primaryButtonText}>Memproses...</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>{configuration.actionLabel}</Text>
        )}
      </Pressable>

      {visibleError ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {visibleError}
        </Text>
      ) : null}

      <ConfirmationModal
        configuration={configuration}
        error={visibleError}
        onCancel={cancelConfirmation}
        onConfirm={confirmAction}
        pending={pendingIsCurrent}
        sessionName={sessionName}
        visible={confirmationIsCurrent}
      />
    </View>
  );
}

type ConfirmationModalProps = {
  configuration: ActionConfiguration;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  sessionName: string;
  visible: boolean;
};

function ConfirmationModal({
  configuration,
  error,
  onCancel,
  onConfirm,
  pending,
  sessionName,
  visible,
}: ConfirmationModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View accessibilityViewIsModal style={styles.modalCard}>
          <Text accessibilityRole="header" style={styles.modalTitle}>
            {configuration.title}
          </Text>
          <Text style={styles.sessionName}>{sessionName}</Text>
          <Text style={styles.modalMessage}>{configuration.message}</Text>

          {error ? (
            <Text accessibilityRole="alert" style={styles.modalError}>
              {error}
            </Text>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable
              accessibilityLabel="Batalkan perubahan status sesi"
              accessibilityRole="button"
              accessibilityState={{ disabled: pending }}
              disabled={pending}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
                pending && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Batal</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Konfirmasi ${configuration.confirmLabel.toLowerCase()}`}
              accessibilityRole="button"
              accessibilityState={{ busy: pending, disabled: pending }}
              disabled={pending}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.buttonPressed,
                pending && styles.buttonDisabled,
              ]}
            >
              {pending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>{configuration.confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  pendingContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  closedText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 12,
    maxWidth: 440,
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  sessionName: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  modalMessage: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  modalError: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
    padding: 10,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#D1D5DB',
    borderRadius: 10,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 112,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 112,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
