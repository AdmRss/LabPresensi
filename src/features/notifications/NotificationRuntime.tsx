import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { getFunctions } from 'firebase/functions';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { app, auth } from '@/lib/firebase';
import { createNotificationClient } from './notificationClient';
import { connectNotificationLifecycle } from './notificationLifecycle';

const client = Platform.OS === 'android' && process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS === '1'
  ? createNotificationClient({
    native: Notifications,
    functions: getFunctions(app, 'us-central1'),
    platform: Platform.OS,
    currentUid: () => auth.currentUser?.uid ?? null,
    storage: { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync },
    randomUUID: Crypto.randomUUID,
  })
  : null;

const LOGOUT_BUDGET_MS = 2_000;

const NotificationFeedbackContext = createContext<{ message: string; retry: () => void } | null>(null);

export function useNotificationFeedback() {
  return useContext(NotificationFeedbackContext);
}

export async function notificationSignOut(uid: string, leave: () => Promise<void>) {
  if (!client) return leave();

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<void>((resolve) => { timer = setTimeout(resolve, LOGOUT_BUDGET_MS); });
    await Promise.race([client.revokeBeforeLogout(uid), deadline]);
    if (auth.currentUser?.uid !== uid) throw new Error('Akun sudah berubah.');
    await leave();
  } finally {
    if (timer) clearTimeout(timer);
    client.finishLogout(uid);
  }
}

export function NotificationRuntime({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigationReady = !!useRootNavigationState()?.key;
  const viewer = !loading && user && auth.currentUser?.uid === user.uid ? user : null;
  const viewerUid = viewer && viewer.role !== 'ADMIN' ? viewer.uid : null;
  const state = useRef({ viewer, authLoading: loading, navigationReady });
  const lifecycle = useRef<ReturnType<typeof connectNotificationLifecycle> | null>(null);
  const [message, setMessage] = useState<{ uid: string; text: string } | null>(null);
  const [permissionRequest, requestPermission] = useState<{ uid: string } | null>(null);

  useEffect(() => {
    state.current = { viewer, authLoading: loading, navigationReady };
    lifecycle.current?.flush();
  }, [viewer, loading, navigationReady]);

  useEffect(() => {
    if (!client) return;
    const connection = connectNotificationLifecycle(Notifications, () => state.current, router.navigate);
    lifecycle.current = connection;
    return () => { lifecycle.current = null; connection.disconnect(); };
  }, []);

  useEffect(() => {
    if (!client || !viewerUid) return;
    const runtime = client;
    let stop: (() => void) | undefined;
    function refresh(request: boolean) {
      if (!viewerUid) return;
      stop?.();
      stop = runtime.start(viewerUid, request, (result) => {
        const text = result.ok ? result.data.message : result.message;
        setMessage(text ? { uid: viewerUid, text } : null);
      });
    }
    refresh(permissionRequest?.uid === viewerUid);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') { refresh(false); lifecycle.current?.flush(); }
    });
    return () => { subscription.remove(); stop?.(); };
  }, [viewerUid, permissionRequest]);

  const feedback = viewerUid && message?.uid === viewerUid
    ? { message: message.text, retry: () => requestPermission({ uid: viewerUid }) }
    : null;

  return (
    <NotificationFeedbackContext.Provider value={feedback}>
      {children}
    </NotificationFeedbackContext.Provider>
  );
}
