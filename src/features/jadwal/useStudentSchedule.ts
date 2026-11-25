import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import type { Kelas, Sesi } from '@/types';
import { mapFirebaseError } from '@/utils/firebaseError';
import { subscribeToStudentSessions } from './services/jadwalService';

export function useStudentSchedule() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Sesi[]>([]);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || user.role !== 'PRAKTIKAN') return;
    return subscribeToStudentSessions(
      user.uid,
      rows => { setSessions(rows); setError(null); },
      (snapshotError) => {
        setError(mapFirebaseError(snapshotError));
        setLoading(false);
      },
      setLoading,
      setClasses,
      setFromCache,
    );
  }, [authLoading, user]);
  return { user, sessions, classes, fromCache, error, loading, authLoading };
}
