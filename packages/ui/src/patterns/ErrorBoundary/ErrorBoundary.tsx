import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { EmptyState } from '../EmptyState/EmptyState';
import { Button } from '../../primitives/Button';

interface Props {
  /** Custom fallback. Receives the error and a reset function. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Fired when an error is caught — wire to your logging service. */
  onError?: (error: Error, info: ErrorInfo) => void;
  children: ReactNode;
}

interface State { error: Error | null; }

/**
 * Catches render errors anywhere in the tree below and renders a friendly fallback.
 * Place near the app root and around heavy feature subtrees.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught error:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 24, height: 24 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
          title="Something went wrong"
          description={this.state.error.message || 'An unexpected error occurred. Try refreshing the page or returning to the dashboard.'}
          action={<Button variant="primary" onClick={this.reset}>Try again</Button>}
        />
      );
    }
    return this.props.children;
  }
}
