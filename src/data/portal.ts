import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, updateDoc, where } from 'firebase/firestore/lite';
import { db } from '../firebase';
import type { Missionary } from '../types';
import { emptyProfile, type ContactMethod, type MissionaryProfile } from './missionaryProfiles';
import { REPORT_PDF_MAX_BYTES, addSubmission, listSubmissionsFor, reportFilesPrefix } from './reports';
import { uploadFile } from './storageFiles';

// What a signed-in missionary reads and writes from their page (/misioneros/mi-pagina).
// firestore.rules / storage.rules allow it only for the profile whose ownerEmail is theirs.

export interface MyAccount {
  missionaryId: string;
  profile: MissionaryProfile;
  page: Missionary | null;
}

/** Their profile (found by the email they signed in with) and their published page. */
export const loadMyAccount = async (email: string): Promise<MyAccount | null> => {
  const snap = await getDocs(query(collection(db, 'missionaryProfiles'), where('ownerEmail', '==', email.trim().toLowerCase()), limit(1)));
  const d = snap.docs[0];
  if (!d) return null;
  const page = await getDoc(doc(db, 'missionaries', d.id));
  return {
    missionaryId: d.id,
    profile: { ...emptyProfile(), ...d.data(), id: d.id } as MissionaryProfile,
    page: page.exists() ? ({ ...page.data(), id: page.id } as Missionary) : null,
  };
};

export interface MyContact { phone: string; preferredContact: ContactMethod; preferredContactNote: string; language: 'es' | 'en' }

export const saveMyContact = (missionaryId: string, c: MyContact) =>
  updateDoc(doc(db, 'missionaryProfiles', missionaryId), { ...c, phone: c.phone.trim(), updatedAt: serverTimestamp(), updatedBy: 'missionary' });

export const listMyReports = listSubmissionsFor;

const safeName = (name: string) => name.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-80);

export { REPORT_PDF_MAX_BYTES };

/** Sends a report (optional PDF + comments) or "no updates" for a quarter. */
export const sendMyReport = async (
  missionaryId: string, quarterId: string, kind: 'report' | 'noUpdates', file: File | null, comments: string,
  onProgress?: (f: number) => void,
) => {
  let pdfPath = '';
  if (kind === 'report' && file) {
    pdfPath = await uploadFile(file, `${reportFilesPrefix(missionaryId)}/${quarterId}-${Date.now()}-${safeName(file.name)}`, onProgress,
      { customMetadata: { originalName: file.name } });
  }
  await addSubmission({
    missionaryId, quarterId, kind, pdfPath, fileName: kind === 'report' ? file?.name ?? '' : '',
    comments: kind === 'report' ? comments.trim() : '', submittedBy: 'missionary',
  });
};
