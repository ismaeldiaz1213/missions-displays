import {
  Timestamp, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore/lite';
import { db } from '../firebase';
import type { ContactInfo, Missionary } from '../types';
import { copyFile, listFiles, removeFile, type StoredFile } from './storageFiles';
import { saveDraft } from './missionaries';

const requestsCol = collection(db, 'missionaryRequests');

export const CONTINENT_IDS = [
  'north-america', 'central-america', 'south-america', 'europe', 'africa', 'asia', 'oceania',
] as const;
export type ContinentId = (typeof CONTINENT_IDS)[number];

// Upload limits — keep in sync with storage.rules (missionary-requests/)
export const REQUEST_FILE_KINDS = ['profile', 'prayer-letter', 'gallery'] as const;
export type RequestFileKind = (typeof REQUEST_FILE_KINDS)[number];
export const REQUEST_LIMITS = {
  imageBytes: 20 * 1024 * 1024,
  pdfBytes: 50 * 1024 * 1024,
  videoBytes: 1024 * 1024 * 1024,
};

export type RequestStatus = 'pending' | 'approved' | 'rejected';

/** Contact details the missionary agreed to show on their public page (all optional). */
export interface PublicContact {
  email: string;
  phone: string;
  website: string;
  facebook: string;
  instagram: string;
}

export interface MissionaryRequestInput {
  language: 'es' | 'en';
  // Private — for the church to reach them
  name: string;
  lastName: string;
  wifeName: string;
  email: string;
  phone: string;
  // Page content
  organization: string;
  sendingChurch: string;
  missionType: string;
  startYear: string;
  continent: ContinentId;
  city: string;
  state: string;
  country: string;
  description: string;
  prayerRequests: string;
  contact: PublicContact;
}

export interface MissionaryRequest extends MissionaryRequestInput {
  id: string;
  status: RequestStatus;
  createdAt: string;
  draftId?: string;
}

export const newRequestId = () => doc(requestsCol).id;

export const requestFilesPrefix = (id: string, kind: RequestFileKind) => `missionary-requests/${id}/${kind}`;

// Public create — validated by firestore.rules
export const createMissionaryRequest = (id: string, input: MissionaryRequestInput) =>
  setDoc(doc(requestsCol, id), { ...input, status: 'pending', createdAt: serverTimestamp() });

// ── Admin-only (enforced by firestore.rules / storage.rules) ─────────────────

export const listMissionaryRequests = async (): Promise<MissionaryRequest[]> => {
  const snap = await getDocs(requestsCol);
  return snap.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : '';
    return { ...data, id: d.id, createdAt } as MissionaryRequest;
  });
};

export const listRequestFiles = async (id: string): Promise<Record<RequestFileKind, StoredFile[]>> => {
  const [profile, prayerLetter, gallery] = await Promise.all(REQUEST_FILE_KINDS.map((k) => listFiles(requestFilesPrefix(id, k))));
  return { profile, 'prayer-letter': prayerLetter, gallery };
};

export const setRequestStatus = (id: string, status: RequestStatus) =>
  updateDoc(doc(requestsCol, id), { status });

/** Deletes the request and the files the missionary uploaded with it (approved pages keep their own copies). */
export const deleteMissionaryRequest = async (id: string) => {
  const files = await listRequestFiles(id);
  await Promise.allSettled(Object.values(files).flat().map((f) => removeFile(f.path)));
  await deleteDoc(doc(requestsCol, id));
};

const extension = (name: string, fallback: string) => {
  const m = /\.([a-z0-9]{1,5})$/i.exec(name);
  return m ? m[1].toLowerCase() : fallback;
};

/** Best-effort coordinates for the map pin (OpenStreetMap). The admin can correct them before publishing. */
const geocode = async (r: MissionaryRequestInput) => {
  try {
    const q = [r.city, r.state, r.country].filter(Boolean).join(', ');
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? { latitude: Number(hit.lat), longitude: Number(hit.lon) } : { latitude: 0, longitude: 0 };
  } catch {
    return { latitude: 0, longitude: 0 };
  }
};

/**
 * Turns a request into an unpublished draft page: copies the uploaded files into the public
 * images/ pdfs/ videos/ folders, saves missionaryDrafts/{id}, and marks the request approved.
 */
export const approveMissionaryRequest = async (
  r: MissionaryRequest,
  onStep: (label: string) => void = () => {},
): Promise<Missionary> => {
  const id = r.draftId ?? crypto.randomUUID();
  onStep('Leyendo archivos…');
  const files = await listRequestFiles(r.id);

  const profile = files.profile[files.profile.length - 1];
  let profileImage = '';
  if (profile) {
    onStep('Copiando foto de perfil…');
    profileImage = await copyFile(profile.path, `images/${id}-profile.${extension(profile.name, 'jpg')}`, profile.contentType);
  }

  const letter = files['prayer-letter'][files['prayer-letter'].length - 1];
  let prayerLetter = '';
  if (letter) {
    onStep('Copiando carta de oración…');
    prayerLetter = await copyFile(letter.path, `pdfs/${id}-prayer-letter.pdf`, 'application/pdf');
  }

  const media: Missionary['media'] = [];
  for (const [i, f] of files.gallery.entries()) {
    onStep(`Copiando galería ${i + 1} de ${files.gallery.length}…`);
    const isVideo = f.contentType.startsWith('video/');
    const folder = isVideo ? 'videos' : 'images';
    const path = await copyFile(f.path, `${folder}/${id}-media-${Date.now()}-${i}.${extension(f.name, isVideo ? 'mp4' : 'jpg')}`, f.contentType);
    media.push({ url: path });
  }

  onStep('Buscando ubicación en el mapa…');
  const coords = await geocode(r);

  const contactInfo: ContactInfo[] = (['email', 'phone', 'website', 'facebook', 'instagram'] as const)
    .filter((type) => r.contact[type]?.trim())
    .map((type) => ({ type, value: r.contact[type].trim() }));

  const draft: Missionary = {
    id,
    name: r.wifeName ? `${r.name} y ${r.wifeName}` : r.name,
    lastName: r.lastName,
    organization: r.organization,
    continent: r.continent,
    location: { city: r.city, state: r.state, country: r.country, ...coords },
    profileImage,
    description: r.description,
    prayerLetter,
    media,
    contactInfo,
    specialNotes: r.prayerRequests,
    startDate: r.startYear,
    missionType: r.missionType,
  };

  onStep('Guardando borrador…');
  await saveDraft(draft);
  await updateDoc(doc(requestsCol, r.id), { status: 'approved', draftId: id });
  return draft;
};
