import type { ReactNode } from 'react'
import { TrendingUp, Activity, Briefcase, Building2, PenTool } from 'lucide-react'

// framer-motion variant shared by the hero's animated blocks
export const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export const STATS = [
  { num: '5', label: 'Life domains' },
  { num: '41+', label: 'Data tables tracked' },
  { num: '8', label: 'AI agent types' },
  { num: '100%', label: 'Data isolation' },
]

export interface DomainCardData {
  icon: ReactNode
  name: string
  desc: string
  feats: string[]
}

export const DOMAINS: DomainCardData[] = [
  {
    icon: <TrendingUp size={22} />,
    name: 'Finance',
    desc: 'Your complete money command center.',
    feats: ['Transactions & categories', 'Budgets & spending alerts', 'Investment portfolio', 'Loan EMI tracker', 'Goals & savings plans'],
  },
  {
    icon: <Activity size={22} />,
    name: 'Health',
    desc: 'Everything wellness in one timeline.',
    feats: ['Workout & gym logging', 'Weight & body metrics', 'Nutrition & calorie tracking', 'Sleep & water habits', 'Streak analytics'],
  },
  {
    icon: <Briefcase size={22} />,
    name: 'Career',
    desc: 'Own your professional trajectory.',
    feats: ['Job application tracker', 'AI skill-gap analysis', 'Career roadmap planner', 'Interview prep notes', 'Salary progression'],
  },
  {
    icon: <Building2 size={22} />,
    name: 'Business',
    desc: 'Run your side hustle or startup.',
    feats: ['Clients & contacts CRM', 'Revenue & expense view', 'Project milestones', 'Business journal', 'Event calendar'],
  },
  {
    icon: <PenTool size={22} />,
    name: 'Content',
    desc: 'Manage your creator pipeline.',
    feats: ['Kanban idea board', 'AI draft generation', 'Published archive', 'Twitter / X queue', 'Content calendar'],
  },
]

export const AI_FEATURES = [
  { title: 'Daily AI Brief', desc: 'Wake up to a personalised summary of your finances, health stats, and upcoming priorities.' },
  { title: 'Spending Anomaly Detection', desc: 'AI flags unusual transactions or overspend before they become a problem.' },
  { title: 'Skill Gap Analysis', desc: 'Upload your CV; get a precise breakdown of skills to learn next for your target role.' },
  { title: 'Smart Chat Assistant', desc: 'Ask anything about your data — "how much did I spend on food last month?" — and get a real answer.' },
  { title: 'Autonomous Agents', desc: 'Schedule AI tasks that run in the background: weekly digests, budget reviews, health check-ins.' },
  { title: 'AI Content Drafts', desc: 'Turn bullet points into polished LinkedIn posts, tweets, or blog articles in seconds.' },
]

export const COMPARE_ROWS = [
  { label: 'Dashboard + 1 area of your choice', free: true, paid: true },
  { label: 'All 5 life areas (Finance, Health, Career, Business, Content)', free: false, paid: true },
  { label: 'Unlimited entries & bank connections', free: false, paid: true },
  { label: 'AI Chat Assistant', free: false, paid: true },
  { label: 'Autonomous Agents', free: false, paid: true },
  { label: 'Integrations (Google, banks & syncs)', free: false, paid: true },
  { label: 'Pay only for the modules you enable', free: false, paid: true },
  { label: 'Switch modules anytime — prorated', free: false, paid: true },
]
