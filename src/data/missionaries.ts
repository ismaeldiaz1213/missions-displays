import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore/lite';
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
