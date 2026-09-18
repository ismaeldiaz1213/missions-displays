import { useEffect, useState } from 'react';
import type { Category, HeardAbout, PickupTransport } from './conference';

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

  // Conference information shown above the form. Days/dates are filled in from CONFERENCE_DAYS.
  infoTitle: 'Información importante',
  infoItems: (firstDay: string, lastDay: string) => [
    `La registración dará inicio a las 3:00 de la tarde del ${firstDay} y posteriormente tendremos una cena a las 5:30 de la tarde. El servicio iniciará a las 7:30 de la noche. Todos aquellos que no se hayan registrado durante ese tiempo lo podrán hacer después del servicio.`,
    `La conferencia termina el ${lastDay} en el servicio por la noche.`,
    'No hay costo por registración. Almuerzo y cena serán provistos durante la conferencia.',
    'No proveemos hospedaje antes o después de la conferencia.',
  ],
  infoVideoNote: 'Misioneros y evangelistas: después de llenar este formulario podrá subir su video de presentación en formato MP4.',

  steps: ['Registro', 'Videos', 'Confirmación'],

  lodgingQuestion: '¿Necesitará hospedaje durante la conferencia?',
  lodgingSub: 'Algunos se quedan con familiares o hacen su propio arreglo.',
  lodgingYes: 'Sí, necesito hospedaje',
  lodgingNo: 'No, me quedo en otro lugar',
  lodging: 'Hospedaje',
  noLodgingNote: 'No se cobra nada porque usted tiene su propio alojamiento.',
  selectLodging: 'Indique si necesita hospedaje',

  selectTransport: 'Seleccione cómo llegará',
  successTitle: (name: string) => `¡Su registro fue enviado${name ? `, ${name}` : ''}!`,
  successBody: (conf: string) => `Gracias por registrarse para la ${conf}. Nos comunicaremos con usted para confirmar los detalles de hospedaje y transporte.`,
  successFee: 'Costo estimado de hotel:',
  successFeeNote: '— no se cobra nada ahora.',
  registerAnother: 'Registrar a otra persona',

  nextStepsTitle: 'Antes de cerrar esta página:',
  stepVideosTitle: 'Guarde su enlace para subir videos',
  stepVideosBody: 'Le sirve para subir o cambiar videos hasta antes de la conferencia.',
  stepPageTitle: 'Ayúdenos a crear su página de misionero',
  stepPageBody: 'Queremos que nuestra iglesia lo conozca y ore por usted. Vea qué necesitamos.',
  stepGo: 'Ver',
  scrollCue: 'Deslice hacia abajo',

  mediaTitle: '¿Necesita subir más videos después?',
  mediaBody: 'Guarde este enlace. Puede usarlo para subir videos hasta antes de la conferencia.',
  mediaLostLink: 'Si pierde este enlace, comuníquese con el hermano Jerry y con gusto se lo enviaremos de nuevo.',
  mediaButton: 'Subir videos',
  copyLink: 'Copiar enlace',
  linkCopied: 'Enlace copiado',

  uploadTitle: 'Video de su ministerio',
  uploadIntro: 'Si desea presentar su ministerio por medio de video, súbalo aquí en formato MP4. No podemos garantizar que su presentación funcione en nuestro sistema si está en otro formato.',
  uploadLater: 'Si todavía no tiene su video listo, puede subirlo más tarde con el enlace que le daremos en la siguiente página.',
  uploadClosesOn: (date: string) => `Puede subir videos hasta el ${date}.`,
  uploadDrop: 'Arrastre sus videos aquí o haga clic para seleccionar',
  uploadLimits: 'Solo videos MP4 · hasta 2 GB por archivo',
  uploadRetry: 'Reintentar',
  uploadDone: 'Subido',
  uploadFailed: 'Error',
  uploadAllDone: '¡Gracias! Sus videos fueron recibidos.',
  uploadInvalidType: (name: string) => `${name}: solo se aceptan videos MP4.`,
  uploadTooLarge: (name: string) => `${name}: el archivo supera 2 GB.`,
  uploadDenied: 'No se pudo subir. El enlace no es válido o el periodo para subir videos terminó.',
  uploadClosedTitle: 'El periodo para subir videos terminó',
  uploadClosedBody: 'Si aún necesita enviar material, comuníquese con la oficina de la iglesia.',
  keepPageOpen: 'Mantenga esta página abierta hasta que terminen las subidas.',
  skipUpload: 'No tengo video por ahora — enviar',
  finish: 'Terminar y enviar',

  participationTitle: '¿Cómo participa?',
  participationSub: 'Seleccione la categoría que mejor lo describe.',
  categories: {
    missionary: { label: 'Misionero', description: 'Sin costo de hotel' },
    evangelist: { label: 'Evangelista', description: 'Sin costo de hotel' },
    pastor: { label: 'Pastor', description: 'Pastor de iglesia local' },
    layman: { label: 'Laico', description: 'Miembro de iglesia' },
  } as Record<Category, { label: string; description: string }>,
  missionaryBoard: 'Junta misionera',
  sendingChurch: 'Iglesia enviadora',

  yourInfo: 'Su información',
  person: {
    firstName: 'Nombre', lastName: 'Apellidos', email: 'Correo electrónico', phone: 'Teléfono',
    street: 'Dirección', city: 'Ciudad', state: 'Estado', zip: 'Código postal', country: 'País',
  },
  homeChurch: 'Iglesia local (donde es miembro)',
  homeChurchCity: 'Ciudad de su iglesia',

  familyTitle: 'Familia',
  familySub: 'Díganos quién le acompañará.',
  wifeQuestion: '¿Viene su esposa con usted?',
  wifeYes: 'Sí, viene',
  yes: 'Sí',
  no: 'No',
  wifeInfo: 'Información de su esposa',
  childrenQuestion: '¿Traerá niños?',
  childrenCount: '¿Cuántos niños?',
  infants: 'Bebés (0–2 años)',
  ages: 'Edades',
  agesPlaceholder: 'Ej. 1, 5, 9',
  childrenNotes: 'Necesidades de los niños',
  childrenNotesPlaceholder: 'Cuna, alergias, etc.',

  daysTitle: 'Días de asistencia',
  daysSubFree: 'Seleccione los días que estará presente.',
  daysSub: (fee: number) => `Seleccione los días que necesitará hotel ($${fee} por persona, por día).`,

  travelTitle: 'Viaje y llegada',
  travelSub: 'Nos ayuda a coordinar quién necesita que lo recojan.',
  pickupQuestion: '¿Necesita que lo recojamos cuando llegue?',
  pickupYes: 'Sí, por favor',
  pickupNo: 'No es necesario',
  transportQuestion: '¿Cómo llegará?',
  transport: { plane: 'Avión', bus: 'Autobús', other: 'Otro' } as Record<PickupTransport, string>,
  flightInfo: 'Información de su vuelo de llegada',
  busInfo: 'Información de su autobús',
  busCompany: 'Línea de autobús',
  busCompanyPlaceholder: 'Ej. Greyhound, FlixBus',
  busStation: 'Estación de llegada',
  otherInfo: 'Información de su llegada',
  transportDetails: '¿Cómo llegará?',
  transportDetailsPlaceholder: 'Ej. Tren, me trae un familiar, etc.',
  pickupLocation: '¿Dónde lo recogemos?',
  airline: 'Aerolínea',
  flightNumber: 'Número de vuelo',
  flightPlaceholder: 'Ej. AA 1234',
  airport: 'Aeropuerto de llegada',
  airportPlaceholder: 'Ej. IAH, HOU',
  arrivalDate: 'Fecha de llegada',
  arrivalTime: 'Hora estimada de llegada',
  approxArrivalDate: 'Fecha aproximada de llegada',
  departureDate: 'Fecha de salida (opcional)',
  rvQuestion: '¿Llegará en RV (casa rodante)?',
  travelNotes: 'Notas de viaje (opcional)',

  moreTitle: 'Algo más',
  moreSub: 'Ayúdenos a conocerle mejor.',
  heardAboutQuestion: '¿Cómo se enteró de la conferencia?',
  heardAbout: {
    pastor: 'Mi pastor / iglesia',
    missionary: 'Un misionero',
    friend: 'Amigo o familiar',
    social: 'Redes sociales',
    website: 'Sitio web de la iglesia',
    attended: 'Asistí antes',
    other: 'Otro',
  } as Record<HeardAbout, string>,
  heardAboutOther: '¿Cómo?',
  comments: 'Comentarios (opcional)',
  commentsPlaceholder: 'Alergias, necesidades especiales, etc.',

  summary: 'Resumen',
  category: 'Categoría',
  adults: 'Adultos',
  children: 'Niños',
  days: 'Días',
  hotelEstimate: 'Hotel estimado',
  noCost: 'Sin costo',
  freeCategoryNote: 'Misioneros y evangelistas no pagan hotel.',
  feeFormula: (fee: number, days: number, adults: number) =>
    `$${fee} × ${plural(days, 'día', 'días')} × ${plural(adults, 'adulto', 'adultos')}`,
  notCharged: 'No se cobra nada ahora. Este registro es solo para planificación.',

  fixErrors: 'Revise los campos marcados en rojo.',
  submit: 'Enviar registro',
  next: 'Siguiente',
  nextHint: 'En el siguiente paso podrá subir su video.',
  submitError: 'No se pudo enviar el registro. Intente de nuevo.',

  errors: {
    required: 'Requerido',
    invalidEmail: 'Correo inválido',
    selectCategory: 'Seleccione una categoría',
    min1: 'Mínimo 1',
    infantsTooMany: 'No puede ser mayor al total',
    selectDay: 'Seleccione al menos un día',
    selectHeardAbout: 'Seleccione una opción',
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

  infoTitle: 'Important information',
  infoItems: (firstDay, lastDay) => [
    `Registration begins at 3:00 PM on ${firstDay}, followed by dinner at 5:30 PM. The service starts at 7:30 PM. Anyone who has not checked in by then may do so after the service.`,
    `The conference ends ${lastDay} with the evening service.`,
    'There is no registration cost. Lunch and dinner will be provided during the conference.',
    'We do not provide lodging before or after the conference.',
  ],
  infoVideoNote: 'Missionaries and evangelists: after completing this form you will be able to upload your presentation video in MP4 format.',

  steps: ['Registration', 'Videos', 'Confirmation'],

  lodgingQuestion: 'Will you need lodging during the conference?',
  lodgingSub: 'Some guests stay with family or make their own arrangements.',
  lodgingYes: 'Yes, I need lodging',
  lodgingNo: 'No, staying elsewhere',
  lodging: 'Lodging',
  noLodgingNote: 'Nothing is charged because you have your own lodging.',
  selectLodging: 'Please tell us if you need lodging',

  selectTransport: 'Select how you will arrive',
  successTitle: (name) => `Your registration was submitted${name ? `, ${name}` : ''}!`,
  successBody: (conf) => `Thank you for registering for the ${conf}. We will contact you to confirm lodging and transportation details.`,
  successFee: 'Estimated hotel cost:',
  successFeeNote: '— nothing is charged now.',
  registerAnother: 'Register another person',

  nextStepsTitle: 'Before you close this page:',
  stepVideosTitle: 'Save your video upload link',
  stepVideosBody: 'Use it to upload or replace videos any time before the conference.',
  stepPageTitle: 'Help us build your missionary page',
  stepPageBody: 'We want our church to know you and pray for you. See what we need.',
  stepGo: 'See',
  scrollCue: 'Scroll down',

  mediaTitle: 'Need to upload more videos later?',
  mediaBody: 'Save this link. You can use it to upload videos until the conference begins.',
  mediaLostLink: "If you lose this link, contact Brother Jerry and we'll gladly send it to you again.",
  mediaButton: 'Upload videos',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',

  uploadTitle: 'Your ministry video',
  uploadIntro: 'If you would like to present your ministry by video, upload it here in MP4 format. We cannot guarantee your presentation will work on our system if it is in another format.',
  uploadLater: "If your video isn't ready yet, you can upload it later using the link we'll give you on the next page.",
  uploadClosesOn: (date) => `You can upload videos until ${date}.`,
  uploadDrop: 'Drag your videos here or click to choose',
  uploadLimits: 'MP4 videos only · up to 2 GB per file',
  uploadRetry: 'Try again',
  uploadDone: 'Uploaded',
  uploadFailed: 'Failed',
  uploadAllDone: 'Thank you! Your videos were received.',
  uploadInvalidType: (name) => `${name}: only MP4 videos are accepted.`,
  uploadTooLarge: (name) => `${name}: the file is larger than 2 GB.`,
  uploadDenied: 'Upload failed. The link is invalid or the upload period has ended.',
  uploadClosedTitle: 'The upload period has ended',
  uploadClosedBody: 'If you still need to send material, please contact the church office.',
  keepPageOpen: 'Keep this page open until the uploads finish.',
  skipUpload: "I don't have a video right now — submit",
  finish: 'Finish & submit',

  participationTitle: 'How are you participating?',
  participationSub: 'Select the category that best describes you.',
  categories: {
    missionary: { label: 'Missionary', description: 'No hotel cost' },
    evangelist: { label: 'Evangelist', description: 'No hotel cost' },
    pastor: { label: 'Pastor', description: 'Local church pastor' },
    layman: { label: 'Layman', description: 'Church member' },
  },
  missionaryBoard: 'Mission board',
  sendingChurch: 'Sending church',

  yourInfo: 'Your information',
  person: {
    firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone',
    street: 'Street address', city: 'City', state: 'State', zip: 'ZIP code', country: 'Country',
  },
  homeChurch: 'Home church',
  homeChurchCity: 'Home church city',

  familyTitle: 'Family',
  familySub: 'Tell us who is coming with you.',
  wifeQuestion: 'Is your wife coming with you?',
  wifeYes: 'Yes, she is',
  yes: 'Yes',
  no: 'No',
  wifeInfo: "Your wife's information",
  childrenQuestion: 'Will you bring children?',
  childrenCount: 'How many children?',
  infants: 'Infants (0–2 years)',
  ages: 'Ages',
  agesPlaceholder: 'e.g. 1, 5, 9',
  childrenNotes: "Children's needs",
  childrenNotesPlaceholder: 'Crib, allergies, etc.',

  daysTitle: 'Attendance days',
  daysSubFree: 'Select the days you will attend.',
  daysSub: (fee) => `Select the days you will need a hotel ($${fee} per person, per day).`,

  travelTitle: 'Travel & arrival',
  travelSub: 'This helps us coordinate who needs to be picked up.',
  pickupQuestion: 'Do you need us to pick you up when you arrive?',
  pickupYes: 'Yes, please',
  pickupNo: 'Not needed',
  transportQuestion: 'How will you arrive?',
  transport: { plane: 'Plane', bus: 'Bus', other: 'Other' },
  flightInfo: 'Your arrival flight',
  busInfo: 'Your bus',
  busCompany: 'Bus line',
  busCompanyPlaceholder: 'e.g. Greyhound, FlixBus',
  busStation: 'Arrival station',
  otherInfo: 'Your arrival',
  transportDetails: 'How are you arriving?',
  transportDetailsPlaceholder: 'e.g. Train, a relative is dropping me off, etc.',
  pickupLocation: 'Where should we pick you up?',
  airline: 'Airline',
  flightNumber: 'Flight number',
  flightPlaceholder: 'e.g. AA 1234',
  airport: 'Arrival airport',
  airportPlaceholder: 'e.g. IAH, HOU',
  arrivalDate: 'Arrival date',
  arrivalTime: 'Estimated arrival time',
  approxArrivalDate: 'Approximate arrival date',
  departureDate: 'Departure date (optional)',
  rvQuestion: 'Are you arriving in an RV?',
  travelNotes: 'Travel notes (optional)',

  moreTitle: 'Anything else',
  moreSub: 'Help us get to know you.',
  heardAboutQuestion: 'How did you hear about the conference?',
  heardAbout: {
    pastor: 'My pastor / church',
    missionary: 'A missionary',
    friend: 'Friend or family',
    social: 'Social media',
    website: 'Church website',
    attended: 'I attended before',
    other: 'Other',
  },
  heardAboutOther: 'How?',
  comments: 'Comments (optional)',
  commentsPlaceholder: 'Allergies, special needs, etc.',

  summary: 'Summary',
  category: 'Category',
  adults: 'Adults',
  children: 'Children',
  days: 'Days',
  hotelEstimate: 'Estimated hotel',
  noCost: 'No cost',
  freeCategoryNote: 'Missionaries and evangelists do not pay for the hotel.',
  feeFormula: (fee, days, adults) => `$${fee} × ${plural(days, 'day', 'days')} × ${plural(adults, 'adult', 'adults')}`,
  notCharged: 'Nothing is charged now. This registration is for planning purposes only.',

  fixErrors: 'Please review the fields marked in red.',
  submit: 'Submit registration',
  next: 'Next',
  nextHint: 'On the next step you can upload your video.',
  submitError: 'We could not submit your registration. Please try again.',

  errors: {
    required: 'Required',
    invalidEmail: 'Invalid email',
    selectCategory: 'Select a category',
    min1: 'At least 1',
    infantsTooMany: 'Cannot exceed the total',
    selectDay: 'Select at least one day',
    selectHeardAbout: 'Select an option',
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
export const useLang = (pageTitle?: Record<Lang, string>): [Lang, (l: Lang) => void] => {
  const [lang, setLang] = useState<Lang>(detectLang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = pageTitle?.[lang] ?? STRINGS[lang].conferenceName;
  }, [lang, pageTitle]);
  return [lang, (l) => { setLang(l); saveLang(l); }];
};
