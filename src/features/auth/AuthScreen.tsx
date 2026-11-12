import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthContext';
import { loginAccount, registerAccount } from '@/features/auth/authService';
import { missingFirebaseEnvKeys } from '@/lib/firebase';
import type { Role } from '@/types';
import { mapFirebaseError } from '@/utils/firebaseError';

type AuthMode = 'LOGIN' | 'REGISTER';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'PRAKTIKAN', label: 'Praktikan' },
  { value: 'ASISTEN', label: 'Asisten' },
];

export function AuthScreen() {
  const { notice, clearNotice, refreshProfile } = useAuth();

  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('PRAKTIKAN');
  const [nim, setNim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [retryingProfile, setRetryingProfile] = useState(false);

  const configIncomplete = missingFirebaseEnvKeys.length > 0;
  const isRegister = mode === 'REGISTER';

  const switchMode = (nextMode: AuthMode) => {
    if (pending || nextMode === mode) {
      return;
    }

    setMode(nextMode);
    setError(null);
  };

  const validate = (): string | null => {
    if (isRegister && nama.trim().length === 0) {
      return 'Nama wajib diisi.';
    }

    if (email.trim().length === 0) {
      return 'Email wajib diisi.';
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      return 'Format email tidak valid.';
    }

    if (password.length === 0) {
      return 'Password wajib diisi.';
    }

    if (password.length < 6) {
      return 'Password minimal 6 karakter.';
    }

    if (isRegister && role === 'PRAKTIKAN' && nim.trim().length === 0) {
      return 'NIM wajib diisi untuk praktikan.';
    }

    return null;
  };

  const handleSubmit = async () => {
    if (pending) {
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    setError(null);
    clearNotice();

    try {
      if (!isRegister) {
        const result = await loginAccount({ email, password });

        if (!result.ok) {
          setError(result.message);
          return;
        }

        setPassword('');
        return;
      }

      const result = await registerAccount({
        nama,
        email,
        password,
        role,
        nim: role === 'PRAKTIKAN' ? nim : null,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setPassword('');
    } catch (unexpectedError) {
      setError(mapFirebaseError(unexpectedError));
    } finally {
      setPending(false);
    }
  };

  const handleRetryProfile = async () => {
    if (retryingProfile) {
      return;
    }

    setRetryingProfile(true);
    try {
      await refreshProfile();
    } finally {
      setRetryingProfile(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>
                LabPresensi
              </Text>
              <Text style={styles.subtitle}>
                {isRegister
                  ? 'Buat akun untuk mulai menggunakan aplikasi'
                  : 'Masuk untuk mengelola presensi praktikum'}
              </Text>
            </View>

            <View style={styles.modeRow}>
              {(['LOGIN', 'REGISTER'] as const).map((option) => {
                const selected = mode === option;

                return (
                  <Pressable
                    accessibilityLabel={option === 'LOGIN' ? 'Tab Masuk' : 'Tab Daftar'}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    key={option}
                    onPress={() => switchMode(option)}
                    style={({ pressed }) => [
                      styles.modeButton,
                      selected && styles.modeButtonActive,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[styles.modeLabel, selected && styles.modeLabelActive]}>
                      {option === 'LOGIN' ? 'Masuk' : 'Daftar'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {configIncomplete ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Konfigurasi Firebase belum lengkap</Text>
                <Text style={styles.warningText}>
                  Isi {missingFirebaseEnvKeys.join(', ')} pada file .env lalu jalankan ulang
                  aplikasi.
                </Text>
              </View>
            ) : null}

            {notice ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>{notice}</Text>
                <View style={styles.noticeActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={retryingProfile}
                    onPress={() => void handleRetryProfile()}
                    style={({ pressed }) => [styles.noticeButton, pressed && styles.pressed]}>
                    {retryingProfile ? (
                      <ActivityIndicator color="#92400E" size="small" />
                    ) : (
                      <Text style={styles.noticeButtonText}>Coba Lagi</Text>
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={clearNotice}
                    style={({ pressed }) => [styles.noticeButton, pressed && styles.pressed]}>
                    <Text style={styles.noticeButtonText}>Tutup</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {isRegister ? (
              <View style={styles.field}>
                <Text style={styles.label}>Nama Lengkap</Text>
                <TextInput
                  accessibilityLabel="Nama lengkap"
                  autoCapitalize="words"
                  editable={!pending}
                  onChangeText={setNama}
                  placeholder="Nama sesuai data praktikum"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={nama}
                />
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!pending}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="nama@email.com"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={email}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!pending}
                onChangeText={setPassword}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            {isRegister ? (
              <View style={styles.field}>
                <Text style={styles.label}>Peran</Text>
                <View style={styles.roleRow}>
                  {ROLE_OPTIONS.map((option) => {
                    const selected = role === option.value;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        disabled={pending}
                        key={option.value}
                        onPress={() => setRole(option.value)}
                        style={({ pressed }) => [
                          styles.roleButton,
                          selected && styles.roleButtonActive,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={[styles.roleLabel, selected && styles.roleLabelActive]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.hint}>
                  Peran dipilih saat mendaftar dan tidak dapat diubah setelah akun dibuat.
                </Text>
              </View>
            ) : null}

            {isRegister && role === 'PRAKTIKAN' ? (
              <View style={styles.field}>
                <Text style={styles.label}>NIM</Text>
                <TextInput
                  accessibilityLabel="NIM"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!pending}
                  keyboardType="number-pad"
                  onChangeText={setNim}
                  placeholder="Nomor Induk Mahasiswa"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={nim}
                />
              </View>
            ) : null}

            {error ? (
              <Text
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
                style={styles.errorBox}>
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: pending, disabled: pending }}
              disabled={pending}
              onPress={() => void handleSubmit()}
              style={({ pressed }) => [
                styles.submitButton,
                pending && styles.submitButtonDisabled,
                pressed && styles.pressed,
              ]}>
              {pending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitLabel}>{isRegister ? 'Daftar' : 'Masuk'}</Text>
              )}
            </Pressable>

            <Text style={styles.footnote}>
              {isRegister
                ? 'Sudah punya akun? Pilih tab Masuk.'
                : 'Belum punya akun? Pilih tab Daftar.'}
            </Text>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
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
    gap: 16,
    maxWidth: 480,
    padding: 24,
    width: '100%',
  },
  heading: {
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
    lineHeight: 20,
    textAlign: 'center',
  },
  modeRow: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    flexDirection: 'row',
    padding: 4,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: 8,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  modeLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  modeLabelActive: {
    color: '#1D4ED8',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    gap: 4,
    padding: 12,
  },
  warningTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
  },
  warningText: {
    color: '#92400E',
    fontSize: 13,
    lineHeight: 18,
  },
  noticeBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    gap: 10,
    padding: 12,
  },
  noticeText: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 19,
  },
  noticeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  noticeButton: {
    alignItems: 'center',
    borderColor: '#FCA5A5',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  noticeButtonText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '700',
  },
  field: {
    gap: 6,
  },
  label: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hint: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 17,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    alignItems: 'center',
    borderColor: '#D1D5DB',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  roleButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  roleLabel: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
  },
  roleLabelActive: {
    color: '#1D4ED8',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footnote: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});


