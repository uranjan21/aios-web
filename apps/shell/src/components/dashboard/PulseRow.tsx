import styled, { useTheme } from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Sparkline } from '@ledgr/ui'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { api } from '@aios/shared/api/client'
import { formatCurrency } from '@aios/shared/lib/utils'
import { ACTIVE_DOMAIN_KEYS, isActiveDomain } from '@aios/shared/config/domains'

interface PulseTile {
  domain: string
  label: string
  value: number
  unit: 'currency' | 'count'
  delta_pct: number | null
  delta_good_when: 'up' | 'down'
  series: number[] | null
}

const DOMAIN_ROUTES: Record<string, string> = {
  finance: '/app/areas/finance',
  health: '/app/areas/health',
  career: '/app/areas/career',
}

const Row = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 4px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media (min-width: 1024px) {
    display: grid;
    grid-template-columns: repeat(${ACTIVE_DOMAIN_KEYS.length}, minmax(0, 1fr));
    overflow: visible;
  }
`

const Tile = styled.button`
  flex: 0 0 auto;
  min-width: 150px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadow.xs};
  cursor: pointer;
  text-align: left;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  transition: box-shadow ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
`

const TileLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ValueRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
`

const TileValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
`

const Delta = styled.span<{ $good: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $good }) => ($good ? theme.color.success : theme.color.destructive)};
`

export function PulseRow() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { data: allTiles = [] } = useQuery({
    queryKey: ['insights', 'pulse'],
    queryFn: () => api.get<PulseTile[]>('/insights/pulse').then(r => r.data),
    staleTime: 5 * 60_000,
  })

  // The endpoint still emits tiles for retired domains (their tables survive the
  // 2026-07-21 cut). Drop them here so no tile renders without a page to open.
  const tiles = allTiles.filter(t => isActiveDomain(t.domain))

  if (tiles.length === 0) return null

  return (
    <Row role="list" aria-label="Domain pulse">
      {tiles.map(tile => {
        const isUp = (tile.delta_pct ?? 0) >= 0
        const good = tile.delta_good_when === 'up' ? isUp : !isUp
        return (
          <Tile
            key={tile.domain}
            role="listitem"
            onClick={() => navigate(DOMAIN_ROUTES[tile.domain] ?? '/app')}
            aria-label={`${tile.label}: ${tile.value}`}
          >
            <TileLabel>{tile.label}</TileLabel>
            <ValueRow>
              <TileValue>
                {tile.unit === 'currency' ? formatCurrency(tile.value) : tile.value}
              </TileValue>
              {tile.delta_pct != null && (
                <Delta $good={good}>
                  {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(tile.delta_pct)}%
                </Delta>
              )}
            </ValueRow>
            {tile.series && tile.series.some(v => v > 0) && (
              <Sparkline data={tile.series} width={120} height={20} stroke={theme.color.accent} />
            )}
          </Tile>
        )
      })}
    </Row>
  )
}
