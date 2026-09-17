import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore/lite';
import { db } from '../firebase';
import type { Missionary } from '../types';

const missionariesCol = collection(db, 'missionaries');
// Unpublished pages (e.g. created from an approved request). Admin-only in firestore.rules.
const draftsCol = collection(db, 'missionaryDrafts');

const NETWORK_TIMEOUT_MS = 5000;

// Kiosks sit on flaky church Wi-Fi: use the network when it answers within 5 s,
// otherwise fall back to the last good copy saved on this device.
const withOfflineCache = async <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const cacheKey = `ibl-cache:${key}`;
  try {
    const data = await Promise.race([
      load(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS)),
    ]);
    try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* storage full/unavailable */ }
    return data;
  } catch (err) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached) as T;
    } catch { /* storage unavailable */ }
    throw err;
  }
};

const toMissionary = (id: string, data: Record<string, unknown>) => ({ ...data, id }) as Missionary;

export const listMissionariesByContinent = (continent: string) =>
  withOfflineCache(`continent:${continent}`, async () => {
    const snap = await getDocs(query(missionariesCol, where('continent', '==', continent)));
    return snap.docs.map((d) => toMissionary(d.id, d.data()));
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

/** Makes a draft public: writes it to missionaries/, then removes the draft. */
export const publishDraft = async (m: Missionary) => {
  await saveMissionary(m);
  await deleteDraft(m.id);
};
