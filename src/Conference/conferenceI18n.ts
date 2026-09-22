import type { Lang } from '../Registration/i18n';

const es = {
  pageTitle: 'Conferencia y Escuela de Misiones 2026',

  church: 'Iglesia Bautista Libertad',
  city: 'Houston, Texas',
  title: 'Conferencia y Escuela de Misiones',
  dates: '2 – 5 de noviembre de 2026',
  posterAlt: 'Conferencia y Escuela de Misiones 2026 — 2 al 5 de noviembre, Iglesia Bautista Libertad, Houston, Texas',

  register: 'Regístrese',
  registerLong: 'Regístrese en línea',
  seeSchedule: 'Ver el horario',
  daysLeft: (n: number) => (n === 1 ? 'Último día para registrarse' : `Faltan ${n} días para cerrar el registro`),
  closed: 'El registro en línea ya cerró',

  verse: 'Rogad, pues, al Señor de la mies, que envíe obreros a su mies.',
  verseRef: 'Mateo 9:38',

  inviteLabel: 'Invitación 2026',
  inviteTitle: 'Le invitamos',
  inviteBody: 'Un mensaje de invitación para la conferencia de este año.',
  videoPlay: 'Reproducir el video',

  galleryLabel: 'Conferencias anteriores',
  galleryTitle: 'Así vivimos la conferencia',
  galleryBody: 'Fotos y videos de años anteriores. Deslice para ver más.',
  galleryPrev: 'Anterior',
  galleryNext: 'Siguiente',

  scheduleLabel: 'Horario',
  scheduleTitle: 'Cuatro días en la mies',
  scheduleBody: 'De lunes a jueves. Las comidas están incluidas para todos nuestros invitados.',
  scheduleItems: {
    packetPickup: 'Entrega de paquetes de registro',
    dinner: 'Cena',
    lunch: 'Almuerzo',
    firstService: 'Primer servicio',
    service: 'Servicio',
    sessions: 'Servicio y sesiones',
  } as Record<string, string>,
  scheduleNote: 'La conferencia termina el jueves por la noche con el servicio final.',

  infoLabel: 'Información',
  infoTitle: 'Lo que necesita saber',
  info: [
    {
      title: 'Registro',
      body: 'El registro en línea ya está abierto. No hay ningún costo por asistir. Si no alcanza a registrarse en línea, puede hacerlo en persona el lunes de 12 PM a 6 PM.',
    },
    {
      title: 'Hospedaje',
      body: 'Los invitados registrados tienen habitación reservada. Quienes se registren en persona el lunes recibirán habitación según disponibilidad. Si ya tiene dónde quedarse, indíquelo en el formulario.',
    },
    {
      title: 'Comidas',
      body: 'Almuerzo y cena se sirven en la iglesia durante la conferencia, sin costo para nuestros invitados.',
    },
    {
      title: 'Presentaciones',
      body: 'Misioneros y evangelistas: después de registrarse podrá subir su video de presentación en formato MP4 desde el mismo sitio, sin necesidad de traer una memoria USB.',
    },
  ],

  ctaTitle: '¿Nos acompaña este año?',
  ctaBody: 'Regístrese en línea para que le reservemos su habitación y podamos planear su transporte desde el aeropuerto.',

  footerNote: 'Iglesia Bautista Libertad · Houston, Texas',
  footerSite: 'Sitio de la iglesia',
  footerMissionaries: 'Nuestros misioneros',
};

export type ConferenceStrings = typeof es;

const en: ConferenceStrings = {
  pageTitle: 'Missions Conference & School 2026',

  church: 'Iglesia Bautista Libertad',
  city: 'Houston, Texas',
  title: 'Missions Conference & School',
  dates: 'November 2 – 5, 2026',
  posterAlt: 'Missions Conference & School 2026 — November 2–5, Iglesia Bautista Libertad, Houston, Texas',

  register: 'Register',
  registerLong: 'Register online',
  seeSchedule: 'See the schedule',
  daysLeft: (n) => (n === 1 ? 'Last day to register' : `${n} days left to register`),
  closed: 'Online registration has closed',

  verse: 'Pray ye therefore the Lord of the harvest, that he will send forth labourers into his harvest.',
  verseRef: 'Matthew 9:38',

  inviteLabel: '2026 Invitation',
  inviteTitle: "You're invited",
  inviteBody: "A message inviting you to this year's conference.",
  videoPlay: 'Play the video',

  galleryLabel: 'Past conferences',
  galleryTitle: 'What the conference is like',
  galleryBody: 'Photos and videos from previous years. Swipe to see more.',
  galleryPrev: 'Previous',
  galleryNext: 'Next',

  scheduleLabel: 'Schedule',
  scheduleTitle: 'Four days in the harvest',
  scheduleBody: 'Monday through Thursday. Meals are provided for all of our guests.',
  scheduleItems: {
    packetPickup: 'Registration packet pickup',
    dinner: 'Dinner',
    lunch: 'Lunch',
    firstService: 'First service',
    service: 'Service',
    sessions: 'Service & sessions',
  },
  scheduleNote: 'The conference ends Thursday evening with the closing service.',

  infoLabel: 'Information',
  infoTitle: 'What you need to know',
  info: [
    {
      title: 'Registration',
      body: 'Online registration is open, and there is no cost to attend. If you miss the online deadline, you can register in person on Monday from 12 PM to 6 PM.',
    },
    {
      title: 'Lodging',
      body: "Registered guests have a room reserved. Those who register in person on Monday are assigned a room based on availability. If you already have a place to stay, just tell us on the form.",
    },
    {
      title: 'Meals',
      body: 'Lunch and dinner are served at the church throughout the conference, at no cost to our guests.',
    },
    {
      title: 'Presentations',
      body: 'Missionaries and evangelists: after registering you can upload your presentation video in MP4 format right from this site — no USB drive needed.',
    },
  ],

  ctaTitle: 'Will you join us this year?',
  ctaBody: 'Register online so we can reserve your room and plan your ride from the airport.',

  footerNote: 'Iglesia Bautista Libertad · Houston, Texas',
  footerSite: 'Church website',
  footerMissionaries: 'Our missionaries',
};

export const CONFERENCE_STRINGS: Record<Lang, ConferenceStrings> = { es, en };
export const CONFERENCE_PAGE_TITLES: Record<Lang, string> = { es: es.pageTitle, en: en.pageTitle };

/** Weekday + day number for a conference date, e.g. "lunes" / "2". */
export const dayParts = (iso: string, locale: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return {
    weekday: d.toLocaleDateString(locale, { weekday: 'long' }),
    short: d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''),
    day: d.toLocaleDateString(locale, { day: 'numeric' }),
    month: d.toLocaleDateString(locale, { month: 'short' }).replace('.', ''),
  };
};
