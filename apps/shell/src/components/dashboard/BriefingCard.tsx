import styled from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '@ledgr/ui'
import { Sunrise } from 'lucide-react'
import { insightsApi } from '@aios/shared/api/insights'

const Body = styled.div`
  font-size: 13.5px;
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
  margin-top: 12px;
`

const Attribution = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
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

  if (data?.status !== 'ready' || !data.briefing) return null

  return (
    <Card
      title="Daily Briefing"
      subtitle={data.briefing.date}
      icon={<Sunrise size={16} />}
      fadeIn="up"
    >
      <Body>{renderBold(data.briefing.content_md)}</Body>
      <Footer>
        <Attribution>AI · generated from your logs</Attribution>
        <Button size="sm" variant="ghost" onClick={() => navigate('/app/review')}>
          Open Review
        </Button>
      </Footer>
    </Card>
  )
}
