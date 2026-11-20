import { Action, Notice } from '@/components/Interface';
import { Sheet } from '@/components/Sheet';
import { space, type } from '@/constants/design';
import { Text } from 'react-native';

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
  destructive?: boolean;
};

export function ConfirmSheet({
  visible, title, message, confirmLabel = 'Konfirmasi', cancelLabel = 'Batal',
  onConfirm, onCancel, pending = false, error, destructive = false,
}: ConfirmSheetProps) {
  return (
    <Sheet
      title={title}
      visible={visible}
      onClose={() => { if (!pending) onCancel(); }}
      footer={(
        <>
          <Action label={cancelLabel} variant="secondary" disabled={pending} onPress={onCancel} style={{ flexGrow: 1 }} />
          <Action label={confirmLabel} variant={destructive ? 'danger' : 'primary'} busy={pending} onPress={onConfirm} style={{ flexGrow: 1 }} />
        </>
      )}>
      <Text style={[type.body, { paddingVertical: space.xs }]}>{message}</Text>
      {error ? <Notice message={error} /> : null}
    </Sheet>
  );
}
