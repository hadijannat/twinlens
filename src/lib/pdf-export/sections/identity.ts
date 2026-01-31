/**
 * PDF Identity Section
 * Renders asset identification information with optional thumbnail
 */

import type jsPDF from 'jspdf';
import type { LayoutState } from '../types';
import type { AssetIdentity, Provenance } from '@lib/normalized';
import { PDF_COLORS } from '../types';
import { LAYOUT, moveDown, getLeftX, ensureSpace } from '../layout';

export interface IdentityData {
  displayName: string;
  identity: AssetIdentity;
  provenance: Provenance;
  thumbnail?: string;
}

const THUMBNAIL_SIZE = 30; // mm
const SECTION_MIN_HEIGHT = 50; // Minimum space needed for identity section

/**
 * Render the identity section
 */
export function renderIdentity(
  doc: jsPDF,
  layout: LayoutState,
  data: IdentityData,
  includeThumbnail: boolean
): void {
  ensureSpace(doc, layout, SECTION_MIN_HEIGHT);

  const leftX = getLeftX();
  const startY = layout.currentY;

  // Section header
  renderSectionHeader(doc, layout, 'Asset Identity');

  // Calculate content layout based on thumbnail presence
  const hasThumbnail = includeThumbnail && data.thumbnail;
  const textStartX = hasThumbnail ? leftX + THUMBNAIL_SIZE + 8 : leftX;

  // Render thumbnail if available
  if (hasThumbnail && data.thumbnail) {
    renderThumbnail(doc, leftX, layout.currentY, data.thumbnail);
  }

  // Asset name (large)
  doc.setFontSize(LAYOUT.fonts.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.gray[900]);
  doc.text(data.displayName, textStartX, layout.currentY);
  moveDown(layout, 6);

  // Identity properties
  doc.setFontSize(LAYOUT.fonts.body);
  doc.setFont('helvetica', 'normal');

  const properties: [string, string | undefined][] = [
    ['Manufacturer', data.identity.manufacturer],
    ['Product', data.identity.productDesignation],
    ['Serial No', data.identity.serialNumber],
    ['Model ID', data.identity.modelId],
    ['GTIN', data.identity.gtin],
  ];

  for (const [label, value] of properties) {
    if (value) {
      renderPropertyRow(doc, layout, textStartX, label, value);
    }
  }

  // Source info
  moveDown(layout, 2);
  doc.setFontSize(LAYOUT.fonts.small);
  doc.setTextColor(PDF_COLORS.gray[500]);
  const sourceText = `Source: ${data.provenance.sourceType}${data.provenance.fileName ? ` (${data.provenance.fileName})` : ''}`;
  doc.text(sourceText, textStartX, layout.currentY);
  moveDown(layout, 4);

  // Validation status badge
  renderValidationBadge(doc, layout, textStartX, data.provenance.validationResults);

  // Ensure we clear the thumbnail area if it's taller than text
  if (hasThumbnail) {
    const thumbnailBottom = startY + THUMBNAIL_SIZE + 8;
    if (layout.currentY < thumbnailBottom) {
      layout.currentY = thumbnailBottom;
    }
  }

  moveDown(layout, LAYOUT.spacing.section);
}

/**
 * Render a section header
 */
export function renderSectionHeader(
  doc: jsPDF,
  layout: LayoutState,
  title: string
): void {
  const leftX = getLeftX();

  doc.setFontSize(LAYOUT.fonts.subheading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.primary);
  doc.text(title.toUpperCase(), leftX, layout.currentY);
  moveDown(layout, 6);
}

/**
 * Render a property row (label: value)
 */
function renderPropertyRow(
  doc: jsPDF,
  layout: LayoutState,
  x: number,
  label: string,
  value: string
): void {
  doc.setTextColor(PDF_COLORS.gray[500]);
  doc.text(`${label}:`, x, layout.currentY);

  const labelWidth = doc.getTextWidth(`${label}: `);
  doc.setTextColor(PDF_COLORS.gray[900]);
  doc.text(value, x + labelWidth, layout.currentY);

  moveDown(layout, 4);
}

/**
 * Render thumbnail image
 */
function renderThumbnail(
  doc: jsPDF,
  x: number,
  y: number,
  thumbnailData: string
): void {
  try {
    // Extract format and data from data URL or use as-is
    let imageData = thumbnailData;
    let format: 'JPEG' | 'PNG' = 'PNG';

    if (thumbnailData.startsWith('data:image/')) {
      const matches = thumbnailData.match(/^data:image\/(jpeg|png|jpg);base64,(.+)$/i);
      if (matches) {
        format = matches[1]?.toUpperCase() === 'JPEG' || matches[1]?.toUpperCase() === 'JPG'
          ? 'JPEG'
          : 'PNG';
        imageData = matches[2] ?? thumbnailData;
      }
    }

    doc.addImage(imageData, format, x, y, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  } catch (error) {
    // If image fails to render, draw a placeholder box
    console.warn('Failed to render thumbnail:', error);
    doc.setDrawColor(PDF_COLORS.gray[300]);
    doc.setFillColor(PDF_COLORS.gray[100]);
    doc.rect(x, y, THUMBNAIL_SIZE, THUMBNAIL_SIZE, 'FD');

    doc.setFontSize(LAYOUT.fonts.small);
    doc.setTextColor(PDF_COLORS.gray[500]);
    doc.text('No image', x + THUMBNAIL_SIZE / 2, y + THUMBNAIL_SIZE / 2, {
      align: 'center',
    });
  }
}

/**
 * Render validation status badge
 */
function renderValidationBadge(
  doc: jsPDF,
  layout: LayoutState,
  x: number,
  validation: Provenance['validationResults']
): void {
  const isValid = validation.valid && validation.errorCount === 0;
  const color = isValid ? PDF_COLORS.success : PDF_COLORS.warning;
  const text = isValid ? 'Valid' : `${validation.errorCount} errors, ${validation.warningCount} warnings`;

  // Badge background
  doc.setFillColor(isValid ? '#dcfce7' : '#fef9c3'); // Light green or light yellow
  const textWidth = doc.getTextWidth(text) + 6;
  doc.roundedRect(x, layout.currentY - 3, textWidth, 5, 1, 1, 'F');

  // Badge text
  doc.setFontSize(LAYOUT.fonts.small);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(color);
  doc.text(text, x + 3, layout.currentY);

  moveDown(layout, 6);
}
