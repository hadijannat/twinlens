/**
 * RawJsonViewer Component
 * Collapsible JSON tree viewer with syntax highlighting
 */

import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

interface RawJsonViewerProps {
  data: unknown;
}

interface JsonNodeProps {
  keyName?: string;
  value: unknown;
  depth?: number;
}

function JsonNode({ keyName, value, depth = 0 }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  if (!isObject) {
    // Primitive value
    let className = 'json-null';
    let displayValue: string;

    if (typeof value === 'string') {
      className = 'json-string';
      displayValue = `"${value}"`;
    } else if (typeof value === 'number') {
      className = 'json-number';
      displayValue = String(value);
    } else if (typeof value === 'boolean') {
      className = 'json-boolean';
      displayValue = String(value);
    } else {
      displayValue = 'null';
    }

    return (
      <div style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && (
          <span className="json-key">"{keyName}"</span>
        )}
        {keyName !== undefined && ': '}
        <span className={className}>{displayValue}</span>
      </div>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  const brackets = isArray ? ['[', ']'] : ['{', '}'];
  const isEmpty = entries.length === 0;

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <span
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        {!isEmpty && (
          <span style={{ display: 'inline-block', width: 16 }}>
            {isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </span>
        )}
        {keyName !== undefined && (
          <span className="json-key">"{keyName}"</span>
        )}
        {keyName !== undefined && ': '}
        {brackets[0]}
        {!isExpanded && !isEmpty && (
          <span style={{ color: 'var(--color-gray-500)' }}>
            ...{entries.length} {isArray ? 'items' : 'properties'}
          </span>
        )}
        {(isEmpty || !isExpanded) && brackets[1]}
      </span>

      {isExpanded && !isEmpty && (
        <>
          {entries.map(([key, val]) => (
            <JsonNode
              key={key}
              keyName={isArray ? undefined : key}
              value={val}
              depth={depth + 1}
            />
          ))}
          <div style={{ paddingLeft: (depth + 1) * 16 - 16 }}>
            {brackets[1]}
          </div>
        </>
      )}
    </div>
  );
}

export function RawJsonViewer({ data }: RawJsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = useCallback(() => {
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard
      .writeText(jsonString)
      .then(() => {
        setCopied(true);
        setCopyError(false);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy JSON', err);
        setCopyError(true);
        setTimeout(() => setCopyError(false), 2000);
      });
  }, [data]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          padding: '0.25rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.75rem',
          background: 'var(--color-gray-700)',
          color: 'var(--color-gray-200)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          zIndex: 1,
        }}
      >
        {copied ? (
          <>
            <Check size={12} /> Copied
          </>
        ) : copyError ? (
          <>Copy failed</>
        ) : (
          <>
            <Copy size={12} /> Copy
          </>
        )}
      </button>
      <div className="json-viewer">
        <JsonNode value={data} />
      </div>
    </div>
  );
}
