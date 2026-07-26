import styled from 'styled-components'

export const ViewToggle = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
`

// NOTE: unused before this split (never rendered); kept verbatim during de-God.
export const TaskCount = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  white-space: nowrap;
`

/* ── List view ─────────────────────────────────────────────────────── */

export const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
`

export const TaskRow = styled.div<{ $done: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[3.5]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.color.border};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(30, 32, 40, 0.8) 0%, rgba(20, 21, 26, 0.6) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 252, 0.8) 100%)'};
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  
  opacity: ${({ $done }) => $done ? 0.6 : 1};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
    border-color: ${({ theme }) => theme.color.accent}60;
  }
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
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ $done, theme }) => $done ? theme.color.mutedForeground : theme.color.foreground};
  text-decoration: ${({ $done }) => $done ? 'line-through' : 'none'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const TaskDesc = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: ${({ theme }) => `${theme.spacing[0.5]}`};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const TaskMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  margin-top: ${({ theme }) => `${theme.spacing[1]}`};
`

export const MetaBadge = styled.span<{ $tone?: 'danger' | 'sprint' | 'warn' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1.5]}`};
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
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  flex-shrink: 0;
`

/* ── Grid view ─────────────────────────────────────────────────────── */

export const TaskGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
`

/* ── Form ──────────────────────────────────────────────────────────── */

export const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[3.5]}`};
`

export const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
`
