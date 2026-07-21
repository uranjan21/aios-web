import styled from 'styled-components'

const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  font-weight: 700;
  margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
`

const LastUpdated = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => `${theme.spacing[12]}`};
`

const Section = styled.section`
  margin-bottom: ${({ theme }) => `${theme.spacing[8]}`};
`

const Heading = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: 600;
  margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
  color: ${({ theme }) => theme.color.foreground};
`

const Text = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  line-height: 1.6;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
`

const List = styled.ul`
  list-style: disc;
  padding-left: ${({ theme }) => `${theme.spacing[6]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
  color: ${({ theme }) => theme.color.mutedForeground};
  
  li {
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    line-height: 1.6;
    margin-bottom: ${({ theme }) => `${theme.spacing[2]}`};
  }
`

export function TermsOfServicePage() {
  return (
    <div>
      <Title>Terms of Service</Title>
      <LastUpdated>Last Updated: {new Date().toLocaleDateString()}</LastUpdated>
      
      <Section>
        <Heading>1. Agreement to Terms</Heading>
        <Text>
          These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and aios ("we," "us" or "our"), concerning your access to and use of our application and website.
          You agree that by accessing the site, you have read, understood, and agreed to be bound by all of these Terms of Service. If you do not agree with all of these terms, then you are expressly prohibited from using the site and you must discontinue use immediately.
        </Text>
      </Section>

      <Section>
        <Heading>2. User Representations</Heading>
        <Text>
          By using the application, you represent and warrant that:
        </Text>
        <List>
          <li>All registration information you submit will be true, accurate, current, and complete.</li>
          <li>You will maintain the accuracy of such information and promptly update such registration information as necessary.</li>
          <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
          <li>You are not a minor in the jurisdiction in which you reside.</li>
          <li>You will not access the site through automated or non-human means, whether through a bot, script, or otherwise.</li>
        </List>
      </Section>

      <Section>
        <Heading>3. Prohibited Activities</Heading>
        <Text>
          You may not access or use the application for any purpose other than that for which we make the site available. 
          As a user of the site, you agree not to:
        </Text>
        <List>
          <li>Systematically retrieve data or other content from the site to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
          <li>Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords.</li>
          <li>Circumvent, disable, or otherwise interfere with security-related features of the site.</li>
          <li>Use the site as part of any effort to compete with us or otherwise use the site and/or the content for any revenue-generating endeavor or commercial enterprise.</li>
        </List>
      </Section>

      <Section>
        <Heading>4. Intellectual Property Rights</Heading>
        <Text>
          Unless otherwise indicated, the application is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the site (collectively, the "Content") and the trademarks, service marks, and logos contained therein are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights.
        </Text>
      </Section>

      <Section>
        <Heading>5. Limitation of Liability</Heading>
        <Text>
          In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, loss of data, or other damages arising from your use of the application, even if we have been advised of the possibility of such damages.
        </Text>
      </Section>

      <Section>
        <Heading>6. Modifications and Interruptions</Heading>
        <Text>
          We reserve the right to change, modify, or remove the contents of the site at any time or for any reason at our sole discretion without notice. We also reserve the right to modify or discontinue all or part of the site without notice at any time. We will not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the site.
        </Text>
      </Section>

      <Section>
        <Heading>7. Contact Us</Heading>
        <Text>
          In order to resolve a complaint regarding the site or to receive further information regarding use of the site, please contact us at: support@aios.dev.
        </Text>
      </Section>
    </div>
  )
}
