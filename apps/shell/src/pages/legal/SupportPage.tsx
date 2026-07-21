import styled from 'styled-components'
import { Mail, Clock } from 'lucide-react'

const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 40px;
  font-weight: 700;
  margin-bottom: 16px;
`

const Subtitle = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 48px;
  max-width: 500px;
  line-height: 1.6;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 48px;
  
  @media (min-width: 640px) {
    grid-template-columns: 1fr 1fr;
  }
`

const Card = styled.div`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ theme }) => theme.color.primary}15;
  color: ${({ theme }) => theme.color.primary};
  display: flex;
  align-items: center;
  justify-content: center;
`

const CardTitle = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
`

const CardText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.5;
  margin: 0;
  flex: 1;
`

const CardLink = styled.a`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.primary};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  &:hover {
    text-decoration: underline;
  }
`

const Section = styled.section`
  margin-bottom: 48px;
`

const Heading = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: ${({ theme }) => theme.color.foreground};
`

const FaqItem = styled.div`
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  &:last-child {
    border-bottom: none;
  }
`

const FaqQuestion = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin-bottom: 8px;
`

const FaqAnswer = styled.p`
  font-size: 15px;
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.6;
  margin: 0;
`

export function SupportPage() {
  return (
    <div>
      <Title>How can we help?</Title>
      <Subtitle>
        Whether you have a question about features, pricing, or anything else, our team is ready to answer all your questions.
      </Subtitle>

      <Grid>
        <Card>
          <IconWrapper>
            <Mail size={24} />
          </IconWrapper>
          <CardTitle>Email Support</CardTitle>
          <CardText>
            Get in touch with our support team directly. We aim to respond to all inquiries within 24 hours.
          </CardText>
          <CardLink href="mailto:support@aios.dev">support@aios.dev</CardLink>
        </Card>

        <Card>
          <IconWrapper>
            <Clock size={24} />
          </IconWrapper>
          <CardTitle>Business Hours</CardTitle>
          <CardText>
            Our core support team is available Monday through Friday.
          </CardText>
          <CardText style={{ fontWeight: 500, color: 'var(--foreground)' }}>
            9:00 AM - 6:00 PM (EST)
          </CardText>
        </Card>
      </Grid>

      <Section>
        <Heading>Frequently Asked Questions</Heading>
        
        <FaqItem>
          <FaqQuestion>How do I reset my passphrase?</FaqQuestion>
          <FaqAnswer>
            Currently, since aios operates as a single-user instance that is locally hosted and end-to-end encrypted, password resets must be done directly through your deployment environment configuration. Check the documentation for recovery keys.
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion>Where is my data stored?</FaqQuestion>
          <FaqAnswer>
            Your data is stored within your own connected Obsidian vault or local database depending on your configuration. We do not store your private notes or chats on our central servers.
          </FaqAnswer>
        </FaqItem>

        <FaqItem>
          <FaqQuestion>How do I set up a new Agent?</FaqQuestion>
          <FaqAnswer>
            Navigate to the Agents tab in your dashboard, click "New Agent", and follow the setup wizard to connect your desired integrations and define the agent's schedule and prompt.
          </FaqAnswer>
        </FaqItem>
      </Section>
    </div>
  )
}
