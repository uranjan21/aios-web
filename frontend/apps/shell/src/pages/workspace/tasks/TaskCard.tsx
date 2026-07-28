import { Trash2, CheckCircle2, Circle, PencilLine, CalendarDays } from 'lucide-react'
import { Button, Card } from '@ledgr/ui'
import { Task, Sprint, Project } from '@ct/shared/api/workspace'
import { TaskCheckBtn, TaskTitle, TaskMeta, MetaBadge } from './TasksPage.styles'
import { priorityTone, fmtDate } from './helpers'
import styled from 'styled-components'

const StyledCard = styled(Card)`
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.color.border};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(30, 32, 40, 0.8) 0%, rgba(20, 21, 26, 0.6) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 252, 0.8) 100%)'};
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
    border-color: ${({ theme }) => theme.color.accent}80;
  }
`

/* ── Task card (grid view) ─────────────────────────────────────────── */

export function TaskCard({ t, sprints, projects, onToggle, onEdit, onDelete }: {
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
    <StyledCard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <TaskCheckBtn $done={t.status === 'done'} onClick={onToggle}>
            {t.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          </TaskCheckBtn>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TaskTitle $done={t.status === 'done'} style={{ whiteSpace: 'normal', fontSize: 13 }}>{t.title}</TaskTitle>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit"><PencilLine size={13} /></Button>
            <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete"><Trash2 size={13} /></Button>
          </div>
        </div>
        {t.description && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{t.description}</p>
        )}
        <TaskMeta>
          {sprint && <MetaBadge $tone="sprint">{sprint.name}</MetaBadge>}
          {project && <MetaBadge>{project.name}</MetaBadge>}
          {(t.priority === 'high' || t.priority === 'urgent') && (
            <MetaBadge $tone={priorityTone(t.priority)}>{t.priority}</MetaBadge>
          )}
          {t.due_date && (
            <MetaBadge><CalendarDays size={9} /> {fmtDate(t.due_date)}</MetaBadge>
          )}
        </TaskMeta>
      </div>
    </StyledCard>
  )
}
