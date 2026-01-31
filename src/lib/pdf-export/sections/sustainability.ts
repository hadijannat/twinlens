/**
 * PDF Sustainability Section
 * Renders carbon footprint and environmental data
 */

import type jsPDF from 'jspdf';
import type { LayoutState } from '../types';
import type { Sustainability } from '@lib/normalized';
import { PDF_COLORS } from '../types';
import { LAYOUT, moveDown, getLeftX, getRightX, ensureSpace } from '../layout';
import { renderSectionHeader } from './identity';
import { formatDate } from '../formatters';

const SECTION_MIN_HEIGHT = 30;

/**
 * Render the sustainability section
 */
export function renderSustainability(
  doc: jsPDF,
  layout: LayoutState,
  sustainability: Sustainability
): void {
  // Check if there's any data to display
  const hasData =
    sustainability.carbonFootprint ||
    sustainability.materials?.length ||
    sustainability.recyclabilityRate !== undefined;

  if (!hasData) {
    return;
  }

  ensureSpace(doc, layout, SECTION_MIN_HEIGHT);
  renderSectionHeader(doc, layout, 'Sustainability');

  const leftX = getLeftX();

  // Carbon footprint
  if (sustainability.carbonFootprint) {
    renderCarbonFootprint(doc, layout, leftX, sustainability.carbonFootprint);
  }

  // Recyclability rate
  if (sustainability.recyclabilityRate !== undefined) {
    renderRecyclability(doc, layout, leftX, sustainability.recyclabilityRate);
  }

  // Materials
  if (sustainability.materials?.length) {
    renderMaterials(doc, layout, leftX, sustainability.materials);
  }

  moveDown(layout, LAYOUT.spacing.section);
}

/**
 * Render carbon footprint information
 */
function renderCarbonFootprint(
  doc: jsPDF,
  layout: LayoutState,
  leftX: number,
  cf: NonNullable<Sustainability['carbonFootprint']>
): void {
  // Total CO2eq (prominent)
  if (cf.totalCO2eq !== undefined) {
    doc.setFontSize(LAYOUT.fonts.heading);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.gray[900]);

    const valueText = `${cf.totalCO2eq.toLocaleString()} ${cf.unit}`;
    doc.text(valueText, leftX, layout.currentY);

    // Label
    doc.setFontSize(LAYOUT.fonts.small);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(PDF_COLORS.gray[500]);
    const labelX = leftX + doc.getTextWidth(valueText) + 4;
    doc.text('Total Carbon Footprint', labelX, layout.currentY);

    moveDown(layout, 6);
  }

  // Method and date on same line
  doc.setFontSize(LAYOUT.fonts.body);
  doc.setFont('helvetica', 'normal');

  if (cf.calculationMethod) {
    doc.setTextColor(PDF_COLORS.gray[500]);
    doc.text('Method: ', leftX, layout.currentY);
    doc.setTextColor(PDF_COLORS.gray[700]);
    doc.text(cf.calculationMethod, leftX + doc.getTextWidth('Method: '), layout.currentY);
    moveDown(layout, 4);
  }

  if (cf.publicationDate) {
    doc.setTextColor(PDF_COLORS.gray[500]);
    doc.text('Published: ', leftX, layout.currentY);
    doc.setTextColor(PDF_COLORS.gray[700]);
    doc.text(formatDate(cf.publicationDate), leftX + doc.getTextWidth('Published: '), layout.currentY);
    moveDown(layout, 4);
  }

  // Lifecycle phases
  if (cf.lifeCyclePhases?.length) {
    moveDown(layout, 2);
    renderLifecyclePhases(doc, layout, leftX, cf.lifeCyclePhases);
  }

  moveDown(layout, 4);
}

/**
 * Render lifecycle phases breakdown
 */
function renderLifecyclePhases(
  doc: jsPDF,
  layout: LayoutState,
  leftX: number,
  phases: { phase: string; value: number; unit: string }[]
): void {
  doc.setFontSize(LAYOUT.fonts.small);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.gray[700]);
  doc.text('Lifecycle Phases:', leftX, layout.currentY);
  moveDown(layout, 4);

  doc.setFont('helvetica', 'normal');
  const rightX = getRightX();

  for (const phase of phases) {
    // Phase name
    doc.setTextColor(PDF_COLORS.gray[500]);
    doc.text(`• ${phase.phase}`, leftX + 2, layout.currentY);

    // Value (right-aligned)
    doc.setTextColor(PDF_COLORS.gray[700]);
    const valueText = `${phase.value.toLocaleString()} ${phase.unit}`;
    doc.text(valueText, rightX - 40, layout.currentY);

    moveDown(layout, 4);
  }
}

/**
 * Render recyclability rate
 */
function renderRecyclability(
  doc: jsPDF,
  layout: LayoutState,
  leftX: number,
  rate: number
): void {
  doc.setFontSize(LAYOUT.fonts.body);
  doc.setTextColor(PDF_COLORS.gray[500]);
  doc.text('Recyclability Rate: ', leftX, layout.currentY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.success);
  doc.text(`${rate}%`, leftX + doc.getTextWidth('Recyclability Rate: '), layout.currentY);

  doc.setFont('helvetica', 'normal');
  moveDown(layout, 5);
}

/**
 * Render materials list
 */
function renderMaterials(
  doc: jsPDF,
  layout: LayoutState,
  leftX: number,
  materials: NonNullable<Sustainability['materials']>
): void {
  doc.setFontSize(LAYOUT.fonts.small);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.gray[700]);
  doc.text('Materials:', leftX, layout.currentY);
  moveDown(layout, 4);

  doc.setFont('helvetica', 'normal');

  for (const material of materials.slice(0, 10)) {
    doc.setTextColor(PDF_COLORS.gray[500]);

    let text = `• ${material.name}`;
    if (material.percentage !== undefined) {
      text += ` (${material.percentage}%)`;
    }
    if (material.recyclable !== undefined) {
      text += material.recyclable ? ' ♻' : '';
    }

    doc.text(text, leftX + 2, layout.currentY);
    moveDown(layout, 4);
  }

  if (materials.length > 10) {
    doc.setTextColor(PDF_COLORS.gray[500]);
    doc.setFont('helvetica', 'italic');
    doc.text(`... and ${materials.length - 10} more materials`, leftX + 2, layout.currentY);
    moveDown(layout, 4);
  }
}
