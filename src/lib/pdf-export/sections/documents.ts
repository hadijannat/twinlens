/**
 * PDF Documents Section
 * Renders attached documents table grouped by category
 */

import type jsPDF from 'jspdf';
import type { LayoutState } from '../types';
import type { Documents, NormalizedDocument } from '@lib/normalized';
import { PDF_COLORS } from '../types';
import { LAYOUT, moveDown, getLeftX, getRightX, ensureSpace } from '../layout';
import { renderSectionHeader } from './identity';
import { formatCategoryName } from '../formatters';

const TABLE_HEADER_HEIGHT = 6;
const TABLE_ROW_HEIGHT = 5;

// Column widths as percentages
const COLUMNS = {
  title: 0.55,
  category: 0.25,
  language: 0.20,
};

/**
 * Render the documents section
 */
export function renderDocuments(
  doc: jsPDF,
  layout: LayoutState,
  documents: Documents
): void {
  if (documents.items.length === 0) {
    return;
  }

  ensureSpace(doc, layout, 30);
  renderSectionHeader(doc, layout, 'Attached Documents');

  const leftX = getLeftX();
  const rightX = getRightX();
  const contentWidth = rightX - leftX;

  // Column positions
  const col1X = leftX;
  const col2X = leftX + contentWidth * COLUMNS.title;
  const col3X = leftX + contentWidth * (COLUMNS.title + COLUMNS.category);

  // Table header
  renderTableHeader(doc, layout, col1X, col2X, col3X, rightX);

  // Group by category
  for (const [category, categoryDocs] of documents.byCategory) {
    if (categoryDocs.length === 0) continue;

    // Check space for at least category header + 2 rows
    const neededHeight = 10 + Math.min(categoryDocs.length, 5) * TABLE_ROW_HEIGHT;
    ensureSpace(doc, layout, neededHeight);

    // Category subheader
    renderCategorySubheader(doc, layout, col1X, rightX, category);

    // Document rows
    for (const document of categoryDocs) {
      renderDocumentRow(doc, layout, col1X, col2X, col3X, rightX, document);
    }
  }

  moveDown(layout, LAYOUT.spacing.section);
}

/**
 * Render table header
 */
function renderTableHeader(
  doc: jsPDF,
  layout: LayoutState,
  col1X: number,
  col2X: number,
  col3X: number,
  rightX: number
): void {
  // Header background
  doc.setFillColor(PDF_COLORS.gray[100]);
  doc.rect(col1X, layout.currentY - 3.5, rightX - col1X, TABLE_HEADER_HEIGHT, 'F');

  // Header text
  doc.setFontSize(LAYOUT.fonts.small);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.gray[700]);

  doc.text('Title', col1X + 1, layout.currentY);
  doc.text('Category', col2X + 1, layout.currentY);
  doc.text('Language', col3X + 1, layout.currentY);

  moveDown(layout, TABLE_HEADER_HEIGHT);
}

/**
 * Render category subheader row
 */
function renderCategorySubheader(
  doc: jsPDF,
  layout: LayoutState,
  leftX: number,
  rightX: number,
  category: string
): void {
  // Light background for category
  doc.setFillColor(PDF_COLORS.gray[50]);
  doc.rect(leftX, layout.currentY - 3, rightX - leftX, TABLE_ROW_HEIGHT, 'F');

  doc.setFontSize(LAYOUT.fonts.small);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.primary);
  doc.text(formatCategoryName(category), leftX + 1, layout.currentY);

  moveDown(layout, TABLE_ROW_HEIGHT);
}

/**
 * Render a single document row
 */
function renderDocumentRow(
  doc: jsPDF,
  layout: LayoutState,
  col1X: number,
  col2X: number,
  col3X: number,
  rightX: number,
  document: NormalizedDocument
): void {
  doc.setFontSize(LAYOUT.fonts.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF_COLORS.gray[700]);

  // Title (with truncation)
  const titleWidth = col2X - col1X - 2;
  const title = document.title || document.id;
  const titleText = truncateToWidth(doc, title, titleWidth);
  doc.text(titleText, col1X + 1, layout.currentY);

  // Category
  doc.setTextColor(PDF_COLORS.gray[500]);
  const categoryText = formatCategoryName(document.category);
  doc.text(categoryText, col2X + 1, layout.currentY);

  // Language
  if (document.language) {
    doc.text(document.language.toUpperCase(), col3X + 1, layout.currentY);
  } else {
    doc.text('-', col3X + 1, layout.currentY);
  }

  // Row separator
  moveDown(layout, TABLE_ROW_HEIGHT - 1);
  doc.setDrawColor(PDF_COLORS.gray[100]);
  doc.setLineWidth(0.1);
  doc.line(col1X, layout.currentY, rightX, layout.currentY);
  moveDown(layout, 1);
}

/**
 * Truncate text to fit within a specific width
 */
function truncateToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) {
    return text;
  }

  let truncated = text;
  while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 3) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}
