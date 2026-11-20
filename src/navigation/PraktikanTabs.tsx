import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Segments } from '@/components/Interface';
import { IzinSayaTab } from '@/features/izin/IzinSayaTab';
import { JadwalTab } from '@/features/jadwal/JadwalTab';
import { RiwayatTab } from '@/features/rekap/RiwayatTab';

const TABS = [
  { key: 'JADWAL', label: 'Jadwal', icon: '⊞' },
  { key: 'RIWAYAT', label: 'Riwayat', icon: '▥' },
  { key: 'IZIN_SAYA', label: 'Izin Saya', icon: '▤' },
] as const;

export function PraktikanTabs() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('JADWAL');

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        {activeTab === 'JADWAL' ? <JadwalTab /> : null}
        {activeTab === 'RIWAYAT' ? <RiwayatTab /> : null}
        {activeTab === 'IZIN_SAYA' ? <IzinSayaTab /> : null}
      </View>
      <Segments items={TABS} selected={activeTab} onChange={setActiveTab} placement="bottom" label="Navigasi praktikan" />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
