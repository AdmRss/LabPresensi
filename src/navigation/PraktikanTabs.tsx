import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountProfile } from '@/components/AccountProfile';
import { Segments } from '@/components/Interface';
import { space } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { IzinSayaTab } from '@/features/izin/IzinSayaTab';
import { PraktikanHome } from '@/features/jadwal/PraktikanHome';
import { JadwalTab } from '@/features/jadwal/JadwalTab';
import { RiwayatTab } from '@/features/rekap/RiwayatTab';
import { MapsTab } from '@/features/maps/MapsTab';

const TABS = [
  { key: 'BERANDA', label: 'Beranda', symbol: { ios: 'house', android: 'home', web: 'home' } },
  { key: 'PRAKTIKUM', label: 'Praktikum', symbol: { ios: 'laptopcomputer', android: 'laptop', web: 'laptop' } },
  { key: 'PETA', label: 'Peta', symbol: { ios: 'map', android: 'map', web: 'map' } },
  { key: 'PROFIL', label: 'Profil', symbol: { ios: 'person', android: 'person', web: 'person' } },
] as const;

const PRAKTIKUM_SECTIONS = [
  { key: 'JADWAL', label: 'Jadwal' },
  { key: 'RIWAYAT', label: 'Riwayat' },
  { key: 'IZIN_SAYA', label: 'Izin Saya' },
] as const;

export function PraktikanTabs({ notificationSessionId, notificationPermissionId }: {
  notificationSessionId?: string;
  notificationPermissionId?: string;
} = {}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>(notificationSessionId || notificationPermissionId ? 'PRAKTIKUM' : 'BERANDA');
  const [section, setSection] = useState<(typeof PRAKTIKUM_SECTIONS)[number]['key']>(notificationPermissionId ? 'IZIN_SAYA' : 'JADWAL');

  const [sessionId, setSessionId] = useState(notificationSessionId);
  const [locationId, setLocationId] = useState<string>();

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        {activeTab === 'BERANDA' ? (
          <PraktikanHome onSchedule={id => {
            setSessionId(id);
            setSection('JADWAL');
            setActiveTab('PRAKTIKUM');
          }} onMap={id => { setLocationId(id); setActiveTab('PETA'); }} />
        ) : null}
        {activeTab === 'PRAKTIKUM' ? (
          <>
            <View style={styles.sectionNav}>
              <Segments items={PRAKTIKUM_SECTIONS} selected={section} onChange={setSection} label="Menu praktikum" />
            </View>
            {section === 'JADWAL' ? <JadwalTab notificationSessionId={sessionId} /> : null}
            {section === 'RIWAYAT' ? <RiwayatTab /> : null}
            {section === 'IZIN_SAYA' ? <IzinSayaTab notificationPermissionId={notificationPermissionId} /> : null}
          </>
        ) : null}
        {activeTab === 'PETA' ? <MapsTab initialLocationId={locationId} /> : null}
        {activeTab === 'PROFIL' ? <AccountProfile user={user} role="Praktikan" /> : null}
      </View>
      <Segments items={TABS} selected={activeTab} onChange={tab => {
        if (tab !== activeTab) { setSessionId(undefined); setLocationId(undefined); }
        setActiveTab(tab);
      }} placement="bottom" label="Navigasi praktikan" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionNav: { paddingHorizontal: space.gutter, paddingTop: space.md },
});
