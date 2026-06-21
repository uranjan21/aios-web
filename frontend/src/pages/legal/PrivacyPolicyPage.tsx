import styled from 'styled-components'

const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 40px;
  font-weight: 700;
  margin-bottom: 16px;
`

const LastUpdated = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 48px;
`

const Section = styled.section`
  margin-bottom: 32px;
`

const Heading = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${({ theme }) => theme.color.foreground};
`

const Text = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 16px;
`

const List = styled.ul`
  list-style: disc;
  padding-left: 24px;
  margin-bottom: 16px;
  color: ${({ theme }) => theme.color.mutedForeground};
  
  li {
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 8px;
  }
`

export function PrivacyPolicyPage() {
  return (
    <div>
      <Title>Privacy Policy</Title>
      <LastUpdated>Last Updated: {new Date().toLocaleDateString()}</LastUpdated>
      
      <Section>
        <Heading>1. Introduction</Heading>
        <Text>
          Welcome to aios. We respect your privacy and are committed to protecting your personal data. 
          This privacy policy will inform you as to how we look after your personal data when you visit our 
          website and tell you about your privacy rights and how the law protects you.
        </Text>
      </Section>

      <Section>
        <Heading>2. The Data We Collect About You</Heading>
        <Text>
          Personal data, or personal information, means any information about an individual from which that person can be identified. 
          We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
        </Text>
        <List>
          <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
          <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
          <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform.</li>
          <li><strong>Usage Data</strong> includes information about how you use our website, products and services.</li>
        </List>
      </Section>

      <Section>
        <Heading>3. How We Use Your Personal Data</Heading>
        <Text>
          We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
        </Text>
        <List>
          <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
          <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
          <li>Where we need to comply with a legal obligation.</li>
        </List>
      </Section>

      <Section>
        <Heading>4. Cookies</Heading>
        <Text>
          You can set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies. 
          If you disable or refuse cookies, please note that some parts of this website may become inaccessible or not function properly.
        </Text>
      </Section>

      <Section>
        <Heading>5. Data Security</Heading>
        <Text>
          We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
        </Text>
      </Section>

      <Section>
        <Heading>6. Your Legal Rights</Heading>
        <Text>
          Under certain circumstances, you have rights under data protection laws in relation to your personal data. These include the right to:
        </Text>
        <List>
          <li>Request access to your personal data.</li>
          <li>Request correction of your personal data.</li>
          <li>Request erasure of your personal data.</li>
          <li>Object to processing of your personal data.</li>
          <li>Request restriction of processing your personal data.</li>
          <li>Request transfer of your personal data.</li>
          <li>Right to withdraw consent.</li>
        </List>
      </Section>

      <Section>
        <Heading>7. Contact Us</Heading>
        <Text>
          If you have any questions about this privacy policy or our privacy practices, please contact us at support@aios.dev.
        </Text>
      </Section>
    </div>
  )
}
