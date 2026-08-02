/**
 * The fourteen module kinds that render inside the standard card shell.
 * Ported from the modular page renderer in `Control Tower Redesign.dc.html`.
 */
import styled, { css } from 'styled-components'
import { Check, ChevronDown } from 'lucide-react'
import { textRole } from '@ledgr/ui'
import { useModulePalette, pct } from './palette'
import {
  Chip, FieldLabel, ModuleButton, Row, RowBody, RowMeta, RowTitle, RowValue,
  Stack, ToggleKnob, ToggleTrack, Track, TrackFill,
} from './primitives'
import type {
  BarsModule, CalendarModule, ChecklistModule, ControlsModule, DonutModule,
  HeatModule, NotesModule, ProgressModule, QueueModule, RowsModule,
  SpansModule, TableModule, TimelineModule, WeekModule,
} from './types'

/*
 * `Row` rendered as a real button when a page wires a handler. The UA button
 * chrome has to be reset back down to what `Row` draws — hence the explicit
 * border-bottom rather than a blanket `border: none`.
 */
const ClickableRow = styled(Row)`
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:is(button) { cursor: pointer; }
`

/* ── rows ─────────────────────────────────────────────────────────────── */

export function RowsKind({ m }: { m: RowsModule }) {
  const c = useModulePalette()
  const { onRowClick } = m
  return (
    <Stack>
      {m.rows.map((r, i) => (
        <ClickableRow
          key={i}
          as={onRowClick ? 'button' : 'div'}
          type={onRowClick ? 'button' : undefined}
          onClick={onRowClick ? () => onRowClick(i) : undefined}
          style={r.busy ? { opacity: 0.55, pointerEvents: 'none' } : undefined}
        >
          <RowBody>
            <RowTitle>{r.title}</RowTitle>
            {r.meta && <RowMeta>{r.meta}</RowMeta>}
          </RowBody>
          {r.tagLabel && (
            <Chip $bg={c.alpha(r.tagColorKey, 0.125)} $color={c(r.tagColorKey)}>{r.tagLabel}</Chip>
          )}
          {r.value && <RowValue>{r.value}</RowValue>}
        </ClickableRow>
      ))}
    </Stack>
  )
}

/* ── progress ─────────────────────────────────────────────────────────── */

const ProgressHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2.5]};
  margin-bottom: 7px;
`

/*
 * A progress row becomes a button only when the page hands in `onRowClick`.
 * `ProgressRow` resets the button chrome so the two paths render identically.
 */
const ProgressRow = styled.div<{ $interactive: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  padding: 0;

  ${({ $interactive, theme }) =>
    $interactive &&
    css`
      cursor: pointer;
      border-radius: ${theme.radii.xs};
      padding: ${theme.spacing[2]};
      margin: -${theme.spacing[2]};
      transition: background 150ms;

      &:hover {
        background: ${theme.color.muted};
      }
    `}
`

export function ProgressKind({ m }: { m: ProgressModule }) {
  const c = useModulePalette()
  const onRowClick = m.onRowClick
  return (
    <Stack $gap={17}>
      {m.rows.map((r, i) => (
        <ProgressRow
          key={i}
          as={onRowClick ? 'button' : 'div'}
          type={onRowClick ? 'button' : undefined}
          $interactive={!!onRowClick}
          onClick={onRowClick ? () => onRowClick(i) : undefined}
        >
          <ProgressHead>
            <RowTitle as="span">{r.title}</RowTitle>
            <span style={{ fontWeight: 700, color: c(r.colorKey), fontVariantNumeric: 'tabular-nums' }}>
              {r.value}
            </span>
          </ProgressHead>
          <Track><TrackFill $pct={pct(r.pct)} $color={c(r.colorKey)} /></Track>
          {r.meta && <RowMeta>{r.meta}</RowMeta>}
        </ProgressRow>
      ))}
    </Stack>
  )
}

/* ── bars ─────────────────────────────────────────────────────────────── */

const BarPlot = styled.div`
  position: relative;
  height: 158px;
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
`

const TargetLine = styled.div<{ $top: string }>`
  position: absolute;
  left: 0;
  right: 0;
  top: ${({ $top }) => $top};
  border-top: 1px dashed ${({ theme }) => theme.color.borderHover};
  pointer-events: none;

  span {
    position: absolute;
    right: 0;
    top: -17px;
    ${textRole('micro')};
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.mutedForeground};
    /* A tall right-hand bar puts its own value label right here, so the target
       label needs an opaque backing to stay readable over it. */
    background: ${({ theme }) => theme.color.card};
    padding: 0 ${({ theme }) => theme.spacing[1]};
    border-radius: ${({ theme }) => theme.radii.xs};
  }
`

const BarCol = styled.div`
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[1.5]};
`

const Bar = styled.div<{ $h: string; $color: string }>`
  width: 100%;
  max-width: 40px;
  height: ${({ $h }) => $h};
  border-radius: 7px 7px 3px 3px;
  background: ${({ $color }) => $color};
  transition: height 450ms ease, filter 150ms;

  &:hover { filter: brightness(1.14); }
`

const BarAxis = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: 9px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  padding-top: 9px;

  span {
    flex: 1;
    min-width: 0;
    text-align: center;
    ${textRole('micro')};
    text-transform: none;
    letter-spacing: 0;
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`

export function BarsKind({ m }: { m: BarsModule }) {
  const c = useModulePalette()
  const max = m.max ?? Math.max(...m.bars.map((b) => b.v), 1)

  return (
    <div>
      <BarPlot>
        {m.target != null && (
          // Bars occupy 86% of the plot height, so the reference line sits at
          // the same scale rather than at a naive percentage of the box.
          <TargetLine $top={pct(100 - Math.round((m.target / max) * 86))}>
            <span>{m.targetLabel ?? 'Target'}</span>
          </TargetLine>
        )}
        {m.bars.map((b, i) => (
          <BarCol key={i}>
            <span
              style={{
                fontSize: '10.5px', fontWeight: 700, whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
                color: b.dim ? c('mutedFg') : c('fg'),
              }}
            >
              {b.t ?? b.v}
            </span>
            <Bar
              $h={pct(Math.round((b.v / max) * 86))}
              $color={b.dim ? c('border') : c(b.colorKey ?? 'accent')}
            />
          </BarCol>
        ))}
      </BarPlot>
      <BarAxis>
        {m.bars.map((b, i) => <span key={i}>{b.label}</span>)}
      </BarAxis>
    </div>
  )
}

/* ── donut ────────────────────────────────────────────────────────────── */

const DonutWrap = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[6]};
  flex-wrap: wrap;
`

const Ring = styled.div<{ $conic: string }>`
  position: relative;
  width: 134px;
  height: 134px;
  border-radius: 50%;
  background: ${({ $conic }) => $conic};
  flex-shrink: 0;
`

const RingHole = styled.div`
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.card};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
`

const Legend = styled.div`
  flex: 1;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  gap: 11px;
`

const Swatch = styled.span<{ $color: string }>`
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

export function DonutKind({ m }: { m: DonutModule }) {
  const c = useModulePalette()
  let acc = 0
  const stops = m.slices.map((s) => {
    const from = acc
    acc += s.pct
    return `${c(s.colorKey)} ${from}% ${acc}%`
  })

  return (
    <DonutWrap>
      <Ring $conic={`conic-gradient(${stops.join(',')})`}>
        <RingHole>
          <span style={{ fontSize: '19px', fontWeight: 700, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
            {m.centerValue}
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c('mutedFg') }}>
            {m.centerLabel}
          </span>
        </RingHole>
      </Ring>
      <Legend>
        {m.slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Swatch $color={c(s.colorKey)} />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.label}
            </span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {s.value ?? `${s.pct}%`}
            </span>
          </div>
        ))}
      </Legend>
    </DonutWrap>
  )
}

/* ── heat ─────────────────────────────────────────────────────────────── */

const HeatRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2.5]};
`

const HeatLabel = styled.span`
  width: 136px;
  flex-shrink: 0;
  ${textRole('body-s')};
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const HeatCells = styled.div`
  flex: 1;
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`

const HeatCell = styled.span<{ $bg: string; $border: string }>`
  flex: 1;
  height: 23px;
  border-radius: 5px;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  transition: transform 150ms;

  &:hover { transform: scale(1.14); }
`

export function HeatKind({ m }: { m: HeatModule }) {
  const c = useModulePalette()
  const base = c(m.colorKey ?? 'health')
  // Four intensity steps: empty, then three weights of the domain colour.
  const shades = [c('muted'), c.alpha(m.colorKey ?? 'health', 0.27), c.alpha(m.colorKey ?? 'health', 0.52), base]

  return (
    <Stack $gap={9}>
      <HeatRow>
        <span style={{ width: 136, flexShrink: 0 }} />
        <HeatCells>
          {m.dayLabels.map((l, i) => (
            <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, fontWeight: 700, color: c('mutedFg') }}>{l}</span>
          ))}
        </HeatCells>
        <span style={{ width: 92, flexShrink: 0 }} />
      </HeatRow>

      {m.habits.map((h, i) => (
        <HeatRow key={i}>
          <HeatLabel>{h.label}</HeatLabel>
          <HeatCells>
            {h.cells.map((v, j) => (
              <HeatCell key={j} $bg={shades[v] ?? c('muted')} $border={v === 0 ? c('border') : 'transparent'} />
            ))}
          </HeatCells>
          <span style={{
            width: 92, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700,
            whiteSpace: 'nowrap', color: h.broken ? c('warning') : c('success'),
          }}>
            {h.streak}
          </span>
        </HeatRow>
      ))}
    </Stack>
  )
}

/* ── calendar ─────────────────────────────────────────────────────────── */

const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[1.5]};
`

const DayCell = styled.div<{ $bg: string; $border: string; $opacity: number }>`
  min-height: 58px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $bg }) => $bg};
  padding: 6px 7px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  opacity: ${({ $opacity }) => $opacity};
  transition: border-color 150ms, transform 150ms;

  &:hover {
    border-color: ${({ theme }) => theme.color.borderHover};
    transform: translateY(-1px);
  }
`

export function CalendarKind({ m }: { m: CalendarModule }) {
  const c = useModulePalette()

  const cells: Array<{ day: number; dim?: boolean; today?: boolean; amount?: string; colorKey?: string }> = [
    ...(m.lead ?? []).map((n) => ({ day: n, dim: true, today: n === m.todayLead })),
    ...Array.from({ length: m.days }, (_, i) => {
      const n = i + 1
      const mk = m.marks?.[n]
      return { day: n, amount: mk?.t, colorKey: mk?.k ?? 'mutedFg', today: n === m.today }
    }),
    ...(m.trail ?? []).map((n) => ({ day: n, dim: true })),
  ]

  return (
    <div>
      <MonthGrid style={{ marginBottom: 7 }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((l) => (
          <span key={l} style={{
            textAlign: 'center', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: c('mutedFg'),
          }}>{l}</span>
        ))}
      </MonthGrid>

      <MonthGrid>
        {cells.map((d, i) => (
          <DayCell
            key={i}
            $bg={d.today ? c.alpha('accent', 0.11) : d.amount ? c('muted') : 'transparent'}
            $border={d.today ? c('accent') : c('border')}
            $opacity={d.dim && !d.today ? 0.4 : 1}
          >
            <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: d.today ? c('accent') : c('fg') }}>
              {d.day}
            </span>
            {d.amount && (
              <span style={{
                fontSize: 9.5, fontWeight: 700, borderRadius: 5, padding: '2px 4px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                color: c(d.colorKey), background: c.alpha(d.colorKey, 0.12),
              }}>
                {d.amount}
              </span>
            )}
          </DayCell>
        ))}
      </MonthGrid>

      {m.legend && (
        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
          {m.legend.map((l, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: c('mutedFg') }}>
              <Swatch $color={c(l.colorKey)} style={{ width: 8, height: 8 }} />{l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── week ─────────────────────────────────────────────────────────────── */

const WeekGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};

  @media ${({ theme }) => theme.media.belowLg} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const DayHead = styled.div<{ $rule: string }>`
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-bottom: 7px;
  border-bottom: 2px solid ${({ $rule }) => $rule};
`

const Block = styled.div<{ $bg: string; $color: string }>`
  border-radius: ${({ theme }) => theme.radii.xs};
  padding: 7px ${({ theme }) => theme.spacing[2]};
  background: ${({ $bg }) => $bg};
  border-left: 2px solid ${({ $color }) => $color};
  transition: transform 150ms;

  &:hover { transform: translateX(2px); }
`

export function WeekKind({ m }: { m: WeekModule }) {
  const c = useModulePalette()
  return (
    <WeekGrid>
      {m.days.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <DayHead $rule={d.today ? c('accent') : c('border')}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: c('mutedFg') }}>
              {d.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: d.today ? c('accent') : c('fg') }}>
              {d.date}
            </span>
          </DayHead>
          {(d.blocks ?? []).map((b, j) => (
            <Block key={j} $bg={c.alpha(b.colorKey, 0.1)} $color={c(b.colorKey)}>
              <div style={{ fontSize: 9.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: c(b.colorKey) }}>{b.time}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 2, lineHeight: 1.32 }}>{b.title}</div>
            </Block>
          ))}
        </div>
      ))}
    </WeekGrid>
  )
}

/* ── timeline ─────────────────────────────────────────────────────────── */

const Dot = styled.span<{ $color: string }>`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const Thread = styled.span`
  flex: 1;
  width: 1px;
  background: ${({ theme }) => theme.color.border};
  margin-top: 5px;
  min-height: 16px;
`

export function TimelineKind({ m }: { m: TimelineModule }) {
  const c = useModulePalette()
  return (
    <Stack>
      {m.entries.map((e, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 15 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 4 }}>
            <Dot $color={c(e.colorKey)} />
            {/* The connector is drawn on every entry except the last. */}
            {i < m.entries.length - 1 && <Thread />}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700 }}>{e.title}</span>
              {e.tagLabel && <Chip $bg={c.alpha(e.colorKey, 0.125)} $color={c(e.colorKey)}>{e.tagLabel}</Chip>}
              {e.date && <span style={{ fontSize: 11, color: c('mutedFg'), marginLeft: 'auto', whiteSpace: 'nowrap' }}>{e.date}</span>}
            </div>
            {e.body && (
              <div style={{ fontSize: 12, color: c('mutedFg'), marginTop: 4, lineHeight: 1.55, textWrap: 'pretty' }}>{e.body}</div>
            )}
          </div>
        </div>
      ))}
    </Stack>
  )
}

/* ── table ────────────────────────────────────────────────────────────── */

const TableHead = styled.div<{ $cols: string }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols};
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[1]} 10px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  span {
    ${textRole('micro')};
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`

const TableRow = styled.div<{ $cols: string }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols};
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 11px ${({ theme }) => theme.spacing[1]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  align-items: center;
  border-radius: ${({ theme }) => theme.radii.xs};
  transition: background 150ms;
  /* Resets for the button form a page opts into via onRowClick. */
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;

  &:is(button) { cursor: pointer; }
  &:hover { background: ${({ theme }) => theme.color.muted}; }
`

/*
 * Horizontal scroll container — a wide table must not widen the page. The
 * floor scales with the column count rather than being a flat 520px: that
 * figure was set for the 5-column tables and forced a 4-column one to scroll
 * inside a span-7 card, clipping its last column at rest.
 */
const TableScroll = styled.div<{ $min: number }>`
  overflow-x: auto;

  > * { min-width: ${({ $min }) => $min}px; }
`

export function TableKind({ m }: { m: TableModule }) {
  const c = useModulePalette()
  const cols = m.gridCols ?? `repeat(${m.cols.length},minmax(0,1fr))`

  return (
    <TableScroll $min={m.cols.length * 110}>
      <div>
        <TableHead $cols={cols}>
          {m.cols.map((col, i) => (
            <span key={i} style={{ textAlign: col.a ?? 'left' }}>{col.l}</span>
          ))}
        </TableHead>
        {m.rows.map((row, i) => (
          <TableRow
            key={i}
            $cols={cols}
            as={m.onRowClick ? 'button' : 'div'}
            type={m.onRowClick ? 'button' : undefined}
            onClick={m.onRowClick ? () => m.onRowClick!(i) : undefined}
          >
            {row.map((cell, j) => {
              const cc = typeof cell === 'object' ? cell : { t: cell }
              const align = m.cols[j]?.a ?? 'left'
              const justify = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start'
              return (
                <div key={j} style={{ minWidth: 0, display: 'flex', justifyContent: justify }}>
                  {'tag' in cc && cc.tag ? (
                    <Chip
                      $bg={cc.colorKey ? c.alpha(cc.colorKey, 0.125) : c('muted')}
                      $color={cc.colorKey ? c(cc.colorKey) : c('mutedFg')}
                    >
                      {cc.t}
                    </Chip>
                  ) : (
                    <span style={{
                      fontSize: '12.5px',
                      color: 'colorKey' in cc && cc.colorKey ? c(cc.colorKey) : c('fg'),
                      fontWeight: 'bold' in cc && cc.bold ? 700 : 500,
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {cc.t}
                    </span>
                  )}
                </div>
              )
            })}
          </TableRow>
        ))}
      </div>
    </TableScroll>
  )
}

/* ── controls ─────────────────────────────────────────────────────────── */

/*
 * Wraps rather than squeezing: a four-option segment or a wide swatch strip in
 * a span-6 card would otherwise crush the label column to a few characters.
 * The control drops to its own line once the label needs more than ~140px.
 */
const ControlRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  padding: 13px ${({ theme }) => theme.spacing[1]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  > *:first-child { min-width: 140px; }
`

const Segment = styled.div`
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: ${({ theme }) => theme.radii.xs};
  background: ${({ theme }) => theme.color.muted};
  flex-shrink: 0;
`

const SegmentOption = styled.span<{ $active: boolean }>`
  ${textRole('body-s')};
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 7px;
  cursor: pointer;
  white-space: nowrap;
  background: ${({ $active, theme }) => ($active ? theme.color.card : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.color.foreground : theme.color.mutedForeground)};
  box-shadow: ${({ $active, theme }) => ($active ? theme.elevation[1] : 'none')};
  transition: background 150ms, color 150ms;
`

const SelectChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  ${textRole('body-s')};
  font-weight: 600;
  padding: 7px 12px;
  border-radius: ${({ theme }) => theme.radii.xs};
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.foreground};
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
  transition: background 150ms, border-color 150ms;

  &:hover {
    border-color: ${({ theme }) => theme.color.borderHover};
    background: ${({ theme }) => theme.color.muted};
  }
`

/**
 * A picker chip. Always a real button — like `ModuleButton`, it simply has no
 * handler until a page wires `onSwatch`, which keeps the gallery unchanged.
 */
const PaletteSwatch = styled.button<{ $color: string; $active: boolean }>`
  width: 26px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radii.xs};
  background: ${({ $color }) => $color};
  border: none;
  padding: 0;
  flex-shrink: 0;
  cursor: pointer;
  box-shadow: 0 0 0 2px ${({ $active, theme }) => ($active ? theme.color.accent : 'transparent')};
  transition: box-shadow 150ms, transform 150ms;

  &:hover { transform: translateY(-1px); }
`

export function ControlsKind({ m }: { m: ControlsModule }) {
  const c = useModulePalette()
  const { onToggle, onSelect, onSwatch } = m
  return (
    <Stack>
      {m.rows.map((r, i) => (
        <ControlRow key={i} style={r.busy ? { opacity: 0.55, pointerEvents: 'none' } : undefined}>
          <RowBody>
            <div style={{ fontWeight: 600 }}>{r.title}</div>
            {r.meta && <RowMeta>{r.meta}</RowMeta>}
          </RowBody>

          {r.control === 'toggle' && (
            <ToggleTrack
              $on={!!r.on}
              role="switch"
              aria-checked={!!r.on}
              aria-label={r.title}
              tabIndex={onToggle ? 0 : undefined}
              onClick={onToggle ? () => onToggle(i, !r.on) : undefined}
              onKeyDown={onToggle ? (e) => {
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(i, !r.on) }
              } : undefined}
            >
              <ToggleKnob $on={!!r.on} />
            </ToggleTrack>
          )}

          {r.control === 'segment' && (
            <Segment>
              {(r.options ?? []).map((op) => (
                <SegmentOption
                  key={op}
                  $active={op === r.value}
                  onClick={onSelect ? () => onSelect(i, op) : undefined}
                >
                  {op}
                </SegmentOption>
              ))}
            </Segment>
          )}

          {r.control === 'swatches' && (
            <div style={{ display: 'flex', gap: 7, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {(r.swatches ?? []).map((sw, j) => (
                <PaletteSwatch
                  key={j}
                  type="button"
                  aria-pressed={!!sw.active}
                  onClick={onSwatch ? () => onSwatch(i, j) : undefined}
                  $color={sw.color}
                  $active={!!sw.active}
                />
              ))}
            </div>
          )}

          {r.control === 'slider' && (
            <div style={{ width: 150, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Track $height={5}><TrackFill $pct={pct(r.pct ?? 0)} $color={c('accent')} /></Track>
                <span style={{
                  position: 'absolute', top: -5, left: pct(r.pct ?? 0), width: 15, height: 15,
                  marginLeft: -7, borderRadius: '50%', background: c('card'),
                  border: `2px solid ${c('accent')}`,
                }} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: c('mutedFg'), width: 38, textAlign: 'right', whiteSpace: 'nowrap' }}>
                {r.value}
              </span>
            </div>
          )}

          {r.control === 'select' && (
            <SelectChip>{r.value}<ChevronDown size={12} strokeWidth={2.4} /></SelectChip>
          )}
        </ControlRow>
      ))}
    </Stack>
  )
}

/* ── queue ────────────────────────────────────────────────────────────── */

const QueueRow = styled.div<{ $bg: string; $border: string }>`
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 11px ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ $border }) => $border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $bg }) => $bg};
  flex-wrap: wrap;
  transition: border-color 150ms;

  &:hover { border-color: ${({ theme }) => theme.color.borderHover}; }
`

const Mono = styled.span`
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  ${textRole('label')};
  font-weight: 700;
  color: ${({ theme }) => theme.color.mutedForeground};
  flex-shrink: 0;
`

export function QueueKind({ m }: { m: QueueModule }) {
  const c = useModulePalette()
  const { onPrimary, onSecondary } = m
  return (
    <Stack $gap={9}>
      {m.rows.map((r, i) => (
        <QueueRow
          key={i}
          $bg={r.flag ? c.alpha('destructive', 0.06) : 'transparent'}
          $border={r.flag ? c.alpha('destructive', 0.33) : c('border')}
          style={r.busy ? { opacity: 0.55, pointerEvents: 'none' } : undefined}
        >
          <Mono>{r.mono}</Mono>
          <div style={{ minWidth: 130, flex: 1 }}>
            <RowTitle>{r.title}</RowTitle>
            {r.meta && <RowMeta>{r.meta}</RowMeta>}
          </div>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: c(r.amountKey), whiteSpace: 'nowrap' }}>
            {r.amount}
          </span>
          {r.suggestion && (
            <Chip $bg={c.alpha(r.suggestKey, 0.12)} $color={c(r.suggestKey)}>{r.suggestion}</Chip>
          )}
          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            <ModuleButton type="button" $variant="primary" onClick={onPrimary ? () => onPrimary(i) : undefined}>
              {r.primary ?? 'Approve'}
            </ModuleButton>
            <ModuleButton type="button" onClick={onSecondary ? () => onSecondary(i) : undefined}>
              {r.secondary ?? 'Skip'}
            </ModuleButton>
          </div>
        </QueueRow>
      ))}
    </Stack>
  )
}

/* ── checklist ────────────────────────────────────────────────────────── */

const CheckBox = styled.span<{ $done: boolean }>`
  width: 19px;
  height: 19px;
  border-radius: ${({ theme }) => theme.radii.xs};
  border: 1.5px solid ${({ $done, theme }) => ($done ? theme.color.accent : theme.color.border)};
  background: ${({ $done, theme }) => ($done ? theme.color.accent : 'transparent')};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

/** A checklist row is a `label` in the canvas, or a button once wired. */
const CheckRow = styled(ClickableRow)`
  cursor: pointer;
  gap: 11px;
`

export function ChecklistKind({ m }: { m: ChecklistModule }) {
  const c = useModulePalette()
  const { onToggle } = m
  return (
    <Stack>
      {m.items.map((it, i) => (
        <CheckRow
          key={i}
          as={onToggle ? 'button' : 'label'}
          type={onToggle ? 'button' : undefined}
          onClick={onToggle ? () => onToggle(i, !it.done) : undefined}
          style={it.busy ? { opacity: 0.55, pointerEvents: 'none' } : undefined}
        >
          <CheckBox $done={!!it.done}>
            {it.done && <Check size={11} strokeWidth={3.4} color={c('accentForeground')} />}
          </CheckBox>
          <RowBody>
            <div style={{
              fontWeight: 600,
              textDecoration: it.done ? 'line-through' : 'none',
              color: it.done ? c('mutedFg') : c('fg'),
            }}>
              {it.label}
            </div>
            {it.meta && <RowMeta>{it.meta}</RowMeta>}
          </RowBody>
          {it.tagLabel && <Chip $bg={c.alpha(it.tagKey, 0.125)} $color={c(it.tagKey)}>{it.tagLabel}</Chip>}
        </CheckRow>
      ))}
    </Stack>
  )
}

/* ── notes ────────────────────────────────────────────────────────────── */

const NoteArea = styled.textarea<{ $height: string }>`
  width: 100%;
  min-height: ${({ $height }) => $height};
  padding: 11px 13px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.muted};
  color: ${({ theme }) => theme.color.foreground};
  ${textRole('body-m')};
  font-family: inherit;
  line-height: 1.55;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms, box-shadow 150ms, background 150ms;

  &:focus {
    border-color: ${({ theme }) => theme.color.accent};
    box-shadow: ${({ theme }) => theme.focusRing};
    background: ${({ theme }) => theme.color.card};
  }
`

export function NotesKind({ m }: { m: NotesModule }) {
  const controlled = !!m.onValueChange
  const canSubmit = !m.submitting && (!controlled || (m.values ?? []).some((v) => v.trim()))

  return (
    <Stack $gap={15}>
      {m.prompts.map((pr, i) => (
        <div key={i}>
          <FieldLabel>{pr.label}</FieldLabel>
          <NoteArea
            placeholder={pr.placeholder}
            $height={pr.height ?? '80px'}
            aria-label={pr.label}
            // Uncontrolled unless the page opts in, so the design gallery can
            // render the composer without owning its state.
            {...(controlled
              ? { value: m.values?.[i] ?? '', onChange: (e) => m.onValueChange?.(i, e.target.value) }
              : {})}
          />
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}>
        {!m.hideDraft && <ModuleButton>Save draft</ModuleButton>}
        <ModuleButton
          $variant="primary"
          disabled={controlled && !canSubmit}
          style={controlled && !canSubmit ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          onClick={m.onSubmit}
        >
          {m.submitting ? 'Saving…' : (m.cta ?? 'Save')}
        </ModuleButton>
      </div>
    </Stack>
  )
}

/* ── spans ────────────────────────────────────────────────────────────── */

const SpanTrack = styled.div`
  flex: 1;
  height: 24px;
  border-radius: 7px;
  background: ${({ theme }) => theme.color.muted};
  position: relative;
`

const SpanBar = styled.div<{ $start: string; $width: string; $color: string }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${({ $start }) => $start};
  width: ${({ $width }) => $width};
  border-radius: 7px;
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: ${({ theme }) => theme.spacing[2]};
  box-sizing: border-box;
  transition: width 450ms ease;
`

export function SpansKind({ m }: { m: SpansModule }) {
  const c = useModulePalette()
  return (
    <Stack $gap={9}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 78, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
          {m.axis.map((l, i) => (
            <span key={i} style={{ fontSize: 9.5, color: c('mutedFg'), fontWeight: 700 }}>{l}</span>
          ))}
        </div>
        <span style={{ width: 68, flexShrink: 0 }} />
      </div>

      {m.nights.map((n, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 78, flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: c('mutedFg') }}>{n.label}</span>
          <SpanTrack>
            <SpanBar $start={pct(n.start)} $width={pct(n.width)} $color={c(n.colorKey)}>
              {/* Light fills need dark text; the accent/info fills need white. */}
              <span style={{
                fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                color: ['warning', 'health', 'success'].includes(String(n.colorKey)) ? c('bg') : '#FFFFFF',
              }}>
                {n.duration}
              </span>
            </SpanBar>
          </SpanTrack>
          <span style={{ width: 68, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: c(n.colorKey) }}>
            {n.quality}
          </span>
        </div>
      ))}
    </Stack>
  )
}
