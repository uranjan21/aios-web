import styled from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { Layers, IndianRupee, Heart, Briefcase, Rocket, PenLine } from 'lucide-react'
import { Card } from '@ledgr/ui'
import { useNavigate } from 'react-router-dom'
import { healthApi, financeApi, careerApi, businessApi, contentApi } from '@/api/areas'
import { formatCurrency } from '@/lib/utils'

/* ─────────────────── 4. DomainPulseCard ─────────────────── */

const PulseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  @media (max-width: 640px) {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    margin: 0 -16px;
    padding: 0 16px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
    & > * {
      scroll-snap-align: center;
      min-width: 140px;
      flex-shrink: 0;
    }
  }
`

const PulseTile = styled.button<{ $accent: string }>`
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.background};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  transition: transform 120ms, box-shadow 120ms, border-color 120ms;
  text-align: left;
  &:hover {
    transform: translateY(-2px);
    border-color: ${({ $accent }) => $accent};
  }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 1px; }
`

const PulseIcon = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $color }) => $color}1A;
  color: ${({ $color }) => $color};
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const PulseLabel = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const PulseValue = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
`

export function DomainPulseCard() {
  const navigate = useNavigate()
  const { data: netWorth } = useQuery({ queryKey: ['finance', 'net-worth'], queryFn: financeApi.netWorth, staleTime: 60_000 })
  const { data: streak } = useQuery({ queryKey: ['health', 'streak'], queryFn: healthApi.streak, staleTime: 60_000 })
  const { data: career } = useQuery({ queryKey: ['career', 'summary'], queryFn: careerApi.summary, staleTime: 60_000 })
  const { data: business } = useQuery({ queryKey: ['business', 'summary'], queryFn: () => businessApi.summary(), staleTime: 60_000 })
  const { data: content } = useQuery({ queryKey: ['content', 'items'], queryFn: () => contentApi.items(), staleTime: 60_000 })

  const thisMonth = content
    ? content.filter((i) => {
        if (i.status !== 'published' || !i.publish_date) return false
        const d = new Date(i.publish_date)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length
    : null

  const mrrValue = (() => {
    if (!business) return '—'
    const n = Number(business.mrr)
    return Number.isFinite(n) && n > 0 ? formatCurrency(n) : '—'
  })()

  const tiles = [
    { label: 'Finance', value: netWorth ? formatCurrency(netWorth.net_worth) : '—', color: '#CA8A04', icon: <IndianRupee size={14} />, path: '/app/areas/finance' },
    { label: 'Health',  value: streak ? `${streak.current_streak}d` : '—', color: '#16A34A', icon: <Heart size={14} />, path: '/app/areas/health' },
    { label: 'Career',  value: career?.total_skills != null ? `${career.total_skills} skills` : '—', color: '#0EA5E9', icon: <Briefcase size={14} />, path: '/app/areas/career' },
    { label: 'Business',value: mrrValue, color: '#DC2626', icon: <Rocket size={14} />, path: '/app/areas/business' },
    { label: 'Content', value: thisMonth !== null ? `${thisMonth}/mo` : '—', color: '#A855F7', icon: <PenLine size={14} />, path: '/app/areas/content' },
  ]

  return (
    <Card title="Domain Pulse" subtitle="At-a-glance across all 5 life areas" icon={<Layers size={14} style={{ color: '#1C1917' }} />}>
      <PulseGrid>
        {tiles.map((t) => (
          <PulseTile key={t.label} $accent={t.color} onClick={() => navigate(t.path)} aria-label={`${t.label}: ${t.value}`}>
            <PulseIcon $color={t.color}>{t.icon}</PulseIcon>
            <div style={{ marginTop: 4 }}>
              <PulseLabel>{t.label}</PulseLabel>
              <br />
              <PulseValue>{t.value}</PulseValue>
            </div>
          </PulseTile>
        ))}
      </PulseGrid>
    </Card>
  )
}
