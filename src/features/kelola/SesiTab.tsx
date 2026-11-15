import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Kelas, Sesi } from '@/types';
import { getKelasList } from './kelolaService';
import {
  closeSesi,
  createSesi,
  deleteSesi,
  openSesi,
  subscribeSesiList,
  updateSesi,
} from './sesiService';

export interface SesiTabProps {
  asistenId?: string;
}

export function SesiTab({ asistenId }: SesiTabProps) {
  const [sesiList, setSesiList] = useState<Sesi[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [formModalVisible, setFormModalVisible] = useState<boolean>(false);
  const [editingSesi, setEditingSesi] = useState<Sesi | null>(null);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [labInput, setLabInput] = useState<string>('');
  const [tanggalInput, setTanggalInput] = useState<string>('');
  const [jamMulaiInput, setJamMulaiInput] = useState<string>('');
  const [jamSelesaiInput, setJamSelesaiInput] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    if (!asistenId) {
      return () => {
        isMounted = false;
      };
    }

    // Fetch Kelas list
    getKelasList(asistenId).then((res) => {
      if (isMounted) {
        if (res.ok) {
          setKelasList(res.data);
        } else {
          setError(res.message);
        }
      }
    });

    // Subscribe Sesi list
    const unsubscribe = subscribeSesiList(
      asistenId,
      (data) => {
        if (isMounted) {
          setSesiList(data);
          setLoading(false);
        }
      },
      (errMsg) => {
        if (isMounted) {
          setError(errMsg);
          setLoading(false);
        }
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [asistenId]);

  const handleOpenCreateModal = () => {
    if (!asistenId) return;
    setEditingSesi(null);
    setSelectedKelasId(kelasList.length > 0 ? kelasList[0].id : '');
    setLabInput('');
    setTanggalInput('');
    setJamMulaiInput('');
    setJamSelesaiInput('');
    setFormError(null);
    setFormModalVisible(true);
  };

  const handleOpenEditModal = (sesi: Sesi) => {
    if (sesi.status !== 'BELUM_DIBUKA') {
      Alert.alert('Tidak dapat mengubah', 'Sesi yang sudah dibuka atau ditutup tidak dapat diubah.');
      return;
    }
    setEditingSesi(sesi);
    setSelectedKelasId(sesi.kelasId);
    setLabInput(sesi.lab);
    setTanggalInput(sesi.tanggal);
    setJamMulaiInput(sesi.jamMulai);
    setJamSelesaiInput(sesi.jamSelesai);
    setFormError(null);
    setFormModalVisible(true);
  };

  const handleSaveSesi = async () => {
    if (!asistenId) {
      setFormError('Asisten ID tidak valid.');
      return;
    }

    if (
      !selectedKelasId ||
      !labInput.trim() ||
      !tanggalInput.trim() ||
      !jamMulaiInput.trim() ||
      !jamSelesaiInput.trim()
    ) {
      setFormError('Semua field wajib diisi dan pilih kelas.');
      return;
    }

    const targetKelas = kelasList.find((k) => k.id === selectedKelasId);
    if (!targetKelas) {
      setFormError('Kelas yang dipilih tidak ditemukan.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    if (editingSesi) {
      const res = await updateSesi(editingSesi.id, asistenId, {
        lab: labInput,
        tanggal: tanggalInput,
        jamMulai: jamMulaiInput,
        jamSelesai: jamSelesaiInput,
      });
      if (res.ok) {
        setFormModalVisible(false);
      } else {
        setFormError(res.message);
      }
    } else {
      const res = await createSesi({
        kelasId: targetKelas.id,
        kelasNama: targetKelas.nama,
        praktikum: targetKelas.praktikum,
        lab: labInput,
        tanggal: tanggalInput,
        jamMulai: jamMulaiInput,
        jamSelesai: jamSelesaiInput,
        asistenId: asistenId,
      });
      if (res.ok) {
        setFormModalVisible(false);
      } else {
        setFormError(res.message);
      }
    }
    setSubmitting(false);
  };

  const handleDeleteSesi = (sesiId: string) => {
    if (!asistenId) return;
    Alert.alert('Konfirmasi Hapus', 'Apakah Anda yakin ingin menghapus sesi ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteSesi(sesiId, asistenId);
          if (!res.ok) {
            Alert.alert('Gagal', res.message);
          }
        },
      },
    ]);
  };

  const handleOpenSesiAction = (sesiId: string) => {
    if (!asistenId) return;
    Alert.alert('Buka Sesi', 'Apakah Anda ingin membuka sesi praktikum ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Buka',
        onPress: async () => {
          const res = await openSesi(sesiId, asistenId);
          if (!res.ok) {
            Alert.alert('Gagal', res.message);
          }
        },
      },
    ]);
  };

  const handleCloseSesiAction = (sesiId: string) => {
    if (!asistenId) return;
    Alert.alert('Tutup Sesi', 'Apakah Anda ingin menutup sesi praktikum ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Tutup',
        onPress: async () => {
          const res = await closeSesi(sesiId, asistenId);
          if (!res.ok) {
            Alert.alert('Gagal', res.message);
          }
        },
      },
    ]);
  };

  if (!asistenId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Asisten ID tidak tersedia.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.title}>
          Kelola Sesi Praktikum
        </Text>
        <Pressable onPress={handleOpenCreateModal} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>+ Tambah Sesi</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#2563EB" size="large" />
        </View>
      ) : sesiList.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Belum ada sesi</Text>
          <Text style={styles.emptySubtitle}>
            Buat sesi praktikum baru untuk memulai pencatatan presensi.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={sesiList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const statusColor =
              item.status === 'DIBUKA'
                ? '#16A34A'
                : item.status === 'DITUTUP'
                ? '#DC2626'
                : '#D97706';
            const statusBg =
              item.status === 'DIBUKA'
                ? '#DCFCE7'
                : item.status === 'DITUTUP'
                ? '#FEF2F2'
                : '#FEF3C7';

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>
                      {item.kelasNama} - {item.praktikum}
                    </Text>
                    <Text style={styles.cardSubtitle}>Lab: {item.lab}</Text>
                    <Text style={styles.cardDetails}>
                      Tanggal: {item.tanggal} | {item.jamMulai} - {item.jamSelesai}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.badgeText, { color: statusColor }]}>{item.status}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  {item.status === 'BELUM_DIBUKA' && (
                    <>
                      <Pressable
                        onPress={() => handleOpenSesiAction(item.id)}
                        style={styles.openButton}
                      >
                        <Text style={styles.openButtonText}>Buka Sesi</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleOpenEditModal(item)}
                        style={styles.editButton}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteSesi(item.id)}
                        style={styles.deleteButton}
                      >
                        <Text style={styles.deleteButtonText}>Hapus</Text>
                      </Pressable>
                    </>
                  )}

                  {item.status === 'DIBUKA' && (
                    <Pressable
                      onPress={() => handleCloseSesiAction(item.id)}
                      style={styles.closeButton}
                    >
                      <Text style={styles.closeButtonText}>Tutup Sesi</Text>
                    </Pressable>
                  )}

                  {item.status === 'DITUTUP' && (
                    <Pressable
                      onPress={() => handleDeleteSesi(item.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>Hapus</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Form Modal (Create / Edit Sesi) */}
      <Modal
        animationType="slide"
        onRequestClose={() => setFormModalVisible(false)}
        transparent
        visible={formModalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingSesi ? 'Edit Sesi Praktikum' : 'Tambah Sesi Praktikum'}
            </Text>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {!editingSesi && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pilih Kelas</Text>
                  {kelasList.length === 0 ? (
                    <Text style={styles.errorText}>
                      Anda belum memiliki kelas. Buat kelas terlebih dahulu di tab Kelola Kelas.
                    </Text>
                  ) : (
                    <View style={styles.classListPicker}>
                      {kelasList.map((k) => (
                        <Pressable
                          key={k.id}
                          onPress={() => setSelectedKelasId(k.id)}
                          style={[
                            styles.classChip,
                            selectedKelasId === k.id && styles.classChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.classChipText,
                              selectedKelasId === k.id && styles.classChipTextSelected,
                            ]}
                          >
                            {k.nama} - {k.praktikum}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Lokasi Lab</Text>
                <TextInput
                  onChangeText={setLabInput}
                  placeholder="Contoh: Lab RPL 1"
                  style={styles.input}
                  value={labInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tanggal (YYYY-MM-DD)</Text>
                <TextInput
                  onChangeText={setTanggalInput}
                  placeholder="2026-06-06"
                  style={styles.input}
                  value={tanggalInput}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Jam Mulai</Text>
                  <TextInput
                    onChangeText={setJamMulaiInput}
                    placeholder="08:00"
                    style={styles.input}
                    value={jamMulaiInput}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Jam Selesai</Text>
                  <TextInput
                    onChangeText={setJamSelesaiInput}
                    placeholder="10:00"
                    style={styles.input}
                    value={jamSelesaiInput}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setFormModalVisible(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                disabled={submitting}
                onPress={handleSaveSesi}
                style={styles.modalSubmitButton}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Simpan</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    flex: 1,
    padding: 16,
    gap: 16,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  listContent: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  cardDetails: {
    color: '#6B7280',
    fontSize: 13,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  openButton: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  openButtonText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  editButton: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 16,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
  },
  modalScroll: {
    gap: 14,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderColor: '#D1D5DB',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111827',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  classListPicker: {
    gap: 6,
    maxHeight: 140,
  },
  classChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  classChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  classChipText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  classChipTextSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalCancelButton: {
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '700',
  },
  modalSubmitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
