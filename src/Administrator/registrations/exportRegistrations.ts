// Excel & PDF exports. Libraries are imported lazily so they only load when an admin exports.
import { CATEGORY_LABELS, CONFERENCE_NAME, TRANSPORT_LABELS, formatConferenceDay, type Category, type Registration } from '../../Registration/conference';
import {
  REGISTRATION_COLUMNS, byArrival, childCount, formatArrival, formatDays, fullName,
  infantCount, money, peopleCount, summarize, travelDetails,
} from './registrationData';

// Reads a brand color from the --ibl-* CSS variables so exports follow the site palette.
const cssHex = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : fallback;
};
const hexToRgb = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

const palette = () => ({
  dark: cssHex('--ibl-primary-dark', '#1E3A8A'),
  primary: cssHex('--ibl-primary', '#2563EB'),
  text: cssHex('--ibl-text', '#1F2937'),
  muted: cssHex('--ibl-text-muted', '#6B7280'),
});

const stamp = () => new Date().toISOString().slice(0, 10);
const generatedLabel = () => new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ── Excel ────────────────────────────────────────────────────────────────────

export const exportRegistrationsExcel = async (regs: Registration[]) => {
  const ExcelJS = (await import('exceljs')).default;
  const c = palette();
  const argb = (hex: string) => `FF${hex.slice(1)}`;
  const zebra = 'FFF3F6FB';
  const border = { style: 'thin' as const, color: { argb: 'FFD9DEE7' } };
  const cellBorder = { top: border, left: border, bottom: border, right: border };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Iglesia Bautista Libertad';
  wb.created = new Date();

  // Adds a title block + styled header row, returns the header row number.
  const addSheet = (name: string, title: string, columns: { header: string; width: number }[]) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 4, xSplit: name === 'Registros' ? 4 : 1 }] });
    columns.forEach((col, i) => { ws.getColumn(i + 1).width = col.width; });
    const last = Math.max(columns.length, 4);

    ws.mergeCells(1, 1, 1, last);
    const t = ws.getCell(1, 1);
    t.value = title;
    t.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(c.dark) } };
    t.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(1).height = 30;

    ws.mergeCells(2, 1, 2, last);
    const sub = ws.getCell(2, 1);
    sub.value = `Generado el ${generatedLabel()} · ${regs.length} registros`;
    sub.font = { italic: true, size: 10, color: { argb: argb(c.muted) } };
    sub.alignment = { indent: 1 };

    const header = ws.getRow(4);
    columns.forEach((col, i) => {
      const cell = header.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(c.primary) } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = cellBorder;
    });
    header.height = 32;
    return ws;
  };

  const addRows = (ws: import('exceljs').Worksheet, rows: (string | number)[][], moneyCols: number[] = []) => {
    rows.forEach((values, idx) => {
      const row = ws.getRow(5 + idx);
      values.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        cell.border = cellBorder;
        cell.alignment = { vertical: 'top', wrapText: true };
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebra } };
        if (moneyCols.includes(i)) cell.numFmt = '"$"#,##0';
      });
    });
  };

  // Sheet 1 — every field
  const cols = REGISTRATION_COLUMNS;
  const ws1 = addSheet('Registros', `${CONFERENCE_NAME} — Registros`, cols);
  const sorted = [...regs].sort((a, b) => a.registrant.lastName.localeCompare(b.registrant.lastName));
  addRows(ws1, sorted.map((r) => cols.map((col) => col.value(r))), cols.flatMap((col, i) => (col.money ? [i] : [])));
  ws1.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + sorted.length, column: cols.length } };
  if (sorted.length > 0) {
    const totalRow = ws1.getRow(5 + sorted.length);
    const feeCol = cols.length;
    totalRow.getCell(feeCol - 1).value = 'Total';
    totalRow.getCell(feeCol).value = { formula: `SUM(${ws1.getColumn(feeCol).letter}5:${ws1.getColumn(feeCol).letter}${4 + sorted.length})` };
    totalRow.getCell(feeCol).numFmt = '"$"#,##0';
    [feeCol - 1, feeCol].forEach((i) => { totalRow.getCell(i).font = { bold: true }; totalRow.getCell(i).border = cellBorder; });
  }

  // Sheet 2 — arrivals / pickup logistics
  const arrivalCols = [
    { header: 'Nombre', width: 26 }, { header: 'Teléfono', width: 16 }, { header: 'Personas', width: 10 },
    { header: 'Transporte', width: 12 }, { header: 'Llegada', width: 22 }, { header: 'Recoger', width: 9 },
    { header: 'Detalles (vuelo / autobús)', width: 34 }, { header: 'Salida', width: 16 }, { header: 'Notas', width: 36 },
  ];
  const ws2 = addSheet('Llegadas', `${CONFERENCE_NAME} — Llegadas y transporte`, arrivalCols);
  addRows(ws2, [...regs].sort(byArrival).map((r) => [
    fullName(r.registrant), r.registrant.phone, peopleCount(r),
    TRANSPORT_LABELS[r.travel.transport] ?? r.travel.transport, formatArrival(r),
    r.travel.needsPickup ? 'Sí' : 'No', travelDetails(r),
    r.travel.departureDate ? formatConferenceDay(r.travel.departureDate, { weekday: 'short', day: 'numeric', month: 'short' }) : '',
    r.travel.notes,
  ]));
  ws2.eachRow((row, n) => {
    if (n > 4 && row.getCell(6).value === 'Sí') row.getCell(6).font = { bold: true, color: { argb: argb(c.primary) } };
  });

  // Sheet 3 — summary
  const s = summarize(regs);
  const ws3 = addSheet('Resumen', `${CONFERENCE_NAME} — Resumen`, [{ header: 'Concepto', width: 34 }, { header: 'Total', width: 16 }]);
  addRows(ws3, [
    ['Registros', s.registrations],
    ['Adultos', s.adults],
    ['Niños', s.children],
    ['  de ellos bebés (0–2)', s.infants],
    ['Total de personas', s.people],
    ...(Object.keys(CATEGORY_LABELS) as Category[]).map((k) => [`Categoría: ${CATEGORY_LABELS[k]}`, s.byCategory[k]]),
    ...Object.entries(s.byDay).map(([d, n]) => [`Personas el ${formatConferenceDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}`, n]),
    ['Necesitan que los recojan', s.pickups],
    ['Hotel estimado (total)', s.hotelTotal],
  ], []);
  ws3.getCell(ws3.rowCount, 2).numFmt = '"$"#,##0';
  ws3.getColumn(1).eachCell((cell, n) => { if (n > 4) cell.font = { bold: true, color: { argb: argb(c.text) } }; });

  const buffer = await wb.xlsx.writeBuffer();
  download(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `registros-conferencia-${stamp()}.xlsx`);
};

// ── PDF ──────────────────────────────────────────────────────────────────────

export const exportRegistrationsPdf = async (regs: Registration[]) => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const c = palette();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  const s = summarize(regs);

  const banner = (subtitle: string) => {
    doc.setFillColor(...hexToRgb(c.dark));
    doc.rect(0, 0, pageW, 58, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text(CONFERENCE_NAME, margin, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(subtitle, margin, 45);
    doc.text(`Generado el ${generatedLabel()}`, pageW - margin, 45, { align: 'right' });
  };

  // Stat tiles
  banner('Registros');
  const tiles: [string, string][] = [
    ['Registros', String(s.registrations)],
    ['Personas', `${s.people}`],
    ['Adultos / Niños', `${s.adults} / ${s.children}`],
    ['Recoger', String(s.pickups)],
    ['Hotel estimado', money(s.hotelTotal)],
  ];
  const tileGap = 10;
  const tileW = (pageW - margin * 2 - tileGap * (tiles.length - 1)) / tiles.length;
  tiles.forEach(([label, value], i) => {
    const x = margin + i * (tileW + tileGap);
    doc.setFillColor(243, 246, 251);
    doc.roundedRect(x, 72, tileW, 46, 6, 6, 'F');
    doc.setTextColor(...hexToRgb(c.muted));
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), x + 10, 88);
    doc.setTextColor(...hexToRgb(c.dark));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(value, x + 10, 108);
    doc.setFont('helvetica', 'normal');
  });
  const categoryLine = (Object.keys(CATEGORY_LABELS) as Category[])
    .map((k) => `${CATEGORY_LABELS[k]}: ${s.byCategory[k]}`).join('   ·   ');
  doc.setTextColor(...hexToRgb(c.muted));
  doc.setFontSize(9);
  doc.text(categoryLine, margin, 134);

  const headStyles = { fillColor: hexToRgb(c.primary), textColor: 255, fontStyle: 'bold' as const, fontSize: 8.5 };
  const common = {
    margin: { left: margin, right: margin, top: 72, bottom: 36 },
    styles: { fontSize: 8, cellPadding: 4, textColor: hexToRgb(c.text), lineColor: [217, 222, 231] as [number, number, number], lineWidth: 0.5, valign: 'top' as const },
    headStyles,
    alternateRowStyles: { fillColor: [243, 246, 251] as [number, number, number] },
  };

  const sorted = [...regs].sort((a, b) => a.registrant.lastName.localeCompare(b.registrant.lastName));
  autoTable(doc, {
    ...common,
    startY: 144,
    head: [['#', 'Nombre', 'Categoría', 'Iglesia', 'Contacto', 'Familia', 'Días', 'Llegada', 'Hotel']],
    body: sorted.map((r, i) => {
      const family = [
        r.bringingSpouse ? `Cónyuge: ${fullName(r.spouse)}` : 'Sin cónyuge',
        childCount(r) ? `Niños: ${childCount(r)}${infantCount(r) ? ` (${infantCount(r)} bebé${infantCount(r) > 1 ? 's' : ''})` : ''}` : '',
      ].filter(Boolean).join('\n');
      const arrival = [
        `${TRANSPORT_LABELS[r.travel.transport] ?? ''} · ${formatArrival(r)}`,
        travelDetails(r),
        r.travel.needsPickup ? 'NECESITA RECOGIDA' : '',
      ].filter(Boolean).join('\n');
      const org = r.category === 'missionary' ? [r.registrant.church, r.missionaryBoard && `Junta: ${r.missionaryBoard}`, r.sendingChurch && `Enviado por: ${r.sendingChurch}`].filter(Boolean).join('\n') : r.registrant.church;
      return [
        String(i + 1), fullName(r.registrant), CATEGORY_LABELS[r.category] ?? r.category, org,
        [r.registrant.phone, r.registrant.email].filter(Boolean).join('\n'),
        family, formatDays(r.attendanceDays), arrival, r.category === 'missionary' ? 'Sin costo' : money(r.hotelFee ?? 0),
      ];
    }),
    columnStyles: {
      0: { cellWidth: 22, halign: 'right', textColor: hexToRgb(c.muted) },
      1: { cellWidth: 100, fontStyle: 'bold' },
      2: { cellWidth: 62 },
      3: { cellWidth: 118 },
      4: { cellWidth: 120 },
      5: { cellWidth: 100 },
      6: { cellWidth: 58 },
      7: { cellWidth: 'auto' },
      8: { cellWidth: 50, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7 && String(data.cell.raw).includes('NECESITA RECOGIDA')) {
        data.cell.styles.textColor = hexToRgb(c.primary);
      }
    },
    didDrawPage: (data) => { if (data.pageNumber > 1) banner('Registros (continuación)'); },
  });

  // Arrivals page
  doc.addPage();
  banner('Llegadas y transporte');
  autoTable(doc, {
    ...common,
    startY: 72,
    head: [['Llegada', 'Nombre', 'Teléfono', 'Personas', 'Transporte', 'Detalles', 'Recoger', 'Notas']],
    body: [...regs].sort(byArrival).map((r) => [
      formatArrival(r), fullName(r.registrant), r.registrant.phone, String(peopleCount(r)),
      TRANSPORT_LABELS[r.travel.transport] ?? '', travelDetails(r), r.travel.needsPickup ? 'Sí' : 'No', r.travel.notes,
    ]),
    columnStyles: {
      0: { cellWidth: 90, fontStyle: 'bold' }, 1: { cellWidth: 110 }, 2: { cellWidth: 80 }, 3: { cellWidth: 48, halign: 'center' },
      4: { cellWidth: 62 }, 5: { cellWidth: 150 }, 6: { cellWidth: 46, halign: 'center' }, 7: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6 && data.cell.raw === 'Sí') {
        data.cell.styles.textColor = hexToRgb(c.primary);
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: (data) => { if (data.pageNumber > 1) banner('Llegadas y transporte'); },
  });

  // Page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(c.muted));
    doc.text(`Página ${i} de ${pages}`, pageW - margin, pageH - 16, { align: 'right' });
  }

  doc.save(`registros-conferencia-${stamp()}.pdf`);
};
