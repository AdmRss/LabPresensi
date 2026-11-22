import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Segments } from '@/components/Interface';
import { useAuth } from '@/features/auth/AuthContext';
import { PemeriksaanIzinTab } from '@/features/izin/PemeriksaanIzinTab';
import { KelolaTab } from '@/features/kelola/KelolaTab';
import { RekapTab } from '@/features/rekap/RekapTab';
import { MapsTab } from '@/features/maps/MapsTab';

const TABS = [
  { key: 'KELOLA', label: 'Kelola', icon: '⊞' },
  { key: 'REKAP', label: 'Rekap', icon: '▥' },
  { key: 'IZIN', label: 'Izin', icon: '▤' },
  { key: 'PETA', label: 'Peta', icon: '🧭' },
] as const;

export function AsistenTabs({ notificationSessionId }: { notificationSessionId?: string } = {}) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('KELOLA');
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        {activeTab === 'KELOLA' ? <KelolaTab asistenId={user?.uid} notificationSessionId={notificationSessionId} /> : null}
        {activeTab === 'REKAP' ? <RekapTab /> : null}
        {activeTab === 'IZIN' ? <PemeriksaanIzinTab /> : null}
        {activeTab === 'PETA' ? <MapsTab /> : null}
      </View>
      <Segments items={TABS} selected={activeTab} onChange={setActiveTab} placement="bottom" label="Navigasi asisten" />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
