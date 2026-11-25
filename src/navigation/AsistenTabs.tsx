import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountProfile } from '@/components/AccountProfile';
import { Segments } from '@/components/Interface';
import { space } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { PemeriksaanIzinTab } from '@/features/izin/PemeriksaanIzinTab';
import { AsistenHome } from '@/features/kelola/AsistenHome';
import { KelolaTab } from '@/features/kelola/KelolaTab';
import { RekapTab } from '@/features/rekap/RekapTab';
import { MapsTab } from '@/features/maps/MapsTab';

const TABS = [
  { key: 'BERANDA', label: 'Beranda', symbol: { ios: 'house', android: 'home', web: 'home' } },
  { key: 'PRAKTIKUM', label: 'Praktikum', symbol: { ios: 'laptopcomputer', android: 'laptop', web: 'laptop' } },
  { key: 'PROFIL', label: 'Profil', symbol: { ios: 'person', android: 'person', web: 'person' } },
] as const;

const PRAKTIKUM_SECTIONS = [
  { key: 'KELOLA', label: 'Kelola' },
  { key: 'REKAP', label: 'Rekap' },
  { key: 'IZIN', label: 'Izin' },
  { key: 'PETA', label: 'Peta' },
] as const;

type PraktikumSection = (typeof PRAKTIKUM_SECTIONS)[number]['key'];

export function AsistenTabs({ notificationSessionId }: { notificationSessionId?: string } = {}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>(notificationSessionId ? 'PRAKTIKUM' : 'BERANDA');
  const [section, setSection] = useState<PraktikumSection>('KELOLA');
  const [sessionId, setSessionId] = useState(notificationSessionId);

  if (!user) return null;

  function openPraktikum(nextSection: PraktikumSection, id?: string) {
    setSessionId(id);
    setSection(nextSection);
    setActiveTab('PRAKTIKUM');
  }

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        {activeTab === 'BERANDA' ? (
          <AsistenHome asistenId={user.uid}
            onKelola={id => openPraktikum('KELOLA', id)}
            onRekap={() => openPraktikum('REKAP')}
            onIzin={() => openPraktikum('IZIN')} />
        ) : null}
        {activeTab === 'PRAKTIKUM' ? (
          <>
            <View style={styles.sectionNav}>
              <Segments items={PRAKTIKUM_SECTIONS} selected={section} onChange={nextSection => {
                if (nextSection !== section) setSessionId(undefined);
                setSection(nextSection);
              }} label="Menu praktikum" />
            </View>
            {section === 'KELOLA' ? <KelolaTab asistenId={user.uid} notificationSessionId={sessionId} /> : null}
            {section === 'REKAP' ? <RekapTab /> : null}
            {section === 'IZIN' ? <PemeriksaanIzinTab /> : null}
            {section === 'PETA' ? <MapsTab /> : null}
          </>
        ) : null}
        {activeTab === 'PROFIL' ? <AccountProfile user={user} role="Asisten" /> : null}
      </View>
      <Segments items={TABS} selected={activeTab} onChange={tab => {
        if (tab !== activeTab) setSessionId(undefined);
        setActiveTab(tab);
      }} placement="bottom" label="Navigasi asisten" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionNav: { paddingHorizontal: space.gutter, paddingTop: space.md },
});
