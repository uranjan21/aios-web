import styled, { keyframes } from 'styled-components'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IndianRupee, Heart, Briefcase, Rocket, PenLine, Zap, Loader2, CheckCircle2, LayoutDashboard, Inbox, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { financeApi, careerApi, businessApi, capturesApi, contentApi } from '@/api/areas'
import { healthApi } from '@/api/areas'
import { agentsApi } from '@/api/agents'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { cardEntrance } from '@/components/PageTransition'
import { useCountUp } from '@/hooks/useCountUp'
import { IconBadge, StatusPill, type IconBadgeColor } from '@/components/lumina';
import { Card as GlassCard } from '@ledgr/ui';
import { EmptyState } from '@/components/EmptyState';

import { Button, Textarea, Stack, Select } from '@ledgr/ui'
import { Card as AppCard } from '@ledgr/ui'

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const SpinningLoader = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
`

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.color.background};
  padding: ${({ theme }) => theme.spacing[4]};
  @media (min-width: ${({ theme }) => theme.breakpoint?.md || '768px'}) {
    padding: ${({ theme }) => theme.spacing[6]};
  }
`

const ContentWrapper = styled.div`
  margin: 0 auto;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`

const GridItem4 = styled.div`
  grid-column: span 12 / span 12;
  @media (min-width: ${({ theme }) => theme.breakpoint?.md || '768px'}) {
    grid-column: span 4 / span 4;
  }
`

const GridItem5 = styled.div`
  grid-column: span 12 / span 12;
  @media (min-width: ${({ theme }) => theme.breakpoint?.md || '768px'}) {
    grid-column: span 5 / span 5;
  }
`

const GridItem3 = styled.div`
  grid-column: span 12 / span 12;
  @media (min-width: ${({ theme }) => theme.breakpoint?.md || '768px'}) {
    grid-column: span 3 / span 3;
  }
`

const GridItem8 = styled.div`
  grid-column: span 12 / span 12;
  @media (min-width: ${({ theme }) => theme.breakpoint?.xl || '1280px'}) {
    grid-column: span 8 / span 8;
  }
`

const GridItem4Xl = styled.div`
  grid-column: span 12 / span 12;
  @media (min-width: ${({ theme }) => theme.breakpoint?.xl || '1280px'}) {
    grid-column: span 4 / span 4;
  }
`

const InnerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  @media (min-width: ${({ theme }) => theme.breakpoint?.sm || '640px'}) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const SummaryCardWrapper = styled(AppCard)<{ $clickable?: boolean }>`
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
  ${({ $clickable }) => $clickable && `
    cursor: pointer;
    &:hover {
      transform: scale(1.02);
    }
    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px currentColor;
    }
  `}
`

const AreaTileWrapper = styled(AppCard)<{ $clickable?: boolean }>`
  padding: 12px !important;
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
  ${({ $clickable }) => $clickable && `
    cursor: pointer;
    &:hover {
      transform: scale(1.02);
    }
    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px currentColor;
    }
  `}
`

const SummaryCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const AreaTileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const SummaryCardTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.025em;
`

const AreaTileTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const StatsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`

const AreaTileStatsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const StatHeroValue = styled.div`
  font-size: 13px;
  line-height: 16px;
  color: ${({ theme }) => theme.color.foreground};
  font-weight: 600;
`

const StatHeroLabel = styled.span`
  font-size: 10.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.1em;
`

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const StatLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.025em;
`

const StatValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
`

const AreaTileStatLabel = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.025em;
`

const AreaTileStatValue = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
`

const TitleGradient = styled.span`
  font-style: italic;
  background: linear-gradient(to right, ${({ theme }) => theme.color.primary}, ${({ theme }) => theme.color.accent});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

const QuickLogConfirmed = styled.p`
  font-size: 10px;
  color: ${({ theme }) => theme.color.success};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-weight: 500;
`

const QuickLogRecentTitle = styled.p`
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.025em;
`

const QuickLogRecentItem = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  background-color: ${({ theme }) => theme.color.muted}80;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

function TrendChip({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const up = value >= 0
  return <StatusPill label={`${up ? '↑' : '↓'} ${Math.abs(value)}${suffix}`} tone={up ? 'primary' : 'muted'} />
}

function SummaryCard({
  icon,
  subtitle,
  action,
  title,
  stats,
  loading,
  onClick,
}: {
  icon?: React.ReactNode
  subtitle?: string
  action?: React.ReactNode
  title: string
  stats: Array<{ label: string; value: string }>
  loading?: boolean
  onClick?: () => void
}) {
  if (loading) {
    return (
      <SummaryCardWrapper noPadding={false}>
        <Stack direction="column" gap={3}>
          <Skeleton style={{ height: '12px', width: '6rem' }} />
          <Skeleton style={{ height: '8px', width: '100%' }} />
          <Skeleton style={{ height: '8px', width: '75%' }} />
          <Skeleton style={{ height: '8px', width: '50%' }} />
        </Stack>
      </SummaryCardWrapper>
    )
  }

  return (
    <SummaryCardWrapper
      title={title}
      subtitle={subtitle}
      icon={icon}
      action={action}
      className="hover:scale-[1.02] transition-transform duration-200"
      hoverable={!!onClick}
      $clickable={!!onClick}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      <StatsList>
        {stats.map(({ label, value }, idx) => (
          idx === 0 ? (
            <div key={label}>
              <StatHeroValue>{value}</StatHeroValue>
              <StatHeroLabel>{label}</StatHeroLabel>
            </div>
          ) : (
            <StatRow key={label}>
              <StatLabel>{label}</StatLabel>
              <StatValue>{value}</StatValue>
            </StatRow>
          )
        ))}
      </StatsList>
    </SummaryCardWrapper>
  )
}

function AreaTile({
  icon,
  subtitle,
  action,
  title,
  stats,
  loading,
  onClick,
}: {
  icon?: React.ReactNode
  subtitle?: string
  action?: React.ReactNode
  title: string
  stats: Array<{ label: string; value: string }>
  loading?: boolean
  onClick?: () => void
}) {
  if (loading) {
    return (
      <AreaTileWrapper>
        <Stack direction="column" gap={2}>
          <Skeleton style={{ height: '12px', width: '5rem' }} />
          <Skeleton style={{ height: '8px', width: '100%' }} />
          <Skeleton style={{ height: '8px', width: '75%' }} />
        </Stack>
      </AreaTileWrapper>
    )
  }

  return (
    <AreaTileWrapper
      title={title}
      subtitle={subtitle}
      icon={icon}
      action={action}
      className="hover:scale-[1.02] transition-transform duration-200"
      hoverable={!!onClick}
      $clickable={!!onClick}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      <AreaTileStatsList>
        {stats.map(({ label, value }) => (
          <StatRow key={label}>
            <AreaTileStatLabel>{label}</AreaTileStatLabel>
            <AreaTileStatValue>{value}</AreaTileStatValue>
          </StatRow>
        ))}
      </AreaTileStatsList>
    </AreaTileWrapper>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [financePeriod, setFinancePeriod] = useState('monthly')
  const [healthPeriod, setHealthPeriod] = useState('30d')
  const [agentStatus, setAgentStatus] = useState('all')
  const [careerPeriod, setCareerPeriod] = useState('30d')
  const [businessMrr, setBusinessMrr] = useState('all')
  const [contentStatus, setContentStatus] = useState('all')

  const { data: latestSnapshot, isLoading: loadingFinance } = useQuery({
    queryKey: ['finance', 'latestSnapshot'],
    queryFn: financeApi.latestSnapshot,
  })
  const { data: netWorth } = useQuery({
    queryKey: ['finance', 'net-worth'],
    queryFn: financeApi.netWorth,
  })
  const { data: streak, isLoading: loadingStreak } = useQuery({
    queryKey: ['health', 'streak'],
    queryFn: healthApi.streak,
  })
  const { data: healthSummary, isLoading: loadingHealth } = useQuery({
    queryKey: ['health', 'summary'],
    queryFn: healthApi.summary,
  })
  const { data: careerSummary, isLoading: loadingCareer } = useQuery({
    queryKey: ['career', 'summary'],
    queryFn: careerApi.summary,
  })
  const { data: businessSummary, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business', 'summary'],
    queryFn: businessApi.summary,
  })
  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
  })

  const { data: contentItems, isLoading: loadingContent } = useQuery({
    queryKey: ['content', 'items'],
    queryFn: () => contentApi.items(),
  })

  const isLoading = loadingFinance || loadingStreak || loadingHealth || loadingAgents || loadingContent

  const activeAgents = agents?.filter(a => a.is_active).length ?? 0
  const lastAgentRun = agents?.reduce((latest, a) => {
    if (!a.last_run_at) return latest
    if (!latest) return a.last_run_at
    return a.last_run_at > latest ? a.last_run_at : latest
  }, null as string | null)

  const animatedNetWorth = useCountUp(netWorth ? netWorth.net_worth : null)
  const animatedCCDebt = useCountUp(latestSnapshot?.cc_debt ? Number(latestSnapshot.cc_debt) : null)
  const animatedTakeHome = useCountUp(latestSnapshot?.take_home ? Number(latestSnapshot.take_home) : null)
  const animatedWeight = useCountUp(healthSummary?.weight ? Number(healthSummary.weight) : null)
  const animatedStreak = useCountUp(streak?.current_streak ?? null)
  const animatedSkills = useCountUp(careerSummary?.total_skills ?? null)
  const animatedMrr = useCountUp(businessSummary?.mrr ? Number(businessSummary.mrr) : null)
  const animatedAgents = useCountUp(agents?.length ?? null)

  const contentTotal = contentItems?.length ?? 0
  const contentPublished = contentItems?.filter(i => i.status === 'published').length ?? 0
  const contentThisMonth = contentItems?.filter(i => {
    if (i.status !== 'published' || !i.publish_date) return false
    const d = new Date(i.publish_date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length ?? 0

  const animatedContentPipeline = useCountUp(contentTotal - contentPublished)
  const animatedContentMonth = useCountUp(contentThisMonth)

  const dateString = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <Container>
      <ContentWrapper>



        <Grid>
          <GridItem5>
            <SummaryCard
              title="Finance"
              subtitle="Net worth, CC debt, and take-home income"
              icon={<IndianRupee size={16} />}
              action={
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    size="sm"
                    fullWidth={false}
                    options={[
                      { label: 'Monthly', value: 'monthly' },
                      { label: 'Yearly', value: 'yearly' },
                    ]}
                    value={financePeriod}
                    onChange={(val) => setFinancePeriod(val as string)}
                  />
                </div>
              }
              loading={loadingFinance}
              onClick={() => navigate('/areas/finance')}
              stats={[
                { label: 'Net worth', value: animatedNetWorth != null ? formatCurrency(animatedNetWorth) : '—' },
                { label: 'CC Debt', value: animatedCCDebt != null ? formatCurrency(animatedCCDebt) : '—' },
                { label: 'Take-home', value: animatedTakeHome != null ? formatCurrency(animatedTakeHome) : '—' },
              ]}
            />
          </GridItem5>
          <GridItem4>
            <SummaryCard
              title="Health"
              subtitle="Weight logs, gym streaks, and active stats"
              icon={<Heart size={16} />}
              action={
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    size="sm"
                    fullWidth={false}
                    options={[
                      { label: '7 Days', value: '7d' },
                      { label: '30 Days', value: '30d' },
                    ]}
                    value={healthPeriod}
                    onChange={(val) => setHealthPeriod(val as string)}
                  />
                </div>
              }
              loading={loadingHealth || loadingStreak}
              onClick={() => navigate('/areas/health')}
              stats={[
                { label: 'Weight', value: animatedWeight != null ? `${animatedWeight.toFixed(1)} kg` : '—' },
                { label: 'Gym streak', value: animatedStreak != null ? `${Math.round(animatedStreak)} days` : '—' },
                { label: 'Last workout', value: formatRelativeTime(streak?.last_workout_at ?? null) },
              ]}
            />
          </GridItem4>
          <GridItem3>
            <SummaryCard
              title="Agents"
              subtitle="Autonomous agent task runners and status"
              icon={<Zap size={16} />}
              action={
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    size="sm"
                    fullWidth={false}
                    options={[
                      { label: 'All', value: 'all' },
                      { label: 'Active', value: 'active' },
                    ]}
                    value={agentStatus}
                    onChange={(val) => setAgentStatus(val as string)}
                  />
                </div>
              }
              loading={loadingAgents}
              onClick={() => navigate('/agents')}
              stats={[
                { label: 'Active', value: String(activeAgents) },
                { label: 'Last run', value: formatRelativeTime(lastAgentRun) },
                { label: 'Total', value: animatedAgents != null ? String(Math.round(animatedAgents)) : '0' },
              ]}
            />
          </GridItem3>
        </Grid>

        <Grid>
          <GridItem8>
            <InnerGrid>
              <AreaTile
                title="Career"
                subtitle="Tracked skills and development events"
                icon={<Briefcase size={16} />}
                action={
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      size="sm"
                      fullWidth={false}
                      options={[
                        { label: '30 Days', value: '30d' },
                        { label: '90 Days', value: '90d' },
                      ]}
                      value={careerPeriod}
                      onChange={(val) => setCareerPeriod(val as string)}
                    />
                  </div>
                }
                loading={loadingCareer}
                onClick={() => navigate('/areas/career')}
                stats={[
                  { label: 'Skills', value: animatedSkills != null ? String(Math.round(animatedSkills)) : '—' },
                  { label: 'Last activity', value: formatRelativeTime(careerSummary?.last_event_at ?? null) },
                ]}
              />
              <AreaTile
                title="Business"
                subtitle="Monthly recurring revenue and milestones"
                icon={<Rocket size={16} />}
                action={
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      size="sm"
                      fullWidth={false}
                      options={[
                        { label: 'MRR: All', value: 'all' },
                        { label: 'MRR: Active', value: 'active' },
                      ]}
                      value={businessMrr}
                      onChange={(val) => setBusinessMrr(val as string)}
                    />
                  </div>
                }
                loading={loadingBusiness}
                onClick={() => navigate('/areas/business')}
                stats={[
                  { label: 'MRR', value: animatedMrr != null ? formatCurrency(animatedMrr) : '₹0' },
                  { label: 'Last shipped', value: formatRelativeTime(businessSummary?.last_feature_at ?? null) },
                ]}
              />
              <AreaTile
                title="Content"
                subtitle="Post pipeline and publication pipeline"
                icon={<PenLine size={16} />}
                action={
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      size="sm"
                      fullWidth={false}
                      options={[
                        { label: 'All Status', value: 'all' },
                        { label: 'Published', value: 'published' },
                      ]}
                      value={contentStatus}
                      onChange={(val) => setContentStatus(val as string)}
                    />
                  </div>
                }
                loading={loadingContent}
                onClick={() => navigate('/areas/content')}
                stats={[
                  { label: 'In pipeline', value: animatedContentPipeline != null ? String(Math.round(animatedContentPipeline)) : '—' },
                  { label: 'This month', value: animatedContentMonth != null ? String(Math.round(animatedContentMonth)) : '—' },
                ]}
              />
            </InnerGrid>
          </GridItem8>

          <GridItem4Xl>
            <GlassCard
              title="Quick Capture"
              subtitle="One-line jot that lands in your inbox"
              icon={<Inbox size={16} />}
              action={<Button size="sm" variant="ghost" onClick={() => navigate('/captures')}>View All</Button>}
              hoverable
              fadeIn="up"
              delay={100}
            >
              <QuickLogInput />
            </GlassCard>
          </GridItem4Xl>
        </Grid>

      </ContentWrapper>
    </Container>
  )
}

function QuickLogInput() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [confirmed, setConfirmed] = useState<string | null>(null)
  const { data: recentCaptures } = useQuery({
    queryKey: ['captures', 'recent'],
    queryFn: () => capturesApi.list?.() ?? Promise.resolve([]),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (text: string) => capturesApi.create(text),
    onSuccess: (_data, text) => {
      setConfirmed(text)
      if (inputRef.current) inputRef.current.value = ''
      setTimeout(() => setConfirmed(null), 3000)
    },
    onError: () => toast.error('Failed to save — try again'),
  })

  const handleSubmit = () => {
    const trimmed = inputRef.current?.value.trim() ?? ''
    if (!trimmed) return
    mutate(trimmed)
  }

  return (
    <Stack direction="column" gap={3}>
      <Textarea
        ref={inputRef}
        rows={3}
        placeholder="Log something… (gym done, ₹500 food, learned X)"
        disabled={isPending}
        style={{ resize: 'none' }}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
      />
      <Button
        aria-label="Save quick capture"
        onClick={handleSubmit}
        disabled={isPending}
        variant="primary"
        style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
      >
        {isPending ? <SpinningLoader style={{ width: '14px', height: '14px' }} /> : 'Capture'}
      </Button>
      {confirmed && (
        <QuickLogConfirmed>
          <CheckCircle2 style={{ width: '12px', height: '12px' }} /> Captured: {confirmed.length > 60 ? confirmed.slice(0, 60) + '…' : confirmed}
        </QuickLogConfirmed>
      )}
      {(!recentCaptures || recentCaptures.length === 0) ? (
        <EmptyState
          icon={PenLine}
          title="No recent captures"
          description="Your quick captures will appear here."
          action={{
            label: "Add Entry",
            onClick: () => {
              if (inputRef.current) inputRef.current.focus()
            }
          }}
        />
      ) : (
        <Stack direction="column" gap={2}>
          <QuickLogRecentTitle>Recent</QuickLogRecentTitle>
          <Stack direction="column" gap={1}>
            {recentCaptures.slice(0, 3).map((c: { id: string; text: string }) => (
              <QuickLogRecentItem key={c.id}>
                {c.text}
              </QuickLogRecentItem>
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}
