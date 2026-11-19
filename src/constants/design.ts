import { Platform, StyleSheet } from 'react-native';

export const color = {
  paper: '#F5F2EA',
  sheet: '#FDFAF3',
  cream: '#EAE4D7',
  ink: '#20211F',
  muted: '#59574F',
  line: '#BDB6A7',
  fieldBorder: '#827A6C',
  cobalt: '#2446CC',
  blueWash: '#E1E8FF',
  onAccent: '#FFFCF4',
  coral: '#F5C1B1',
  danger: '#852D25',
  green: '#20533C',
  mint: '#D9E8D9',
  amber: '#664514',
  straw: '#F3E3B9',
  overlay: 'rgba(32, 33, 31, 0.60)',
} as const;

export const space = { xs: 4, sm: 8, md: 12, gutter: 20, lg: 24, xl: 32, xxl: 40 } as const;
export const radius = 4;
export const touch = 48;
export const contentWidth = 680;

export const type = StyleSheet.create({
  display: { color: color.ink, fontSize: 36, fontWeight: '900', letterSpacing: -1.7, lineHeight: 41 },
  heading: { color: color.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.55, lineHeight: 29 },
  title: { color: color.ink, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  body: { color: color.ink, fontSize: 15, lineHeight: 22 },
  muted: { color: color.muted, fontSize: 14, lineHeight: 21 },
  label: { color: color.ink, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  mono: {
    color: color.muted,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    lineHeight: 18,
  },
});

export const surface = StyleSheet.create({
  outline: { borderWidth: 1, borderColor: color.ink, borderRadius: radius },
  column: { alignSelf: 'center', maxWidth: contentWidth, width: '100%' },
  offset: { backgroundColor: color.ink, borderRadius: radius, paddingRight: 4, paddingBottom: 4 },
});
