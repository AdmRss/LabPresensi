import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/store/AppContext';
import { useNav } from '@/navigation/NavContext';
import type { Role } from '@/types';

export function RoleSelectScreen() {
  const { assistants, praktikans, setActiveUser } = useApp();
  const { navigateTo } = useNav();

  const [selectedRole, setSelectedRole] = useState<Role>('ASISTEN');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setSelectedId(null);
  };

  const handleLogin = () => {
    if (!selectedId) return;

    if (selectedRole === 'ASISTEN') {
      const assistant = assistants.find((a) => a.id === selectedId);
      if (assistant) {
        setActiveUser(assistant);
        navigateTo('SCHEDULE');
      }
    } else {
      const praktikan = praktikans.find((p) => p.id === selectedId);
      if (praktikan) {
        setActiveUser(praktikan);
        navigateTo('SCHEDULE');
      }
    }
  };

  const currentList = selectedRole === 'ASISTEN' ? assistants : praktikans;

  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            LabPresensi
          </Text>
          <Text style={styles.subtitle}>Pilih peran dan identitas untuk masuk ke aplikasi</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pilih Peran</Text>
          <View style={styles.roleTabs}>
            <Pressable
              onPress={() => handleSelectRole('ASISTEN')}
              style={[styles.roleTab, selectedRole === 'ASISTEN' && styles.roleTabActive]}
            >
              <Text style={[styles.roleTabText, selectedRole === 'ASISTEN' && styles.roleTabTextActive]}>
                Asisten
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleSelectRole('PRAKTIKAN')}
              style={[styles.roleTab, selectedRole === 'PRAKTIKAN' && styles.roleTabActive]}
            >
              <Text style={[styles.roleTabText, selectedRole === 'PRAKTIKAN' && styles.roleTabTextActive]}>
                Praktikan
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Pilih Identitas {selectedRole === 'ASISTEN' ? 'Asisten' : 'Praktikan'}
          </Text>
          <View style={styles.list}>
            {currentList.map((item) => {
              const isSelected = item.id === selectedId;
              const subText =
                selectedRole === 'ASISTEN'
                  ? (item as any).email
                  : `NIM: ${(item as any).nim} • Kelas ${(item as any).kelas}`;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedId(item.id)}
                  style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                >
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.nama}</Text>
                    <Text style={styles.itemSub}>{subText}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          disabled={!selectedId}
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.loginButton,
            !selectedId && styles.loginButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.loginButtonText}>Masuk</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  container: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    gap: 20,
    maxWidth: 480,
    padding: 24,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
  },
  roleTabs: {
    flexDirection: 'row',
    gap: 10,
  },
  roleTab: {
    alignItems: 'center',
    borderColor: '#D1D5DB',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    padding: 10,
  },
  roleTabActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  roleTabText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
  },
  roleTabTextActive: {
    color: '#1D4ED8',
  },
  list: {
    gap: 8,
    maxHeight: 280,
  },
  itemCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  itemCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  radioOuter: {
    alignItems: 'center',
    borderColor: '#9CA3AF',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioOuterSelected: {
    borderColor: '#2563EB',
  },
  radioInner: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    height: 10,
    width: 10,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  itemSub: {
    color: '#6B7280',
    fontSize: 13,
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    padding: 14,
  },
  loginButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
