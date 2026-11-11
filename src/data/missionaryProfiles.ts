import { Timestamp, collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db } from '../firebase';
import type { Missionary } from '../types';

// Private information about a missionary, kept apart from their public page (missionaries/{id})
// so the kiosk never sees it. One missionaryProfiles/{id} per missionary, same id as the page.
// Admin-only in firestore.rules.
const profilesCol = collection(db, 'missionaryProfiles');

export const CONTACT_METHODS = ['email', 'whatsapp', 'phone', 'text', 'other'] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const CONTACT_METHOD_LABELS: Record<ContactMethod, { es: string; en: string }> = {
  email: { es: 'Correo electrónico', en: 'Email' },
  whatsapp: { es: 'WhatsApp', en: 'WhatsApp' },
  phone: { es: 'Llamada telefónica', en: 'Phone call' },
  text: { es: 'Mensaje de texto', en: 'Text message' },
  other: { es: 'Otro', en: 'Other' },
};

export interface MissionaryProfile {
  id: string;
  email: string;
  phone: string;
  preferredContact: ContactMethod | '';
  /** e.g. "Facebook Messenger" when preferredContact is 'other', or a best time to call. */
  preferredContactNote: string;
  language: 'es' | 'en';
  spouseName: string;
  sendingChurch: string;
  /** Internal notes for the church staff; never shown to the missionary. */
  notes: string;
  /** Page request this profile came from, if any. */
  requestId: string;
  /** Lower-case email the missionary signs in with (kept equal to `email`). */
  ownerEmail?: string;
  invitedAt?: string;
  invitedBy?: string;
  /** The page change they are working on in the portal (missionaryEdits/{id}). */
  openEditId?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type ProfileInput = Omit<MissionaryProfile, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'ownerEmail' | 'invitedAt' | 'invitedBy' | 'openEditId'>;

const INPUT_KEYS: (keyof ProfileInput)[] = [
  'email', 'phone', 'preferredContact', 'preferredContactNote', 'language', 'spouseName', 'sendingChurch', 'notes', 'requestId',
];

export const emptyProfile = (): ProfileInput => ({
  email: '', phone: '', preferredContact: '', preferredContactNote: '', language: 'es',
  spouseName: '', sendingChurch: '', notes: '', requestId: '',
});

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : '');

export const listProfiles = async (): Promise<MissionaryProfile[]> => {
  const snap = await getDocs(profilesCol);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...emptyProfile(), ...data, id: d.id, createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt), invitedAt: iso(data.invitedAt),
    } as MissionaryProfile;
  });
};

/** Creates or updates the profile; only the fields passed are changed. `by` is who made the change. */
export const saveProfile = (id: string, fields: Partial<ProfileInput>, by: string, isNew = false) => {
  // Only the editable fields: never write back timestamps or ids that came in with the profile.
  const picked = Object.fromEntries(INPUT_KEYS.filter((k) => fields[k] !== undefined).map((k) => [k, fields[k]]));
  // The email is also how the missionary signs in to their page.
  const owner = typeof fields.email === 'string' ? { ownerEmail: fields.email.trim().toLowerCase() } : {};
  return setDoc(doc(profilesCol, id), {
    ...picked,
    ...owner,
    ...(isNew ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
    updatedBy: by,
  }, { merge: true });
};

// ── Completeness ("Perfil completo" vs "Básico") ─────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

export const publicContact = (m: Missionary, type: 'email' | 'phone') =>
  m.contactInfo?.find((c) => c.type === type)?.value?.trim() ?? '';

/** The best email to write to: the private one, else the one on their public page. */
export const contactEmail = (m: Missionary, p: MissionaryProfile | null) => {
  const e = p?.email?.trim() || publicContact(m, 'email');
  return isEmail(e) ? e : '';
};

export const contactPhone = (m: Missionary, p: MissionaryProfile | null) =>
  p?.phone?.trim() || publicContact(m, 'phone');

export type MissingField = 'contactMethod' | 'emailOrPhone' | 'city' | 'country' | 'mapPin' | 'organization';

export const MISSING_LABELS: Record<MissingField, { es: string; en: string }> = {
  contactMethod: { es: 'Método de contacto preferido', en: 'Preferred contact method' },
  emailOrPhone: { es: 'Correo o teléfono privado', en: 'Private email or phone' },
  city: { es: 'Ciudad', en: 'City' },
  country: { es: 'País', en: 'Country' },
  mapPin: { es: 'Ubicación en el mapa', en: 'Map location' },
  organization: { es: 'Organización', en: 'Organization' },
};

/** What still needs filling in before the profile counts as complete. */
export const missingFields = (m: Missionary, p: MissionaryProfile | null): MissingField[] => {
  const out: MissingField[] = [];
  if (!p?.preferredContact) out.push('contactMethod');
  if (!(p?.email?.trim() || p?.phone?.trim())) out.push('emailOrPhone');
  if (!m.location?.city?.trim()) out.push('city');
  if (!m.location?.country?.trim()) out.push('country');
  if (!m.location || (m.location.latitude === 0 && m.location.longitude === 0)) out.push('mapPin');
  if (!m.organization?.trim()) out.push('organization');
  return out;
};
