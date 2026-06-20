# Plan - Finance Home Page Streamlining

## Goal
Implement the requested streamlining changes in `frontend/src/components/areas/finance/HomeTab.tsx` and verify the build.

## Steps
1. **Analyze and Modify Imports**:
   - Add `Button` and `HeaderActionPortal` to the `@ledgr/ui` import.
   - Clean up unused imports/variables such as `IconBadge` (if it becomes unused after removing the Accounts card).

2. **Add Toggles State**:
   - Define state variables `showInsights` and `showExplainMonth` initialized to `false` inside the `HomeTab` component.

3. **Implement Portal Buttons**:
   - Add `<HeaderActionPortal>` containing the "Insights" and "Explain Month" buttons at the top of the `HomeTab` return statement (inside the top-level fragment).

4. **Streamline AnalyticsGrid**:
   - Remove the "Recent Activity" card (which contains lists of recent activities).
   - Remove the "Accounts" card (which displays account lists).
   - Keep "Upcoming Payments" and "Financial Health Score".
   - Clean up any unused state/memoized variables resulting from this removal, such as `recentActivity`, `accounts` query, and `ACCOUNT_ICONS`.

5. **Insert Conditional InsightsGrid**:
   - Move the `<InsightsGrid>` to be immediately below `<KpiGrid>`.
   - Wrap it with a condition `(showInsights || showExplainMonth)`.
   - Render the respective card components (`<AiInsightCard>` and `<AIInsightsEngine />`) based on their state variables `showExplainMonth` and `showInsights`.
   - Remove the `<InsightsGrid>` from the bottom of the page.

6. **Verify Build**:
   - Run `pnpm build` in the `frontend/` directory to ensure compilation succeeds with zero TypeScript errors or warnings.
