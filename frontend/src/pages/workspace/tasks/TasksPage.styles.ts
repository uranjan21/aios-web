import styled from 'styled-components'

export const ViewToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`

// NOTE: unused before this split (never rendered); kept verbatim during de-God.
export const TaskCount = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  white-space: nowrap;
`

/* ── List view ─────────────────────────────────────────────────────── */

export const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const TaskRow = styled.div<{ $done: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 14px;
  background: ${({ theme }) => theme.color.card};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.xs};
  opacity: ${({ $done }) => $done ? 0.6 : 1};
  transition: opacity 150ms;
`

export const TaskCheckBtn = styled.button<{ $done: boolean }>`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ $done, theme }) => $done ? theme.color.accent : theme.color.mutedForeground};
  margin-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 120ms;
  &:hover { color: ${({ theme }) => theme.color.accent}; }
`

export const TaskBody = styled.div`
  flex: 1;
  min-width: 0;
`

export const TaskTitle = styled.div<{ $done: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: ${({ $done, theme }) => $done ? theme.color.mutedForeground : theme.color.foreground};
  text-decoration: ${({ $done }) => $done ? 'line-through' : 'none'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const TaskDesc = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const TaskMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 5px;
`

export const MetaBadge = styled.span<{ $tone?: 'danger' | 'sprint' | 'warn' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $tone }) =>
    $tone === 'danger' ? `${theme.color.destructive}18`
    : $tone === 'warn' ? `${theme.color.accent}18`
    : $tone === 'sprint' ? `${theme.color.primary}12`
    : theme.color.muted};
  color: ${({ theme, $tone }) =>
    $tone === 'danger' ? theme.color.destructive
    : $tone === 'warn' ? theme.color.accent
    : $tone === 'sprint' ? theme.color.foreground
    : theme.color.mutedForeground};
`

export const TaskActions = styled.div`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
`

/* ── Grid view ─────────────────────────────────────────────────────── */

export const TaskGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
`

/* ── Form ──────────────────────────────────────────────────────────── */

export const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

export const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`
