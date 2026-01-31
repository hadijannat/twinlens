/**
 * PDF Technical Specifications Section
 * Renders technical facts organized by category in table format
 */

import type jsPDF from 'jspdf';
import type { LayoutState } from '../types';
import type { TechnicalFacts } from '@lib/normalized';
import { PDF_COLORS } from '../types';
import { LAYOUT, moveDown, getLeftX, getRightX, ensureSpace } from '../layout';
import { renderSectionHeader } from './identity';
import { formatValueOnly, getUnit, formatCategoryName } from '../formatters';

const DEFAULT_MAX_FACTS_PER_CATEGORY = 20;
const TABLE_HEADER_HEIGHT = 6;
const TABLE_ROW_HEIGHT = 5;

// Column widths as percentages of content width
const COLUMNS = {
  property: 0.45,
  value: 0.40,
  unit: 0.15,
};

/**
 * Render the technical specifications section
 */
export function renderTechnical(
  doc: jsPDF,
  layout: LayoutState,
  facts: TechnicalFacts,
  options: { maxFactsPerCategory?: number; preferredLanguage?: string } = {}
): void {
  const { maxFactsPerCategory = DEFAULT_MAX_FACTS_PER_CATEGORY, preferredLanguage = 'en' } = options;

  if (facts.byCategory.size === 0) {
    return; // No facts to display
  }

  ensureSpace(doc, layout, 30);
  renderSectionHeader(doc, layout, 'Technical Specifications');

  const leftX = getLeftX();
  const rightX = getRightX();
  const contentWidth = rightX - leftX;

  // Column positions
  const col1X = leftX;
  const col2X = leftX + contentWidth * COLUMNS.property;
  const col3X = leftX + contentWidth * (COLUMNS.property + COLUMNS.value);

  for (const [category, categoryFacts] of facts.byCategory) {
    // Estimate height needed for this category
    const factsToShow = Math.min(categoryFacts.length, maxFactsPerCategory);
    const estimatedHeight = TABLE_HEADER_HEIGHT + (factsToShow + 1) * TABLE_ROW_HEIGHT + 10;
    ensureSpace(doc, layout, estimatedHeight);

    // Category header
    renderCategoryHeader(doc, layout, category);

    // Table header
    renderTableHeader(doc, layout, col1X, col2X, col3X, rightX);

    // Table rows
    const displayFacts = categoryFacts.slice(0, maxFactsPerCategory);
    for (const fact of displayFacts) {
      renderFactRow(doc, layout, col1X, col2X, col3X, rightX, fact, preferredLanguage);
    }

    // "... and N more" if truncated
    const remaining = categoryFacts.length - displayFacts.length;
    if (remaining > 0) {
      doc.setFontSize(LAYOUT.fonts.small);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(PDF_COLORS.gray[500]);
      doc.text(`... and ${remaining} more properties`, col1X, layout.currentY);
      moveDown(layout, 5);
    }

    moveDown(layout, 4);
  }

  moveDown(layout, LAYOUT.spacing.section - 4);
}

/**
 * Render category header
 */
function renderCategoryHeader(
  doc: jsPDF,
  layout: LayoutState,
  category: string
): void {
  const leftX = getLeftX();

  doc.setFontSize(LAYOUT.fonts.body);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.primary);
  doc.text(formatCategoryName(category), leftX, layout.currentY);
  moveDown(layout, 5);
}

/**
 * Render table header row
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

  doc.text('Property', col1X + 1, layout.currentY);
  doc.text('Value', col2X + 1, layout.currentY);
  doc.text('Unit', col3X + 1, layout.currentY);

  moveDown(layout, TABLE_HEADER_HEIGHT);
}

/**
 * Render a single fact row
 */
function renderFactRow(
  doc: jsPDF,
  layout: LayoutState,
  col1X: number,
  col2X: number,
  col3X: number,
  rightX: number,
  fact: { displayLabel: string; value: import('@lib/normalized').TypedValue },
  preferredLanguage: string
): void {
  doc.setFontSize(LAYOUT.fonts.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF_COLORS.gray[700]);

  // Property name
  const propertyWidth = col2X - col1X - 2;
  const propertyText = truncateToWidth(doc, fact.displayLabel, propertyWidth);
  doc.text(propertyText, col1X + 1, layout.currentY);

  // Value
  const valueWidth = col3X - col2X - 2;
  const valueText = truncateToWidth(doc, formatValueOnly(fact.value, preferredLanguage), valueWidth);
  doc.text(valueText, col2X + 1, layout.currentY);

  // Unit
  const unit = getUnit(fact.value) ?? '';
  if (unit) {
    const unitWidth = rightX - col3X - 2;
    const unitText = truncateToWidth(doc, unit, unitWidth);
    doc.setTextColor(PDF_COLORS.gray[500]);
    doc.text(unitText, col3X + 1, layout.currentY);
  }

  // Row separator line
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
