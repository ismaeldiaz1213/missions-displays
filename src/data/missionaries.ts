import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore/lite';
import { db } from '../firebase';
import type { Missionary } from '../types';

const missionariesCol = collection(db, 'missionaries');
// Unpublished pages (e.g. created from an approved request). Admin-only in firestore.rules.
const draftsCol = collection(db, 'missionaryDrafts');

const NETWORK_TIMEOUT_MS = 5000;

const CACHE_PREFIX = 'ibl-cache:';

/** Last good copy saved on this device, or null. */
export const readCache = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch { return null; /* storage unavailable or corrupt */ }
};

const writeCache = (key: string, data: unknown) => {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data)); } catch { /* storage full/unavailable */ }
};

// Kiosks sit on flaky church Wi-Fi: use the network when it answers within 5 s,
// otherwise fall back to the last good copy saved on this device.
export const withOfflineCache = async <T>(key: string, load: () => Promise<T>): Promise<T> => {
  try {
    const data = await Promise.race([
      load(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS)),
    ]);
    writeCache(key, data);
    return data;
  } catch (err) {
    const cached = readCache<T>(key);
    if (cached) return cached;
    throw err;
  }
};

const toMissionary = (id: string, data: Record<string, unknown>) => ({ ...data, id }) as Missionary;

export const listMissionariesByContinent = (continent: string) =>
  withOfflineCache(`continent:${continent}`, async () => {
    const snap = await getDocs(query(missionariesCol, where('continent', '==', continent)));
    return snap.docs.map((d) => toMissionary(d.id, d.data()));
  });

/**
 * Every published missionary in one request (the collection is small). Also refreshes each
 * continent's and each missionary's saved copy, so after the map loads once the whole site
 * opens instantly and keeps working if the Wi-Fi drops.
 */
export const listMissionaries = () =>
  withOfflineCache('all', async () => {
    const snap = await getDocs(missionariesCol);
    const all = snap.docs.map((d) => toMissionary(d.id, d.data()));
    const byContinent: Record<string, Missionary[]> = {};
    for (const m of all) {
      writeCache(`missionary:${m.id}`, m);
      (byContinent[m.continent] ??= []).push(m);
    }
    for (const [continent, list] of Object.entries(byContinent)) writeCache(`continent:${continent}`, list);
    return all;
  });

export const getMissionary = (id: string) =>
  withOfflineCache(`missionary:${id}`, async () => {
    const snap = await getDoc(doc(missionariesCol, id));
    return snap.exists() ? toMissionary(snap.id, snap.data()) : null;
  });

// Admin-only (enforced by firestore.rules). JSON round-trip drops `undefined`, which Firestore rejects.
export const saveMissionary = (m: Missionary) =>
  setDoc(doc(missionariesCol, m.id), JSON.parse(JSON.stringify(m)));

export const deleteMissionary = (id: string) => deleteDoc(doc(missionariesCol, id));

// ── Drafts ───────────────────────────────────────────────────────────────────

export const listDraftsByContinent = async (continent: string) => {
  const snap = await getDocs(query(draftsCol, where('continent', '==', continent)));
  return snap.docs.map((d) => toMissionary(d.id, d.data()));
};

export const saveDraft = (m: Missionary) =>
  setDoc(doc(draftsCol, m.id), JSON.parse(JSON.stringify(m)));

export const deleteDraft = (id: string) => deleteDoc(doc(draftsCol, id));

// ── Admin directory, history and archive (admin-only in firestore.rules) ─────

const historyCol = (id: string) => collection(db, 'missionaryHistory', id, 'versions');
// "Deleted" pages are moved here, never destroyed; their files stay in Storage.
const archiveCol = collection(db, 'missionaryArchive');

/** Fresh from the server (no device cache): every published page and every draft. */
export const listForAdmin = async () => {
  const [pub, drafts] = await Promise.all([getDocs(missionariesCol), getDocs(draftsCol)]);
  return {
    published: pub.docs.map((d) => toMissionary(d.id, d.data())),
    drafts: drafts.docs.map((d) => toMissionary(d.id, d.data())),
  };
};

export interface ArchivedMissionary { page: Missionary; wasDraft: boolean; archivedAt: string; archivedBy: string }

export const listArchived = async (): Promise<ArchivedMissionary[]> => {
  const snap = await getDocs(archiveCol);
  return snap.docs.map((d) => {
    const data = d.data();
    const at = data.archivedAt as { toDate?: () => Date } | undefined;
    return {
      page: toMissionary(d.id, data.page ?? {}),
      wasDraft: !!data.wasDraft,
      archivedAt: at?.toDate ? at.toDate().toISOString() : '',
      archivedBy: String(data.archivedBy ?? ''),
    };
  });
};

/** Saves the current published page to missionaryHistory before it is replaced, so it can be restored. */
export const snapshotPublished = async (id: string, savedBy: string, reason: string) => {
  const current = await getDoc(doc(missionariesCol, id));
  if (!current.exists()) return;
  await addDoc(historyCol(id), { ...current.data(), savedAt: serverTimestamp(), savedBy, reason });
};

/** Publishes a page, keeping the version it replaces in history. */
export const publishWithHistory = async (m: Missionary, savedBy: string, reason = 'admin-edit') => {
  await snapshotPublished(m.id, savedBy, reason);
  await saveMissionary(m);
};

/** Hides a page from the site without losing anything: it moves to missionaryArchive. */
export const archiveMissionary = async (m: Missionary, wasDraft: boolean, archivedBy: string) => {
  const page = JSON.parse(JSON.stringify(m));
  delete page.id;
  await setDoc(doc(archiveCol, m.id), { page, wasDraft, archivedAt: serverTimestamp(), archivedBy });
  await (wasDraft ? deleteDraft(m.id) : deleteMissionary(m.id));
};

export const restoreMissionary = async (a: ArchivedMissionary) => {
  await (a.wasDraft ? saveDraft(a.page) : saveMissionary(a.page));
  await deleteDoc(doc(archiveCol, a.page.id));
};

export interface PageVersion {
  id: string;
  page: Missionary;
  savedAt: string;
  savedBy: string;
  /** Why it was saved: 'admin-edit', 'profile-update', 'from-report', 'restore', or an approved change. */
  reason: string;
}

const HISTORY_META = ['savedAt', 'savedBy', 'reason', 'replacedByEdit'];

/** Every earlier version of a published page, newest first. */
export const listHistory = async (id: string): Promise<PageVersion[]> => {
  const snap = await getDocs(historyCol(id));
  return snap.docs.map((d) => {
    const data = { ...d.data() } as Record<string, unknown>;
    const at = data.savedAt as { toDate?: () => Date } | undefined;
    const reason = data.replacedByEdit ? 'approved-change' : String(data.reason ?? '');
    const savedBy = String(data.savedBy ?? '');
    for (const k of HISTORY_META) delete data[k];
    return { id: d.id, page: toMissionary(id, data), savedAt: at?.toDate ? at.toDate().toISOString() : '', savedBy, reason };
  }).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
};

/** Puts an earlier version back on the site; the version it replaces is kept in history too. */
export const restoreVersion = (v: PageVersion, by: string) => publishWithHistory(v.page, by, 'restore');

/** The published page straight from the server (admins reviewing changes need the latest). */
export const getPublishedFresh = async (id: string) => {
  const snap = await getDoc(doc(missionariesCol, id));
  return snap.exists() ? toMissionary(snap.id, snap.data()) : null;
};
