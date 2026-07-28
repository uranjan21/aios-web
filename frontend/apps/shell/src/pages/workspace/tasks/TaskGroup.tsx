import { Task } from '@ct/shared/api/workspace'
import { CollapsibleSection } from '@ct/shared/components/workspace/CollapsibleSection'
import { TaskGrid, TaskList } from './TasksPage.styles'

/* ── Group wrapper (collapsible) ───────────────────────────────────── */

export function TaskGroup({ sectionId, label, tasks, isGrid, renderItem }: {
  sectionId: string
  label: string
  tasks: Task[]
  isGrid: boolean
  renderItem: (t: Task) => React.ReactNode
}) {
  if (tasks.length === 0) return null
  const Inner = isGrid ? TaskGrid : TaskList
  return (
    <CollapsibleSection
      sectionId={sectionId}
      label={label}
      count={`${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
    >
      <Inner>{tasks.map(renderItem)}</Inner>
    </CollapsibleSection>
  )
}
