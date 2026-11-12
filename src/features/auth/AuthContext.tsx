import React, { createContext, useContext, type ReactNode } from 'react';

import type { AppUser } from '@/types';

export type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
};

// Stub scaffold: diganti implementasi Firebase Auth pada M1 (P1).
const dummyUser: AppUser = {
  uid: 'dummy-asisten',
  nama: 'Asisten Demo',
  email: 'demo@lab.ac.id',
  role: 'ASISTEN',
  nim: null,
  createdAt: new Date(0).toISOString(),
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextValue = {
    user: dummyUser,
    loading: false,
    logout: async () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
