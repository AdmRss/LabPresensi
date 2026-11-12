import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ScreenState } from '@/types';

type NavContextType = {
  currentScreen: ScreenState;
  selectedSessionId: string | null;
  activeTab: 'SCHEDULE' | 'RIWAYAT';
  setActiveTab: (tab: 'SCHEDULE' | 'RIWAYAT') => void;
  navigateTo: (screen: ScreenState, sessionId?: string) => void;
  goBack: () => void;
};

const NavContext = createContext<NavContextType | undefined>(undefined);

export function NavContextProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('ROLE_SELECT');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'RIWAYAT'>('SCHEDULE');
  const [screenHistory, setScreenHistory] = useState<ScreenState[]>(['ROLE_SELECT']);

  const navigateTo = (screen: ScreenState, sessionId?: string) => {
    if (sessionId !== undefined) {
      setSelectedSessionId(sessionId);
    }
    setScreenHistory((prev) => [...prev, screen]);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory];
      newHistory.pop();
      const previous = newHistory[newHistory.length - 1];
      setScreenHistory(newHistory);
      setCurrentScreen(previous);
    } else {
      setCurrentScreen('ROLE_SELECT');
    }
  };

  return (
    <NavContext.Provider
      value={{
        currentScreen,
        selectedSessionId,
        activeTab,
        setActiveTab,
        navigateTo,
        goBack,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error('useNav must be used within a NavContextProvider');
  }
  return context;
}
