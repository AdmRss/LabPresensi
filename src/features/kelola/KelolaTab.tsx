import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AppUser, Kelas } from '@/types';
import {
  addPeserta,
  createKelas,
  deleteKelas,
  getKelasList,
  getPraktikanList,
  removePeserta,
  updateKelas,
} from './kelolaService';
import { SesiTab } from './SesiTab';

export interface KelolaTabProps {
  asistenId?: string;
}

export function KelolaTab({ asistenId }: KelolaTabProps) {
  const [activeTab, setActiveTab] = useState<'KELAS' | 'SESI'>('KELAS');

  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(asistenId));
  const [error, setError] = useState<string | null>(null);

  const [formModalVisible, setFormModalVisible] = useState<boolean>(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [namaInput, setNamaInput] = useState<string>('');
  const [praktikumInput, setPraktikumInput] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [participantsModalVisible, setParticipantsModalVisible] = useState<boolean>(false);
  const [selectedKelas, setSelectedKelas] = useState<Kelas | null>(null);
  const [allPraktikan, setAllPraktikan] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchKelas = React.useCallback(async () => {
    if (!asistenId) {
      setKelasList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getKelasList(asistenId);
    if (result.ok) {
      setKelasList(result.data);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, [asistenId]);

  useEffect(() => {
    let isMounted = true;

    if (!asistenId) {
      return () => {
        isMounted = false;
      };
    }

    getKelasList(asistenId).then((result) => {
      if (isMounted) {
        if (result.ok) {
          setKelasList(result.data);
        } else {
          setError(result.message);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [asistenId]);

  const handleOpenCreateModal = () => {
    setEditingKelas(null);
    setNamaInput('');
    setPraktikumInput('');
    setFormError(null);
    setFormModalVisible(true);
  };

  const handleOpenEditModal = (kelas: Kelas) => {
    setEditingKelas(kelas);
    setNamaInput(kelas.nama);
    setPraktikumInput(kelas.praktikum);
    setFormError(null);
    setFormModalVisible(true);
  };

  const handleSaveKelas = async () => {
    if (!asistenId) {
      setFormError('Asisten ID tidak valid.');
      return;
    }

    if (!namaInput.trim() || !praktikumInput.trim()) {
      setFormError('Nama kelas dan praktikum wajib diisi.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    if (editingKelas) {
      const res = await updateKelas(editingKelas.id, {
        nama: namaInput,
        praktikum: praktikumInput,
      });
      if (res.ok) {
        setFormModalVisible(false);
        fetchKelas();
      } else {
        setFormError(res.message);
      }
    } else {
      const res = await createKelas({
        nama: namaInput,
        praktikum: praktikumInput,
        asistenId: asistenId,
      });
      if (res.ok) {
        setFormModalVisible(false);
        fetchKelas();
      } else {
        setFormError(res.message);
      }
    }
    setSubmitting(false);
  };

  const handleDeleteKelas = async (kelasId: string) => {
    const res = await deleteKelas(kelasId);
    if (res.ok) {
      fetchKelas();
    } else {
      setError(res.message);
    }
  };

  const handleOpenParticipantsModal = async (kelas: Kelas) => {
    setSelectedKelas(kelas);
    const praktikanRes = await getPraktikanList();
    if (praktikanRes.ok) {
      setAllPraktikan(praktikanRes.data);
    }
    setParticipantsModalVisible(true);
  };

  const handleAddParticipant = async (praktikanUid: string) => {
    if (!selectedKelas) return;
    const res = await addPeserta(selectedKelas.id, praktikanUid);
    if (res.ok) {
      // update local state
      const updatedPeserta = [...selectedKelas.pesertaUids, praktikanUid];
      setSelectedKelas({ ...selectedKelas, pesertaUids: updatedPeserta });
      setKelasList(
        kelasList.map((k) => (k.id === selectedKelas.id ? { ...k, pesertaUids: updatedPeserta } : k)),
      );
    }
  };

  const handleRemoveParticipant = async (praktikanUid: string) => {
    if (!selectedKelas) return;
    const res = await removePeserta(selectedKelas.id, praktikanUid);
    if (res.ok) {
      const updatedPeserta = selectedKelas.pesertaUids.filter((uid) => uid !== praktikanUid);
      setSelectedKelas({ ...selectedKelas, pesertaUids: updatedPeserta });
      setKelasList(
        kelasList.map((k) => (k.id === selectedKelas.id ? { ...k, pesertaUids: updatedPeserta } : k)),
      );
    }
  };

  const filteredPraktikan = allPraktikan.filter(
    (p) =>
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.nim && p.nim.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <View style={styles.container}>
      {/* Navigation Segmented Switcher */}
      <View style={styles.tabSwitcher}>
        <Pressable
          onPress={() => setActiveTab('KELAS')}
          style={[styles.tabButton, activeTab === 'KELAS' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabButtonText, activeTab === 'KELAS' && styles.tabButtonTextActive]}>
            Kelola Kelas & Peserta
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('SESI')}
          style={[styles.tabButton, activeTab === 'SESI' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabButtonText, activeTab === 'SESI' && styles.tabButtonTextActive]}>
            Kelola Sesi
          </Text>
        </Pressable>
      </View>

      {!asistenId ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Asisten ID tidak tersedia.</Text>
        </View>
      ) : activeTab === 'SESI' ? (
        <SesiTab asistenId={asistenId} />
      ) : (
        <View style={{ flex: 1, gap: 16 }}>
          <View style={styles.headerRow}>
            <Text accessibilityRole="header" style={styles.title}>
              Kelola Kelas & Peserta
            </Text>
            <Pressable onPress={handleOpenCreateModal} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>+ Tambah Kelas</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#2563EB" size="large" />
            </View>
          ) : kelasList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Belum ada kelas</Text>
              <Text style={styles.emptySubtitle}>
                Buat kelas praktikum pertama Anda menggunakan tombol di atas.
              </Text>
            </View>
          ) : (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={kelasList}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{item.nama}</Text>
                      <Text style={styles.cardSubtitle}>{item.praktikum}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.pesertaUids.length} Peserta</Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => handleOpenParticipantsModal(item)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Atur Peserta</Text>
                    </Pressable>
                    <Pressable onPress={() => handleOpenEditModal(item)} style={styles.iconButton}>
                      <Text style={styles.iconButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteKelas(item.id)} style={styles.deleteButton}>
                      <Text style={styles.deleteButtonText}>Hapus</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Form Modal (Create/Edit Kelas) */}
      <Modal
        animationType="slide"
        onRequestClose={() => setFormModalVisible(false)}
        transparent
        visible={formModalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingKelas ? 'Edit Kelas Praktikum' : 'Tambah Kelas Praktikum'}
            </Text>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Kelas (contoh: 3A, IF-1)</Text>
              <TextInput
                onChangeText={setNamaInput}
                placeholder="Masukkan nama kelas"
                style={styles.input}
                value={namaInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Praktikum (contoh: Pemrograman Perangkat Bergerak)</Text>
              <TextInput
                onChangeText={setPraktikumInput}
                placeholder="Masukkan nama praktikum"
                style={styles.input}
                value={praktikumInput}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setFormModalVisible(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                disabled={submitting}
                onPress={handleSaveKelas}
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

      {/* Participants Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setParticipantsModalVisible(false)}
        transparent
        visible={participantsModalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.largeModal]}>
            <Text style={styles.modalTitle}>
              Atur Peserta: {selectedKelas?.nama} ({selectedKelas?.praktikum})
            </Text>

            <TextInput
              onChangeText={setSearchQuery}
              placeholder="Cari praktikan berdasarkan nama atau NIM..."
              style={styles.input}
              value={searchQuery}
            />

            <View style={styles.participantSection}>
              <Text style={styles.sectionSubtitle}>Daftar Praktikan Terdaftar & Tersedia</Text>
              <FlatList
                data={filteredPraktikan}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => {
                  const isEnrolled = selectedKelas?.pesertaUids.includes(item.uid);
                  return (
                    <View style={styles.participantRow}>
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName}>{item.nama}</Text>
                        <Text style={styles.participantNim}>NIM: {item.nim || '-'}</Text>
                      </View>
                      {isEnrolled ? (
                        <Pressable
                          onPress={() => handleRemoveParticipant(item.uid)}
                          style={styles.removeParticipantButton}
                        >
                          <Text style={styles.removeParticipantText}>Cabut</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => handleAddParticipant(item.uid)}
                          style={styles.addParticipantButton}
                        >
                          <Text style={styles.addParticipantText}>Tambah</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                }}
                style={styles.participantList}
              />
            </View>

            <Pressable
              onPress={() => setParticipantsModalVisible(false)}
              style={[styles.primaryButton, { alignSelf: 'stretch', marginTop: 10 }]}
            >
              <Text style={styles.primaryButtonText}>Selesai</Text>
            </Pressable>
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
  tabSwitcher: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#1E293B',
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
    gap: 2,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#6B7280',
    fontSize: 14,
  },
  badge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  iconButton: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconButtonText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#B91C1C',
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
  },
  largeModal: {
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
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
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  participantSection: {
    flex: 1,
    gap: 8,
  },
  sectionSubtitle: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  participantList: {
    maxHeight: 240,
  },
  participantRow: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    marginBottom: 6,
  },
  participantInfo: {
    flex: 1,
    gap: 2,
  },
  participantName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  participantNim: {
    color: '#6B7280',
    fontSize: 12,
  },
  addParticipantButton: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addParticipantText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
  removeParticipantButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeParticipantText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
});
