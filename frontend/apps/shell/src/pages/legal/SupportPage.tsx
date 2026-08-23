import styled from 'styled-components'
import { Mail, Clock } from 'lucide-react'

const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  font-weight: 700;
  margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
`

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => `${theme.spacing[12]}`};
  max-width: 500px;
  line-height: 1.6;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => `${theme.spacing[6]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[12]}`};
  
  @media ${({ theme }) => theme.media.sm} {
    grid-template-columns: 1fr 1fr;
  }
`

const Card = styled.div`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.spacing[6]}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[4]}`};
`

const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.primary}15;
  color: ${({ theme }) => theme.color.primary};
  display: flex;
  align-items: center;
  justify-content: center;
`

const CardTitle = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
`

const CardText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.5;
  margin: 0;
  flex: 1;
`

const CardLink = styled.a`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
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
  margin-bottom: ${({ theme }) => `${theme.spacing[12]}`};
`

const Heading = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: 600;
  margin-bottom: ${({ theme }) => `${theme.spacing[6]}`};
  color: ${({ theme }) => theme.color.foreground};
`

const FaqItem = styled.div`
  margin-bottom: ${({ theme }) => `${theme.spacing[6]}`};
  padding-bottom: ${({ theme }) => `${theme.spacing[6]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  &:last-child {
    border-bottom: none;
  }
`

const FaqQuestion = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin-bottom: ${({ theme }) => `${theme.spacing[2]}`};
`

const FaqAnswer = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.6;
  margin: 0;
`

export function SupportPage() {
  return (
    <div>
      <Title>How can we help?</Title>
      <Subtitle>
        Whether you have a question about features, your own API key, or anything else, we are ready to help.
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
          <CardLink href="mailto:support@controltower.dev">support@controltower.dev</CardLink>
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
            Currently, since Control Tower operates as a single-user instance that is locally hosted and end-to-end encrypted, password resets must be done directly through your deployment environment configuration. Check the documentation for recovery keys.
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
