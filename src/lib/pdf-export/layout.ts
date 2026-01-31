/**
 * PDF Layout Utilities
 * Constants and helpers for PDF page layout management
 */

import type jsPDF from 'jspdf';
import type { LayoutState } from './types';

/**
 * Layout constants for A4 PDF in millimeters
 */
export const LAYOUT = {
  pageWidth: 210,
  pageHeight: 297,
  margins: { top: 20, bottom: 20, left: 20, right: 20 },
  contentWidth: 170, // pageWidth - left margin - right margin
  fonts: {
    title: 16,
    heading: 12,
    subheading: 10,
    body: 9,
    small: 8,
  },
  spacing: {
    section: 12,
    paragraph: 6,
    line: 4,
  },
  tableRowHeight: 6,
} as const;

/**
 * Check if we need a new page to fit the required height
 */
export function needsNewPage(layout: LayoutState, requiredHeight: number): boolean {
  const availableHeight = layout.pageHeight - layout.margins.bottom - layout.currentY;
  return requiredHeight > availableHeight;
}

/**
 * Add a new page and reset Y position
 */
export function addPage(doc: jsPDF, layout: LayoutState): void {
  doc.addPage();
  layout.pageNumber++;
  layout.currentY = layout.margins.top;
}

/**
 * Create initial layout state
 */
export function createLayoutState(): LayoutState {
  return {
    currentY: LAYOUT.margins.top,
    pageNumber: 1,
    pageHeight: LAYOUT.pageHeight,
    margins: { ...LAYOUT.margins },
  };
}

/**
 * Ensure there's enough space for content, adding a new page if needed
 */
export function ensureSpace(
  doc: jsPDF,
  layout: LayoutState,
  requiredHeight: number
): void {
  if (needsNewPage(layout, requiredHeight)) {
    addPage(doc, layout);
  }
}

/**
 * Move Y position down by specified amount
 */
export function moveDown(layout: LayoutState, amount: number): void {
  layout.currentY += amount;
}

/**
 * Get the X position for left-aligned content
 */
export function getLeftX(): number {
  return LAYOUT.margins.left;
}

/**
 * Get the X position for right-aligned content
 */
export function getRightX(): number {
  return LAYOUT.pageWidth - LAYOUT.margins.right;
}

/**
 * Get the X position for centered content
 */
export function getCenterX(): number {
  return LAYOUT.pageWidth / 2;
}

/**
 * Calculate text width to check if it fits
 */
export function getTextWidth(doc: jsPDF, text: string): number {
  return doc.getTextWidth(text);
}
