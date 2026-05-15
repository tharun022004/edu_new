import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function statusLabel(status) {
  if (!status) return 'UNKNOWN';
  return String(status).toUpperCase();
}

/**
 * Generate and download a PDF attendance report for the student.
 */
export function downloadAttendancePdf({
  studentName,
  studentEmail,
  records = [],
  summary = {}
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date().toLocaleString();

  const total = summary.total ?? records.length;
  const present = summary.present ?? records.filter((r) => r.status === 'present').length;
  const late = summary.late ?? records.filter((r) => r.status === 'late').length;
  const absent = summary.absent ?? records.filter((r) => r.status === 'absent').length;
  const rate =
    summary.rate ??
    (total === 0 ? 100 : Math.round(((present + late) / total) * 100));

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Attendance Report', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${generatedAt}`, 14, 28);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Information', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${studentName || 'Student'}`, 14, 56);
  doc.text(`Email: ${studentEmail || '-'}`, 14, 62);
  doc.text(`Total sessions recorded: ${total}`, 14, 68);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Summary', 14, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const summaryLines = [
    `Attendance rate: ${rate}%`,
    `Present: ${present}`,
    `Late: ${late}`,
    `Absent: ${absent}`
  ];
  summaryLines.forEach((line, i) => {
    doc.text(line, 14, 88 + i * 6);
  });

  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const tableBody =
    sortedRecords.length > 0
      ? sortedRecords.map((record) => [
          formatDate(record.date),
          record.class?.name || 'Class',
          record.class?.subject || '-',
          record.class?.grade ? `Grade ${record.class.grade}` : '-',
          statusLabel(record.status)
        ])
      : [['No records', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: 112,
    head: [['Date', 'Class', 'Subject', 'Grade', 'Status']],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 38 },
      4: { cellWidth: 22 }
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const status = String(data.cell.raw || '').toLowerCase();
        if (status === 'present') {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'late') {
          data.cell.styles.textColor = [202, 138, 4];
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'absent') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  const absentRows = sortedRecords.filter((r) => r.status === 'absent');
  let finalY = doc.lastAutoTable.finalY + 12;

  if (absentRows.length > 0) {
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text('Absent Dates', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    absentRows.forEach((row, index) => {
      const y = finalY + 8 + index * 6;
      if (y > 280) return;
      doc.text(
        `• ${formatDate(row.date)} — ${row.class?.name || 'Class'} (${row.class?.subject || 'N/A'})`,
        16,
        y
      );
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${pageCount} — Edu Platform Attendance Report`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const fileDate = new Date().toISOString().split('T')[0];
  doc.save(`Attendance_Report_${fileDate}.pdf`);
}
