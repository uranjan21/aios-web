# Plan: Card & GlassCard Layout Standardization

This plan outlines the steps to audit, refactor, and verify card standardization across the entire `aios-web` application, satisfying the requirements of `AGENTS.md` and the user requests.

---

## 1. Objectives

- Ensure 100% of primary cards, KPI tiles, and charts use standardized `@ledgr/ui` `Card`, `GlassCard`, or `KpiCard` components instead of custom `div` wrappers.
- Pass appropriate props to all Cards/GlassCards:
  - `icon` from `lucide-react`.
  - Faded `subtitle` (1-line description).
  - Move/reposition all header filters, segmented controls, close buttons, and chart legends into the `action` prop.
  - Invent and implement relevant filters (e.g. Period or Status selectors) for cards that previously lacked them.
  - Extract chart legends from canvas to HTML inside the `action` prop.
- Ensure the application builds successfully with zero TypeScript compilation errors.

---

## 2. Decomposed Tasks & Verification Steps

### Task 1: Refactor Common Layout & General Pages
1. **`WorkspaceLayout.tsx`**: Replace custom `Rail` styled wrapper with `@ledgr/ui` `Card` / `GlassCard`, passing standard header props.
2. **`LoginPage.tsx`**: Replace custom `LoginCard` wrapper with `@ledgr/ui` `Card` or `GlassCard` with standard header props.
3. **`DashboardPage.tsx`**:
   - Refactor `SummaryCard` (Finance, Health, Agents) and `AreaTile` (Career, Business, Content) to remove custom header rendering inside the card body, passing standard `title`, `subtitle`, `icon` props.
   - Propose and add period/status filter selects in the `action` prop for all these cards.
   - Add filter/action to `Quick Capture` card.
4. **`SettingsPage.tsx`**: Standardize the settings section card actions and account card (move "Sign out" button to `action` prop).
5. **Verification**: Verify visual appearance on Dashboard, Login, and Settings pages. Check console for type safety.

### Task 2: Standardize Finance Page & Components
1. **Redirect local imports**: Redirect `import { Card } from '@/components/ui/Card';` to `import { Card } from '@ledgr/ui';` in:
   - `AccountManager.tsx`
   - `CategoryManager.tsx`
   - `InvestmentsTab.tsx`
   - `LoansTab.tsx`
   - `BudgetsTab.tsx`
   - `GoalsTab.tsx`
2. **`TransactionsTab.tsx`**: Refactor `SummaryBar` (Income, Expenses, Net) from custom `SumPill` container to small standard `@ledgr/ui` `GlassCard` components with appropriate icons, subtitles, and styles.
3. **`FinanceStats.tsx`**:
   - Move the Highcharts legend `LegendList` (Income vs Expense chart) from card body into the `action` prop of `ChartCard`. Add a Period filter.
   - Move the custom scroll list legend `PieScroll` (Spending by Category chart) from card body into the `action` prop. Add a Period filter.
   - Move the absolute-positioned category drill-down `CloseBtn` button into the `action` prop.
   - Add status/timeline filter selectors in the `action` prop for the `Budget vs Actual` and `Trend` charts.
4. **Verification**: Verify Finance page tabs compilation and layout correctness.

### Task 3: Standardize Other Area Pages (Business, Career, Health, Content)
1. **Business Area (`BusinessPage.tsx` & `SummaryTab.tsx`)**:
   - Runway Calculator & Event Timeline: Add subtitles and filters.
   - Ledgr Project Card: Remove custom header, use standard `title`, `subtitle`, `icon`, and `action`.
   - `SummaryTab.tsx`: MRR Trend: Add period filter. MetricTile: Remove duplicate subtitle rendering from card body.
2. **Career Area (`CareerPage.tsx`, `OpportunitiesTab.tsx`, `SkillGapCard.tsx`)**:
   - `CareerStat` tiles: Standardize to use standard `title`, `subtitle`, and `icon` props.
   - Opportunities Pipeline, Career Timeline, Skills Radar: Add subtitles and action filters.
   - **Bug**: Remove nested inner GlassCard wrapper from `CareerRadar` component.
   - `OpportunitiesTab.tsx` (OppListSection) & `SkillGapCard.tsx`: Add action/filter props.
3. **Health Area (`HealthPage.tsx`, `BodySleepTab.tsx`, `FitnessTab.tsx`, `HistoryTab.tsx`, `NutritionTab.tsx`, `WaterTrackerWidget.tsx`)**:
   - `HealthPage.tsx` (Weight Progression): Disable Highcharts canvas legend and render it in HTML inside `action` prop next to the SegmentedControl.
   - `BodySleepTab.tsx` (`KpiCard` tiles): Add `sub` prop subtitles. Weight, Sleep Duration Trend, Sleep 7-days: Add period/quality filters in `action`.
   - `FitnessTab.tsx`: Convert custom headers in `GoalCard` and `SessionCard` to standard card props. Convert custom `Habits Stats` GlassCards to standard `KpiCard` components.
   - `HistoryTab.tsx`: Wrap raw `Table` in standard `Card` or `GlassCard`, and place filter/export buttons in the `action` prop.
   - `NutritionTab.tsx` & `WaterTrackerWidget.tsx`: Add period filters and target adjustment buttons in the `action` prop.
4. **Content Area (`ContentPage.tsx` & `TwitterQueueCard.tsx`)**:
   - EngagementWidget & Twitter Queue: Add period/category filters.
   - PublishedDropZone: Standardize `PublishedZoneRoot` custom wrapper to `@ledgr/ui` `GlassCard`, passing standard header props.

### Task 4: Compilation and Verification Gate
1. Run `npm run build` or `pnpm build` in the `frontend/` directory to ensure 100% successful compilation with zero type errors.
2. Verify all modified pages and tabs in the UI via the Reviewer, Challenger, and Forensic Auditor subagents.
