// "Exportar Excel" on the Misioneros tab: one workbook with every missionary we support.
// exceljs is imported lazily so it only loads when an admin exports.
import type { Worksheet } from 'exceljs';
import { CONTACT_METHOD_LABELS } from '../../data/missionaryProfiles';
import { isVideoPath } from '../../storageUrl';
import { publicUrlFor } from '../../siteUrl';
import { MISSING_LABELS } from '../../data/missionaryProfiles';
import type { DirectoryEntry } from './directoryData';
import { fullName } from './directoryData';

export const CONTINENT_LABELS: Record<string, string> = {
  'north-america': 'Norte América', 'central-america': 'Centro América', 'south-america': 'Sur América',
  europe: 'Europa', africa: 'África', asia: 'Asia', oceania: 'Oceanía',
};

const STATUS_LABELS = { published: 'Publicado', draft: 'Borrador', archived: 'Archivado' } as const;

const NAVY = 'FF1E3A8A';
const BLUE = 'FF2563EB';
const MUTED = 'FF64748B';
const ZEBRA = 'FFF4F7FB';
const border = { style: 'thin' as const, color: { argb: 'FFDCE3EC' } };
const cellBorder = { top: border, left: border, bottom: border, right: border };

export interface Column<T> { header: string; width: number; value: (row: T) => string | number | null; wrap?: boolean }

const download = (buffer: ArrayBuffer, filename: string) => {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Title, subtitle, a styled frozen header with filters, then zebra-striped rows. */
export const fillSheet = <T>(ws: Worksheet, title: string, subtitle: string, columns: Column<T>[], rows: T[]) => {
  columns.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });
  const last = Math.max(columns.length, 3);

  ws.mergeCells(1, 1, 1, last);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  t.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, last);
  const sub = ws.getCell(2, 1);
  sub.value = subtitle;
  sub.font = { italic: true, size: 10, color: { argb: MUTED } };
  sub.alignment = { indent: 1 };

  const header = ws.getRow(4);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = cellBorder;
  });
  header.height = 32;

  rows.forEach((row, r) => {
    const excelRow = ws.getRow(5 + r);
    columns.forEach((c, i) => {
      const cell = excelRow.getCell(i + 1);
      const v = c.value(row);
      cell.value = v === '' ? null : v;
      cell.border = cellBorder;
      cell.alignment = { vertical: 'top', wrapText: !!c.wrap };
      if (r % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
    });
  });

  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 2 }];
  if (rows.length) ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + rows.length, column: columns.length } };
};

const yesNo = (b: boolean) => (b ? 'Sí' : 'No');
const pub = (e: DirectoryEntry, type: string) => e.page.contactInfo?.filter((c) => c.type === type).map((c) => c.value).join(', ') ?? '';
const method = (e: DirectoryEntry) => {
  const m = e.profile?.preferredContact;
  return m ? CONTACT_METHOD_LABELS[m].es + (e.profile?.preferredContactNote ? ` (${e.profile.preferredContactNote})` : '') : '';
};

const missionaryColumns: Column<DirectoryEntry>[] = [
  { header: 'Nombre', width: 24, value: (e) => e.page.name },
  { header: 'Apellido', width: 18, value: (e) => e.page.lastName },
  { header: 'Página', width: 12, value: (e) => STATUS_LABELS[e.status] },
  { header: 'Perfil', width: 11, value: (e) => (e.complete ? 'Completo' : 'Básico') },
  { header: 'Falta para completar', width: 30, wrap: true, value: (e) => e.missing.map((f) => MISSING_LABELS[f].es).join(', ') },
  { header: 'Esposa', width: 18, value: (e) => e.profile?.spouseName ?? '' },
  { header: 'Organización', width: 26, value: (e) => e.page.organization },
  { header: 'Iglesia que envía', width: 26, value: (e) => e.profile?.sendingChurch ?? '' },
  { header: 'Tipo de misión', width: 22, value: (e) => e.page.missionType },
  { header: 'Inicio en la misión', width: 14, value: (e) => e.page.startDate ?? '' },
  { header: 'Continente', width: 16, value: (e) => CONTINENT_LABELS[e.page.continent] ?? e.page.continent },
  { header: 'Ciudad', width: 18, value: (e) => e.page.location?.city ?? '' },
  { header: 'Estado / Provincia', width: 18, value: (e) => e.page.location?.state ?? '' },
  { header: 'País', width: 16, value: (e) => e.page.location?.country ?? '' },
  { header: 'Latitud', width: 11, value: (e) => e.page.location?.latitude || null },
  { header: 'Longitud', width: 11, value: (e) => e.page.location?.longitude || null },
  { header: 'Correo (privado)', width: 28, value: (e) => e.profile?.email ?? '' },
  { header: 'Teléfono (privado)', width: 18, value: (e) => e.profile?.phone ?? '' },
  { header: 'Contacto preferido', width: 22, value: method },
  { header: 'Idioma', width: 9, value: (e) => (e.profile?.language === 'en' ? 'Inglés' : 'Español') },
  { header: 'Correo para escribirle', width: 28, value: (e) => e.email },
  { header: 'Correo público', width: 26, value: (e) => pub(e, 'email') },
  { header: 'Teléfono público', width: 18, value: (e) => pub(e, 'phone') },
  { header: 'Sitio web', width: 26, value: (e) => pub(e, 'website') },
  { header: 'Facebook', width: 26, value: (e) => pub(e, 'facebook') },
  { header: 'Instagram', width: 22, value: (e) => pub(e, 'instagram') },
  { header: 'Descripción', width: 60, wrap: true, value: (e) => e.page.description },
  { header: 'Peticiones / notas', width: 40, wrap: true, value: (e) => e.page.specialNotes ?? '' },
  { header: 'Foto de perfil', width: 10, value: (e) => yesNo(!!e.page.profileImage) },
  { header: 'Carta de oración', width: 10, value: (e) => yesNo(!!e.page.prayerLetter) },
  { header: 'Fotos', width: 8, value: (e) => e.page.media?.filter((m) => !isVideoPath(m.url)).length ?? 0 },
  { header: 'Videos', width: 8, value: (e) => e.page.media?.filter((m) => isVideoPath(m.url)).length ?? 0 },
  { header: 'Enlace a la página', width: 40, value: (e) => (e.status === 'published' ? publicUrlFor(`/misionero/${e.id}`) : '') },
  { header: 'Notas internas', width: 40, wrap: true, value: (e) => e.profile?.notes ?? '' },
];

const noEmailColumns: Column<DirectoryEntry>[] = [
  { header: 'Nombre', width: 30, value: (e) => fullName(e.page) },
  { header: 'Organización', width: 26, value: (e) => e.page.organization },
  { header: 'País', width: 16, value: (e) => e.page.location?.country ?? '' },
  { header: 'Teléfono', width: 20, value: (e) => e.phone },
  { header: 'Contacto preferido', width: 26, value: method },
  { header: 'Facebook', width: 26, value: (e) => pub(e, 'facebook') },
  { header: 'Instagram', width: 22, value: (e) => pub(e, 'instagram') },
  { header: 'Notas internas', width: 40, wrap: true, value: (e) => e.profile?.notes ?? '' },
];

export type ExtraSheet = (wb: import('exceljs').Workbook, generated: string) => void;

export const exportMissionariesExcel = async (entries: DirectoryEntry[], extraSheets: ExtraSheet[] = []) => {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Iglesia Bautista Libertad';
  wb.created = new Date();
  const generated = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

  const active = entries.filter((e) => e.status !== 'archived');
  const archived = entries.filter((e) => e.status === 'archived');
  const noEmail = active.filter((e) => !e.email);

  fillSheet(wb.addWorksheet('Misioneros'), 'Misioneros que apoyamos · Iglesia Bautista Libertad',
    `Generado el ${generated} · ${active.length} misioneros (${active.filter((e) => e.complete).length} con perfil completo)`,
    missionaryColumns, active);
  fillSheet(wb.addWorksheet('Sin correo'), 'Misioneros sin correo electrónico',
    `${noEmail.length} misioneros: comuníquese con ellos por teléfono, WhatsApp u otro medio`, noEmailColumns, noEmail);
  extraSheets.forEach((add) => add(wb, generated));
  if (archived.length) {
    fillSheet(wb.addWorksheet('Archivados'), 'Páginas archivadas', `${archived.length} páginas ocultas del sitio (se pueden restaurar)`,
      missionaryColumns, archived);
  }

  download(await wb.xlsx.writeBuffer(), `misioneros-${new Date().toISOString().slice(0, 10)}.xlsx`);
};
