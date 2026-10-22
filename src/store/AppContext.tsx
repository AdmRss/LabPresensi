import React, { createContext, useContext, useState, ReactNode } from 'react';
import type {
  Assistant,
  Praktikan,
  PracticumSession,
  AttendanceRecord,
  ActiveUser,
  SessionActionResult,
  CheckInResult,
} from '@/types';
import { initialAssistants, initialPraktikans, initialSessions, initialAttendance } from '@/data/seed';

type AppContextType = {
  assistants: Assistant[];
  praktikans: Praktikan[];
  sessions: PracticumSession[];
  attendance: AttendanceRecord[];
  activeUser: ActiveUser | null;
  setActiveUser: (user: ActiveUser | null) => void;
  openSession: (sessionId: string) => SessionActionResult;
  closeSession: (sessionId: string) => SessionActionResult;
  checkIn: (sessionId: string, praktikanOverride?: Praktikan) => CheckInResult;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [assistants] = useState<Assistant[]>(initialAssistants);
  const [praktikans] = useState<Praktikan[]>(initialPraktikans);
  const [sessions, setSessions] = useState<PracticumSession[]>(initialSessions);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialAttendance);
  const [activeUser, setActiveUser] = useState<ActiveUser | null>(null);

  const openSession = (sessionId: string): SessionActionResult => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return { ok: false, code: 'NOT_FOUND', message: 'Sesi tidak ditemukan.' };
    }
    if (session.status !== 'BELUM_DIBUKA') {
      return { ok: false, code: 'INVALID_STATE', message: 'Sesi hanya dapat dibuka dari status BELUM_DIBUKA.' };
    }

    const updatedSessions = sessions.map((s) =>
      s.id === sessionId
        ? { ...s, status: 'DIBUKA' as const, openedAt: new Date().toISOString() }
        : s,
    );
    setSessions(updatedSessions);
    return { ok: true };
  };

  const closeSession = (sessionId: string): SessionActionResult => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return { ok: false, code: 'NOT_FOUND', message: 'Sesi tidak ditemukan.' };
    }
    if (session.status !== 'DIBUKA') {
      return { ok: false, code: 'INVALID_STATE', message: 'Sesi hanya dapat ditutup dari status DIBUKA.' };
    }

    const updatedSessions = sessions.map((s) =>
      s.id === sessionId
        ? { ...s, status: 'DITUTUP' as const, closedAt: new Date().toISOString() }
        : s,
    );
    setSessions(updatedSessions);
    return { ok: true };
  };

  const checkIn = (sessionId: string, praktikanOverride?: Praktikan): CheckInResult => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return { ok: false, code: 'SESSION_NOT_OPEN', message: 'Sesi tidak ditemukan.' };
    }
    if (session.status !== 'DIBUKA') {
      return { ok: false, code: 'SESSION_NOT_OPEN', message: 'SESSION_NOT_OPEN' };
    }

    const praktikan =
      praktikanOverride || (activeUser?.role === 'PRAKTIKAN' ? (activeUser as Praktikan) : null);

    if (!praktikan) {
      return { ok: false, code: 'INVALID_USER', message: 'Identitas praktikan tidak valid.' };
    }

    const existing = attendance.find(
      (a) => a.sessionId === sessionId && a.praktikanId === praktikan.id,
    );
    if (existing) {
      return { ok: false, code: 'ALREADY_CHECKED_IN', message: 'ALREADY_CHECKED_IN' };
    }

    const record: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sessionId,
      praktikanId: praktikan.id,
      nama: praktikan.nama,
      nim: praktikan.nim,
      kelas: praktikan.kelas,
      timestamp: new Date().toISOString(),
    };

    setAttendance((prev) => [...prev, record]);
    return { ok: true, record };
  };

  return (
    <AppContext.Provider
      value={{
        assistants,
        praktikans,
        sessions,
        attendance,
        activeUser,
        setActiveUser,
        openSession,
        closeSession,
        checkIn,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
}
