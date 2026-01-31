/**
 * ErrorBoundary Component
 * Catches React errors to prevent entire app from crashing
 * Includes retry functionality
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
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

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-icon">
            <AlertTriangle size={24} />
          </div>
          <h3 className="error-boundary-title">Something went wrong</h3>
          <p className="error-boundary-message">
            Unable to display this content. The data format may be incompatible.
          </p>
          {this.state.error && (
            <pre className="error-boundary-details">
              {this.state.error.message}
            </pre>
          )}
          <button className="error-boundary-retry" onClick={this.handleRetry}>
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
