import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { useApp } from '@/store/AppContext';
import type { PracticumSession } from '@/types';

type CheckInActionProps = {
  session: PracticumSession;
};

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function CheckInAction({ session }: CheckInActionProps) {
  const { activeUser, attendance, checkIn } = useApp();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // This component is only for a logged-in Praktikan.
  if (!activeUser || activeUser.role !== 'PRAKTIKAN') {
    return null;
  }

  const praktikan = activeUser;

  // Check the shared store so a successful check-in remains visible
  // when the user leaves the screen and returns.
  const existingRecord = attendance.find(
    (record) =>
      record.sessionId === session.id &&
      record.praktikanId === praktikan.id,
  );

  const handleConfirm = () => {
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      // P1's checkIn method uses the active user from AppContext.
      const result = checkIn(session.id);

      if (!result.ok) {
        if (result.code === 'ALREADY_CHECKED_IN') {
          setError('Anda sudah melakukan presensi pada sesi ini.');
        } else if (result.code === 'SESSION_NOT_OPEN') {
          setError('Sesi belum dibuka atau sudah ditutup.');
        } else if (result.code === 'INVALID_USER') {
          setError('Identitas praktikan tidak valid.');
        } else {
          setError(result.message || 'Presensi gagal. Silakan coba lagi.');
        }

        return;
      }

      // The shared attendance state is updated by P1's checkIn method.
      setConfirmVisible(false);
      setError(null);
    } catch {
      setError('Terjadi kesalahan saat presensi. Silakan coba lagi.');
    } finally {
      setPending(false);
    }
  };

  if (session.status === 'BELUM_DIBUKA') {
    return (
      <View style={styles.statusBox}>
        <Text style={styles.disabledText}>Sesi belum dibuka</Text>
      </View>
    );
  }

  if (session.status === 'DITUTUP') {
    return (
      <View style={styles.statusBox}>
        <Text style={styles.disabledText}>Sesi sudah ditutup</Text>
      </View>
    );
  }

  if (existingRecord) {
    return (
      <View style={styles.successBox}>
        <Text style={styles.successText}>
          ✔ Presensi tercatat pukul{' '}
          {formatTime(existingRecord.timestamp)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Presensi Sekarang"
        onPress={() => {
          setError(null);
          setConfirmVisible(true);
        }}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>Presensi Sekarang</Text>
      </Pressable>

      <ConfirmSheet
        visible={confirmVisible}
        title="Konfirmasi Presensi"
        message={
          `Lakukan presensi atas nama ${praktikan.nama} ` +
          `(NIM: ${praktikan.nim}) untuk sesi ${session.namaPraktikum}?`
        }
        confirmLabel="Ya, Presensi"
        cancelLabel="Batal"
        pending={pending}
        error={error}
        onCancel={() => {
          if (!pending) {
            setConfirmVisible(false);
            setError(null);
          }
        }}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statusBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
  },
  disabledText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 14,
  },
  successText: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});