/**
 * PDF Export Types
 * Type definitions for PDF report generation
 */

import type { NormalizedAsset } from '@lib/normalized';
import type { LintResult } from '@lib/linter';

export interface PdfExportOptions {
  includeThumbnail?: boolean;
  includeCompliance?: boolean;
  includeTechnicalFacts?: boolean;
  includeSustainability?: boolean;
  includeDocuments?: boolean;
  preferredLanguage?: string;
  maxFactsPerCategory?: number;
}

export interface PdfExportData {
  asset: NormalizedAsset;
  lintResult?: LintResult;
  thumbnail?: string;
  fileName?: string;
}

export interface PdfExportResult {
  blob: Blob;
  filename: string;
  pageCount: number;
}

export interface LayoutState {
  currentY: number;
  pageNumber: number;
  pageHeight: number;
  margins: { top: number; bottom: number; left: number; right: number };
}

export const PDF_COLORS = {
  primary: '#2563eb',
  success: '#16a34a',
  warning: '#ca8a04',
  error: '#dc2626',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    300: '#d1d5db',
    500: '#6b7280',
    700: '#374151',
    900: '#111827',
  },
} as const;
