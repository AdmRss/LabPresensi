import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type PressableProps, type TextInputProps,
} from 'react-native';

import { color, radius, space, surface, touch, type } from '@/constants/design';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
const tones = {
  neutral: { fill: color.cream, text: color.ink },
  info: { fill: color.blueWash, text: color.cobalt },
  success: { fill: color.mint, text: color.green },
  warning: { fill: color.straw, text: color.amber },
  danger: { fill: color.coral, text: color.danger },
} satisfies Record<Tone, { fill: string; text: string }>;

const actionColors = {
  primary: { fill: color.cobalt, text: color.onAccent, border: color.cobalt },
  secondary: { fill: color.sheet, text: color.ink, border: color.fieldBorder },
  danger: { fill: color.coral, text: color.danger, border: color.danger },
  quiet: { fill: 'transparent', text: color.cobalt, border: 'transparent' },
};

type ActionProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: keyof typeof actionColors;
  busy?: boolean;
  tactile?: boolean;
  style?: PressableProps['style'];
};

export function Action({
  label, variant = 'primary', busy = false, tactile = false,
  disabled, style, accessibilityState, ...props
}: ActionProps) {
  const inactive = disabled || busy;
  const { fill, text: foreground, border } = actionColors[variant];

  return (
    <Pressable
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, busy, disabled: inactive }}
      disabled={inactive}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        tactile && !inactive && surface.offset,
        state.pressed && styles.actionPressed,
      ]}>
      {({ pressed }) => (
        <View style={[
          surface.outline, styles.action, { backgroundColor: fill, borderColor: border },
          inactive && !busy && styles.inactive, pressed && tactile && styles.actionDown,
        ]}>
          <Text style={[styles.actionText, { color: inactive && !busy ? color.muted : foreground }]}>{label}</Text>
          {busy ? <ActivityIndicator color={foreground} /> : null}
        </View>
      )}
    </Pressable>
  );
}

export function Field({ style, editable, onFocus, onBlur, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      editable={editable}
      onFocus={(event) => { setFocused(true); onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); onBlur?.(event); }}
      placeholderTextColor={color.muted}
      selectionColor={color.blueWash}
      cursorColor={color.cobalt}
      underlineColorAndroid="transparent"
      style={[
        surface.outline, styles.field, props.multiline && styles.multiline,
        editable === false && styles.inactive, style, focused && styles.fieldFocused,
      ]}
    />
  );
}

export function ScreenHeading({ title, action, children }: { title: string; action?: ReactNode; children?: ReactNode }) {
  const heading = <Text accessibilityRole="header" style={[type.display, action ? styles.headingText : undefined]}>{title}</Text>;
  return (
    <View style={styles.screenHeading}>
      <View style={styles.headingTitle}>
        <View style={styles.headingRule} />
        {action ? <View style={styles.headingRow}>{heading}{action}</View> : heading}
      </View>
      {children}
    </View>
  );
}

export function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={type.label}>{label}</Text>
      {hint ? <Text style={type.muted}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export function ScreenState({
  title, description, loading, tone = 'neutral', children,
}: { title: string; description?: string; loading?: boolean; tone?: Tone; children?: ReactNode }) {
  return (
    <View accessibilityLiveRegion="polite" accessibilityState={{ busy: loading }}
      style={[surface.panel, styles.state, tone !== 'neutral' && { backgroundColor: tones[tone].fill }]}>
      <View style={styles.stateTitle}>
        {loading ? <ActivityIndicator color={color.cobalt} /> : <View style={[styles.stateDot, { backgroundColor: tones[tone].text }]} />}
        <Text accessibilityRole="header" style={[type.title, styles.stateText, { color: tones[tone].text }]}>{title}</Text>
      </View>
      {description ? <Text accessibilityRole={tone === 'danger' ? 'alert' : undefined} style={type.muted}>{description}</Text> : null}
      {children}
    </View>
  );
}

export function Notice({ message, tone = 'danger' }: { message: string; tone?: Tone }) {
  const { fill, text } = tones[tone];
  return (
    <Text
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={[type.body, styles.notice, { backgroundColor: fill, borderColor: text, color: text }]}>
      {message}
    </Text>
  );
}

export function Stamp({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { fill, text } = tones[tone];
  return (
    <Text style={[type.label, styles.stamp, { backgroundColor: fill, color: text }]}>
      {label}
    </Text>
  );
}

type Segment<T extends string> = { key: T; label: string; icon?: string; symbol?: SymbolViewProps['name'] };

export function Segments<T extends string>({
  items, selected, onChange, disabled = false, placement = 'inline', label,
}: {
  items: readonly Segment<T>[];
  selected: T;
  onChange: (key: T) => void;
  disabled?: boolean;
  placement?: 'inline' | 'bottom';
  label: string;
}) {
  return (
    <View accessibilityLabel={label} accessibilityRole="tablist" style={[
      styles.segments,
      placement === 'bottom' ? styles.bottom : styles.inline,
    ]}>
      {items.map((item) => {
        const active = selected === item.key;
        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            key={item.key}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => [
              styles.segment,
              placement === 'bottom' && styles.bottomSegment,
              active && (placement === 'bottom' ? styles.bottomActive : styles.segmentActive),
              pressed && styles.actionPressed,
            ]}>
            {item.symbol ? (
              <View aria-hidden>
                <SymbolView name={item.symbol} size={24} tintColor={active ? color.cobalt : color.muted} />
              </View>
            ) : item.icon ? <Text allowFontScaling={false} aria-hidden style={[styles.segmentIcon, active && styles.bottomLabelActive]}>{item.icon}</Text> : null}
            <Text style={[
              type.label, styles.segmentLabel,
              active && (placement === 'bottom' ? styles.bottomLabelActive : styles.segmentLabelActive),
            ]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { minHeight: touch, paddingHorizontal: space.md, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  actionText: { fontSize: 14, fontWeight: '700', lineHeight: 20, textAlign: 'center', flexShrink: 1 },
  actionPressed: { opacity: 0.78 },
  actionDown: { transform: [{ translateX: 2 }, { translateY: 2 }] },
  inactive: { backgroundColor: color.cream, borderColor: color.line },
  field: {
    backgroundColor: color.sheet, color: color.ink, fontSize: 16, minHeight: touch,
    paddingHorizontal: space.md, paddingVertical: space.md, borderColor: color.fieldBorder,
  },
  multiline: { minHeight: 108, textAlignVertical: 'top' },
  fieldFocused: { borderColor: color.cobalt, backgroundColor: color.onAccent },
  screenHeading: { gap: space.md, borderBottomWidth: 1, borderBottomColor: color.line, paddingBottom: space.inset },
  headingTitle: { gap: space.sm },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  headingText: { flex: 1, minWidth: 0 },
  headingRule: { width: 28, height: 3, backgroundColor: color.cobalt },
  fieldGroup: { gap: space.xs },
  state: { gap: space.sm, padding: space.inset, alignItems: 'flex-start' },
  stateTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stateDot: { width: 6, height: 6, borderRadius: 3 },
  stateText: { flexShrink: 1 },
  notice: { borderLeftWidth: 3, borderRadius: radius, padding: space.md },
  stamp: { alignSelf: 'flex-start', flexShrink: 1, borderRadius: 4, paddingHorizontal: space.sm, paddingVertical: space.xs },
  segments: { flexDirection: 'row', gap: space.xs, padding: space.xs },
  inline: { backgroundColor: color.cream, borderRadius: radius + 2 },
  segment: { flex: 1, minWidth: 0, minHeight: touch, borderRadius: radius, paddingHorizontal: space.xs, paddingVertical: space.sm, justifyContent: 'center', alignItems: 'center' },
  segmentActive: { backgroundColor: color.sheet },
  segmentLabel: { textAlign: 'center' },
  segmentLabelActive: { color: color.cobalt },
  segmentIcon: { color: color.muted, fontSize: 19, lineHeight: 20 },
  bottom: { backgroundColor: color.sheet, borderTopWidth: 1, borderTopColor: color.line, paddingHorizontal: space.md, paddingVertical: space.sm },
  bottomSegment: { gap: space.xs },
  bottomActive: { backgroundColor: color.blueWash },
  bottomLabelActive: { color: color.cobalt },
});
