import styled, { useTheme } from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Sparkline, focusRing } from '@ledgr/ui'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { api } from '@ct/shared/api/client'
import { formatCurrency } from '@ct/shared/lib/utils'
import { ACTIVE_DOMAIN_KEYS, isActiveDomain } from '@ct/shared/config/domains'

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
  finance: '/app/finance',
  health: '/app/health',
  career: '/app/career',
}

const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: ${({ theme }) => `${theme.spacing[1]}`};
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media ${({ theme }) => theme.media.lg} {
    display: grid;
    grid-template-columns: repeat(${ACTIVE_DOMAIN_KEYS.length}, minmax(0, 1fr));
    overflow: visible;
  }
`



const Tile = styled.button`
  position: relative;
  overflow: hidden;
  flex: 0 0 auto;
  min-width: 150px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[3.5]}`};
  
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.color.border};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(30, 32, 40, 0.8) 0%, rgba(20, 21, 26, 0.6) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 252, 0.8) 100%)'};
  backdrop-filter: blur(12px);
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);

  cursor: pointer;
  text-align: left;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
    border-color: ${({ theme }) => theme.color.accent}80;
  }
  ${focusRing}
`

const TileLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ValueRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  width: 100%;
`

const TileValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
`

const Delta = styled.span<{ $good: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
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
