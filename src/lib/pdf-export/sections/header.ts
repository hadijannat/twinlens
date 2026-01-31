/**
 * PDF Header Section
 * Renders the report header with title, date, and source
 */

import type jsPDF from 'jspdf';
import type { LayoutState } from '../types';
import { PDF_COLORS } from '../types';
import { LAYOUT, moveDown, getLeftX, getRightX } from '../layout';

export interface HeaderData {
  fileName?: string;
  generatedAt: string;
}

/**
 * Render the PDF report header
 */
export function renderHeader(
  doc: jsPDF,
  layout: LayoutState,
  data: HeaderData
): void {
  const leftX = getLeftX();
  const rightX = getRightX();

  // Title
  doc.setFontSize(LAYOUT.fonts.title);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.gray[900]);
  doc.text('Asset Administration Shell Report', leftX, layout.currentY);
  moveDown(layout, 8);

  // Subtitle line with date and source
  doc.setFontSize(LAYOUT.fonts.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF_COLORS.gray[500]);

  const dateText = `Generated: ${formatHeaderDate(data.generatedAt)}`;
  doc.text(dateText, leftX, layout.currentY);

  if (data.fileName) {
    const sourceText = `Source: ${data.fileName}`;
    doc.text(sourceText, rightX, layout.currentY, { align: 'right' });
  }

  moveDown(layout, 6);

  // Divider line
  doc.setDrawColor(PDF_COLORS.gray[300]);
  doc.setLineWidth(0.5);
  doc.line(leftX, layout.currentY, rightX, layout.currentY);

  moveDown(layout, LAYOUT.spacing.section);
}

/**
 * Format date for header display
 */
function formatHeaderDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}
