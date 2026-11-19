import { useState } from 'react';
import { Text, View } from 'react-native';
import { Action } from '@/components/Interface';
import { space, type } from '@/constants/design';

export type DropdownOption = { id: string; label: string };

export function Dropdown({ label, value, options, onChange, disabled }: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = options.find(option => option.id === value);
  return <View style={{ gap: space.xs }}>
    <Text style={type.label}>{label}</Text>
    <Action label={(selected?.label ?? 'Pilih ' + label.toLowerCase()) + (expanded ? ' ▴' : ' ▾')}
      accessibilityLabel={label + (selected ? ', ' + selected.label : '')}
      accessibilityState={{ expanded }} variant="secondary"
      disabled={disabled || !options.length} onPress={() => setExpanded(!expanded)} />
    {expanded && !disabled ? options.map(option =>
      <Action key={option.id} label={option.label} variant={option.id === value ? 'primary' : 'secondary'}
        onPress={() => { onChange(option.id); setExpanded(false); }} />) : null}
    {!options.length ? <Text style={type.muted}>Belum ada pilihan.</Text> : null}
  </View>;
}
