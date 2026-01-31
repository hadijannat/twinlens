/**
 * PDF Compliance Section
 * Renders compliance status with traffic light indicator and issues
 */

import type jsPDF from 'jspdf';
import type { LayoutState } from '../types';
import type { LintResult, LintIssue, LintStatus } from '@lib/linter';
import { PDF_COLORS } from '../types';
import { LAYOUT, moveDown, getLeftX, getRightX, ensureSpace } from '../layout';
import { renderSectionHeader } from './identity';
import { formatCategoryName } from '../formatters';

const MAX_ISSUES_PER_CATEGORY = 5;
const SECTION_MIN_HEIGHT = 40;

/**
 * Render the compliance section
 */
export function renderCompliance(
  doc: jsPDF,
  layout: LayoutState,
  lintResult: LintResult
): void {
  ensureSpace(doc, layout, SECTION_MIN_HEIGHT);

  renderSectionHeader(doc, layout, 'Compliance Status');

  // Traffic light and status
  renderStatusIndicator(doc, layout, lintResult.status);

  // Summary stats
  renderSummaryStats(doc, layout, lintResult.summary);

  // Issues by category
  if (lintResult.issues.length > 0) {
    renderIssuesByCategory(doc, layout, lintResult.issues);
  }

  moveDown(layout, LAYOUT.spacing.section);
}

/**
 * Render the traffic light status indicator
 */
function renderStatusIndicator(
  doc: jsPDF,
  layout: LayoutState,
  status: LintStatus
): void {
  const leftX = getLeftX();
  const circleRadius = 4;
  const circleX = leftX + circleRadius;
  const circleY = layout.currentY - 1;

  // Traffic light colors
  const colors: Record<LintStatus, string> = {
    pass: PDF_COLORS.success,
    warn: PDF_COLORS.warning,
    fail: PDF_COLORS.error,
  };

  const labels: Record<LintStatus, string> = {
    pass: 'COMPLIANT',
    warn: 'NEEDS ATTENTION',
    fail: 'NON-COMPLIANT',
  };

  // Draw filled circle
  doc.setFillColor(colors[status]);
  doc.circle(circleX, circleY, circleRadius, 'F');

  // Status text
  doc.setFontSize(LAYOUT.fonts.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors[status]);
  doc.text(labels[status], leftX + circleRadius * 2 + 4, layout.currentY);

  moveDown(layout, 8);
}

/**
 * Render summary statistics
 */
function renderSummaryStats(
  doc: jsPDF,
  layout: LayoutState,
  summary: LintResult['summary']
): void {
  const leftX = getLeftX();

  doc.setFontSize(LAYOUT.fonts.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF_COLORS.gray[700]);

  const stats = [
    { label: 'Passed', value: summary.passed, color: PDF_COLORS.success },
    { label: 'Errors', value: summary.errors, color: PDF_COLORS.error },
    { label: 'Warnings', value: summary.warnings, color: PDF_COLORS.warning },
    { label: 'Future', value: summary.infos, color: PDF_COLORS.gray[500] },
  ];

  let x = leftX;
  for (const stat of stats) {
    doc.setTextColor(PDF_COLORS.gray[500]);
    doc.text(`${stat.label}: `, x, layout.currentY);
    x += doc.getTextWidth(`${stat.label}: `);

    doc.setTextColor(stat.color);
    doc.setFont('helvetica', 'bold');
    doc.text(String(stat.value), x, layout.currentY);
    x += doc.getTextWidth(String(stat.value)) + 10;

    doc.setFont('helvetica', 'normal');
  }

  moveDown(layout, 8);
}

/**
 * Render issues grouped by category
 */
function renderIssuesByCategory(
  doc: jsPDF,
  layout: LayoutState,
  issues: LintIssue[]
): void {
  const leftX = getLeftX();
  const rightX = getRightX();

  // Group issues by category
  const byCategory = new Map<string, LintIssue[]>();
  for (const issue of issues) {
    const parts = issue.ruleId.split('.');
    const category = (parts.length > 1 ? parts[1] : 'general') ?? 'general';
    const existing = byCategory.get(category) ?? [];
    existing.push(issue);
    byCategory.set(category, existing);
  }

  doc.setFontSize(LAYOUT.fonts.body);

  for (const [category, categoryIssues] of byCategory) {
    // Check if we need a new page for this category
    const estimatedHeight = Math.min(categoryIssues.length, MAX_ISSUES_PER_CATEGORY + 1) * 5 + 10;
    ensureSpace(doc, layout, estimatedHeight);

    // Category header
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.gray[700]);
    doc.text(formatCategoryName(category), leftX, layout.currentY);
    moveDown(layout, 5);

    // Issues (limited)
    doc.setFont('helvetica', 'normal');
    const displayIssues = categoryIssues.slice(0, MAX_ISSUES_PER_CATEGORY);
    const remaining = categoryIssues.length - displayIssues.length;

    for (const issue of displayIssues) {
      renderIssueRow(doc, layout, leftX, rightX, issue);
    }

    if (remaining > 0) {
      doc.setTextColor(PDF_COLORS.gray[500]);
      doc.setFont('helvetica', 'italic');
      doc.text(`... and ${remaining} more`, leftX + 4, layout.currentY);
      moveDown(layout, 4);
    }

    moveDown(layout, 2);
  }
}

/**
 * Render a single issue row
 */
function renderIssueRow(
  doc: jsPDF,
  layout: LayoutState,
  leftX: number,
  rightX: number,
  issue: LintIssue
): void {
  const severityColors: Record<string, string> = {
    error: PDF_COLORS.error,
    warning: PDF_COLORS.warning,
    info: PDF_COLORS.gray[500],
  };

  const severitySymbols: Record<string, string> = {
    error: '✕',
    warning: '!',
    info: 'i',
  };

  // Severity indicator
  const symbol = severitySymbols[issue.severity] ?? '?';
  doc.setTextColor(severityColors[issue.severity] ?? PDF_COLORS.gray[500]);
  doc.setFont('helvetica', 'bold');
  doc.text(symbol, leftX + 2, layout.currentY);

  // Issue message (truncated to fit)
  doc.setTextColor(PDF_COLORS.gray[700]);
  doc.setFont('helvetica', 'normal');
  const maxMessageWidth = rightX - leftX - 15;
  const message = truncateToWidth(doc, issue.message, maxMessageWidth);
  doc.text(message, leftX + 8, layout.currentY);

  moveDown(layout, 4);
}

/**
 * Truncate text to fit within a specific width
 */
function truncateToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) {
    return text;
  }

  let truncated = text;
  while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 10) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}
