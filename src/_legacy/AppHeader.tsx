import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useApp } from '@/store/AppContext';
import { useNav } from '@/navigation/NavContext';

export function AppHeader() {
  const { activeUser, setActiveUser } = useApp();
  const { navigateTo } = useNav();

  if (!activeUser) {
    return null;
  }

  const handleSwitchRole = () => {
    setActiveUser(null);
    navigateTo('ROLE_SELECT');
  };

  return (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <Text style={styles.nameText} numberOfLines={1}>
          {activeUser.nama || (activeUser.role === 'ASISTEN' ? 'Asisten' : 'Praktikan')}
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{activeUser.role}</Text>
          {activeUser.role === 'PRAKTIKAN' && <Text style={styles.classText}> • Kelas {activeUser.kelas}</Text>}
        </View>
      </View>
      <Pressable
        accessibilityLabel="Ganti peran atau identitas"
        accessibilityRole="button"
        onPress={handleSwitchRole}
        style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}
      >
        <Text style={styles.switchButtonText}>Ganti Peran</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    marginRight: 12,
  },
  nameText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  roleBadge: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  roleText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  classText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  switchButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
