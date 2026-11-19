import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type PressableProps, type TextInputProps,
} from 'react-native';

import { color, radius, space, surface, touch, type } from '@/constants/design';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
const tones = {
  neutral: { fill: color.cream, text: color.ink },
  info: { fill: color.blueWash, text: color.cobalt },
  success: { fill: color.mint, text: color.green },
  warning: { fill: color.straw, text: color.amber },
  danger: { fill: color.coral, text: color.danger },
} satisfies Record<Tone, { fill: string; text: string }>;

type ActionProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  busy?: boolean;
  tactile?: boolean;
  style?: PressableProps['style'];
};

export function Action({
  label, variant = 'primary', busy = false, tactile = false,
  disabled, style, accessibilityState, ...props
}: ActionProps) {
  const inactive = disabled || busy;
  const fill = variant === 'primary' ? color.cobalt : variant === 'danger' ? color.coral : color.sheet;
  const foreground = variant === 'primary' ? color.onAccent : variant === 'danger' ? color.danger : color.ink;

  return (
    <Pressable
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, busy, disabled: inactive }}
      disabled={inactive}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        tactile && surface.offset,
        (inactive || state.pressed) && styles.actionPressed,
      ]}>
      {({ pressed }) => (
        <View style={[
          surface.outline, styles.action, { backgroundColor: fill },
          inactive && styles.inactive, pressed && tactile && styles.actionDown,
        ]}>
          {busy
            ? <ActivityIndicator color={color.ink} />
            : <Text style={[styles.actionText, { color: inactive ? color.muted : foreground }]}>{label}</Text>}
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

export function ScreenHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.screenHeading}>
      <Text accessibilityRole="header" style={type.display}>{title}</Text>
      {children}
    </View>
  );
}

export function ScreenState({
  title, description, loading, tone = 'neutral', children,
}: { title: string; description?: string; loading?: boolean; tone?: Tone; children?: ReactNode }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.state}>
      {loading ? <ActivityIndicator color={color.cobalt} size="large" /> : null}
      <Text accessibilityRole="header" style={[type.heading, { color: tones[tone].text }]}>{title}</Text>
      {description ? <Text style={type.muted}>{description}</Text> : null}
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
    <Text style={[type.label, styles.stamp, { backgroundColor: fill, borderColor: text, color: text }]}>
      {label}
    </Text>
  );
}

type Segment<T extends string> = { key: T; label: string };

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
      placement === 'bottom' ? styles.bottom : surface.outline,
    ]}>
      {items.map((item, index) => {
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
              styles.segment, index > 0 && styles.segmentDivider,
              active && (placement === 'bottom' ? styles.bottomActive : styles.segmentActive),
              pressed && styles.actionPressed,
            ]}>
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
  action: { minHeight: touch, paddingHorizontal: space.md, paddingVertical: space.sm, justifyContent: 'center' },
  actionText: { fontSize: 14, fontWeight: '800', lineHeight: 19, textAlign: 'center' },
  actionPressed: { opacity: 0.78 },
  actionDown: { transform: [{ translateX: 2 }, { translateY: 2 }] },
  inactive: { backgroundColor: color.cream },
  field: {
    backgroundColor: color.sheet, color: color.ink, fontSize: 16, minHeight: touch,
    paddingHorizontal: space.md, paddingVertical: 11, borderWidth: 2, borderColor: color.fieldBorder,
  },
  multiline: { minHeight: 108, textAlignVertical: 'top' },
  fieldFocused: { borderColor: color.cobalt, backgroundColor: color.onAccent },
  screenHeading: { gap: space.sm, borderBottomWidth: 2, borderBottomColor: color.ink, paddingBottom: space.md },
  state: { backgroundColor: color.cream, borderLeftColor: color.cobalt, borderLeftWidth: 4, gap: space.sm, padding: space.gutter, alignItems: 'flex-start' },
  notice: { borderWidth: 1, borderLeftWidth: 4, borderRadius: radius, padding: space.md },
  stamp: { alignSelf: 'flex-start', flexShrink: 1, borderWidth: 1, borderRadius: 2, paddingHorizontal: space.sm, paddingVertical: space.xs },
  segments: { backgroundColor: color.sheet, flexDirection: 'row' },
  segment: { flex: 1, minWidth: 0, minHeight: touch, paddingHorizontal: space.xs, paddingVertical: space.sm, justifyContent: 'center' },
  segmentDivider: { borderLeftColor: color.line, borderLeftWidth: 1 },
  segmentActive: { backgroundColor: color.ink },
  segmentLabel: { textAlign: 'center' },
  segmentLabelActive: { color: color.onAccent },
  bottom: { borderTopWidth: 2, borderTopColor: color.ink },
  bottomActive: { backgroundColor: color.blueWash, borderTopWidth: 3, borderTopColor: color.cobalt, paddingTop: 5 },
  bottomLabelActive: { color: color.cobalt },
});
