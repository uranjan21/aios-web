import { motion } from 'framer-motion'
import { Sparkles, MessageSquare, Bot } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DocSection, DocH1, DocH2, DocH3, DocP, DocUl, DocLi, DocAlert, Code, Kbd } from '@/components/ui/DocStyles'
import styled from 'styled-components'

const PageWrap = styled(motion.div)`
  max-width: 56rem;
  padding-bottom: 96px;
`

const WelcomeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: ${({ theme }) => `${theme.color.primary}18`};
  color: ${({ theme }) => theme.color.primary};
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
`

const DocLink = styled(Link)`
  color: ${({ theme }) => theme.color.primary};
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  margin-bottom: 24px;
  &:hover { text-decoration: underline; }
`

const AreaLink = styled(Link)`
  color: ${({ theme }) => theme.color.primary};
  font-size: 14px;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`

export function GuideOverview() {
  return (
    <PageWrap initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <DocSection>
        <WelcomeBadge>
          <Sparkles size={16} />
          <span>Welcome to AiOs Guide</span>
        </WelcomeBadge>
        <DocH1>Master your AI Workspace</DocH1>
        <DocP>
          AiOs is a unified operating system powered by intelligent agents. It consolidates your tools into specialized
          workspaces and leverages AI to automate repetitive tasks, analyze your data, and 10x your productivity.
        </DocP>
      </DocSection>

      <DocSection>
        <DocH2>Core Capabilities</DocH2>
        <DocP>The system is split into two foundational pillars: conversational intelligence and autonomous execution.</DocP>

        <DocH3>Intelligent Chat</DocH3>
        <DocP>
          Talk to advanced AI models directly. You can share context, ask complex questions, and get detailed structured
          answers instantly. The chat interface supports rich markdown and code execution.
        </DocP>
        <DocLink to="/app/guide/chat">
          Read the Chat Guide <MessageSquare size={16} />
        </DocLink>

        <DocH3>Autonomous Agents</DocH3>
        <DocP>
          Deploy specialized agents that work in the background. Unlike standard chat, agents can autonomously research,
          analyze datasets, and execute multi-step workflows on your behalf while you focus on other tasks.
        </DocP>
        <DocLink to="/app/guide/agents">
          Read the Agents Guide <Bot size={16} />
        </DocLink>
      </DocSection>

      <DocSection>
        <DocH2>Specialized Areas</DocH2>
        <DocP>
          AiOs replaces disparate single-purpose apps with deeply integrated, specialized areas. Each area is customized
          with specific widgets, pipelines, and AI capabilities.
        </DocP>

        <DocUl>
          <DocLi>
            <strong>Finance:</strong> Track net worth, manage category budgets, and use the Debt Payoff Planner.{' '}
            <AreaLink to="/app/guide/areas/finance">Explore Finance →</AreaLink>
          </DocLi>
          <DocLi>
            <strong>Health:</strong> Log macros dynamically, track PRs, and map your 30-day weight trends.{' '}
            <AreaLink to="/app/guide/areas/health">Explore Health →</AreaLink>
          </DocLi>
          <DocLi>
            <strong>Career:</strong> Map your skills on a Radar chart and run AI Gap Analysis for target roles.{' '}
            <AreaLink to="/app/guide/areas/career">Explore Career →</AreaLink>
          </DocLi>
          <DocLi>
            <strong>Business:</strong> Track Runway, MRR trends via Highcharts, and log critical product events.{' '}
            <AreaLink to="/app/guide/areas/business">Explore Business →</AreaLink>
          </DocLi>
          <DocLi>
            <strong>Content:</strong> Manage posts via a Kanban board and generate platform-aware drafts using AI.{' '}
            <AreaLink to="/app/guide/areas/content">Explore Content →</AreaLink>
          </DocLi>
        </DocUl>

        <DocAlert title="Global Command Palette" type="tip">
          No matter which area you are in, you can press <Kbd>⌘</Kbd> + <Kbd>K</Kbd> to open the global command
          palette and jump instantly to another workspace or invoke an agent.
        </DocAlert>
      </DocSection>
    </PageWrap>
  )
}
