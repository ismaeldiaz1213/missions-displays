// Past conferences: conferences/{id}, with the registrations in conferences/{id}/registrations.
// Admin only (firestore.rules).
//
// Archiving MOVES a conference out of the way so the Registros and Recogidas tabs start empty for
// the next one. Nothing is lost: each registration is copied into the archive, the copy is read
// back and checked, and only then are the originals removed. Archived years stay readable on the
// admin page; deleting one is a separate, explicit step.
//
// Cost: a registration is ~2 KB, so a few hundred a year is well under 1 MB of Firestore,
// a fraction of a cent per month. The uploaded videos (conference-media/) are what take space;
// archiving leaves them where they are, and deleting an archive can remove them too.
import {
  Timestamp, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, writeBatch,
} from 'firebase/firestore/lite';
import { db } from '../firebase';
import type { ConferenceConfig } from '../Registration/conference';
import { saveConference, toConfig, toIso } from './conference';
import { DEFAULT_HOTELS, getHotelSettings, resetHotelAssignments, type HotelSettings } from './hotels';
import { CONFERENCE_MEDIA_PREFIX, toRegistration } from './registrations';
import { deleteFolder } from './storageFiles';

export interface ArchivedConference extends ConferenceConfig {
  id: string;
  registrationCount: number;
  archivedAt: string;
  archivedBy: string;
  hotels: HotelSettings;
}

const archivesCol = collection(db, 'conferences');
const archivedRegsCol = (id: string) => collection(db, 'conferences', id, 'registrations');
const registrationsCol = collection(db, 'registrations');

export const listArchivedConferences = async (): Promise<ArchivedConference[]> => {
  const snap = await getDocs(archivesCol);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...toConfig(data),
      id: d.id,
      registrationCount: data.registrationCount ?? 0,
      archivedAt: toIso(data.archivedAt, ''),
      archivedBy: data.archivedBy ?? '',
      hotels: { hotels: data.hotels ?? DEFAULT_HOTELS, assignments: data.assignments ?? {} },
    };
  }).sort((a, b) => b.id.localeCompare(a.id));
};

export const listArchivedRegistrations = async (id: string) =>
  (await getDocs(archivedRegsCol(id))).docs.map(toRegistration);

/** The archive's name: the year of its first day, plus a suffix if that year is already archived. */
export const archiveIdFor = (c: ConferenceConfig, taken: string[]) => {
  const base = (c.days[0] ?? new Date().toISOString()).slice(0, 4);
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
};

// Firestore allows 500 writes per batch.
const BATCH = 400;
const inBatches = async <T>(items: T[], write: (batch: ReturnType<typeof writeBatch>, item: T) => void) => {
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = writeBatch(db);
    items.slice(i, i + BATCH).forEach((item) => write(batch, item));
    await batch.commit();
  }
};

export type ArchiveStep = 'copying' | 'checking' | 'clearing' | 'next' | 'done';

/**
 * Moves the current conference's registrations and hotel assignments into conferences/{id},
 * then makes `next` the current conference (registration closed until an admin opens it).
 * Safe to run again if it stops halfway: copies are keyed by registration id, and nothing is
 * removed from registrations/ until every copy has been read back.
 */
export const archiveConference = async (
  id: string, current: ConferenceConfig, next: ConferenceConfig, archivedBy: string,
  onStep: (s: ArchiveStep) => void = () => {},
) => {
  onStep('copying');
  const originals = (await getDocs(registrationsCol)).docs;
  const hotels = await getHotelSettings();
  await inBatches(originals, (b, d) => b.set(doc(archivedRegsCol(id), d.id), d.data()));

  onStep('checking');
  const copied = new Set((await getDocs(archivedRegsCol(id))).docs.map((d) => d.id));
  const missing = originals.filter((d) => !copied.has(d.id));
  if (missing.length) throw new Error(`No se copiaron ${missing.length} registros. No se borró nada; intente de nuevo.`);
  await setDoc(doc(archivesCol, id), {
    name: current.name,
    nameEn: current.nameEn,
    days: current.days,
    registrationOpen: false,
    registrationClosesAt: Timestamp.fromDate(new Date(current.registrationClosesAt)),
    mediaUploadsCloseAt: Timestamp.fromDate(new Date(current.mediaUploadsCloseAt)),
    registrationCount: copied.size,
    hotels: hotels.hotels,
    assignments: hotels.assignments,
    archivedAt: serverTimestamp(),
    archivedBy,
  });

  onStep('clearing');
  await inBatches(originals, (b, d) => b.delete(d.ref));
  await resetHotelAssignments(hotels.hotels);

  onStep('next');
  await saveConference({ ...next, registrationOpen: false });
  onStep('done');
};

/**
 * Permanently deletes an archived conference's registrations (and, if asked, the videos they
 * uploaded). There is no undo — the admin page makes them export and type the year first.
 */
export const deleteArchivedConference = async (id: string, withVideos: boolean) => {
  const regs = (await getDocs(archivedRegsCol(id))).docs;
  if (withVideos) {
    for (const r of regs) await deleteFolder(`${CONFERENCE_MEDIA_PREFIX}/${r.id}`);
  }
  await inBatches(regs, (b, d) => b.delete(d.ref));
  await deleteDoc(doc(archivesCol, id));
};
