import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Action, Field, FieldGroup, Notice, Segments } from '@/components/Interface';
import { color, radius, space, surface, type } from '@/constants/design';
import { useAuth } from '@/features/auth/AuthContext';
import { loginAccount, registerAccount, validateCredentials } from '@/features/auth/authService';
import { missingFirebaseEnvKeys } from '@/features/auth/firebaseEnv';
import { mapFirebaseError } from '@/utils/firebaseError';

type AuthMode = 'LOGIN' | 'REGISTER';

const MODES = [
  { key: 'LOGIN', label: 'Masuk' },
  { key: 'REGISTER', label: 'Daftar' },
] as const;

export function AuthScreen() {
  const { notice, clearNotice, refreshProfile } = useAuth();
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nim, setNim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [retryingProfile, setRetryingProfile] = useState(false);
  const isRegister = mode === 'REGISTER';

  const switchMode = (nextMode: AuthMode) => {
    if (!pending && nextMode !== mode) {
      setMode(nextMode);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (pending) return;
    const registration = isRegister ? { nama, email, password, nim } : undefined;
    const validationError = validateCredentials({ email, password }, registration);
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    setError(null);
    clearNotice();
    try {
      const result = registration
        ? await registerAccount(registration)
        : await loginAccount({ email, password });
      if (result.ok) setPassword('');
      else setError(result.message);
    } catch (unexpectedError) {
      setError(mapFirebaseError(unexpectedError));
    } finally {
      setPending(false);
    }
  };

  const handleRetryProfile = async () => {
    if (retryingProfile) return;
    setRetryingProfile(true);
    try {
      await refreshProfile();
    } finally {
      setRetryingProfile(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.masthead}>
              <Text accessibilityRole="header" style={styles.wordmark}>LabPresensi</Text>
              <Text style={[type.body, styles.mastheadLabel]}>Presensi praktikum</Text>
            </View>

            <View style={[surface.panel, styles.form]}>
              <Segments items={MODES} selected={mode} onChange={switchMode} disabled={pending} label="Akses akun" />
              <Text accessibilityRole="header" style={type.heading}>{isRegister ? 'Buat akun Praktikan' : 'Masuk ke akun'}</Text>

              {missingFirebaseEnvKeys.length ? (
                <Notice tone="warning" message={`Konfigurasi Firebase belum lengkap. Isi ${missingFirebaseEnvKeys.join(', ')} pada file .env, lalu jalankan ulang aplikasi.`} />
              ) : null}

              {notice ? (
                <View style={styles.profileNotice}>
                  <Notice message={notice} />
                  <View style={styles.noticeActions}>
                    <Action label="Coba lagi" variant="secondary" busy={retryingProfile} onPress={() => void handleRetryProfile()} />
                    <Action label="Tutup" variant="secondary" onPress={clearNotice} />
                  </View>
                </View>
              ) : null}

              {isRegister ? (
                <FieldGroup label="Nama lengkap">
                  <Field accessibilityLabel="Nama lengkap" autoCapitalize="words" autoComplete="name" editable={!pending} onChangeText={setNama} value={nama} />
                </FieldGroup>
              ) : null}

              <FieldGroup label="Email">
                <Field accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" autoCorrect={false} editable={!pending} keyboardType="email-address" onChangeText={setEmail} placeholder="nama@email.com" value={email} />
              </FieldGroup>

              <FieldGroup label="Kata sandi">
                <Field accessibilityLabel="Kata sandi" autoCapitalize="none" autoComplete={isRegister ? 'new-password' : 'current-password'} autoCorrect={false} editable={!pending} onChangeText={setPassword} onSubmitEditing={isRegister ? undefined : () => void handleSubmit()} secureTextEntry value={password} />
                <Text style={type.muted}>Minimal 6 karakter</Text>
              </FieldGroup>

              {isRegister ? (
                <FieldGroup label="NIM" hint="Nomor Induk Mahasiswa, 14 digit.">
                  <Field accessibilityLabel="NIM" autoCapitalize="none" editable={!pending} keyboardType="number-pad" maxLength={14} onChangeText={value => setNim(value.replace(/[^0-9]/g, ''))} value={nim} />
                </FieldGroup>
              ) : null}

              {error ? <Notice message={error} /> : null}
              <Action label={isRegister ? 'Daftar' : 'Masuk'} busy={pending} tactile onPress={() => void handleSubmit()} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.paper },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.gutter, paddingVertical: space.lg },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center', gap: space.inset },
  masthead: { backgroundColor: color.blueInk, borderRadius: radius, borderBottomWidth: 4, borderBottomColor: color.cobalt, padding: space.gutter, gap: space.xs },
  mastheadLabel: { color: color.blueWash },
  wordmark: { ...type.display, color: color.onAccent },
  form: { gap: space.inset, padding: space.inset },
  profileNotice: { gap: space.sm },
  noticeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
