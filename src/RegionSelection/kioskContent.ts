// Text for the map page's "Conferencia" and "Acerca de este sitio" panels. Edit freely.
// This is the 2026 conference's text; its dates come from CONFERENCE_DAYS in src/Registration/conference.ts
// and the schedule from src/Conference/conferenceContent.ts. (Registration dates for later years are set on
// the admin page instead; a new year's kiosk card still needs those two files plus the text below.)

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

/** Shown on the map so nobody thinks the map is the full list. Update the number as it changes. */
export const COVERAGE = {
  title: 'Apoyamos a más de 110 misioneros',
  body: 'Estamos agregando sus páginas poco a poco. Le invitamos a visitar el mapa nuevamente durante la conferencia y en los próximos días.',
  short: 'Apoyamos a más de 110 misioneros. Estamos agregando sus páginas poco a poco.',
};

const CONTACT_EMAIL = 'diazismael@iblibertad.com';

export const ABOUT = {
  title: 'Acerca de este sitio',
  body: [
    'Este sitio presenta a los misioneros que la Iglesia Bautista Libertad apoya alrededor del mundo. ' +
      'Su propósito es que nuestra congregación los conozca, ore por ellos y los apoye en la obra que el Señor les ha encomendado.',
    'Actualmente apoyamos a más de 110 misioneros. Estamos agregando sus páginas poco a poco, por lo que algunos ' +
      'todavía no aparecen en el mapa. Le invitamos a visitarlo nuevamente en las próximas semanas.',
    'Toque un continente para ver a los misioneros que sirven allí, o la foto de un misionero para conocer su ministerio, ' +
      'ver fotografías y videos, y leer su carta de oración más reciente. También puede consultar este sitio desde su ' +
      'teléfono en misiones.iblibertad.org.',
  ],
  sections: [
    {
      title: 'Versión de prueba',
      body:
        'Este sitio se encuentra en fase de prueba, por lo que es posible que encuentre algunos errores. Agradecemos su paciencia. ' +
        `Si tiene comentarios o sugerencias, puede escribir a ${CONTACT_EMAIL}.`,
    },
    {
      title: '¿Le interesa para su iglesia?',
      body:
        'Este sitio es un proyecto de servicio desarrollado con dedicación para nuestra iglesia. Si desea algo similar para su ' +
        `congregación, escriba a ${CONTACT_EMAIL} y con gusto conversaremos los detalles.`,
    },
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
