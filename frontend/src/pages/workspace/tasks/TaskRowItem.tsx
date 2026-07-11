import { Trash2, CheckCircle2, Circle, PencilLine, CalendarDays, Tag, AlertCircle } from 'lucide-react'
import { Button } from '@ledgr/ui'
import { Task, Sprint, Project } from '@/api/workspace'
import {
  TaskRow, TaskCheckBtn, TaskBody, TaskTitle, TaskDesc, TaskMeta, MetaBadge, TaskActions,
} from './TasksPage.styles'
import { priorityTone, fmtDate } from './helpers'

/* ── Task row (list view) ──────────────────────────────────────────── */

export function TaskRowItem({ t, sprints, projects, onToggle, onEdit, onDelete }: {
  t: Task
  sprints: Sprint[]
  projects: Project[]
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const sprint = sprints.find(s => s.id === t.sprint_id)
  const project = projects.find(p => p.id === t.project_id)

  return (
    <TaskRow $done={t.status === 'done'}>
      <TaskCheckBtn $done={t.status === 'done'} onClick={onToggle}>
        {t.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </TaskCheckBtn>
      <TaskBody>
        <TaskTitle $done={t.status === 'done'}>{t.title}</TaskTitle>
        {t.description && <TaskDesc>{t.description}</TaskDesc>}
        <TaskMeta>
          {sprint && <MetaBadge $tone="sprint">{sprint.name}</MetaBadge>}
          {project && <MetaBadge>{project.name}</MetaBadge>}
          {(t.priority === 'high' || t.priority === 'urgent') && (
            <MetaBadge $tone={priorityTone(t.priority)}>
              <AlertCircle size={9} /> {t.priority}
            </MetaBadge>
          )}
          {t.due_date && <MetaBadge><CalendarDays size={9} /> {fmtDate(t.due_date)}</MetaBadge>}
          {t.labels && t.labels.split(',').filter(Boolean).slice(0, 2).map(l => (
            <MetaBadge key={l}><Tag size={9} /> {l.trim()}</MetaBadge>
          ))}
        </TaskMeta>
      </TaskBody>
      <TaskActions>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit"><PencilLine size={13} /></Button>
        <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete"><Trash2 size={13} /></Button>
      </TaskActions>
    </TaskRow>
  )
}
