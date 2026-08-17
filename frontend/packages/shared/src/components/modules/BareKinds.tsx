/**
 * The four module kinds that render WITHOUT the card shell — each is a grid of
 * its own cards, so the shell would double the chrome.
 */
import styled from 'styled-components'
import { Cpu, Plus } from 'lucide-react'
import { textRole } from '@ledgr/ui'
import { useModulePalette, pct } from './palette'
import { Chip, ModuleButton, ToggleKnob, ToggleTrack, Track, TrackFill } from './primitives'
import type { SpacingStep } from './primitives'
import type { AgentsModule, ChatModule, KanbanModule, TilesModule } from './types'

/** The translucent gradient card the redesign uses for every raised surface. */
const SurfaceCard = styled.div<{ $bg?: string; $border?: string }>`
  background: ${({ $bg, theme }) => $bg ?? theme.surface.card};
  backdrop-filter: ${({ theme }) => theme.surface.filter};
  -webkit-backdrop-filter: ${({ theme }) => theme.surface.filter};
  border: 1px solid ${({ $border, theme }) => $border ?? theme.surface.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.surface.shadow};
`

const AutoGrid = styled.div<{ $cols: string; $gap: SpacingStep }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols};
  gap: ${({ $gap, theme }) => theme.spacing[$gap]};
  flex: 1;
  align-content: start;
  min-width: 0;

  /*
   * An explicit cols value (agents uses 3) is a desktop instruction. Honouring
   * it on a phone gives ~120px cards that wrap one word per line, so it
   * collapses to a single column below md. Tiles opt out via TileScroller,
   * which needs a scroll-snapped ROW rather than a stack.
   */
  @media ${({ theme }) => theme.media.belowMd} {
    grid-template-columns: 1fr;
  }
`

const trackFor = (m: { tileCols?: string; cols?: number }) =>
  m.tileCols ?? (m.cols ? `repeat(${m.cols},minmax(0,1fr))` : 'repeat(auto-fit,minmax(190px,1fr))')

/* ── tiles ────────────────────────────────────────────────────────────── */

const Tile = styled(SurfaceCard)`
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4.5]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2.5]};
  transition: box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease;
  /* Resets for the button form a page opts into via onTileClick. */
  text-align: left;
  font: inherit;
  color: inherit;

  &:is(button) { cursor: pointer; }

  &:hover {
    box-shadow: ${({ theme }) => theme.elevation[2]};
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.color.borderHover};
  }
`

/*
 * MOBILE STRICT: below `md` a KPI grid collapses to one column and the tiles
 * stack into a tall loose column — the exact pattern the rule bans. They become
 * a compact scroll-snapped row instead, the same treatment the dashboard's
 * PulseRow already uses for its tiles.
 */
const TileScroller = styled(AutoGrid)`
  @media ${({ theme }) => theme.media.belowMd} {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: ${({ theme }) => theme.spacing[0.5]};

    &::-webkit-scrollbar { display: none; }

    > * {
      flex: 0 0 clamp(168px, 62vw, 190px);
      scroll-snap-align: start;
      padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
    }
  }
`

const TileLabel = styled.span`
  ${textRole('label')};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.mutedForeground};
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TileValue = styled.div`
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.015em;
  font-variant-numeric: tabular-nums;
`

export function TilesKind({ m }: { m: TilesModule }) {
  const c = useModulePalette()
  const { onTileClick } = m
  return (
    <TileScroller $cols={trackFor(m)} $gap={4}>
      {m.tiles.map((t, i) => (
        <Tile
          key={i}
          as={onTileClick ? 'button' : 'div'}
          type={onTileClick ? 'button' : undefined}
          onClick={onTileClick ? () => onTileClick(i) : undefined}
          $bg={t.accent ? c.alpha('accent', 0.11) : undefined}
          $border={t.accent ? c('accent') : undefined}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {t.dotKey && (
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: c(t.dotKey), boxShadow: `0 0 0 3px ${c.alpha(t.dotKey, 0.19)}`,
              }} />
            )}
            <TileLabel>{t.label}</TileLabel>
            {t.badge && (
              <Chip
                $bg={t.badgeKey ? c.alpha(t.badgeKey, 0.125) : c('muted')}
                $color={t.badgeKey ? c(t.badgeKey) : c('mutedFg')}
              >
                {t.badge}
              </Chip>
            )}
          </div>

          <TileValue>{t.value}</TileValue>

          {t.bar != null && (
            <Track $height={6}><TrackFill $pct={pct(t.bar)} $color={c(t.barKey ?? 'accent')} /></Track>
          )}

          {t.sub && (
            <div style={{ fontSize: 11.5, fontWeight: 600, color: t.subKey ? c(t.subKey) : c('mutedFg') }}>
              {t.sub}
            </div>
          )}
        </Tile>
      ))}
    </TileScroller>
  )
}

/* ── kanban ───────────────────────────────────────────────────────────── */

const Column = styled(SurfaceCard)`
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2.5]};
  min-width: 0;
`

const KanbanCard = styled.div`
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => theme.spacing[2.5]};
  background: ${({ theme }) => theme.color.muted};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1.5]};
  cursor: pointer;
  transition: transform 150ms, border-color 150ms;
  /* Resets for the button form a page opts into via onCardClick. */
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.color.borderHover};
  }
`

export function KanbanKind({ m }: { m: KanbanModule }) {
  const c = useModulePalette()
  const { onCardClick } = m
  // Cards are indexed across all columns in column order, so a page can map an
  // index straight back into the flattened list it built the board from. The
  // offsets are derived up front rather than counted during render.
  const columnOffsets = m.columns.reduce<number[]>((acc, col, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + m.columns[i - 1].cards.length)
    return acc
  }, [])
  return (
    <AutoGrid $cols={trackFor(m)} $gap={3.5}>
      {m.columns.map((col, i) => (
        <Column key={i}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c(col.colorKey), flexShrink: 0 }} />
            <span style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {col.label}
            </span>
            <Chip $bg={c('muted')} $color={c('mutedFg')}>{col.count}</Chip>
          </div>

          {col.cards.map((card, j) => (
            <KanbanCard
              key={j}
              as={onCardClick ? 'button' : 'div'}
              type={onCardClick ? 'button' : undefined}
              onClick={onCardClick ? () => onCardClick(columnOffsets[i] + j) : undefined}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35 }}>{card.title}</div>
              {card.meta && <div style={{ fontSize: 11, color: c('mutedFg') }}>{card.meta}</div>}
              {card.tagLabel && (
                <Chip $bg={c.alpha(card.tagKey, 0.125)} $color={c(card.tagKey)} style={{ alignSelf: 'flex-start' }}>
                  {card.tagLabel}
                </Chip>
              )}
            </KanbanCard>
          ))}
        </Column>
      ))}
    </AutoGrid>
  )
}

/* ── agents ───────────────────────────────────────────────────────────── */

const AgentCard = styled(SurfaceCard)`
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4.5]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  transition: box-shadow 200ms, border-color 200ms;

  &:hover {
    box-shadow: ${({ theme }) => theme.elevation[2]};
    border-color: ${({ theme }) => theme.color.borderHover};
  }
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

/**
 * Run history sparkbars. A zero-height run means "did not run" and draws in
 * the border colour; anything under 50% success draws destructive.
 */
const RunBars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[0.5]};
  height: 40px;
`

const LogLine = styled.div`
  /*
   * The canvas used a monospace stack here. Monospace display type is banned
   * (feedback-no-serif-fonts), so this keeps the UI face and leans on tabular
   * figures + a muted panel to read as log output.
   */
  ${textRole('micro')};
  letter-spacing: 0;
  text-transform: none;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: ${({ theme }) => theme.color.muted};
  border-radius: ${({ theme }) => theme.radii.xs};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[2.5]};
  line-height: 1.55;
`

/** The agent name block, a button once a page wires onCardClick. */
const AgentTitle = styled.div`
  flex: 1;
  min-width: 0;
  text-align: left;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  padding: 0;

  &:is(button) { cursor: pointer; }
`

export function AgentsKind({ m }: { m: AgentsModule }) {
  const c = useModulePalette()
  const { onToggle, onCardClick } = m
  return (
    <AutoGrid $cols={trackFor(m)} $gap={4}>
      {m.agents.map((ag, i) => {
        const Icon = ag.icon ?? Cpu
        return (
          <AgentCard key={i}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
              <IconChip $bg={c.alpha(ag.iconKey, 0.13)} $color={c(ag.iconKey)}>
                <Icon size={16} />
              </IconChip>
              {/* The name opens the agent; the toggle beside it must not, so
                  the clickable region is the text block, not the whole card. */}
              <AgentTitle
                as={onCardClick ? 'button' : 'div'}
                type={onCardClick ? 'button' : undefined}
                onClick={onCardClick ? () => onCardClick(i) : undefined}
              >
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{ag.name}</div>
                <div style={{ fontSize: 11, color: c('mutedFg'), marginTop: 2 }}>{ag.schedule}</div>
              </AgentTitle>
              <ToggleTrack
                $on={!!ag.on}
                $w={38}
                $h={22}
                role="switch"
                aria-checked={!!ag.on}
                aria-label={ag.name}
                tabIndex={onToggle ? 0 : undefined}
                onClick={onToggle ? () => onToggle(i, !ag.on) : undefined}
                onKeyDown={onToggle ? (e) => {
                  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(i, !ag.on) }
                } : undefined}
              >
                <ToggleKnob $on={!!ag.on} $size={17} />
              </ToggleTrack>
            </div>

            <RunBars>
              {ag.runs.map((r, j) => (
                <span key={j} style={{
                  flex: 1,
                  height: pct(Math.max(8, Math.round(r * 100))),
                  borderRadius: 3,
                  background: r === 0 ? c('border') : r < 0.5 ? c('destructive') : c(ag.iconKey),
                  transition: 'height 400ms ease',
                }} />
              ))}
            </RunBars>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 11 }}>
              <span style={{ color: c('mutedFg'), fontWeight: 600 }}>{ag.lastRun}</span>
              <span style={{ fontWeight: 700, color: c(ag.statusKey) }}>{ag.successPct}</span>
            </div>

            <LogLine>{ag.log}</LogLine>
          </AgentCard>
        )
      })}
    </AutoGrid>
  )
}

/* ── chat ─────────────────────────────────────────────────────────────── */

const ChatLayout = styled.div`
  display: grid;
  grid-template-columns: 242px 1fr;
  gap: ${({ theme }) => theme.spacing[4.5]};
  height: 70vh;
  min-height: 540px;
  width: 100%;

  @media ${({ theme }) => theme.media.belowMd} {
    /* The thread rail is secondary — drop it rather than squeeze both. */
    grid-template-columns: 1fr;
    height: auto;

    > :first-child { display: none; }
  }
`

const Pane = styled(SurfaceCard)`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`

const Thread = styled.div<{ $active: boolean; $accent: string }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[2.5]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) => ($active ? theme.color.muted : 'transparent')};
  border-left: 2px solid ${({ $accent }) => $accent};
  cursor: pointer;
  transition: background 150ms;

  &:hover { background: ${({ theme }) => theme.color.muted}; }
`

const Bubble = styled.div<{ $mine: boolean }>`
  background: ${({ $mine, theme }) => ($mine ? theme.color.accent : theme.color.muted)};
  color: ${({ $mine, theme }) => ($mine ? theme.color.accentForeground : theme.color.foreground)};
  border: 1px solid ${({ $mine, theme }) => ($mine ? 'transparent' : theme.color.border)};
  border-radius: ${({ $mine, theme }) =>
    $mine ? `${theme.radii.md} ${theme.radii.md} 4px ${theme.radii.md}`
          : `${theme.radii.md} ${theme.radii.md} ${theme.radii.md} 4px`};
  padding: ${({ theme }) => theme.spacing[2.5]} ${({ theme }) => theme.spacing[3.5]};
  ${textRole('body-m')};
  line-height: 1.6;
  text-wrap: pretty;
`

const Composer = styled.input`
  flex: 1;
  min-width: 0;
  height: 42px;
  padding: 0 ${({ theme }) => theme.spacing[3.5]};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.muted};
  color: ${({ theme }) => theme.color.foreground};
  ${textRole('body-m')};
  font-family: inherit;
  outline: none;
  transition: border-color 150ms, box-shadow 150ms, background 150ms;

  &:focus {
    border-color: ${({ theme }) => theme.color.accent};
    box-shadow: ${({ theme }) => theme.focusRing};
    background: ${({ theme }) => theme.color.card};
  }
`

export function ChatKind({ m }: { m: ChatModule }) {
  const c = useModulePalette()
  const Icon = m.icon

  return (
    <ChatLayout>
      <Pane>
        <div style={{ padding: 12, borderBottom: `1px solid ${c('border')}` }}>
          <ModuleButton $variant="primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 12px' }}>
            <Plus size={13} strokeWidth={2.6} />New conversation
          </ModuleButton>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {m.threads.map((t, i) => (
            <Thread key={i} $active={!!t.active} $accent={t.active ? c(t.colorKey) : 'transparent'}>
              <div style={{ fontSize: 12.5, fontWeight: t.active ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.title}
              </div>
              <div style={{ fontSize: 10.5, color: c('mutedFg'), marginTop: 3 }}>{t.meta}</div>
            </Thread>
          ))}
        </div>
      </Pane>

      <Pane>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 18px', borderBottom: `1px solid ${c('border')}` }}>
          {Icon && (
            <IconChip $bg={c.alpha('accent', 0.11)} $color={c('accent')} style={{ width: 32, height: 32 }}>
              <Icon size={15} />
            </IconChip>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{m.title}</div>
            {m.subtitle && <div style={{ fontSize: 11, color: c('mutedFg'), marginTop: 2 }}>{m.subtitle}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {(m.context ?? []).map((cx, i) => (
              <Chip key={i} $bg={c.alpha(cx.colorKey, 0.11)} $color={c(cx.colorKey)}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c(cx.colorKey), display: 'inline-block', marginRight: 5 }} />
                {cx.label}
              </Chip>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {m.messages.map((msg, i) => {
            const mine = msg.role === 'user'
            return (
              <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 5, alignItems: mine ? 'flex-end' : 'flex-start', minWidth: 0 }}>
                  <Bubble $mine={mine}>{msg.text}</Bubble>
                  <span style={{ fontSize: 10, color: c('mutedFg'), fontWeight: 600 }}>{msg.time}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ borderTop: `1px solid ${c('border')}`, padding: '14px 18px 16px' }}>
          {!!m.suggestions?.length && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 11 }}>
              {m.suggestions.map((sg, i) => (
                <ModuleButton key={i} style={{ padding: '6px 11px' }}>{sg.label}</ModuleButton>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Composer placeholder={m.placeholder ?? 'Ask anything…'} aria-label="Message" />
            <ModuleButton $variant="primary" style={{ height: 42, padding: '0 18px' }}>Send</ModuleButton>
          </div>
        </div>
      </Pane>
    </ChatLayout>
  )
}
