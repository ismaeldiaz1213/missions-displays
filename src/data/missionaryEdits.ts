import {
  FirestoreError, Timestamp, addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore/lite';
import { db } from '../firebase';
import type { Missionary } from '../types';
import { copyFile, listFiles, type StoredFile } from './storageFiles';
import { REQUEST_FILE_KINDS, type RequestFileKind } from './missionaryRequests';

// Each private edit link is one missionaryEdits/{token} document; the id is the secret token.
// Anyone holding it may read the edit and save or submit it; admins create, approve and reject
// (enforced by firestore.rules and storage.rules).
const editsCol = collection(db, 'missionaryEdits');
const missionariesCol = collection(db, 'missionaries');
const historyCol = (missionaryId: string) => collection(db, 'missionaryHistory', missionaryId, 'versions');

// Pending uploads use the same kinds and limits as page requests (REQUEST_LIMITS).
export const EDIT_FILE_KINDS = REQUEST_FILE_KINDS;
export type EditFileKind = RequestFileKind;

export type EditStatus = 'draft' | 'submitted' | 'rejected' | 'approved';

/** The page as the missionary wants it: every Missionary field except id. */
export type ProposedPage = Omit<Missionary, 'id'>;

export interface MissionaryEdit {
  token: string;
  missionaryId: string;
  proposed: ProposedPage;
  status: EditStatus;
  rejectionReason: string;
  revoked: boolean;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
  reviewedAt: string;
  reviewedBy: string;
}

export const editFilesPrefix = (token: string, kind: EditFileKind) => `missionary-edits/${token}/${kind}`;

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : '');

const toEdit = (token: string, data: Record<string, unknown>): MissionaryEdit => ({
  ...(data as Omit<MissionaryEdit, 'token' | 'createdAt' | 'updatedAt' | 'submittedAt' | 'reviewedAt'>),
  token,
  createdAt: iso(data.createdAt),
  updatedAt: iso(data.updatedAt),
  submittedAt: iso(data.submittedAt),
  reviewedAt: iso(data.reviewedAt),
});

// JSON round-trip drops `undefined`, which Firestore rejects.
const toProposed = (page: ProposedPage & { id?: string }): ProposedPage => {
  const copy = JSON.parse(JSON.stringify(page));
  delete copy.id;
  return copy;
};

// ── Missionary (link holder) ─────────────────────────────────────────────────

/** The edit behind a link, or null if the link is unknown, revoked or already approved. */
export const getEdit = async (token: string): Promise<MissionaryEdit | null> => {
  try {
    const snap = await getDoc(doc(editsCol, token));
    return snap.exists() ? toEdit(snap.id, snap.data()) : null;
  } catch (err) {
    if (err instanceof FirestoreError && err.code === 'permission-denied') return null;
    throw err;
  }
};

export const saveEditDraft = (token: string, proposed: ProposedPage) =>
  updateDoc(doc(editsCol, token), { proposed: toProposed(proposed), status: 'draft', updatedAt: serverTimestamp() });

export const submitEdit = (token: string, proposed: ProposedPage) =>
  updateDoc(doc(editsCol, token), {
    proposed: toProposed(proposed),
    status: 'submitted',
    updatedAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
  });

// ── Admin-only (enforced by firestore.rules / storage.rules) ─────────────────

/** Creates a private edit link for a published missionary, starting from their current page. Returns the token. */
export const createEditLink = async (m: Missionary): Promise<string> => {
  const ref = doc(editsCol);
  await setDoc(ref, {
    missionaryId: m.id,
    proposed: toProposed(m),
    status: 'draft',
    rejectionReason: '',
    revoked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: '',
  });
  return ref.id;
};

/** Edits waiting for review (submitted, on links that are still active). */
export const listPendingEdits = async (): Promise<MissionaryEdit[]> => {
  const snap = await getDocs(query(editsCol, where('status', '==', 'submitted')));
  return snap.docs.map((d) => toEdit(d.id, d.data())).filter((e) => !e.revoked);
};

export const listEditsForMissionary = async (missionaryId: string): Promise<MissionaryEdit[]> => {
  const snap = await getDocs(query(editsCol, where('missionaryId', '==', missionaryId)));
  return snap.docs.map((d) => toEdit(d.id, d.data()));
};

export const listEditFiles = async (token: string): Promise<Record<EditFileKind, StoredFile[]>> => {
  const [profile, prayerLetter, gallery] = await Promise.all(EDIT_FILE_KINDS.map((k) => listFiles(editFilesPrefix(token, k))));
  return { profile, 'prayer-letter': prayerLetter, gallery };
};

export const revokeEditLink = (token: string) => updateDoc(doc(editsCol, token), { revoked: true });

export const rejectEdit = (token: string, reason: string, reviewedBy: string) =>
  updateDoc(doc(editsCol, token), {
    status: 'rejected', rejectionReason: reason, reviewedAt: serverTimestamp(), reviewedBy,
  });

const extension = (path: string, fallback: string) => {
  const m = /\.([a-z0-9]{1,5})$/i.exec(path);
  return m ? m[1].toLowerCase() : fallback;
};

/**
 * Publishes an edit: copies files uploaded through the link into the public images/ pdfs/
 * videos/ folders, saves a snapshot of the current page to missionaryHistory so it can be
 * reverted, overwrites missionaries/{id}, and marks the edit approved (which locks the link).
 */
export const approveEdit = async (
  edit: MissionaryEdit,
  reviewedBy: string,
  onStep: (label: string) => void = () => {},
): Promise<Missionary> => {
  const id = edit.missionaryId;
  const pending = `missionary-edits/${edit.token}/`;
  const files = await listEditFiles(edit.token);
  const contentTypes = new Map(Object.values(files).flat().map((f) => [f.path, f.contentType]));
  let n = 0;
  const publish = async (path: string | undefined, label: string) => {
    if (!path?.startsWith(pending)) return path;
    onStep(label);
    const contentType = contentTypes.get(path) ?? '';
    const folder = contentType === 'application/pdf' ? 'pdfs' : contentType.startsWith('video/') ? 'videos' : 'images';
    return copyFile(path, `${folder}/${id}-edit-${Date.now()}-${n++}.${extension(path, 'bin')}`, contentType);
  };

  const p = edit.proposed;
  const page: Missionary = {
    ...p,
    id,
    profileImage: await publish(p.profileImage, 'Copiando foto de perfil…'),
    prayerLetter: await publish(p.prayerLetter, 'Copiando carta de oración…'),
    media: [],
  };
  for (const [i, item] of p.media.entries()) {
    page.media.push({ ...item, url: (await publish(item.url, `Copiando galería ${i + 1} de ${p.media.length}…`)) ?? '' });
  }

  onStep('Guardando versión anterior…');
  const current = await getDoc(doc(missionariesCol, id));
  if (current.exists()) {
    await addDoc(historyCol(id), { ...current.data(), savedAt: serverTimestamp(), replacedByEdit: edit.token, savedBy: reviewedBy });
  }

  onStep('Publicando…');
  const published = JSON.parse(JSON.stringify(page)) as Missionary;
  await setDoc(doc(missionariesCol, id), published);
  await updateDoc(doc(editsCol, edit.token), { status: 'approved', reviewedAt: serverTimestamp(), reviewedBy });
  return published;
};
