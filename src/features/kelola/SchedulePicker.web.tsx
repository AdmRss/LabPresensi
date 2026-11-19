import { useState } from 'react';
import { View } from 'react-native';

import { Action } from '@/components/Interface';
import { color, space } from '@/constants/design';
import { dateKey, formatMinutes, parseDate, pickerMinutes, pickerTime, timeMinutes } from './schedule';
import type { SchedulePickerProps } from './SchedulePicker';

export function SchedulePicker({ mode, value, minimumDate, onConfirm, onCancel }: SchedulePickerProps) {
  const [draft, setDraft] = useState<Date | null>(value);
  const current = !draft ? '' : mode === 'date' ? dateKey(draft) : formatMinutes(pickerMinutes(draft));
  return (
    <View style={{ gap: space.sm }}>
      <input
        aria-label={mode === 'date' ? 'Pilih tanggal sesi' : 'Pilih jam sesi'}
        lang="id-ID"
        type={mode}
        value={current}
        min={minimumDate ? dateKey(minimumDate) : undefined}
        style={{ border: '2px solid ' + color.fieldBorder, padding: space.md, fontSize: 16, color: color.ink }}
        onChange={({ currentTarget }) => {
          if (mode === 'date') {
            setDraft(parseDate(currentTarget.value));
          } else {
            const minutes = timeMinutes(currentTarget.value);
            setDraft(minutes === null ? null : pickerTime(minutes));
          }
        }}
      />
      <Action label="Pilih" disabled={!draft || Boolean(minimumDate && dateKey(draft) < dateKey(minimumDate))} onPress={() => { if (draft) onConfirm(draft); }} />
      <Action label="Batal" variant="secondary" onPress={onCancel} />
    </View>
  );
}
