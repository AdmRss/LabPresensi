import { isDocumentId, type FirestoreData } from './types';

export type ClassReader = (classId: string) => Promise<FirestoreData | undefined>;

export async function resolveSessionRecipients(
  session: FirestoreData,
  readClass: ClassReader,
  includeAssistant: boolean,
): Promise<string[]> {
  if (session.archived === true || !isDocumentId(session.kelasId)) return [];

  const kelas = await readClass(session.kelasId);
  if (!kelas || kelas.archived === true) return [];

  const participants = Array.isArray(kelas.pesertaUids) ? kelas.pesertaUids.filter(isDocumentId) : [];
  const uids = new Set(participants);
  if (includeAssistant && isDocumentId(kelas.asistenId) && kelas.asistenId === session.asistenId) {
    uids.add(kelas.asistenId);
  }
  return [...uids];
}
