# Card Standardization Audit Summary

Based on audits conducted by general, finance, and other area codebase explorers, the following components must be refactored to standard `@ledgr/ui` Card/GlassCard structures, adding icons, subtitles, and header action controls.

## 1. General & Layout Files

### DashboardPage.tsx (`frontend/src/pages/DashboardPage.tsx`)
- **`SummaryCard`**: Currently custom extension on `AppCard`. Replace custom header inside the body with standard `@ledgr/ui` `Card` or `GlassCard` props:
  - **Finance Card**: `icon={<IndianRupee size={16} />}`, `subtitle="Overview of net worth, debt, and take-home income"`, and add a period dropdown filter in `action`.
  - **Health Card**: `icon={<Heart size={16} />}`, `subtitle="Weight tracker and workout consistency"`, and add a range dropdown filter in `action`.
  - **Agents Card**: `icon={<Zap size={16} />}`, `subtitle="Status and runtime logs of AI agents"`, and add a status select filter in `action`.
- **`AreaTile`**: Currently custom extension on `AppCard`. Replace custom header inside the body with standard `@ledgr/ui` `Card` or `GlassCard` props:
  - **Career Card**: `icon={<Briefcase size={16} />}`, `subtitle="Skill progression and activity tracker"`, and add a period filter in `action`.
  - **Business Card**: `icon={<Rocket size={16} />}`, `subtitle="Monthly recurring revenue and shipping logs"`, and add an MRR filter in `action`.
  - **Content Card**: `icon={<PenLine size={16} />}`, `subtitle="Drafting pipeline and monthly publication count"`, and add a status filter in `action`.
- **Quick Capture Card**: Add a link button inside the `action` prop: e.g. `<Button size="sm" variant="ghost">View All</Button>`.

### LoginPage.tsx (`frontend/src/pages/LoginPage.tsx`)
- **`LoginCard`**: Replace custom form wrapper with `@ledgr/ui` `GlassCard` or `Card`, passing standard header props:
  - `icon={<Lock size={16} />}` (or Shield)
  - `title="Welcome back"`
  - `subtitle="Enter your passphrase to access your command center"`
  - `action={<StatusPill label="Secure" tone="primary" />}` (or similar status pill)

### SettingsPage.tsx (`frontend/src/pages/SettingsPage.tsx`)
- **Sections (Appearance, System Status, AI Usage, Keyboard Shortcuts)**: Add actions inside the `action` prop:
  - Appearance: Reset button.
  - System Status: Move status/refresh trigger to `action`.
  - AI Usage: Add range filter (Daily/Weekly/Monthly).
  - Keyboard Shortcuts: Search/filter dropdown.
- **Account Card**: Move the "Sign out" button to the `action` prop of the `GlassCard`.

### WorkspaceLayout.tsx (`frontend/src/components/layout/WorkspaceLayout.tsx`)
- **`Rail`**: Replace custom styled `div` with a styled `@ledgr/ui` `Card` or `GlassCard`. Supply header props: e.g., `icon={<LayoutDashboard size={16} />}` and `subtitle="Workspace tools & quick actions"`.

---

## 2. Finance Components (`frontend/src/components/areas/finance/`)

### Standardize Card Imports
In `AccountManager.tsx`, `BudgetsTab.tsx`, `CategoryManager.tsx`, `GoalsTab.tsx`, `InvestmentsTab.tsx`, and `LoansTab.tsx`:
- Change `import { Card } from '@/components/ui/Card'` to `import { Card } from '@ledgr/ui'`.

### TransactionsTab.tsx (`frontend/src/components/areas/finance/TransactionsTab.tsx`)
- **`SummaryBar`**: Refactor the custom `div` pills (`SumPill`) to standard `<GlassCard>` or `<Card>` containers. Assign icons (`TrendingUp`, `TrendingDown`, `Wallet`), subtitles ("Total income", etc.), and display values in the card body.

### FinanceStats.tsx (`frontend/src/components/areas/finance/FinanceStats.tsx`)
- **Income vs Expense Chart**: Extract custom HTML legend `LegendList` from card body to the card header's `action` prop. Add a period filter (Monthly/Yearly) to the `action` prop.
- **Spending by Category Chart**: Extract custom scroll legend `PieScroll` from card body to the card header's `action` prop. Add a period filter.
- **Drill-down Card**: Move the absolute-positioned `CloseBtn` (with `X` icon) from the card body to the card header's `action` prop.
- **Budget vs Actual**: Add a status filter in the `action` prop.
- **Trend Chart**: Add a timeline filter in the `action` prop.

### HomeTab.tsx (`frontend/src/components/areas/finance/HomeTab.tsx`)
- Add appropriate period/status filters in `action` prop for `HealthScoreCard`, `StatTile` (Net Worth), `StatTile` (Spent), `StatTile` (Income), `StatTile` (Savings Rate), and `Upcoming Payments`.

---

## 3. Other Area Components

### Business Page & Components
- **Runway Calculator** (`BusinessPage.tsx`): Add `subtitle="Burn rate and operational cash forecast"` and a period/budget scope filter in `action`.
- **Ledgr Project Card** (`BusinessPage.tsx`): Replace custom layout inside body with standard `GlassCard` props: `title="Ledgr"`, `subtitle="SaaS accounting for Indian freelancers"`, `icon={<Rocket size={16} />}` (or the IconBadge), and `action={<Badge tone="info">Building</Badge>}`.
- **Event Timeline** (`BusinessPage.tsx`): Add `subtitle="Venture milestones, decisions, and feature releases"` and a filter dropdown in `action` adjacent to the Log button.
- **MRR Trend** (`SummaryTab.tsx`): Add period filter dropdown in `action`.
- **MetricTile** (`SummaryTab.tsx`): Remove the duplicate `<TileSub>` rendering from card body.
- **Event Log** (`EventsTab.tsx`): Add a filter dropdown adjacent to the Log button in `action`.

### Career Page & Components
- **CareerStat KPI tiles** (`CareerPage.tsx`): Add icons (`BookOpen`, `Briefcase`, `Activity`, `History`) and use standard Card title/subtitle/icon props.
- **Opportunities Pipeline** (`CareerPage.tsx`): Add `subtitle="Active job postings and project pipelines"` and filter in `action`.
- **Career Timeline** (`CareerPage.tsx`): Add `subtitle="Milestones and professional history timeline"` and filter in `action`.
- **Skills Radar** (`CareerPage.tsx`): Add `subtitle="Visual mapping of core competencies"`, filter in `action`, and remove the redundant inner `GlassCard` wrapper from `CareerRadar`.
- **OppListSection** (`OpportunitiesTab.tsx`): Add period/date range filter in `action`.
- **AI Skill-Gap Analysis** (`SkillGapCard.tsx`): Add action button in `action`.

### Health Page & Components
- **KpiCard tiles** (`BodySleepTab.tsx`): Add subtitles via `sub` prop.
- **Weight & Body Fat Trend** (`BodySleepTab.tsx`): Add period filter in `action` adjacent to legend.
- **Sleep Duration Trend** (`BodySleepTab.tsx`): Add period filter in `action` adjacent to legend.
- **Sleep Last 7 Days** (`BodySleepTab.tsx`): Add quality filter in `action`.
- **GoalCard** (`FitnessTab.tsx`): Convert custom header in body to standard GlassCard props (`title`, `subtitle`, `icon`, `action`).
- **Personal Records** (`FitnessTab.tsx`): Add filter in `action`.
- **Habits Stats** (`FitnessTab.tsx`): Convert custom GlassCards to `KpiCard` components.
- **SessionCard** (`FitnessTab.tsx`): Wrap list in parent card, convert SessionCard custom headers to standard GlassCard props.
- **Health Logs Table** (`HistoryTab.tsx`): Wrap `Table` in standard Card/GlassCard. Place the filter dropdown and Export CSV button in `action`.
- **Today's Nutrition** (`NutritionTab.tsx`): Add period filter in `action`.

### Content Page & Components
- **Content Summary** (`ContentPage.tsx`): Add period filter in `action`.
- **Published Content** (`ContentPage.tsx`): Convert custom `PublishedZoneRoot` div wrapper to standard GlassCard or Card.
