import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, space, surface, touch, type } from '@/constants/design';

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
  const inactive = disabled || !options.length;
  return <View style={styles.field}>
    <Text style={type.label}>{label}</Text>
    <Pressable accessibilityRole="button"
      accessibilityLabel={label + (selected ? ', ' + selected.label : '')}
      accessibilityState={{ expanded, disabled: inactive }} disabled={inactive} onPress={() => setExpanded(!expanded)}
      style={({ pressed }) => [surface.panel, styles.trigger, expanded && styles.expanded, inactive && styles.inactive, pressed && styles.pressed]}>
      <Text style={[selected ? type.body : type.muted, styles.text]}>{selected?.label ?? 'Pilih ' + label.toLowerCase()}</Text>
      <Text aria-hidden style={styles.caret}>{expanded ? '▴' : '▾'}</Text>
    </Pressable>
    {expanded && !disabled && options.length ? <View style={[surface.panel, styles.options]}>
      {options.map((option, index) => (
        <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: option.id === value }}
          onPress={() => { onChange(option.id); setExpanded(false); }}
          style={({ pressed }) => [styles.option, index > 0 && styles.divider, option.id === value && styles.selected, pressed && styles.pressed]}>
          <Text style={[type.body, styles.text, option.id === value && styles.selectedText]}>{option.label}</Text>
          {option.id === value ? <Text aria-hidden style={styles.caret}>✓</Text> : null}
        </Pressable>
      ))}
    </View> : null}
    {!options.length ? <Text style={type.muted}>Belum ada pilihan.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  trigger: { minHeight: touch, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.md, borderColor: color.fieldBorder },
  expanded: { borderColor: color.cobalt },
  inactive: { backgroundColor: color.cream, borderColor: color.line },
  pressed: { backgroundColor: color.cream },
  text: { flex: 1, minWidth: 0 },
  caret: { color: color.cobalt, fontSize: 16, fontWeight: '700' },
  options: { overflow: 'hidden', borderRadius: radius },
  option: { minHeight: touch, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm },
  divider: { borderTopWidth: 1, borderTopColor: color.line },
  selected: { backgroundColor: color.blueWash },
  selectedText: { color: color.blueInk, fontWeight: '700' },
});
