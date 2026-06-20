import styled from 'styled-components'

const Root = styled.div`
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
`

const IconBadge = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 24px;
  background: ${({ theme }) => `${theme.color.muted}80`};
  border: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`

const Initial = styled.span`
  font-size: 24px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
`

const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0 0 12px;
`

const Body = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.mutedForeground};
  max-width: 400px;
  line-height: 1.6;
  margin: 0;
`

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Root>
      <IconBadge>
        <Initial>{title.charAt(0)}</Initial>
      </IconBadge>
      <Title>{title}</Title>
      <Body>
        This area is currently under construction. Rolling out the new premium architecture across the entire AiOS.
      </Body>
    </Root>
  )
}
