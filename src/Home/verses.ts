// Verses for the welcome screen — Reina-Valera 1960. Edit freely; keep RV1960 for Spanish.

export interface Verse { text: string; ref: string }

/** Opens every loop, over Houston. */
export const OPENING_VERSE: Verse = {
  text: 'Y les dijo: Id por todo el mundo y predicad el evangelio a toda criatura.',
  ref: 'Marcos 16:15',
};

/** One of these plays (with a full turn of the globe) every few missionaries, in order. */
export const INTERLUDE_VERSES: Verse[] = [
  {
    text: 'Pero recibiréis poder, cuando haya venido sobre vosotros el Espíritu Santo, y me seréis testigos en Jerusalén, en toda Judea, en Samaria, y hasta lo último de la tierra.',
    ref: 'Hechos 1:8',
  },
  { text: 'Proclamad entre las naciones su gloria, en todos los pueblos sus maravillas.', ref: 'Salmos 96:3' },
  {
    text: 'Después oí la voz del Señor, que decía: ¿A quién enviaré, y quién irá por nosotros? Entonces respondí yo: Heme aquí, envíame a mí.',
    ref: 'Isaías 6:8',
  },
  { text: 'Rogad, pues, al Señor de la mies, que envíe obreros a su mies.', ref: 'Mateo 9:38' },
];

/** Closes the loop back at the church, with how people can help. */
export const CLOSING_VERSE: Verse = {
  text: '¿Y cómo predicarán si no fueren enviados? Como está escrito: ¡Cuán hermosos son los pies de los que anuncian la paz, de los que anuncian buenas nuevas!',
  ref: 'Romanos 10:15',
};

export const HOW_TO_HELP = [
  { emoji: '🙏', title: 'Ore', body: 'por nuestros misioneros y sus familias' },
  { emoji: '🤝', title: 'Apoye', body: 'la obra misionera de nuestra iglesia' },
  { emoji: '✈️', title: 'Vaya', body: '¿lo está llamando Dios a usted?' },
];
