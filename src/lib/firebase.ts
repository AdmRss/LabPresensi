import { getApp, getApps, initializeApp } from "firebase/app";

import {
  connectAuthEmulator,
  getAuth,
  // @ts-expect-error Firebase React Native export is missing from generic TypeScript declarations.
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Authentication with persistent AsyncStorage.
let auth: Auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Authentication was already initialized.
  auth = getAuth(app);
}

// Initialize Cloud Firestore.
const db = getFirestore(app);

// Hanya untuk pengujian web lokal dengan proyek demo sintetis.
if (__DEV__ && firebaseConfig.projectId === 'demo-labpresensi' &&
    process.env.EXPO_PUBLIC_USE_LOCAL_EMULATORS === '1' && !auth.emulatorConfig) {
  connectAuthEmulator(auth, 'http://127.0.0.1:19319', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 18319);
}

export { app, auth, db };
