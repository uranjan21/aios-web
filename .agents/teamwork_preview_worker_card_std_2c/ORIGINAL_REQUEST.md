# Worker 2c Request - Health, Finance & Content Card Standardization

## Working Directory
/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_2c

## Objective
Standardize card usage in `HistoryTab.tsx` (health), `FitnessTab.tsx` (health), `TransactionsTab.tsx` (finance), and `ContentPage.tsx` (content) per standard conventions.

## Specific Task Instructions

### 1. `frontend/src/components/areas/health/HistoryTab.tsx`
- Pass standard card props to the `<Table>` component:
  - `title="Health Logs"`
  - `subtitle="History of logged body metrics, sleep, nutrition and fitness logs"`
  - `icon={<Activity size={16} />}`
- Move search filter and "Export CSV" button (from `AreaToolbar`/`HeaderActionPortal` or local layouts) into the `action` prop of `<Table>` so they render parallel to the header.

### 2. `frontend/src/components/areas/health/FitnessTab.tsx`
- GoalCard: replace custom header layout with standard `GlassCard` props:
  - `title={goal.label}`
  - `subtitle="Daily fitness and water goals tracker"`
  - `icon={<Icon style={{ width: '14px', height: '14px', color: goal.color }} />}`
  - `action={done ? <CheckCircle2 style={{ width: '16px', height: '16px', color: 'var(--primary)' }} /> : undefined}`
- Habit Stats: convert custom GlassCards inside habit stats layout to `<KpiCard>` components (which are already imported):
  - Habits: `<KpiCard label="Habits" sub="Total habits monitored" value={...} icon={Repeat} />`
  - Done Today: `<KpiCard label="Done Today" sub="Habits checked today" value={...} icon={CheckCircle2} />`
  - Best Streak: `<KpiCard label="Best Streak" sub="Highest habit streak" value={...} icon={Flame} />`
- Workout Sessions List:
  - Wrap the entire workout sessions list in a parent `GlassCard` or `Card` with `title="Recent Workouts"`, `subtitle="Browse your recently completed workouts and exercises"`, and `icon={<Dumbbell size={16} />}`.
  - Inside the list, convert the custom headers in `SessionCard` to standard `GlassCard` props (`title={session.name}`, `subtitle={dayjs(session.logged_at).format('ddd, MMM D')}`, `icon={<Dumbbell size={14} />}`).

### 3. `frontend/src/components/areas/finance/TransactionsTab.tsx`
- Wrap the main transactions list `{body}` (or the table/list container) in a standard `Card` or `GlassCard` component, passing:
  - `title="Transactions"`
  - `subtitle="Browse and search transaction logs for the selected period"`
  - `icon={<ArrowLeftRight size={16} />}`

### 4. `frontend/src/pages/areas/ContentPage.tsx`
- Replace `PublishedZoneRoot` with a standard `Card` or `GlassCard` component, passing:
  - `title="Published Content"`
  - `subtitle="Catalog of successfully published posts and articles"`
  - `icon={<div style={{ display: 'flex', alignItems: 'center' }}><PublishedDot /></div>}`
  - `action={<PublishedCount>{isLoading ? '·' : items.length} live</PublishedCount>}`

## Integrity Constraints
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

## Completion Criteria
- Modify all specified files cleanly.
- Verify changes compile successfully.
- Write a `handoff.md` detailing changes, code diff references, and compilation validation.

## 2026-06-20T17:58:21Z
Read /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_2c/ORIGINAL_REQUEST.md and implement standard card layouts. Write progress to progress.md and handoff details to handoff.md. Use /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_2c as your working directory.
