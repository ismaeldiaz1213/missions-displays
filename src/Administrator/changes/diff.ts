import type { ContactInfo, Missionary } from '../../types';
import type { ProposedPage } from '../../data/missionaryEdits';

// What a proposed page changes compared with the published one, field by field.

export type Part = { text: string; kind: 'same' | 'added' | 'removed' };

/** Word-level difference between two texts (longest common subsequence). */
export const textDiff = (before: string, after: string): Part[] => {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  if (a.length * b.length > 4_000_000) return [{ text: before, kind: 'removed' }, { text: after, kind: 'added' }];
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  }
  const out: Part[] = [];
  const push = (text: string, kind: Part['kind']) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text; else out.push({ text, kind });
  };
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push(a[i], 'same'); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) push(a[i++], 'removed');
    else push(b[j++], 'added');
  }
  while (i < a.length) push(a[i++], 'removed');
  while (j < b.length) push(b[j++], 'added');
  return out;
};

export type Change =
  | { field: string; kind: 'value'; before: string; after: string }
  | { field: string; kind: 'text'; parts: Part[] }
  | { field: string; kind: 'file'; before: string; after: string }
  | { field: string; kind: 'list'; added: string[]; removed: string[] };

const contactLabel = (c: ContactInfo) => `${c.type}: ${c.value}`;

export const FIELD_LABELS: Record<string, { es: string; en: string }> = {
  name: { es: 'Nombre', en: 'Name' },
  lastName: { es: 'Apellido', en: 'Last name' },
  organization: { es: 'Organización', en: 'Organization' },
  missionType: { es: 'Tipo de misión', en: 'Mission type' },
  startDate: { es: 'Inicio en el campo', en: 'On the field since' },
  continent: { es: 'Continente', en: 'Continent' },
  location: { es: 'Ubicación', en: 'Location' },
  description: { es: 'Descripción', en: 'Description' },
  specialNotes: { es: 'Peticiones / notas', en: 'Prayer requests / notes' },
  contactInfo: { es: 'Contacto público', en: 'Public contact' },
  profileImage: { es: 'Foto de perfil', en: 'Profile photo' },
  prayerLetter: { es: 'Carta de oración', en: 'Prayer letter' },
  media: { es: 'Galería', en: 'Gallery' },
};

const place = (l: Missionary['location']) =>
  `${[l?.city, l?.state, l?.country].filter(Boolean).join(', ')} (${l?.latitude ?? 0}, ${l?.longitude ?? 0})`;

export const pageChanges = (before: Missionary | ProposedPage, after: ProposedPage): Change[] => {
  const out: Change[] = [];
  for (const f of ['name', 'lastName', 'organization', 'missionType', 'startDate', 'continent'] as const) {
    const b = String(before[f] ?? ''), a = String(after[f] ?? '');
    if (a !== b) out.push({ field: f, kind: 'value', before: b, after: a });
  }
  if (place(before.location) !== place(after.location)) out.push({ field: 'location', kind: 'value', before: place(before.location), after: place(after.location) });
  for (const f of ['description', 'specialNotes'] as const) {
    const b = before[f] ?? '', a = after[f] ?? '';
    if (a !== b) out.push({ field: f, kind: 'text', parts: textDiff(b, a) });
  }
  for (const f of ['profileImage', 'prayerLetter'] as const) {
    const b = before[f] ?? '', a = after[f] ?? '';
    if (a !== b) out.push({ field: f, kind: 'file', before: b, after: a });
  }
  const bc = (before.contactInfo ?? []).map(contactLabel), ac = (after.contactInfo ?? []).map(contactLabel);
  if (bc.join('|') !== ac.join('|')) out.push({ field: 'contactInfo', kind: 'list', added: ac.filter((x) => !bc.includes(x)), removed: bc.filter((x) => !ac.includes(x)) });
  const bm = (before.media ?? []).map((m) => m.url), am = (after.media ?? []).map((m) => m.url);
  if (bm.join('|') !== am.join('|')) out.push({ field: 'media', kind: 'list', added: am.filter((x) => !bm.includes(x)), removed: bm.filter((x) => !am.includes(x)) });
  return out;
};
