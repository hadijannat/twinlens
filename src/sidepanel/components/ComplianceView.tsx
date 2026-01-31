/**
 * ComplianceView Component
 * Traffic-light compliance view for regulatory validation
 */

import { useMemo, useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
} from 'lucide-react';
import type { AASEnvironment } from '@shared/types';
import {
  executeLinter,
  batteryPassportRules,
  groupIssuesByCategory,
  type LintResult,
  type LintIssue,
  type LintStatus,
  type LintSeverity,
} from '@lib/linter';
import type { ComplianceSettings, SeverityOverride } from '@lib/settings';
import { DEFAULT_COMPLIANCE } from '@lib/settings';

interface ComplianceViewProps {
  environment: AASEnvironment;
  settings?: ComplianceSettings;
}

interface CategorySectionProps {
  name: string;
  issues: LintIssue[];
}

function getStatusIcon(status: LintStatus, size = 20) {
  switch (status) {
    case 'pass':
      return <CheckCircle size={size} className="compliance-icon pass" />;
    case 'warn':
      return <AlertTriangle size={size} className="compliance-icon warn" />;
    case 'fail':
      return <AlertCircle size={size} className="compliance-icon fail" />;
  }
}

function getSeverityIcon(severity: LintSeverity, size = 14) {
  switch (severity) {
    case 'error':
      return <AlertCircle size={size} className="compliance-icon fail" />;
    case 'warning':
      return <AlertTriangle size={size} className="compliance-icon warn" />;
    case 'info':
      return <Info size={size} className="compliance-icon info" />;
  }
}

function getCategoryStatus(issues: LintIssue[]): LintStatus {
  if (issues.some((i) => i.severity === 'error')) return 'fail';
  if (issues.some((i) => i.severity === 'warning')) return 'warn';
  return 'pass';
}

function formatCategoryName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function CategorySection({ name, issues }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const status = getCategoryStatus(issues);
  const formattedName = formatCategoryName(name);

  return (
    <div className="compliance-category">
      <button
        className="compliance-category-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="compliance-category-toggle">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        {getStatusIcon(status, 16)}
        <span className="compliance-category-name">{formattedName}</span>
        <span className="compliance-category-count">{issues.length}</span>
      </button>

      {isExpanded && (
        <div className="compliance-issues">
          {issues.map((issue, idx) => (
            <div key={idx} className={`compliance-issue ${issue.severity}`}>
              <div className="compliance-issue-header">
                {getSeverityIcon(issue.severity)}
                <span className="compliance-issue-name">{issue.ruleName}</span>
                {issue.effectiveDate && (
                  <span className="compliance-issue-future">
                    <Clock size={10} />
                    {new Date(issue.effectiveDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="compliance-issue-message">{issue.message}</p>
              {issue.reference && (
                <span className="compliance-issue-ref">{issue.reference}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ result }: { result: LintResult }) {
  const { summary, status } = result;

  return (
    <div className={`compliance-summary ${status}`}>
      <div className="compliance-summary-icon">{getStatusIcon(status, 32)}</div>
      <div className="compliance-summary-content">
        <h3 className="compliance-summary-title">
          {status === 'pass' && 'Compliant'}
          {status === 'warn' && 'Needs Attention'}
          {status === 'fail' && 'Non-Compliant'}
        </h3>
        <p className="compliance-summary-subtitle">EU Battery Regulation</p>
      </div>
      <div className="compliance-summary-stats">
        <div className="compliance-stat">
          <span className="compliance-stat-value pass">{summary.passed}</span>
          <span className="compliance-stat-label">Passed</span>
        </div>
        <div className="compliance-stat">
          <span className="compliance-stat-value fail">{summary.errors}</span>
          <span className="compliance-stat-label">Errors</span>
        </div>
        <div className="compliance-stat">
          <span className="compliance-stat-value warn">{summary.warnings}</span>
          <span className="compliance-stat-label">Warnings</span>
        </div>
        <div className="compliance-stat">
          <span className="compliance-stat-value info">{summary.infos}</span>
          <span className="compliance-stat-label">Future</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Apply severity override to issues
 */
function applySeverityOverride(
  issues: LintIssue[],
  override: SeverityOverride
): LintIssue[] {
  if (override === 'default') return issues;

  return issues.map((issue) => {
    if (issue.severity === 'warning') {
      if (override === 'treat-warn-as-error') {
        return { ...issue, severity: 'error' as const };
      }
      if (override === 'treat-warn-as-info') {
        return { ...issue, severity: 'info' as const };
      }
    }
    return issue;
  });
}

export function ComplianceView({
  environment,
  settings = DEFAULT_COMPLIANCE,
}: ComplianceViewProps) {
  // Get enabled rule packs
  const enabledRules = useMemo(() => {
    const rules = [];
    if (settings.enabledRulePacks.includes('eu-battery-regulation')) {
      rules.push(batteryPassportRules);
    }
    // Add more rule packs here as they become available
    return rules;
  }, [settings.enabledRulePacks]);

  const result = useMemo(
    () => executeLinter(environment, enabledRules),
    [environment, enabledRules]
  );

  // Apply settings to issues
  const processedIssues = useMemo(() => {
    let issues = result.issues;

    // Filter out future rules if not showing them
    if (!settings.showFutureRules) {
      issues = issues.filter((issue) => issue.severity !== 'info');
    }

    // Apply severity override
    issues = applySeverityOverride(issues, settings.severityOverride);

    return issues;
  }, [result.issues, settings.showFutureRules, settings.severityOverride]);

  const categories = useMemo(() => {
    const grouped = groupIssuesByCategory(processedIssues);
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [processedIssues]);

  if (result.issues.length === 0) {
    return (
      <div className="compliance-empty">
        <div className="compliance-empty-icon">
          <Shield size={48} />
        </div>
        <h3>All Checks Passed</h3>
        <p>
          This asset meets all checked requirements of the EU Battery Regulation.
        </p>
        <div className="compliance-meta">
          <span>{result.summary.total} rules checked</span>
        </div>
      </div>
    );
  }

  return (
    <div className="compliance-view">
      <SummaryCard result={result} />

      <div className="compliance-categories">
        {categories.map(([name, issues]) => (
          <CategorySection key={name} name={name} issues={issues} />
        ))}
      </div>

      <div className="compliance-footer">
        <span>{result.summary.total} rules from EU Battery Regulation (2023/1542)</span>
      </div>
    </div>
  );
}
