import { deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore/lite';
import { db } from '../firebase';

export interface Hotel {
  id: string;
  name: string;
  color: string;
}

export interface HotelSettings {
  hotels: Hotel[];
  /** registration id → hotel id */
  assignments: Record<string, string>;
}

/** Colors an admin can pick; they also show as dots on the PDF, so they need to stay distinct. */
export const HOTEL_COLORS = ['#2563EB', '#16A34A', '#EA580C', '#9333EA', '#DB2777', '#0891B2', '#CA8A04', '#64748B'];

export const DEFAULT_HOTELS: Hotel[] = [1, 2, 3].map((n) => ({ id: `hotel-${n}`, name: `Hotel ${n}`, color: HOTEL_COLORS[n - 1] }));

// Admin only — see firestore.rules.
const hotelsRef = doc(db, 'settings', 'hotels');

export const getHotelSettings = async (): Promise<HotelSettings> => {
  const data = (await getDoc(hotelsRef)).data();
  return { hotels: data?.hotels ?? DEFAULT_HOTELS, assignments: data?.assignments ?? {} };
};

/** Saves the hotel list. Assignments to a hotel that was removed are cleared too. */
export const saveHotels = async (hotels: Hotel[], assignments: Record<string, string>) => {
  const ids = new Set(hotels.map((h) => h.id));
  const kept = Object.fromEntries(Object.entries(assignments).filter(([, h]) => ids.has(h)));
  await setDoc(hotelsRef, { hotels, assignments: kept, updatedAt: serverTimestamp() });
  return kept;
};

/**
 * Puts registrations in a hotel (or takes them out with null). Only touches these registrations'
 * entries, so two admins assigning different people at once don't overwrite each other.
 */
export const assignHotel = async (registrationIds: string[], hotelId: string | null, settings: HotelSettings) => {
  const changes = Object.fromEntries(registrationIds.map((id) => [`assignments.${id}`, hotelId ?? deleteField()]));
  const exists = (await getDoc(hotelsRef)).exists();
  if (!exists) await setDoc(hotelsRef, { hotels: settings.hotels, assignments: {}, updatedAt: serverTimestamp() });
  await updateDoc(hotelsRef, { ...changes, updatedAt: serverTimestamp() });
};
