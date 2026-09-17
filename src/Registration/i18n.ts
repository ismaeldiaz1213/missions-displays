import { useEffect, useState } from 'react';
import type { Category, Transport } from './conference';

export type Lang = 'es' | 'en';

export const LOCALES: Record<Lang, string> = { es: 'es-ES', en: 'en-US' };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const es = {
  language: 'Idioma',
  churchName: 'Iglesia Bautista Libertad',
  conferenceName: 'Conferencia de Misiones 2026',
  registerUntil: (date: string) => `Registro hasta el ${date}`,
  lastDay: 'último día',
  daysLeft: (n: number) => `quedan ${plural(n, 'día', 'días')}`,

  closedTitle: 'El registro está cerrado',
  closedBody: (date: string) => `La fecha límite para registrarse fue el ${date}. Si tiene preguntas, comuníquese con la oficina de la iglesia.`,

  successTitle: (name: string) => `¡Registro recibido${name ? `, ${name}` : ''}!`,
  successBody: (conf: string) => `Gracias por registrarse para la ${conf}. Nos comunicaremos con usted para confirmar los detalles de hospedaje y transporte.`,
  successFee: 'Costo estimado de hotel:',
  successFeeNote: '— no se cobra nada ahora.',
  registerAnother: 'Registrar a otra persona',

  mediaTitle: '¿Tiene videos o fotos de su ministerio?',
  mediaBody: 'Súbalos aquí para presentarlos durante la conferencia. Guarde este enlace para volver a subir más adelante.',
  mediaButton: 'Subir videos y fotos',
  copyLink: 'Copiar enlace',
  linkCopied: 'Enlace copiado',

  uploadTitle: 'Videos y fotos de su ministerio',
  uploadIntro: 'Suba videos o fotos para presentarlos durante la conferencia. Puede volver a este enlace y subir más archivos cuando quiera.',
  uploadClosesOn: (date: string) => `Puede subir archivos hasta el ${date}.`,
  uploadDrop: 'Arrastre archivos aquí o haga clic para seleccionar',
  uploadLimits: 'Videos o imágenes · hasta 2 GB por archivo',
  uploadStart: 'Subir archivos',
  uploadDone: 'Subido',
  uploadFailed: 'Error',
  uploadAllDone: '¡Gracias! Sus archivos fueron recibidos.',
  uploadInvalidType: (name: string) => `${name}: solo se aceptan videos o imágenes.`,
  uploadTooLarge: (name: string) => `${name}: el archivo supera 2 GB.`,
  uploadDenied: 'No se pudo subir. El enlace no es válido o el periodo para subir archivos terminó.',
  uploadClosedTitle: 'El periodo para subir archivos terminó',
  uploadClosedBody: 'Si aún necesita enviar material, comuníquese con la oficina de la iglesia.',
  keepPageOpen: 'Mantenga esta página abierta hasta que terminen las subidas.',

  participationTitle: '¿Cómo participa?',
  participationSub: 'Seleccione la categoría que mejor lo describe.',
  categories: {
    missionary: { label: 'Misionero', description: 'Sin costo de hotel' },
    pastor: { label: 'Pastor', description: 'Pastor de iglesia local' },
    evangelist: { label: 'Evangelista', description: 'Ministerio de evangelismo' },
    layman: { label: 'Laico', description: 'Miembro de iglesia' },
  } as Record<Category, { label: string; description: string }>,
  missionaryBoard: 'Junta misionera / Clearing house',
  sendingChurch: 'Iglesia enviadora',

  yourInfo: 'Su información',
  person: {
    firstName: 'Nombre', lastName: 'Apellidos', email: 'Correo electrónico', phone: 'Teléfono', church: 'Iglesia',
    street: 'Dirección', city: 'Ciudad', state: 'Estado', zip: 'Código postal', country: 'País',
  },

  familyTitle: 'Familia',
  familySub: 'Díganos quién le acompañará.',
  spouseQuestion: '¿Viene su cónyuge a la conferencia?',
  spouseYes: 'Sí, viene',
  yes: 'Sí',
  no: 'No',
  spouseInfo: 'Información del cónyuge',
  sameAddress: 'Misma dirección que la mía',
  childrenQuestion: '¿Traerá niños?',
  childrenCount: '¿Cuántos niños?',
  infants: 'Bebés (0–2 años)',
  ages: 'Edades',
  agesPlaceholder: 'Ej. 1, 5, 9',
  childrenNotes: 'Necesidades de los niños (cuna, alergias, etc.)',

  daysTitle: 'Días de asistencia',
  daysSubMissionary: 'Seleccione los días que estará presente.',
  daysSub: (fee: number) => `Seleccione los días que necesitará hotel ($${fee} por persona, por día).`,

  travelTitle: 'Viaje y llegada',
  travelSub: 'Nos ayuda a coordinar transporte y recibimiento.',
  howArrive: '¿Cómo llegará?',
  transport: { plane: 'Avión', bus: 'Autobús', car: 'Automóvil', other: 'Otro' } as Record<Transport, string>,
  airline: 'Aerolínea',
  flightNumber: 'Número de vuelo',
  flightPlaceholder: 'Ej. AA 1234',
  airport: 'Aeropuerto de llegada',
  busCompany: 'Línea de autobús',
  busStation: 'Estación de llegada',
  arrivalDate: 'Fecha de llegada',
  arrivalTime: 'Hora estimada',
  departureDate: 'Fecha de salida',
  pickupQuestion: (t: Transport | ''): string =>
    t === 'plane' ? '¿Necesita que lo recojan en el aeropuerto?'
      : t === 'bus' ? '¿Necesita que lo recojan en la estación?'
        : '¿Necesita que lo recojan?',
  pickupYes: 'Sí, por favor',
  pickupNo: 'No es necesario',
  travelNotes: 'Notas de viaje (opcional)',

  moreTitle: 'Algo más',
  moreSub: 'Alergias, necesidades de accesibilidad, peticiones especiales.',
  comments: 'Comentarios (opcional)',

  summary: 'Resumen',
  category: 'Categoría',
  adults: 'Adultos',
  children: 'Niños',
  days: 'Días',
  hotelEstimate: 'Hotel estimado',
  noCost: 'Sin costo',
  missionariesFree: 'Los misioneros no pagan hotel.',
  feeFormula: (fee: number, days: number, adults: number) =>
    `$${fee} × ${plural(days, 'día', 'días')} × ${plural(adults, 'adulto', 'adultos')}`,
  notCharged: 'No se cobra nada ahora. Este registro es solo para planificación.',

  fixErrors: 'Revise los campos marcados en rojo.',
  submit: 'Enviar registro',
  submitError: 'No se pudo enviar el registro. Intente de nuevo.',

  errors: {
    required: 'Requerido',
    invalidEmail: 'Correo inválido',
    selectCategory: 'Seleccione una categoría',
    min1: 'Mínimo 1',
    infantsTooMany: 'No puede ser mayor al total',
    selectDay: 'Seleccione al menos un día',
    selectTransport: 'Seleccione cómo llegará',
  },
};

export type Strings = typeof es;

const en: Strings = {
  language: 'Language',
  churchName: 'Iglesia Bautista Libertad',
  conferenceName: 'Missions Conference 2026',
  registerUntil: (date) => `Register by ${date}`,
  lastDay: 'last day',
  daysLeft: (n) => `${plural(n, 'day', 'days')} left`,

  closedTitle: 'Registration is closed',
  closedBody: (date) => `The registration deadline was ${date}. If you have questions, please contact the church office.`,

  successTitle: (name) => `Registration received${name ? `, ${name}` : ''}!`,
  successBody: (conf) => `Thank you for registering for the ${conf}. We will contact you to confirm lodging and transportation details.`,
  successFee: 'Estimated hotel cost:',
  successFeeNote: '— nothing is charged now.',
  registerAnother: 'Register another person',

  mediaTitle: 'Do you have videos or photos of your ministry?',
  mediaBody: 'Upload them here so we can present them during the conference. Save this link to upload more later.',
  mediaButton: 'Upload videos & photos',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',

  uploadTitle: 'Videos & photos of your ministry',
  uploadIntro: 'Upload videos or photos to be presented during the conference. You can come back to this link and upload more files anytime.',
  uploadClosesOn: (date) => `You can upload files until ${date}.`,
  uploadDrop: 'Drag files here or click to choose',
  uploadLimits: 'Videos or images · up to 2 GB per file',
  uploadStart: 'Upload files',
  uploadDone: 'Uploaded',
  uploadFailed: 'Failed',
  uploadAllDone: 'Thank you! Your files were received.',
  uploadInvalidType: (name) => `${name}: only videos or images are accepted.`,
  uploadTooLarge: (name) => `${name}: the file is larger than 2 GB.`,
  uploadDenied: 'Upload failed. The link is invalid or the upload period has ended.',
  uploadClosedTitle: 'The upload period has ended',
  uploadClosedBody: 'If you still need to send material, please contact the church office.',
  keepPageOpen: 'Keep this page open until the uploads finish.',

  participationTitle: 'How are you participating?',
  participationSub: 'Select the category that best describes you.',
  categories: {
    missionary: { label: 'Missionary', description: 'No hotel cost' },
    pastor: { label: 'Pastor', description: 'Local church pastor' },
    evangelist: { label: 'Evangelist', description: 'Evangelism ministry' },
    layman: { label: 'Layman', description: 'Church member' },
  },
  missionaryBoard: 'Mission board / Clearing house',
  sendingChurch: 'Sending church',

  yourInfo: 'Your information',
  person: {
    firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone', church: 'Church',
    street: 'Street address', city: 'City', state: 'State', zip: 'ZIP code', country: 'Country',
  },

  familyTitle: 'Family',
  familySub: 'Tell us who is coming with you.',
  spouseQuestion: 'Is your spouse attending the conference?',
  spouseYes: 'Yes, attending',
  yes: 'Yes',
  no: 'No',
  spouseInfo: 'Spouse information',
  sameAddress: 'Same address as mine',
  childrenQuestion: 'Will you bring children?',
  childrenCount: 'How many children?',
  infants: 'Infants (0–2 years)',
  ages: 'Ages',
  agesPlaceholder: 'e.g. 1, 5, 9',
  childrenNotes: "Children's needs (crib, allergies, etc.)",

  daysTitle: 'Attendance days',
  daysSubMissionary: 'Select the days you will attend.',
  daysSub: (fee) => `Select the days you will need a hotel ($${fee} per person, per day).`,

  travelTitle: 'Travel & arrival',
  travelSub: 'This helps us coordinate transportation and your welcome.',
  howArrive: 'How will you arrive?',
  transport: { plane: 'Plane', bus: 'Bus', car: 'Car', other: 'Other' },
  airline: 'Airline',
  flightNumber: 'Flight number',
  flightPlaceholder: 'e.g. AA 1234',
  airport: 'Arrival airport',
  busCompany: 'Bus line',
  busStation: 'Arrival station',
  arrivalDate: 'Arrival date',
  arrivalTime: 'Estimated time',
  departureDate: 'Departure date',
  pickupQuestion: (t) =>
    t === 'plane' ? 'Do you need a pickup at the airport?'
      : t === 'bus' ? 'Do you need a pickup at the station?'
        : 'Do you need a pickup?',
  pickupYes: 'Yes, please',
  pickupNo: 'Not needed',
  travelNotes: 'Travel notes (optional)',

  moreTitle: 'Anything else',
  moreSub: 'Allergies, accessibility needs, special requests.',
  comments: 'Comments (optional)',

  summary: 'Summary',
  category: 'Category',
  adults: 'Adults',
  children: 'Children',
  days: 'Days',
  hotelEstimate: 'Estimated hotel',
  noCost: 'No cost',
  missionariesFree: 'Missionaries do not pay for the hotel.',
  feeFormula: (fee, days, adults) => `$${fee} × ${plural(days, 'day', 'days')} × ${plural(adults, 'adult', 'adults')}`,
  notCharged: 'Nothing is charged now. This registration is for planning purposes only.',

  fixErrors: 'Please review the fields marked in red.',
  submit: 'Submit registration',
  submitError: 'We could not submit your registration. Please try again.',

  errors: {
    required: 'Required',
    invalidEmail: 'Invalid email',
    selectCategory: 'Select a category',
    min1: 'At least 1',
    infantsTooMany: 'Cannot exceed the total',
    selectDay: 'Select at least one day',
    selectTransport: 'Select how you will arrive',
  },
};

export const STRINGS: Record<Lang, Strings> = { es, en };

const STORAGE_KEY = 'ibl-reg-lang';

// ?lang=en|es in the link wins, then the last choice on this device, then the browser language.
export const detectLang = (): Lang => {
  const param = new URLSearchParams(window.location.search).get('lang');
  if (param === 'es' || param === 'en') return param;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch { /* storage unavailable */ }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
};

export const saveLang = (lang: Lang) => {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* storage unavailable */ }
};

/** Current form language, persisted on this device and reflected in <html lang> and the tab title. */
export const useLang = (): [Lang, (l: Lang) => void] => {
  const [lang, setLang] = useState<Lang>(detectLang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = STRINGS[lang].conferenceName;
  }, [lang]);
  return [lang, (l) => { setLang(l); saveLang(l); }];
};
