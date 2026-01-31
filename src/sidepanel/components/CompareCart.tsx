/**
 * CompareCart Component
 * Shows pinned items for comparison
 */

import { useState, useEffect } from 'react';
import { X, Trash2, ArrowRight } from 'lucide-react';
import { compareStore } from '@lib/compare/store';
import type { CompareItem } from '@lib/compare/types';

interface CompareCartProps {
  onCompare: () => void;
}

export function CompareCart({ onCompare }: CompareCartProps) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const stored = await compareStore.getItems();
    setItems(stored);
    setLoading(false);
  }

  async function handleRemove(id: string) {
    await compareStore.removeItem(id);
    await loadItems();
  }

  async function handleClear() {
    await compareStore.clear();
    setItems([]);
  }

  if (loading) {
    return (
      <div className="compare-cart loading">
        <div className="spinner" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="compare-cart empty">
        <p>No items pinned for comparison.</p>
        <p className="compare-hint">Load an AASX file and click "Pin to Compare" to add it here.</p>
      </div>
    );
  }

  return (
    <div className="compare-cart">
      <div className="compare-cart-header">
        <h3>Pinned for Comparison ({items.length}/4)</h3>
        <button className="compare-clear-btn" onClick={handleClear}>
          <Trash2 size={14} /> Clear All
        </button>
      </div>

      <div className="compare-cart-items">
        {items.map((item) => (
          <div key={item.id} className="compare-cart-item">
            {item.thumbnail && (
              <img src={item.thumbnail} alt="" className="compare-item-thumb" />
            )}
            <div className="compare-item-info">
              <span className="compare-item-name">{item.name}</span>
              <span className="compare-item-date">
                {new Date(item.timestamp).toLocaleDateString()}
              </span>
            </div>
            <button
              className="compare-item-remove"
              onClick={() => handleRemove(item.id)}
              aria-label="Remove"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {items.length >= 2 && (
        <button className="compare-action-btn" onClick={onCompare}>
          Compare {items.length} Items <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
