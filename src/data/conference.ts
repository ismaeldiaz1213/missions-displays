// The current conference: settings/conference. Admins edit it on the admin page; the
// registration page, the media upload page and firestore.rules / storage.rules all read it.
// Past conferences live in conferences/{id} — see conferenceArchive.ts (admin only).
import { Timestamp, doc, getDoc, serverTimestamp, setDoc, type DocumentData } from 'firebase/firestore/lite';
import { db } from '../firebase';
import { DEFAULT_CONFERENCE, type ConferenceConfig } from '../Registration/conference';
import { withOfflineCache } from './missionaries';
import { useCachedLoad } from './useCachedLoad';

// ── Current conference ───────────────────────────────────────────────────────

// Public read (the registration page needs it), admin write — see firestore.rules.
const conferenceRef = doc(db, 'settings', 'conference');

export const CONFERENCE_CACHE_KEY = 'settings:conference';

export const toIso = (v: unknown, fallback: string) => (v instanceof Timestamp ? v.toDate().toISOString() : fallback);

export const toConfig = (data: DocumentData | undefined): ConferenceConfig => (data ? {
  name: data.name ?? '',
  nameEn: data.nameEn ?? '',
  days: Array.isArray(data.days) ? data.days : [],
  registrationOpen: data.registrationOpen === true,
  registrationClosesAt: toIso(data.registrationClosesAt, DEFAULT_CONFERENCE.registrationClosesAt),
  mediaUploadsCloseAt: toIso(data.mediaUploadsCloseAt, DEFAULT_CONFERENCE.mediaUploadsCloseAt),
} : DEFAULT_CONFERENCE);

export const getConference = () =>
  withOfflineCache(CONFERENCE_CACHE_KEY, async () => toConfig((await getDoc(conferenceRef)).data()));

/** Never cached — the admin page must see what the rules see. */
export const getConferenceFresh = async () => toConfig((await getDoc(conferenceRef)).data());

export const saveConference = (c: ConferenceConfig) =>
  setDoc(conferenceRef, {
    name: c.name.trim(),
    nameEn: c.nameEn.trim(),
    days: [...c.days].sort(),
    registrationOpen: c.registrationOpen,
    registrationClosesAt: Timestamp.fromDate(new Date(c.registrationClosesAt)),
    mediaUploadsCloseAt: Timestamp.fromDate(new Date(c.mediaUploadsCloseAt)),
    updatedAt: serverTimestamp(),
  });

/**
 * The current conference for public pages: the copy saved on this device right away, then the
 * fresh one. `null` only on a first visit while it loads; if it can't load, the 2026 defaults.
 */
export const useConference = () => {
  const { data, error } = useCachedLoad(CONFERENCE_CACHE_KEY, getConference);
  return data ?? (error ? DEFAULT_CONFERENCE : null);
};

