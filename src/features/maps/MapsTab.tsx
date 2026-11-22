import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Map, Camera, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { Action, ScreenHeading } from '@/components/Interface';
import { color, space, type } from '@/constants/design';
import { subscribeCatalog, type LokasiPraktikum } from '@/features/kelola/kelolaService';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Sesi } from '@/types';

const BUILDING_E_COORDS = [110.440765625, -7.0482375] as [number, number];

export function MapsTab() {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LokasiPraktikum[]>([]);
  const [sessions, setSessions] = useState<Sesi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Lokasi belum dimuat');
  const [isLocating, setIsLocating] = useState(false);
  const cameraRef = useRef<CameraRef>(null);

  useEffect(() => {
    let locUnsub = () => {};
    let sesUnsub = () => {};

    locUnsub = subscribeCatalog<LokasiPraktikum>(
      'lokasiPraktikum',
      (rows) => {
        setLocations(rows);
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      }
    );

    sesUnsub = onSnapshot(
      query(collection(db, 'sesi')),
      (snapshot) => {
        const list: Sesi[] = [];
        snapshot.forEach((d) => {
          const sesi = { ...d.data(), id: d.id } as Sesi;
          if (!sesi.archived) list.push(sesi);
        });
        setSessions(list);
      },
      (err) => {
        setError(err.message);
      }
    );

    return () => {
      locUnsub();
      sesUnsub();
    };
  }, []);

  const handleFetchUserLocation = async () => {
    if (isLocating) return;
    setIsLocating(true);
    setLocationStatus('Meminta izin lokasi...');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('Izin akses lokasi ditolak.');
        setIsLocating(false);
        return;
      }

      setLocationStatus('Mengambil posisi GPS...');
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
      setUserCoords(coords);
      setLocationStatus('Posisi GPS aktif');
      setIsLocating(false);

      if (cameraRef.current) {
        cameraRef.current.easeTo({
          center: coords,
          zoom: 16,
          duration: 1000,
        });
      }
    } catch {
      setLocationStatus('Gagal mengambil posisi lokasi.');
      setIsLocating(false);
    }
  };

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const filteredSessions = selectedLocationId
    ? sessions.filter((s) => s.lokasiId === selectedLocationId)
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <ScreenHeading title="Peta Lokasi Lab" />
      </View>
      <View style={styles.mapContainer}>
        <Map
          style={styles.map}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          attributionPosition={{ bottom: 8, right: 8 }}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: BUILDING_E_COORDS,
              zoom: 16,
            }}
          />
          <Marker
            id="gedung-e"
            lngLat={BUILDING_E_COORDS}
            onPress={() => {
              if (locations.length > 0 && !selectedLocationId) {
                setSelectedLocationId(locations[0].id);
              } else if (!selectedLocationId) {
                setSelectedLocationId('gedung-e-default');
              } else {
                setSelectedLocationId(null);
              }
            }}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerPin}>
                <Text style={styles.markerText}>E</Text>
              </View>
            </View>
          </Marker>

          {userCoords ? (
            <Marker id="user-location" lngLat={userCoords}>
              <View style={styles.userMarkerContainer}>
                <View style={styles.userMarkerDot} />
              </View>
            </Marker>
          ) : null}
        </Map>

        <View style={styles.floatingControls}>
          <Action
            label={isLocating ? 'Mencari...' : 'Lokasi Saya'}
            variant="secondary"
            onPress={handleFetchUserLocation}
          />
          <Text style={styles.statusText}>{locationStatus}</Text>
        </View>

        {selectedLocationId ? (
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={type.title}>
                {selectedLocation ? selectedLocation.nama : 'Gedung E (Lab B, C, D)'}
              </Text>
              <Action label="Tutup" variant="quiet" onPress={() => setSelectedLocationId(null)} />
            </View>

            {loading ? (
              <Text style={type.body}>Memuat data lokasi...</Text>
            ) : error ? (
              <Text style={[type.body, { color: color.danger }]}>{error}</Text>
            ) : (
              <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}>
                <View style={styles.locationSelectorRow}>
                  {locations.map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[
                        styles.locationChip,
                        selectedLocationId === loc.id && styles.locationChipActive,
                      ]}
                      onPress={() => setSelectedLocationId(loc.id)}
                    >
                      <Text
                        style={[
                          styles.locationChipText,
                          selectedLocationId === loc.id && styles.locationChipTextActive,
                        ]}
                      >
                        {loc.nama}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedLocation && (
                  <View style={styles.locationInfo}>
                    <Text style={type.body}>
                      {selectedLocation.buildingCode ? `Gedung: ${selectedLocation.buildingCode}` : 'Referensi Gedung E'}
                    </Text>
                    <Text style={[type.muted, styles.coords]}>
                      Lat: {selectedLocation.latitude ?? -7.0482375}, Lon: {selectedLocation.longitude ?? 110.440765625}
                    </Text>
                  </View>
                )}

                <View style={styles.sectionDivider} />

                <Text style={[type.title, styles.sectionTitle]}>Sesi Praktikum di Lokasi Ini</Text>
                {filteredSessions.length === 0 ? (
                  <Text style={type.muted}>Belum ada sesi praktikum aktif untuk lokasi ini.</Text>
                ) : (
                  filteredSessions.map((sesi) => (
                    <View key={sesi.id} style={styles.sessionCard}>
                      <Text style={type.title}>{sesi.praktikum} - {sesi.kelasNama}</Text>
                      <Text style={type.body}>Tanggal: {sesi.tanggal} ({sesi.jamMulai} - {sesi.jamSelesai})</Text>
                      <Text style={type.muted}>Status: {sesi.status}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.paper },
  headerContainer: { paddingHorizontal: space.gutter, paddingTop: space.md },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.cobalt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.paper,
  },
  markerText: { color: color.onAccent, fontWeight: 'bold', fontSize: 14 },
  floatingControls: { position: 'absolute', top: 16, right: 16, gap: 8 },
  userMarkerContainer: { alignItems: 'center', justifyContent: 'center' },
  userMarkerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: color.paper,
  },
  statusText: { fontSize: 10, color: color.ink, backgroundColor: color.sheet, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
    backgroundColor: color.sheet,
    padding: space.inset,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: color.line,
    gap: space.xs,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetScroll: { marginTop: 8 },
  sheetScrollContent: { gap: 12, paddingBottom: 24 },
  locationSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  locationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.paper,
  },
  locationChipActive: {
    backgroundColor: color.cobalt,
    borderColor: color.cobalt,
  },
  locationChipText: { fontSize: 12, color: color.ink },
  locationChipTextActive: { color: color.onAccent, fontWeight: 'bold' },
  locationInfo: { gap: 2 },
  sectionDivider: { height: 1, backgroundColor: color.line, marginVertical: 4 },
  sectionTitle: { fontSize: 14, marginBottom: 4 },
  sessionCard: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
    gap: 2,
  },
  coords: { fontSize: 12, marginTop: 2 },
});
