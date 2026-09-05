/**
 * Guide — the user-facing manual for Control Tower.
 *
 * `WelcomeWizard` runs once at signup and there is no docs site, so after that
 * first minute everything a user has to work out by clicking around was written
 * down nowhere: which area is free, where accounts are added, what the seven
 * agents do on a schedule, what ⌘K and ⌘L are for. This page is the manual the
 * wizard hands off to — permanent, linkable, and re-readable on day 200.
 *
 * It is built out of the module kit like every other destination, and it is
 * deliberately NOT a wall of prose: every row that describes a destination
 * navigates to it, so reading the guide and using the app are the same act.
 * Rows that describe something with no destination (the shortcuts, the
 * pricing facts) carry no handler and stay inert — a row that looks clickable
 * and does nothing is the exact defect this page would otherwise teach.
 *
 * Static content by design. It describes the product, not the account, so it
 * makes no API calls and renders identically for a signed-out-of-everything
 * free user and an admin.
 */
import { useNavigate } from 'react-router-dom'
import {
  Bot, BookOpen, Heart, Keyboard, Rocket, Settings, Shield, Sparkles,
  Sunrise, Target,
} from 'lucide-react'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'

/** A row that goes somewhere: `to` is consumed by the module's onRowClick. */
interface LinkRow {
  title: string
  meta: string
  to: string
  value?: string
  mono?: string
}

/*
 * The mac/other split is only about what the key CAP READS. The handlers
 * themselves accept metaKey OR ctrlKey everywhere (useKeyboardShortcuts,
 * CommandPalette), so the behaviour is identical on both platforms.
 */
const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform || '')
const MOD = isMac ? '⌘' : 'Ctrl'

const START: LinkRow[] = [
  {
    mono: '1',
    title: 'Verify your email',
    meta: 'The areas stay locked until the address on your account is confirmed. The banner at the top of the app is the fastest way in.',
    to: '/app/settings/security',
  },
  {
    mono: '2',
    title: 'Add your accounts',
    meta: 'Finance needs at least one account before a transaction can be logged. Categories and loan/bill defaults live on the same page.',
    to: '/app/finance/setup?section=accounts',
  },
  {
    mono: '3',
    title: 'Set your targets',
    meta: 'Body, fitness and nutrition numbers. Every Health module draws its reference lines against these.',
    to: '/app/health/targets',
  },
  {
    mono: '4',
    title: 'Connect Google',
    meta: 'Gmail feeds the transaction inbox, Calendar feeds the day view, Fit feeds body metrics. All optional, all revocable.',
    to: '/app/settings/connections',
  },
]

const DAILY: LinkRow[] = [
  { title: 'Today', meta: 'Your briefing, the day’s focus and a 12-week activity heat map.', to: '/app' },
  { title: 'This week', meta: 'Time-block the week Monday to Sunday and see where the hours actually went.', to: '/app/week' },
  { title: 'Weekly review', meta: 'A guided pass that writes: it records progress against each goal and captures what you want to carry forward.', to: '/app/review' },
]

const AREAS: LinkRow[] = [
  { title: 'Finance', meta: 'Accounts, transactions, budgets, bills, investments, and an inbox of transactions parsed out of your bank email.', to: '/app/finance' },
  { title: 'Health', meta: 'Workouts, nutrition, body metrics, sleep and habits, measured against your targets.', to: '/app/health' },
  { title: 'Career', meta: 'A running journal, a skills inventory, the learning queue that closes its gaps, and an opportunity pipeline.', to: '/app/career' },
]

const WORKSPACE: LinkRow[] = [
  { title: 'Goals', meta: 'Long-range outcomes, each tied to a domain. Goals are set here for every area, not inside the areas themselves.', to: '/app/workspace/goals' },
  { title: 'Milestones', meta: 'The checkpoints a goal is measured by. Progress on a goal is the share of its milestones hit.', to: '/app/workspace/milestones' },
  { title: 'Projects & sprints', meta: 'Projects carry a domain; a sprint groups the work for a period. A task inherits both from its parent.', to: '/app/workspace/projects' },
  { title: 'Tasks', meta: 'Everything actually to be done, filterable by domain, project and sprint.', to: '/app/workspace/tasks' },
]

const ASSISTANT: LinkRow[] = [
  {
    title: 'Chat',
    meta: 'An assistant with your own data in context. It can log a transaction, add a task or read your notes back to you — actions that change data ask first.',
    to: '/app/chat',
    value: `${MOD}J`,
  },
  {
    title: 'Agents',
    meta: 'Seven scheduled workers. Four run by default; the rest you turn on. Each one’s schedule fires in your own timezone.',
    to: '/app/agents',
  },
]

/** Key caps, not destinations — deliberately no handler on this module. */
const SHORTCUTS: Array<{ title: string; meta: string; value: string }> = [
  { title: 'Command palette', meta: 'Jump to any page, trigger an agent, or ask a question with `?`.', value: `${MOD}K` },
  { title: 'Quick log', meta: 'Capture a transaction, a workout or a note in one line. On a project or sprint page it adds a task instead.', value: `${MOD}L` },
  { title: 'Assistant drawer', meta: 'Opens the assistant over whatever page you are on.', value: `${MOD}J` },
  { title: 'Go to…', meta: 'Then a letter: f Finance, h Health, r Career, k Projects, c Chat, a Agents, w Week, d Today, s Settings, u Guide.', value: 'g' },
  { title: 'Switch theme', meta: 'Light and dark. The app follows your OS until you choose.', value: `${MOD}⇧T` },
  { title: 'Help', meta: 'Opens the command palette from anywhere outside a text field.', value: '?' },
]

/** Mirrors DEFAULT_AGENTS in backend/app/api/agents.py. */
const AGENTS: Array<{ title: string; meta: string; value: string; tagLabel: string; tagColorKey: string }> = [
  { title: 'Morning Brief', meta: 'Your day ahead from yesterday’s activity, today’s bills and open priorities. Skips days with nothing to report.', value: '06:00 daily', tagLabel: 'On', tagColorKey: 'success' },
  { title: 'Health Coach', meta: 'Weekly check-in across workouts, logs and habits.', value: 'Mon 06:00', tagLabel: 'On', tagColorKey: 'success' },
  { title: 'Monthly Finance', meta: 'A snapshot of the month that closed.', value: '1st, 09:00', tagLabel: 'On', tagColorKey: 'success' },
  { title: 'Vault Extractor', meta: 'Sweeps your notes into the knowledge layer. No AI credits — it is a plain sync.', value: '23:00 daily', tagLabel: 'On', tagColorKey: 'success' },
  { title: 'Transaction Tracker', meta: 'Reads bank and UPI alerts from linked Gmail accounts and queues them in the Finance inbox. Enables itself when you connect Gmail.', value: 'Every 6h', tagLabel: 'Needs Gmail', tagColorKey: 'warning' },
  { title: 'Statement Reconciler', meta: 'Parses statement emails and queues only the lines not already in your ledger.', value: '08:30 daily', tagLabel: 'Needs Gmail', tagColorKey: 'warning' },
  { title: 'Professional Pulse', meta: 'Weekly career review — blockers and the highest-leverage next move.', value: 'Mon 07:00', tagLabel: 'Opt-in', tagColorKey: 'mutedFg' },
]

const SETTINGS: LinkRow[] = [
  { title: 'Profile', meta: 'Your name, picture and how you signed in.', to: '/app/settings/profile' },
  { title: 'Security & privacy', meta: 'Password, email verification, and deleting the account.', to: '/app/settings/security' },
  { title: 'Appearance', meta: 'Light or dark, and the density of the interface.', to: '/app/settings/appearance' },
  { title: 'Notifications', meta: 'Browser push and which events are worth interrupting you for.', to: '/app/settings/notifications' },
  { title: 'Connections', meta: 'Google accounts, and the sync state of each one.', to: '/app/settings/connections' },
  { title: 'AI & knowledge', meta: 'Model, your own API key, and what the assistant may read.', to: '/app/settings/ai' },
]

const PRIVACY: LinkRow[] = [
  { title: 'Your data is yours alone', meta: 'Every record is scoped to your account at the database level. Nothing is shared between accounts, ever.', to: '/app/settings/security' },
  { title: 'Verify your email', meta: 'Areas stay locked until the address is confirmed. Resend the link from the banner if it never arrived.', to: '/app/settings/security' },
  { title: 'Delete your account', meta: 'One action, and every row belonging to you goes with it. There is no soft-delete and no recovery.', to: '/app/settings/security' },
  { title: 'API keys', meta: 'Bring your own OpenAI or Anthropic key and it is encrypted at rest. Requests then run on your key, not ours.', to: '/app/settings/ai' },
]

export function GuidePage() {
  const navigate = useNavigate()
  const go = (rows: LinkRow[]) => (i: number) => navigate(rows[i].to)
  const strip = (rows: LinkRow[]) => rows.map(({ to: _to, ...r }) => r)

  const modules: ModuleSpec[] = [
    {
      kind: 'rows',
      span: 12,
      icon: Rocket,
      iconKey: 'accent',
      title: 'Start here',
      subtitle: 'Four things that make everything else work. Each row opens the page it describes.',
      rows: START.map(({ to: _to, ...r }) => ({ ...r, monoKey: 'accent' as const })),
      onRowClick: go(START),
    },
    {
      kind: 'rows',
      span: 6,
      icon: Sunrise,
      iconKey: 'accent',
      title: 'Your day',
      subtitle: 'Three horizons on the same question: what deserves your attention.',
      rows: strip(DAILY),
      onRowClick: go(DAILY),
    },
    {
      kind: 'rows',
      span: 6,
      icon: Heart,
      iconKey: 'health',
      title: 'Life areas',
      subtitle: 'Where the data lives. Each area has its own sub-pages in the sidebar.',
      rows: strip(AREAS),
      onRowClick: go(AREAS),
    },
    {
      kind: 'rows',
      span: 6,
      icon: Target,
      iconKey: 'career',
      title: 'Workspace',
      subtitle: 'Planning for every domain in one place — goals do not live inside the areas.',
      rows: strip(WORKSPACE),
      onRowClick: go(WORKSPACE),
    },
    {
      kind: 'rows',
      span: 6,
      icon: Sparkles,
      iconKey: 'accent',
      title: 'The assistant',
      subtitle: 'One model, your data, two ways in.',
      rows: strip(ASSISTANT),
      onRowClick: go(ASSISTANT),
    },
    {
      kind: 'rows',
      span: 6,
      icon: Keyboard,
      iconKey: 'mutedFg',
      title: 'Keyboard',
      subtitle: 'The palette and quick log are the two worth learning.',
      rows: SHORTCUTS,
    },
    {
      kind: 'rows',
      span: 6,
      icon: Bot,
      iconKey: 'accent',
      title: 'Agents that run for you',
      subtitle: 'Schedules fire in your timezone. Turn any of them off, or change the hour, on the Agents page.',
      action: 'Open agents',
      onAction: () => navigate('/app/agents'),
      rows: AGENTS,
    },
    {
      kind: 'rows',
      span: 6,
      icon: Settings,
      iconKey: 'mutedFg',
      title: 'Where each setting lives',
      subtitle: 'Six tabs, and the rail inside the page is what switches between them.',
      action: 'Open settings',
      onAction: () => navigate('/app/settings'),
      rows: SETTINGS.map(({ to: _to, ...r }) => r),
      onRowClick: go(SETTINGS),
    },
    {
      kind: 'rows',
      span: 6,
      icon: Shield,
      iconKey: 'success',
      title: 'Your data and privacy',
      subtitle: 'What we hold, and how to get it back or get rid of it.',
      rows: strip(PRIVACY),
      onRowClick: go(PRIVACY),
    },
    {
      kind: 'rows',
      span: 6,
      icon: BookOpen,
      iconKey: 'mutedFg',
      title: 'Still stuck',
      subtitle: 'Nothing here answers it, or something is behaving wrongly.',
      action: 'Contact support',
      onAction: () => navigate('/support'),
      rows: [
        { title: 'The Finance inbox is empty', meta: 'The tracker only reads mail from a linked Gmail account, and only mail it recognises as financial. Connect Gmail, then use "Fetch now" on the inbox.' },
        { title: 'An agent never ran', meta: 'Check it is switched on, and that the hour on its schedule has passed in your timezone. Trigger it by hand from the Agents page to test.' },
      ],
    },
  ]

  return (
    <PageContainer>
      <PageContent>
        <ModuleGrid modules={modules} />
      </PageContent>
    </PageContainer>
  )
}
