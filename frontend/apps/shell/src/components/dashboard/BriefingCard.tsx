import styled, { keyframes } from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '@ledgr/ui'
import { Sunrise, Sparkles, Settings } from 'lucide-react'
import { insightsApi } from '@ct/shared/api/insights'

const pulseGlow = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.15); }
`

const StyledCard = styled(Card)`
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.color.border};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(20, 24, 34, 0.85)'
      : 'rgba(255, 255, 255, 0.85)'};
  backdrop-filter: blur(16px);
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: 0 8px 30px -6px rgba(0, 0, 0, 0.05);
`

const Body = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.65;
  color: ${({ theme }) => theme.color.foreground};
  white-space: pre-wrap;

  strong {
    font-weight: 700;
  }
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => `${theme.spacing[3]}`};
`

const Attribution = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: inline-flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 13px;
    height: 13px;
    color: ${({ theme }) => theme.color.accent};
  }
`

const GlassEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.5rem;
  gap: 16px;

  .icon-badge {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${({ theme }) => theme.color.accent}33 0%, ${({ theme }) => theme.color.accent}10 100%);
    border: 1px solid ${({ theme }) => theme.color.accent}44;
    color: ${({ theme }) => theme.color.accent};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;

    svg {
      width: 24px;
      height: 24px;
    }

    &::after {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 1px solid ${({ theme }) => theme.color.accent}22;
      animation: ${pulseGlow} 3s infinite ease-in-out;
    }
  }

  .title {
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
    font-weight: 800;
    color: ${({ theme }) => theme.color.foreground};
    letter-spacing: -0.01em;
  }

  .desc {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    color: ${({ theme }) => theme.color.mutedForeground};
    max-width: 24rem;
    line-height: 1.5;
  }

  .action-btn {
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 20px;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'};
    border: 1px solid ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : theme.color.border};
    color: ${({ theme }) => theme.color.foreground};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 140ms ease;

    &:hover {
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'};
      border-color: ${({ theme }) => theme.color.accent}55;
      transform: translateY(-1px);
    }
  }
`

/** Render the briefing markdown's **bold** spans without a markdown lib. */
function renderBold(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))
}

export function BriefingCard() {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['insights', 'briefing', 'today'],
    queryFn: insightsApi.briefingToday,
    staleTime: 10 * 60_000,
  })

  if (data?.status !== 'ready' || !data.briefing) {
    return (
      <StyledCard title="Daily Briefing" icon={<Sunrise size={16} />}>
        <GlassEmptyState>
          <div className="icon-badge">
            <Sunrise size={22} />
          </div>
          <span className="title">No briefing yet</span>
          <p className="desc">
            Your morning brief is synthesized automatically from yesterday's logs and today's schedule.
          </p>
          <button 
            type="button" 
            className="action-btn"
            onClick={() => navigate('/app/settings?section=briefing')}
          >
            <Settings size={13} />
            <span>Briefing Settings</span>
          </button>
        </GlassEmptyState>
      </StyledCard>
    )
  }

  return (
    <StyledCard
      title="Daily Briefing"
      subtitle={data.briefing.date}
      icon={<Sunrise size={16} />}
    >
      <Body>{renderBold(data.briefing.content_md)}</Body>
      <Footer>
        <Attribution>
          <Sparkles />
          <span>AI · generated from your logs</span>
        </Attribution>
        <Button size="sm" variant="ghost" onClick={() => navigate('/app/review')}>
          Open Review
        </Button>
      </Footer>
    </StyledCard>
  )
}

