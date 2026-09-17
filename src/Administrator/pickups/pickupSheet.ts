// Printable driver sheet: one page per pickup day, with a block per trip.
// jsPDF is imported lazily so it only loads when an admin exports.
import { CONFERENCE_NAME, formatConferenceDay } from '../../Registration/conference';
import { CHURCH, fromMinutes, riderLine, tripTimes, type Trip } from './pickupData';

export interface SheetTrip {
  trip: Trip;
  driveMinutes: number;
}

export const exportPickupSheet = async (day: string, trips: SheetTrip[]) => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 40;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageW, 56, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Hoja de recogidas', margin, 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${CONFERENCE_NAME} · ${formatConferenceDay(day, { weekday: 'long', day: 'numeric', month: 'long' })}`, margin, 44);
  doc.text(`Salida: ${CHURCH.address}`, pageW - margin, 44, { align: 'right' });

  let y = 82;
  trips.forEach(({ trip, driveMinutes }, i) => {
    const { pickupAt, leaveAt, backAt } = tripTimes(trip, driveMinutes);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Viaje ${i + 1} · ${trip.place.label}`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(107, 114, 128);
    const line = leaveAt === null
      ? `Sin hora de llegada — confirme con el pasajero · ${trip.seats} persona(s)`
      : `Salir de IBL ${fromMinutes(leaveAt)} · recoger ${fromMinutes(pickupAt as number)} · de regreso ~${fromMinutes(backAt as number)} · ${trip.seats} persona(s) · ${driveMinutes} min de viaje`;
    doc.text(line, margin, y + 14);

    autoTable(doc, {
      startY: y + 22,
      margin: { left: margin, right: margin },
      head: [['Nombre', 'Teléfono', 'Llegada', 'Detalle', 'Pers.', 'Notas']],
      body: trip.riders.map((r) => {
        const l = riderLine(r);
        return [l.name, l.phone, l.time || '—', l.detail, String(l.seats), l.notes];
      }),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 246, 251] },
      columnStyles: { 4: { halign: 'center', cellWidth: 34 } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28;
  });

  doc.save(`recogidas-${day}.pdf`);
};
