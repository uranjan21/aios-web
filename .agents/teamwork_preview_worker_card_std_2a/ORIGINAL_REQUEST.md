# Worker 2a Request - General Pages Card Standardization

## Working Directory
/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_2a

## Objective
Standardize card usage in `LoginPage.tsx`, `DashboardPage.tsx`, `SettingsPage.tsx`, `AiInsightCard.tsx`, and `CareerRadar.tsx` per standard conventions.

## Specific Task Instructions

### 1. `frontend/src/pages/LoginPage.tsx`
- Replace custom `LoginCard` wrapper with `@ledgr/ui` `GlassCard` or standard `Card`.
- Supply props: `title="Welcome back"`, `subtitle="Enter your passphrase to continue"`, `icon={<Shield size={16} />}` (import `Shield` from `lucide-react`).
- Remove the custom `<DesktopWelcome>`, welcome title/subtitle elements.

### 2. `frontend/src/pages/DashboardPage.tsx`
- In `SummaryCard` and `AreaTile` instantiations, pass `icon` prop as a JSX element instead of a component class reference.
  - E.g., `icon={<IndianRupee size={16} />}` instead of `icon={IndianRupee}`.
- Add a descriptive 1-line faded `subtitle` prop to all card instances:
  - Finance: `subtitle="Net worth, CC debt, and take-home income"`
  - Health: `subtitle="Weight logs, gym streaks, and active stats"`
  - Agents: `subtitle="Autonomous agent task runners and status"`
  - Career: `subtitle="Tracked skills and development events"`
  - Business: `subtitle="Monthly recurring revenue and milestones"`
  - Content: `subtitle="Post pipeline and publication pipeline"`

### 3. `frontend/src/pages/SettingsPage.tsx`
- Move the "Sign out" button from inside the card body into the `action` prop of the `GlassCard` for "Account".
  ```tsx
  action={
    <Button variant="destructive" size="sm" onClick={handleLogout}>
      <LogOut size={12} /> Sign out
    </Button>
  }
  ```

### 4. `frontend/src/components/AiInsightCard.tsx`
- Refactor the custom card header layout inside the card body. Pass standard `GlassCard` props instead:
  - `title={title ?? (area === 'finance' ? 'Explain This Month' : 'Explain This Week')}`
  - `subtitle={area === 'finance' ? 'AI financial advisor analysis' : 'AI health analyst snapshot'}`
  - `icon={<Sparkles size={14} style={{ color: '#7c3aed', flexShrink: 0 }} />}`
  - `action={<Button size="sm" ...>...</Button>}` (move the toggle/close or action buttons there).
- Remove custom `<CardHeader>` styled component and internal header divs.

### 5. `frontend/src/components/CareerRadar.tsx`
- Remove the custom `FullWidthCard` wrapper entirely and return `<HighchartsReact ... />` directly (avoiding card-in-card nesting).

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

## 2026-06-20T17:58:20Z
Read /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_2a/ORIGINAL_REQUEST.md and implement standard card layouts. Write progress to progress.md and handoff details to handoff.md. Use /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_2a as your working directory.
