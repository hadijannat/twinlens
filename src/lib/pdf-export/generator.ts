/**
 * PDF Report Generator
 * Main entry point for generating PDF reports from normalized asset data
 */

import { jsPDF } from 'jspdf';
import type { PdfExportData, PdfExportOptions, PdfExportResult, LayoutState } from './types';
import { createLayoutState } from './layout';
import { renderHeader } from './sections/header';
import { addFootersToAllPages } from './sections/footer';
import { renderIdentity } from './sections/identity';
import { renderCompliance } from './sections/compliance';
import { renderTechnical } from './sections/technical';
import { renderSustainability } from './sections/sustainability';
import { renderDocuments } from './sections/documents';

/** TwinLens version for footer */
const VERSION = '0.1.0';

/** Default export options */
const DEFAULT_OPTIONS: Required<PdfExportOptions> = {
  includeThumbnail: true,
  includeCompliance: true,
  includeTechnicalFacts: true,
  includeSustainability: true,
  includeDocuments: true,
  preferredLanguage: 'en',
  maxFactsPerCategory: 20,
};

/**
 * Generate a PDF report from normalized asset data
 */
export async function generatePdfReport(
  data: PdfExportData,
  options?: PdfExportOptions
): Promise<PdfExportResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const generatedAt = new Date().toISOString();

  // Create jsPDF instance (A4, portrait, millimeters)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Initialize layout state
  const layout: LayoutState = createLayoutState();

  // Render header
  renderHeader(doc, layout, {
    fileName: data.fileName ?? data.asset.provenance.fileName,
    generatedAt,
  });

  // Render identity section
  renderIdentity(doc, layout, {
    displayName: data.asset.displayName,
    identity: data.asset.identity,
    provenance: data.asset.provenance,
    thumbnail: data.thumbnail ?? data.asset.thumbnail,
  }, opts.includeThumbnail);

  // Render compliance section (if lint result provided)
  if (opts.includeCompliance && data.lintResult) {
    renderCompliance(doc, layout, data.lintResult);
  }

  // Render technical specifications
  if (opts.includeTechnicalFacts && data.asset.technicalFacts.facts.size > 0) {
    renderTechnical(doc, layout, data.asset.technicalFacts, {
      maxFactsPerCategory: opts.maxFactsPerCategory,
      preferredLanguage: opts.preferredLanguage,
    });
  }

  // Render sustainability
  if (opts.includeSustainability) {
    renderSustainability(doc, layout, data.asset.sustainability);
  }

  // Render documents
  if (opts.includeDocuments && data.asset.documents.items.length > 0) {
    renderDocuments(doc, layout, data.asset.documents);
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  addFootersToAllPages(doc, totalPages, {
    version: VERSION,
    generatedAt,
  });

  // Generate blob
  const blob = doc.output('blob');

  // Generate filename
  const baseName = sanitizeFilename(
    data.fileName?.replace(/\.aasx$/i, '') ??
    data.asset.displayName ??
    'aas-report'
  );
  const filename = `${baseName}-report.pdf`;

  return {
    blob,
    filename,
    pageCount: totalPages,
  };
}

/**
 * Sanitize a string for use as a filename
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}
