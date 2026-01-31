/**
 * PDF Footer Section
 * Renders page numbers and version info on all pages
 */

import type jsPDF from 'jspdf';
import { PDF_COLORS } from '../types';
import { LAYOUT, getLeftX, getRightX, getCenterX } from '../layout';

export interface FooterData {
  version: string;
  generatedAt: string;
}

/**
 * Add footers to all pages in the document
 * Should be called after all content is rendered
 */
export function addFootersToAllPages(
  doc: jsPDF,
  totalPages: number,
  data: FooterData
): void {
  const footerY = LAYOUT.pageHeight - LAYOUT.margins.bottom + 10;

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    renderFooter(doc, footerY, page, totalPages, data);
  }
}

/**
 * Render footer on a single page
 */
function renderFooter(
  doc: jsPDF,
  y: number,
  currentPage: number,
  totalPages: number,
  data: FooterData
): void {
  const leftX = getLeftX();
  const rightX = getRightX();
  const centerX = getCenterX();

  // Divider line
  doc.setDrawColor(PDF_COLORS.gray[300]);
  doc.setLineWidth(0.3);
  doc.line(leftX, y - 4, rightX, y - 4);

  // Footer text styling
  doc.setFontSize(LAYOUT.fonts.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF_COLORS.gray[500]);

  // Left: TwinLens version
  doc.text(`TwinLens ${data.version}`, leftX, y);

  // Center: Page numbers
  const pageText = `Page ${currentPage} of ${totalPages}`;
  doc.text(pageText, centerX, y, { align: 'center' });

  // Right: Timestamp
  const timeText = formatFooterTime(data.generatedAt);
  doc.text(timeText, rightX, y, { align: 'right' });
}

/**
 * Format timestamp for footer
 */
function formatFooterTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  } catch {
    return isoDate;
  }
}
