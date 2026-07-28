import type { ReactNode } from 'react'
import { TrendingUp, Activity, Briefcase } from 'lucide-react'

// framer-motion variant shared by the hero's animated blocks
export const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export const STATS = [
  { num: '3', label: 'Life domains' },
  { num: 'Auto', label: 'UPI txns from Gmail' },
  { num: '8', label: 'AI agents on schedule' },
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
    feats: ['Auto-capture UPI & bank txns from Gmail', 'Categories, budgets & spending alerts', 'Investment portfolio', 'Loan EMI tracker', 'Goals & savings plans'],
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
    feats: ['Job application tracker', 'AI skill-gap analysis', 'Skills inventory', 'Career journal & notes'],
  },
]

export const AI_FEATURES = [
  { title: 'Auto Transaction Capture', desc: 'Connect Gmail and Control Tower reads your UPI and bank alerts, parses each one, and queues it for a one-tap review into your ledger.' },
  { title: 'Daily AI Brief', desc: 'Wake up to a personalised summary of your finances, health stats, and upcoming priorities.' },
  { title: 'Spending Anomaly Detection', desc: 'AI flags unusual transactions or overspend before they become a problem.' },
  { title: 'Skill Gap Analysis', desc: 'Point at a target role; get a precise breakdown of the skills to learn next.' },
  { title: 'Smart Chat Assistant', desc: 'Ask anything about your data — "how much did I spend on food last month?" — and get a real answer.' },
  { title: 'Autonomous Agents', desc: 'Schedule AI tasks that run in the background: weekly digests, budget reviews, health check-ins.' },
]

export const COMPARE_ROWS = [
  { label: 'Dashboard + 1 area of your choice', free: true, paid: true },
  { label: 'All 3 life areas (Finance, Health, Career)', free: false, paid: true },
  { label: 'Auto transaction capture from Gmail', free: false, paid: true },
  { label: 'Unlimited entries & connected accounts', free: false, paid: true },
  { label: 'AI Chat Assistant', free: false, paid: true },
  { label: 'Autonomous Agents', free: false, paid: true },
  { label: 'Integrations (Google, Gmail & syncs)', free: false, paid: true },
  { label: 'Pay only for the modules you enable', free: false, paid: true },
]
