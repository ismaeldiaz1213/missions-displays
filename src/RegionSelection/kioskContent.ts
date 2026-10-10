// Text for the map page's "Conferencia" and "Acerca de este sitio" panels. Edit freely.
// Conference dates come from src/Registration/conference.ts and the schedule from
// src/Conference/conferenceContent.ts, so a new year only needs those two files plus the text below.

import { CONFERENCE_DAYS, CONFERENCE_NAME } from '../Registration/conference';
import type { ConferencePhase, ConferencePhaseSetting } from '../data/settings';

export type { ConferencePhase };

const PREVIEW: Record<string, ConferencePhase> = { antes: 'upcoming', 'en-vivo': 'live', despues: 'over' };

/**
 * Which conference card the map shows. An admin can pick it on the admin page ("Pantallas");
 * on `auto` it follows the kiosk's local date (it's in Houston).
 * Add ?conferencia=antes | en-vivo | despues to the URL to preview each look.
 */
export const conferencePhase = (setting: ConferencePhaseSetting = 'auto', now = new Date()): ConferencePhase => {
  const preview = new URLSearchParams(window.location.search).get('conferencia');
  if (preview && PREVIEW[preview]) return PREVIEW[preview];
  if (setting !== 'auto') return setting;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (today < CONFERENCE_DAYS[0]) return 'upcoming';
  return today <= CONFERENCE_DAYS[CONFERENCE_DAYS.length - 1] ? 'live' : 'over';
};

export const daysUntilConference = (now = new Date()) => {
  const [y, m, d] = CONFERENCE_DAYS[0].split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((start.getTime() - today.getTime()) / 86_400_000);
};

export const CONFERENCE = {
  name: CONFERENCE_NAME,
  dates: '2 – 5 de noviembre de 2026',
  verse: 'Rogad, pues, al Señor de la mies, que envíe obreros a su mies.',
  verseRef: 'Mateo 9:38',
  /** What the theme means, in a sentence or two. */
  themeBody:
    'Este año nuestra conferencia gira en torno a la mies: los campos ya están listos para la cosecha, ' +
    'y el Señor nos manda orar por más obreros. Durante cuatro días escucharemos a misioneros de todo el mundo ' +
    'contar lo que Dios está haciendo en sus campos.',
  /** "¿Cómo puede ayudar?" — one line each. */
  howToHelp: [
    { emoji: '🙏', title: 'Ore', body: 'Por los misioneros, sus familias y por más obreros para la mies.' },
    { emoji: '⛪', title: 'Acompáñenos', body: 'Servicio cada noche a las 7:00 PM (el lunes a las 7:30 PM).' },
    { emoji: '📣', title: 'Invite a alguien', body: 'Comparta la página de la conferencia con su familia y amigos.' },
    { emoji: '🤝', title: 'Conozca a un misionero', body: 'Salúdelos, escuche su historia y pregunte cómo orar por ellos.' },
  ],
  liveTitle: '¡La conferencia es esta semana!',
  liveBody: 'Bienvenidos. Si usted es misionero y aún no tiene su página en este mapa, escanee el código y envíenos su información.',
};

/** After the conference: the "¿Cómo nos fue?" panel. The photos/videos come from PAST_GALLERY in conferenceContent.ts. */
export const RECAP = {
  cardEyebrow: 'Gracias por acompañarnos',
  cardTitle: '¿Cómo nos fue en la conferencia?',
  title: 'Así vivimos la conferencia',
  body:
    'Gracias a todos los que oraron, sirvieron y nos acompañaron. Aquí puede ver fotos y videos de la conferencia. ' +
    'Sigamos orando al Señor de la mies por nuestros misioneros.',
};

export const ABOUT = {
  title: 'Acerca de este sitio',
  body: [
    'Este mapa muestra a los misioneros que la Iglesia Bautista Libertad sostiene alrededor del mundo, ' +
      'para que nuestra congregación pueda conocerlos mejor, orar por ellos y apoyarlos.',
    'Toque un continente para ver a los misioneros que sirven allí, o toque la foto de un misionero para conocer ' +
      'a su familia, ver fotos y videos, leer su carta de oración y saber qué hora es donde viven.',
    'En la página de cada misionero hay un código QR para llevarla en su teléfono.',
  ],
  thanksTitle: 'Agradecimientos',
  thanks: [
    'Nuestro Salvador — El Señor Jesucristo',
    'El Pastor Roy Carrizales',
    'Los miembros de la Iglesia Bautista Libertad',
  ],
  missionaryTitle: '¿Es usted misionero?',
  missionaryBody: 'Envíenos su información y fotos para crear su página en este mapa.',
};
