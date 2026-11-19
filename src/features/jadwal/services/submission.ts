import { collection, doc, getDocFromServer, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function ownSessionQuery(kind: 'presensi' | 'izin', uid: string, sesiId: string) {
  return query(collection(db, kind), where('praktikanUid', '==', uid), where('sesiId', '==', sesiId));
}

// A rejected update can mean duplicate, closed session or revoked membership.
// Only an independently acknowledged, readable record establishes a duplicate.
export async function confirmedDuplicate(error: unknown, kind: 'presensi' | 'izin', id: string) {
  if ((error as { code?: string })?.code !== 'permission-denied') return false;
  try {
    const snapshot = await getDocFromServer(doc(db, kind, id));
    return snapshot.exists() && !snapshot.metadata.hasPendingWrites;
  } catch {
    return false;
  }
}
