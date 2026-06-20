# Card Standardization Audit Report

This report presents a comprehensive audit of all `Card`, `GlassCard`, and custom card-like wrappers inside all primary Page files and area tab components across the `aios-web` application, referencing the standard guidelines in `AGENTS.md`.

---

## 1. Primitive Card Reference Verification
* **Source Path**: `ledgr-ui/src/primitives/Card/Card.tsx`
* **Props Verified**:
  * `title` (string): Optional header title.
  * `subtitle` (string): Optional 1-line faded subtitle (uses `CardSubtitle` styled component with `color: theme.color.mutedForeground` and `font-size: 11px`).
  * `icon` (ReactNode): Renders left of the title inside `<TitleGroup>`.
  * `action` (ReactNode): Renders on the right, aligned parallel to the title (supports filters, segmented controls, or buttons).
  * `variant` (`'default' | 'elevated' | 'glass' | 'outline' | 'ghost'`): Visual style variation.
  * `interactive` / `hoverable` (boolean): Applies hover lift effect (translateY, scale, and border-color transitions).
  * `size` (`'sm' | 'md' | 'lg' | 'none'`): Internal padding.
  * `noPadding` (boolean): Sets padding to none.
  * `fadeIn` (`'none' | 'up'`): Slide-up entrance animation.

---

## 2. Audit Findings & Proposed Refactoring Changes

Below is a detailed list of all files with card usages, identifying standard deviations, layout issues, and concrete proposed refactoring changes to align them with standard conventions.

### A. General pages

#### 1. `frontend/src/pages/LoginPage.tsx`
* **Current Implementation**:
  * Uses a custom `LoginCard` component which is a custom styled `styled.form` wrapper.
  * Extraneous header component `<DesktopWelcome>` with `<WelcomeTitle>` and `<WelcomeSub>` is rendered outside the card.
* **Standard Deviation**:
  * Form wrapping does not use standard `@ledgr/ui` `Card` or `GlassCard` component.
  * Header layout is custom and detached from the card itself.
* **Proposed Changes**:
  * Replace the custom `LoginCard` wrapper with `@ledgr/ui` `GlassCard` or standard `Card` using the `as="form"` prop.
  * Supply the standard header props:
    * `title="Welcome back"`
    * `subtitle="Enter your passphrase to continue"`
    * `icon={<Shield size={16} />}`
  * Remove the custom `<DesktopWelcome>` wrapper and nested title/subtitle elements.

#### 2. `frontend/src/pages/DashboardPage.tsx`
* **Current Implementation**:
  * `SummaryCard` and `AreaTile` components wrap `@ledgr/ui`'s `Card` (`AppCard`).
* **Standard Deviation**:
  * **Icon Bug**: The icon prop is passed as a component class reference (e.g. `icon={IndianRupee}`, `icon={Heart}`, `icon={Zap}`, `icon={Briefcase}`, `icon={Rocket}`, `icon={PenLine}`) instead of a JSX element (e.g. `icon={<IndianRupee size={16} />}`). Standard React will not render a component constructor directly as a child element.
  * **Missing Subtitles**: All instances of `SummaryCard` and `AreaTile` lack a `subtitle` prop.
  * **Missing Actions**: Cards do not utilize the `action` prop (though clicks navigate to area pages).
* **Proposed Changes**:
  * Refactor `SummaryCard` and `AreaTile` instantiations to pass the icons as JSX elements with consistent sizing, e.g. `icon={<IndianRupee size={16} />}`.
  * Add descriptive 1-line faded `subtitle` props to all cards:
    * Finance SummaryCard: `subtitle="Net worth, CC debt, and take-home income"`
    * Health SummaryCard: `subtitle="Weight logs, gym streaks, and active stats"`
    * Agents SummaryCard: `subtitle="Autonomous agent task runners and status"`
    * Career AreaTile: `subtitle="Tracked skills and development events"`
    * Business AreaTile: `subtitle="Monthly recurring revenue and milestones"`
    * Content AreaTile: `subtitle="Post pipeline and publication pipeline"`

#### 3. `frontend/src/pages/SettingsPage.tsx`
* **Current Implementation**:
  * Uses the `Section` helper component mapping to `GlassCard` with pre-defined subtitles and icons.
  * Renders a standalone `GlassCard` for "Account" containing a "Sign out" button in its body.
* **Standard Deviation**:
  * The "Sign out" button is placed inside the body of the `Account` card, instead of the standard `action` prop header slot.
* **Proposed Changes**:
  * Move the "Sign out" button from the card children to the `action` prop of the `GlassCard` to align with standard action layouts.
  ```tsx
  <GlassCard
    title="Account"
    subtitle="Sign-out and account-level controls"
    icon={<User size={16} />}
    action={
      <Button variant="destructive" size="sm" onClick={handleLogout}>
        <LogOut size={12} /> Sign out
      </Button>
    }
    fadeIn="up"
    delay={300}
  />
  ```

#### 4. `frontend/src/pages/IntegrationsPage.tsx`
* **Current Implementation**:
  * Renders `IntegrationCard` wrapping standard `GlassCard` with titles, subtitles, icons, and status badges in `action`.
* **Standard Deviation**:
  * Fully compliant!
* **Proposed Changes**:
  * None.

#### 5. `frontend/src/pages/AgentsPage.tsx`
* **Current Implementation**:
  * Renders `AgentCard` wrapping standard `AgentCardWrapper` (derived from `AppCard`) with titles, subtitles, icons, and action controls.
* **Standard Deviation**:
  * Fully compliant!
* **Proposed Changes**:
  * None.

---

### B. Business Area

#### 6. `frontend/src/pages/areas/BusinessPage.tsx`
* **Current Card Usages**:
  * **Runway Calculator**: Renders standard `GlassCard`.
    * *Deviation*: Lacks a subtitle explaining the calculator's purpose.
    * *Change*: Add `subtitle="Calculate cash runway based on burn rate"`.
  * **Ledgr Project Card**: Renders custom layout header inside the card body.
    * *Deviation*: Renders custom `ProjectHeader` styled divs with an `IconBadge`, title, description, and status badge manually rather than passing them as card props.
    * *Change*: Refactor to use standard `GlassCard` props:
      * `title="Ledgr"`
      * `subtitle="SaaS accounting for Indian freelancers"`
      * `icon={<Rocket size={16} />}`
      * `action={<Badge tone="info">Building</Badge>}`
      * Remove the custom `ProjectHeader`, `ProjectTitle`, `ProjectDescription`, and `BadgeWrapper` styled components from the codebase.
  * **Event Timeline Card**: Renders standard `GlassCard` with title, icon, and button action.
    * *Deviation*: Lacks a subtitle.
    * *Change*: Add `subtitle="Recent venture milestones and decisions"`.

#### 7. `frontend/src/components/areas/business/SummaryTab.tsx`
* **Current Card Usages**:
  * **MrrTrendCard**: Renders standard `Card`. Fully compliant.
  * **MetricTile**: Renders standard `Card` containing KPI value and subtitle.
    * *Deviation*: The sub-text is passed as `subtitle={sub}` to the card prop AND rendered inside the body as `<TileSub>{sub}</TileSub>`. This causes the subtitle to be rendered twice.
    * *Change*: Remove the duplicate `<TileSub>{sub}</TileSub>` element from the card body.

---

### C. Career Area

#### 8. `frontend/src/pages/areas/CareerPage.tsx`
* **Current Card Usages**:
  * **CareerStat**: Custom layout representing KPI tiles.
    * *Deviation*: Uses custom text layouts inside the card body. Lacks icons and subtitles.
    * *Change*: Refactor to use standard `Card` header props:
      * Skills Tracked: `icon={<BookOpen size={16} />}` and `subtitle="total skills tracked"`
      * Active Pipeline: `icon={<Briefcase size={16} />}` and `subtitle="open opportunities"`
      * In Play: `icon={<Target size={16} />}` and `subtitle="interview or offer stages"`
      * Milestones: `icon={<History size={16} />}` and `subtitle="timeline logs"`
  * **Opportunities Pipeline**: Renders standard `GlassCard`.
    * *Deviation*: Lacks a subtitle.
    * *Change*: Add `subtitle="Track active job applications and stages"`.
  * **Career Timeline**: Renders standard `GlassCard` with timeline log button.
    * *Deviation*: Lacks a subtitle.
    * *Change*: Add `subtitle="Career history and milestone timeline"`.
  * **Skills Radar**: Renders standard `GlassCard` wrapping `CareerRadar` and skill lists.
    * *Deviation*: Lacks a subtitle.
    * *Change*: Add `subtitle="Visual mapping of core competencies"`.

#### 9. `frontend/src/components/CareerRadar.tsx`
* **Current Card Usages**:
  * Renders a Highcharts chart inside a styled `GlassCard` (`FullWidthCard`).
* **Standard Deviation**:
  * **Redundant Wrapper**: Because `CareerRadar` is rendered inside `CareerPage.tsx`'s "Skills Radar" card, this results in a nested card-within-a-card rendering anomaly.
* **Proposed Changes**:
  * Remove the custom `FullWidthCard` wrapper entirely from `CareerRadar.tsx` and return `<HighchartsReact ... />` directly.

---

### D. Health Area

#### 10. `frontend/src/components/areas/health/HistoryTab.tsx`
* **Current Card Usages**:
  * Renders the canonical `Table` component.
* **Standard Deviation**:
  * **Missing Card Header**: The table is rendered without a title, subtitle, icon, or header actions.
  * **Toolbar Deviation**: The search filters and export CSV button are rendered outside the table in the main layout toolbar.
* **Proposed Changes**:
  * Pass standard card props to the `<Table>` component:
    * `title="Health Logs"`
    * `subtitle="History of logged body metrics, sleep, nutrition and fitness logs"`
    * `icon={<Activity size={16} />}`
  * Move the search filter and "Export CSV" button (from `AreaToolbar`/`HeaderActionPortal`) into the `action` prop of the `<Table>` to align them parallel to the table header.

#### 11. `frontend/src/components/areas/health/FitnessTab.tsx`
* **Current Card Usages**:
  * **GoalCard**: Renders a `GlassCard` for daily water/calorie goals.
    * *Deviation*: Uses custom header divs inside the card body.
    * *Change*: Replace custom header layout with standard `GlassCard` props:
      * `title={goal.label}`
      * `subtitle="Daily fitness and water goals tracker"`
      * `icon={<Icon style={{ width: '14px', height: '14px', color: goal.color }} />}`
      * `action={done ? <CheckCircle2 style={{ width: '16px', height: '16px', color: 'var(--primary)' }} /> : undefined}`
  * **Habits Stats**: Renders 3 custom `GlassCards` for habit metadata metrics.
    * *Deviation*: Renders custom labels and values inside the body, violating Card standards.
    * *Change*: Convert these cards to `KpiCard` components (which are already imported from `@ledgr/ui`):
      * Card 1: `<KpiCard label="Habits" sub="Total habits monitored" value={...} icon={Repeat} />`
      * Card 2: `<KpiCard label="Done Today" sub="Habits checked today" value={...} icon={CheckCircle2} />`
      * Card 3: `<KpiCard label="Best Streak" sub="Highest habit streak" value={...} icon={Flame} />`
  * **Workout Sessions List**: Renders raw header label `Recent Workouts` above a list of `SessionCard`s.
    * *Deviation*: `SessionCard` uses custom headers inside the card body. The list lacks a card container.
    * *Change*:
      * Wrap the entire workout sessions list in a single parent `GlassCard` or `Card` with:
        * `title="Recent Workouts"`
        * `subtitle="Browse your recently completed workouts and exercises"`
        * `icon={<Dumbbell size={16} />}`
      * Inside the list, convert the custom headers in `SessionCard` to standard `GlassCard` props (`title={session.name}`, `subtitle={dayjs(session.logged_at).format('ddd, MMM D')}`, `icon={<Dumbbell size={14} />}`).

---

### E. Content Area

#### 12. `frontend/src/pages/areas/ContentPage.tsx`
* **Current Card Usages**:
  * **PublishedDropZone**: Renders custom `PublishedZoneRoot` div.
    * *Deviation*: Relies on a custom styled-component `styled.div` wrapper with custom headers instead of using the standard Card component.
    * *Change*: Replace `PublishedZoneRoot` with a standard `Card` or `GlassCard` component, passing:
      * `title="Published Content"`
      * `subtitle="Catalog of successfully published posts and articles"`
      * `icon={<div style={{ display: 'flex', alignItems: 'center' }}><PublishedDot /></div>}`
      * `action={<PublishedCount>{isLoading ? '·' : items.length} live</PublishedCount>}`
  * **EngagementWidget**: Renders standard `AppCard`. Fully compliant.
  * **ItemCard**: Renders standard `AppCard` representing kanban board cards.
    * *Note*: These are drag-and-drop units and do not require full section card headers.

---

### F. Common / Shared Components

#### 13. `frontend/src/components/AiInsightCard.tsx`
* **Current Card Usages**:
  * Renders a `GlassCard`.
* **Standard Deviation**:
  * **Custom Header**: Defines a custom `<CardHeader>` component with local title and button layouts inside the card body, rather than using standard card header props.
* **Proposed Changes**:
  * Refactor to pass standard `GlassCard` props:
    * `title={title ?? (area === 'finance' ? 'Explain This Month' : 'Explain This Week')}`
    * `subtitle={area === 'finance' ? 'AI financial advisor analysis' : 'AI health analyst snapshot'}`
    * `icon={<Sparkles size={14} style={{ color: '#7c3aed', flexShrink: 0 }} />}`
    * `action={<Button size="sm" ...>...</Button>}`
  * Remove the custom `<CardHeader>` styled component and internal header divs.

#### 14. `frontend/src/components/areas/finance/TransactionsTab.tsx`
* **Current Card Usages**:
  * **SummaryBar**: Renders standard `GlassCard` elements. Fully compliant.
  * **Transactions List/Table**: Renders raw table list inside the layout wrapper.
* **Standard Deviation**:
  * The main table list containing transactions is rendered raw and is not wrapped in any standard `Card` or `GlassCard` container.
* **Proposed Changes**:
  * Wrap the transactions list `{body}` inside a standard `Card` or `GlassCard` component, passing:
    * `title="Transactions"`
    * `subtitle="Browse and search transaction logs for the selected period"`
    * `icon={<ArrowLeftRight size={16} />}`
