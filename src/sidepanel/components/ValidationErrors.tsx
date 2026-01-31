/**
 * ValidationErrors Component
 * Displays Zod validation errors with paths
 */

import { AlertTriangle } from 'lucide-react';
import type { ValidationError } from '@shared/types';

interface ValidationErrorsProps {
  errors: ValidationError[];
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="validation-errors" style={{ marginBottom: '1rem' }}>
      <h3>
        <AlertTriangle size={16} />
        Validation Issues ({errors.length})
      </h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-600)', marginBottom: '0.5rem' }}>
        The file was parsed but some data may not conform to the AAS specification.
      </p>
      {errors.slice(0, 10).map((error, index) => (
        <div key={index} className="validation-error">
          {error.path && <span className="path">{error.path}: </span>}
          {error.message}
        </div>
      ))}
      {errors.length > 10 && (
        <div
          style={{
            padding: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--color-gray-500)',
            textAlign: 'center',
          }}
        >
          ...and {errors.length - 10} more
        </div>
      )}
    </div>
  );
}
