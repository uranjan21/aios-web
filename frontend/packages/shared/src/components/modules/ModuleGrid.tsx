/**
 * The modular page renderer.
 *
 * A page hands in an ordered list of `ModuleSpec`s; this lays them out on a
 * 12-column grid and dispatches each to its kind. Every destination that is
 * "a set of modules answering the question the page name asks" is a data file
 * plus this component — no per-page layout code.
 *
 * Port of the MODULAR PAGE RENDERER block in `Control Tower Redesign.dc.html`.
 */
import styled from 'styled-components'
import { Circle } from 'lucide-react'
import { textRole } from '@ledgr/ui'
import { useModulePalette } from './palette'
import { ModuleButton } from './primitives'
import {
  BarsKind, CalendarKind, ChecklistKind, ControlsKind, DonutKind, HeatKind,
  NotesKind, ProgressKind, QueueKind, RowsKind, SpansKind, TableKind,
  TimelineKind, WeekKind,
} from './ShellKinds'
import { AgentsKind, ChatKind, KanbanKind, TilesKind } from './BareKinds'
import { BARE_KINDS, type ModuleSpec } from './types'

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[5]};
  max-width: 1240px;
  align-items: stretch;
  width: 100%;
`

/*
 * Spans collapse in two steps rather than one. Going straight from 12 columns
 * to a single stack loses the paired 7/5 and 6/6 layouts that carry most of
 * these pages, so tablet keeps two columns for anything under a half-width.
 */
const Cell = styled.div<{ $span: number }>`
  grid-column: span ${({ $span }) => $span};
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;

  @media ${({ theme }) => theme.media.belowLg} {
    grid-column: span ${({ $span }) => ($span <= 6 ? 6 : 12)};
  }

  @media ${({ theme }) => theme.media.belowMd} {
    grid-column: span 12;
  }
`

const Shell = styled.div`
  background: ${({ theme }) => theme.surface.card};
  backdrop-filter: ${({ theme }) => theme.surface.filter};
  -webkit-backdrop-filter: ${({ theme }) => theme.surface.filter};
  border: 1px solid ${({ theme }) => theme.surface.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.surface.shadow};
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
`

const ShellHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]}`};
`

const IconChip = styled.span<{ $bg: string; $color: string }>`
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const ShellTitle = styled.div`
  ${textRole('body-l')};
  font-weight: 700;
`

const ShellSubtitle = styled.div`
  ${textRole('body-s')};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 2px;
`

const ShellBody = styled.div`
  border-top: 1px solid ${({ theme }) => theme.color.border};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]} 18px`};
  flex: 1;
`

function KindBody({ m }: { m: ModuleSpec }) {
  switch (m.kind) {
    case 'rows':      return <RowsKind m={m} />
    case 'progress':  return <ProgressKind m={m} />
    case 'bars':      return <BarsKind m={m} />
    case 'donut':     return <DonutKind m={m} />
    case 'heat':      return <HeatKind m={m} />
    case 'calendar':  return <CalendarKind m={m} />
    case 'week':      return <WeekKind m={m} />
    case 'timeline':  return <TimelineKind m={m} />
    case 'table':     return <TableKind m={m} />
    case 'controls':  return <ControlsKind m={m} />
    case 'queue':     return <QueueKind m={m} />
    case 'checklist': return <ChecklistKind m={m} />
    case 'notes':     return <NotesKind m={m} />
    case 'spans':     return <SpansKind m={m} />
    case 'tiles':     return <TilesKind m={m} />
    case 'kanban':    return <KanbanKind m={m} />
    case 'agents':    return <AgentsKind m={m} />
    case 'chat':      return <ChatKind m={m} />
  }
}

export function ModuleGrid({ modules }: { modules: ModuleSpec[] }) {
  const c = useModulePalette()

  return (
    <Grid>
      {modules.map((m, i) => {
        const bare = BARE_KINDS.has(m.kind)
        const Icon = m.icon ?? Circle

        return (
          <Cell key={`${i}-${m.kind}`} $span={m.span ?? 12}>
            {bare ? (
              <KindBody m={m} />
            ) : (
              <Shell>
                <ShellHeader>
                  <IconChip
                    $bg={m.iconKey ? c.alpha(m.iconKey, 0.13) : c.alpha('accent', 0.11)}
                    $color={m.iconKey ? c(m.iconKey) : c('accent')}
                  >
                    <Icon size={16} />
                  </IconChip>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <ShellTitle>{m.title}</ShellTitle>
                    {m.subtitle && <ShellSubtitle>{m.subtitle}</ShellSubtitle>}
                  </div>
                  {m.action && <ModuleButton>{m.action}</ModuleButton>}
                </ShellHeader>
                <ShellBody>
                  <KindBody m={m} />
                </ShellBody>
              </Shell>
            )}
          </Cell>
        )
      })}
    </Grid>
  )
}
