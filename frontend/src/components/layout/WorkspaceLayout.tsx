import type { ReactNode } from 'react'

/**
 * Two-zone workspace: analytics/visualization in the center, all input/logging
 * tools docked in a sticky right rail. Below xl the rail drops under the center.
 *
 *   <WorkspaceLayout rail={<QuickActions/>}>
 *     ...analytics cards...
 *   </WorkspaceLayout>
 */
export function WorkspaceLayout({ children, rail }: { children: ReactNode; rail?: ReactNode }) {
  return (
    <div className="flex flex-col xl:flex-row gap-4 xl:gap-5 items-start">
      <div className="flex-1 min-w-0 w-full space-y-4">{children}</div>
      {rail && (
        <aside className="w-full xl:w-[300px] shrink-0 xl:sticky xl:top-1 space-y-4 rounded-3xl border-0 bg-card shadow-premium-sm p-3">
          {rail}
        </aside>
      )}
    </div>
  )
}

/** Section label for grouping rail cards — "Quick Log", "Track", etc. */
export function RailHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1 first:pt-0 pt-1">
      <span className="w-1 h-1 rounded-full bg-primary" />
      <span className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  )
}
