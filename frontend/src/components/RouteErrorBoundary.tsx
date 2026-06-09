import { Component, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface State { hasError: boolean }

export class RouteErrorBoundary extends Component<{ children?: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[RouteErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">Something went wrong</p>
            <p className="text-sm text-muted-foreground mt-1">This page crashed. Reload to recover.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
