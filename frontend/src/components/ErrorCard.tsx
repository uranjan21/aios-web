import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorCardProps {
  message?: string
  onRetry?: () => void
}

export function ErrorCard({ message = 'Something went wrong.', onRetry }: ErrorCardProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <AlertCircle className="w-8 h-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-accent text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  )
}
