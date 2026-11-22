import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Action, ScreenHeading, Segments } from '@/components/Interface';
import { LogoutAction } from '@/components/LogoutAction';
import { space, surface, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { IzinSayaTab } from '@/features/izin/IzinSayaTab';
import { JadwalTab } from '@/features/jadwal/JadwalTab';
import { RiwayatTab } from '@/features/rekap/RiwayatTab';
import { MapsTab } from '@/features/maps/MapsTab';

const TABS = [
  { key: 'BERANDA', label: 'Beranda', symbol: { ios: 'house', android: 'home', web: 'home' } },
  { key: 'PRAKTIKUM', label: 'Praktikum', symbol: { ios: 'laptopcomputer', android: 'laptop_mac', web: 'laptop_mac' } },
  { key: 'PETA', label: 'Peta', symbol: { ios: 'map', android: 'map', web: 'map' } },
  { key: 'PROFIL', label: 'Profil', symbol: { ios: 'person', android: 'person', web: 'person' } },
] as const;

const PRAKTIKUM_SECTIONS = [
  { key: 'JADWAL', label: 'Jadwal' },
  { key: 'RIWAYAT', label: 'Riwayat' },
  { key: 'IZIN_SAYA', label: 'Izin Saya' },
] as const;

export function PraktikanTabs() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('BERANDA');
  const [section, setSection] = useState<(typeof PRAKTIKUM_SECTIONS)[number]['key']>('JADWAL');

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        {activeTab === 'BERANDA' ? (
          <ScrollView contentContainerStyle={surface.page}>
            <ScreenHeading title="Beranda" />
            <View style={[surface.panel, styles.card]}>
              <Text accessibilityRole="header" style={type.heading}>Halo, {user.nama}</Text>
              <Text style={type.body}>Lihat jadwal dan lakukan presensi dari menu Praktikum.</Text>
              <Action label="Lihat jadwal" onPress={() => { setSection('JADWAL'); setActiveTab('PRAKTIKUM'); }} />
            </View>
          </ScrollView>
        ) : null}
        {activeTab === 'PRAKTIKUM' ? (
          <>
            <View style={styles.sectionNav}>
              <Segments items={PRAKTIKUM_SECTIONS} selected={section} onChange={setSection} label="Menu praktikum" />
            </View>
            {section === 'JADWAL' ? <JadwalTab /> : null}
            {section === 'RIWAYAT' ? <RiwayatTab /> : null}
            {section === 'IZIN_SAYA' ? <IzinSayaTab /> : null}
          </>
        ) : null}
        {activeTab === 'PETA' ? <MapsTab /> : null}
        {activeTab === 'PROFIL' ? (
          <ScrollView contentContainerStyle={surface.page}>
            <ScreenHeading title="Profil" />
            <View style={[surface.panel, styles.card]}>
              <ProfileField label="Nama" value={user.nama} />
              {user.nim ? <ProfileField label="NIM" value={user.nim} /> : null}
              <ProfileField label="Email" value={user.email} />
              <ProfileField label="Peran" value="Praktikan" />
            </View>
            <LogoutAction variant="danger" />
          </ScrollView>
        ) : null}
      </View>
      <Segments items={TABS} selected={activeTab} onChange={setActiveTab} placement="bottom" label="Navigasi praktikan" />
    </View>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={type.muted}>{label}</Text>
      <Text selectable style={type.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionNav: { paddingHorizontal: space.gutter, paddingTop: space.md },
  card: { gap: space.inset, padding: space.inset },
  field: { gap: space.xs },
});
