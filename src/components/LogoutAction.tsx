import { useState } from 'react';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Action } from '@/components/Interface';
import { useAuth } from '@/features/auth/AuthContext';
import { mapFirebaseError } from '@/utils/firebaseError';

export function LogoutAction({ variant = 'quiet' }: { variant?: 'quiet' | 'danger' | 'secondary' }) {
  const { user, logout } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleConfirmLogout = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await logout();
      setConfirmVisible(false);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : mapFirebaseError(logoutError));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Action
        label="Keluar"
        accessibilityLabel={`Keluar dari akun ${user.nama}`}
        variant={variant}
        onPress={() => { setError(null); setConfirmVisible(true); }}
      />
      <ConfirmSheet
        confirmLabel="Keluar"
        destructive
        error={error}
        message="Anda akan kembali ke layar masuk. Data presensi tetap tersimpan."
        onCancel={() => setConfirmVisible(false)}
        onConfirm={() => void handleConfirmLogout()}
        pending={pending}
        title="Keluar dari akun?"
        visible={confirmVisible}
      />
    </>
  );
}
