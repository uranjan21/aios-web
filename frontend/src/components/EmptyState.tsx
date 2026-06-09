import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
      <div className="p-4 rounded-full bg-muted/60">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">{description}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
