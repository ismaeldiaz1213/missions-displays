import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db } from '../firebase';
import { withOfflineCache } from './missionaries';

export type ConferencePhase = 'upcoming' | 'live' | 'over';
/** `auto` follows the conference dates; the others are set by hand from the admin page. */
export type ConferencePhaseSetting = 'auto' | ConferencePhase;

export interface KioskSettings {
  conferencePhase: ConferencePhaseSetting;
}

export const DEFAULT_KIOSK_SETTINGS: KioskSettings = { conferencePhase: 'auto' };

// Public read (the kiosks need it), admin write — see firestore.rules.
const kioskRef = doc(db, 'settings', 'kiosk');

export const KIOSK_SETTINGS_CACHE_KEY = 'settings:kiosk';

export const getKioskSettings = () =>
  withOfflineCache(KIOSK_SETTINGS_CACHE_KEY, async (): Promise<KioskSettings> => {
    const snap = await getDoc(kioskRef);
    const data = snap.data() ?? {};
    return { ...DEFAULT_KIOSK_SETTINGS, conferencePhase: data.conferencePhase ?? 'auto' };
  });

export const saveKioskSettings = (s: KioskSettings) =>
  setDoc(kioskRef, { conferencePhase: s.conferencePhase, updatedAt: serverTimestamp() });
