import { Platform, StyleSheet } from 'react-native';

export const color = {
  paper: '#EDF2F8',
  sheet: '#FFFFFF',
  cream: '#E5EBF3',
  ink: '#152640',
  muted: '#4E6078',
  line: '#CBD6E3',
  fieldBorder: '#73849B',
  cobalt: '#2556D8',
  blueWash: '#E7EEFF',
  blueLine: '#ACBFF7',
  blueInk: '#142D50',
  onAccent: '#FFFFFF',
  coral: '#FCE5E8',
  danger: '#9E2941',
  green: '#096343',
  mint: '#DBF4E8',
  amber: '#80500D',
  straw: '#FFF0C9',
  overlay: 'rgba(14, 29, 52, 0.58)',
} as const;

export const space = { xs: 4, sm: 8, md: 12, inset: 16, gutter: 20, lg: 24, xl: 32, xxl: 40 } as const;
export const radius = 12;
export const touch = 48;
export const contentWidth = 680;

export const type = StyleSheet.create({
  display: { color: color.ink, fontSize: 32, fontWeight: '800', letterSpacing: -1.15, lineHeight: 37 },
  heading: { color: color.ink, fontSize: 20, fontWeight: '700', letterSpacing: -0.35, lineHeight: 26 },
  title: { color: color.ink, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  body: { color: color.ink, fontSize: 15, lineHeight: 22 },
  muted: { color: color.muted, fontSize: 13, lineHeight: 19 },
  label: { color: color.ink, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  mono: {
    color: color.muted,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 18,
  },
});

export const surface = StyleSheet.create({
  outline: { borderWidth: 1, borderColor: color.line, borderRadius: radius },
  panel: { backgroundColor: color.sheet, borderWidth: 1, borderColor: color.line, borderRadius: radius },
  page: { paddingHorizontal: space.gutter, paddingTop: space.gutter, paddingBottom: space.xl, gap: space.inset },
  groupedList: { gap: 0 },
  groupTitle: { marginTop: space.xs, marginBottom: space.sm },
  groupItem: { marginBottom: space.md },
  column: { alignSelf: 'center', maxWidth: contentWidth, width: '100%' },
  offset: { backgroundColor: color.blueInk, borderRadius: radius, paddingRight: 2, paddingBottom: 3 },
});
