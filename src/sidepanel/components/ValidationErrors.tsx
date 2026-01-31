/**
 * ValidationErrors Component
 * Displays grouped, filterable validation errors with collapsible categories
 */

import { useState, useMemo } from 'react';
import { AlertTriangle, ChevronRight, ChevronDown, Copy, Check, Filter } from 'lucide-react';
import type { ValidationError } from '@shared/types';
import { categorizeError } from '@lib/aas-validator';

interface ValidationErrorsProps {
  errors: ValidationError[];
}

// Safely convert to array
function safeArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  const errorList = safeArray(errors);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success'>('idle');

  // Group errors by category using useMemo
  const groupedErrors = useMemo(() => {
    const groups = new Map<string, ValidationError[]>();

    for (const error of errorList) {
      const category = categorizeError(error.message);
      const existing = groups.get(category) || [];
      existing.push(error);
      groups.set(category, existing);
    }

    // Sort categories by error count (descending)
    return new Map([...groups.entries()].sort((a, b) => b[1].length - a[1].length));
  }, [errorList]);

  const categories = useMemo(() => Array.from(groupedErrors.keys()), [groupedErrors]);

  if (errorList.length === 0) {
    return null;
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleCopyReport = async () => {
    const lines: string[] = [
      '# AAS Validation Report',
      '',
      `Total issues: ${errorList.length}`,
      '',
    ];

    for (const [category, errs] of groupedErrors) {
      lines.push(`## ${category} (${errs.length})`);
      lines.push('');
      for (const err of errs) {
        lines.push(`- \`${err.path}\`: ${err.message}`);
      }
      lines.push('');
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy report:', err);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setActiveFilter(value === '' ? null : value);
  };

  // Filter categories based on active filter
  const visibleCategories = activeFilter
    ? categories.filter(cat => cat === activeFilter)
    : categories;

  return (
    <div className="validation-errors" style={{ marginBottom: '1rem' }}>
      <div className="validation-header">
        <h3>
          <AlertTriangle size={16} />
          Validation Issues ({errorList.length})
        </h3>
        <div className="validation-actions">
          <div className="validation-filter">
            <Filter size={12} />
            <select
              value={activeFilter || ''}
              onChange={handleFilterChange}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat} ({groupedErrors.get(cat)?.length})
                </option>
              ))}
            </select>
          </div>
          <button
            className="validation-copy-btn"
            onClick={handleCopyReport}
            aria-label={copyStatus === 'success' ? 'Report copied' : 'Copy report as markdown'}
          >
            {copyStatus === 'success' ? (
              <>
                <Check size={12} />
                Copied
              </>
            ) : (
              <>
                <Copy size={12} />
                Copy Report
              </>
            )}
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-600)', marginBottom: '0.75rem' }}>
        The file was parsed but some data may not conform to the AAS specification.
      </p>

      <div className="validation-categories">
        {visibleCategories.map(category => {
          const categoryErrors = groupedErrors.get(category) || [];
          const isExpanded = expandedCategories.has(category);

          return (
            <div key={category} className="validation-category">
              <button
                className="validation-category-header"
                onClick={() => toggleCategory(category)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                <span className="validation-category-name">{category}</span>
                <span className="validation-category-count">{categoryErrors.length}</span>
              </button>

              {isExpanded && (
                <div className="validation-category-errors">
                  {categoryErrors.map((error, index) => (
                    <div key={index} className="validation-error">
                      {error.path && <span className="path">{error.path}: </span>}
                      {error.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
