/**
 * ErrorBoundary Component
 * Catches React errors to prevent entire app from crashing
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={16} color="var(--color-error)" />
            <strong style={{ color: 'var(--color-error)' }}>Display Error</strong>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
            Unable to display this content. The data format may be incompatible.
          </p>
          {this.state.error && (
            <pre style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              fontSize: '0.75rem',
              background: 'white',
              borderRadius: '0.25rem',
              overflow: 'auto',
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
