/**
 * CompareView Component
 * Side-by-side comparison of pinned assets
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { compareStore } from '@lib/compare/store';
import { compareEnvironments } from '@lib/compare/diff';
import type { CompareItem } from '@lib/compare/types';
import type { ComparedField } from '@lib/compare/diff';

interface CompareViewProps {
  onBack: () => void;
}

export function CompareView({ onBack }: CompareViewProps) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [fields, setFields] = useState<ComparedField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDiffOnly, setShowDiffOnly] = useState(false);

  useEffect(() => {
    loadAndCompare();
  }, []);

  async function loadAndCompare() {
    setLoading(true);
    const stored = await compareStore.getItems();
    setItems(stored);

    if (stored.length >= 2) {
      const environments = stored.map(item => item.data);
      const compared = compareEnvironments(environments);
      setFields(compared);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="compare-view loading">
        <div className="spinner" />
      </div>
    );
  }

  if (items.length < 2) {
    return (
      <div className="compare-view">
        <button className="compare-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="compare-empty">
          <AlertCircle size={32} />
          <p>Need at least 2 items to compare.</p>
        </div>
      </div>
    );
  }

  const displayFields = showDiffOnly
    ? fields.filter(f => f.isDifferent)
    : fields;

  const diffCount = fields.filter(f => f.isDifferent).length;

  return (
    <div className="compare-view">
      <div className="compare-view-header">
        <button className="compare-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <label className="compare-diff-toggle">
          <input
            type="checkbox"
            checked={showDiffOnly}
            onChange={(e) => setShowDiffOnly(e.target.checked)}
          />
          Show differences only ({diffCount})
        </label>
      </div>

      <div className="compare-table-container">
        <table className="compare-table">
          <thead>
            <tr>
              <th className="compare-field-col">Field</th>
              {items.map((item) => (
                <th key={item.id} className="compare-value-col">
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayFields.map((field) => (
              <tr key={field.label} className={field.isDifferent ? 'diff-row' : ''}>
                <td className="compare-field-name">{field.label}</td>
                {field.values.map((value, idx) => (
                  <td key={idx} className="compare-field-value">
                    {value ?? <span className="compare-empty-value">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
