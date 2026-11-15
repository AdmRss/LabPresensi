import { useState, type JSX } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KelolaTab } from '@/features/kelola/KelolaTab';
import { PemeriksaanIzinTab } from '@/features/izin/PemeriksaanIzinTab';
import { RekapTab } from '@/features/rekap/RekapTab';
import { useAuth } from '@/features/auth/AuthContext';

type AsistenTabKey = 'KELOLA' | 'REKAP' | 'IZIN';

const TABS: { key: AsistenTabKey; label: string }[] = [
  { key: 'KELOLA', label: 'Kelola' },
  { key: 'REKAP', label: 'Rekap' },
  { key: 'IZIN', label: 'Izin' },
];

export function AsistenTabs(): JSX.Element {
  const [activeTab, setActiveTab] = useState<AsistenTabKey>('KELOLA');
  const { user } = useAuth();
  const asistenId = user?.uid;

  return (
    <View style={styles.container}>
      <View accessibilityRole="tablist" style={styles.tabBar}>
        {TABS.map((tab) => {
          const selected = tab.key === activeTab;

          return (
            <Pressable
              accessibilityLabel={`Tab ${tab.label}`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [
                styles.tabButton,
                selected && styles.tabButtonActive,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.content}>
        {activeTab === 'KELOLA' ? <KelolaTab asistenId={asistenId} /> : null}
        {activeTab === 'REKAP' ? <RekapTab /> : null}
        {activeTab === 'IZIN' ? <PemeriksaanIzinTab /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 12,
  },
  tabButtonActive: {
    borderBottomColor: '#2563EB',
    borderBottomWidth: 2,
  },
  tabLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#1D4ED8',
  },
  content: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
