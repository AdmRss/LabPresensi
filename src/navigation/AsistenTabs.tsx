import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Segments } from '@/components/Interface';
import { useAuth } from '@/features/auth/AuthContext';
import { PemeriksaanIzinTab } from '@/features/izin/PemeriksaanIzinTab';
import { KelolaTab } from '@/features/kelola/KelolaTab';
import { RekapTab } from '@/features/rekap/RekapTab';

const TABS = [
  { key: 'KELOLA', label: 'Kelola' },
  { key: 'REKAP', label: 'Rekap' },
  { key: 'IZIN', label: 'Izin' },
] as const;

export function AsistenTabs() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('KELOLA');
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        {activeTab === 'KELOLA' ? <KelolaTab asistenId={user?.uid} /> : null}
        {activeTab === 'REKAP' ? <RekapTab /> : null}
        {activeTab === 'IZIN' ? <PemeriksaanIzinTab /> : null}
      </View>
      <Segments items={TABS} selected={activeTab} onChange={setActiveTab} placement="bottom" label="Navigasi asisten" />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
