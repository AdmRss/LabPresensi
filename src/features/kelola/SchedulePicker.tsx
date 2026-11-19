import { useState } from 'react';
import { Platform, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { Action } from '@/components/Interface';
import { color, space } from '@/constants/design';

export type SchedulePickerProps = {
  mode: 'date' | 'time';
  value: Date;
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
};

export function SchedulePicker({ mode, value, minimumDate, onConfirm, onCancel }: SchedulePickerProps) {
  const [draft, setDraft] = useState(value);
  const android = Platform.OS === 'android';
  return (
    <View style={{ gap: space.sm }}>
      <DateTimePicker
        value={android ? value : draft}
        mode={mode}
        minimumDate={minimumDate}
        presentation={android ? 'dialog' : 'inline'}
        display={android ? 'default' : mode === 'date' ? 'inline' : 'spinner'}
        locale="id_ID"
        is24Hour
        accentColor={color.cobalt}
        positiveButton={{ label: 'Pilih' }}
        negativeButton={{ label: 'Batal' }}
        onValueChange={(_, date) => android ? onConfirm(date) : setDraft(date)}
        onDismiss={onCancel}
      />
      {!android ? <>
        <Action label="Pilih" onPress={() => onConfirm(draft)} />
        <Action label="Batal" variant="secondary" onPress={onCancel} />
      </> : null}
    </View>
  );
}
