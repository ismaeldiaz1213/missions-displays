import {
  Timestamp, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc,
} from 'firebase/firestore/lite';
import { db } from '../firebase';
import { calculateHotelFee, type Registration, type RegistrationInput } from '../Registration/conference';

const registrationsCol = collection(db, 'registrations');

export const CONFERENCE_MEDIA_PREFIX = 'conference-media';

/** Generates the id up front so the page can build the missionary's media-upload link. */
export const newRegistrationId = () => doc(registrationsCol).id;

// Public create — validated and deadline-enforced by firestore.rules.
export const createRegistration = (id: string, input: RegistrationInput) =>
  setDoc(doc(registrationsCol, id), {
    ...input,
    hotelFee: calculateHotelFee(input),
    createdAt: serverTimestamp(),
  });

// Admin-only (enforced by firestore.rules)
export const listRegistrations = async (): Promise<Registration[]> => {
  const snap = await getDocs(registrationsCol);
  return snap.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : '';
    return { ...data, id: d.id, createdAt } as Registration;
  });
};

export const deleteRegistration = (id: string) => deleteDoc(doc(registrationsCol, id));

export const mediaUploadPath = (registrationId: string) => `/conferencia/subir/${registrationId}`;
