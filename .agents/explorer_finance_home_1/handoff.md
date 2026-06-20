# Handoff Report — Finance Home Page Explorer Investigation

## 1. Observation
We investigated the directory structures, file imports, and page components to locate the Finance Home tab and identify the specific cards.

### A. Main Page and Home Tab Location
- **Finance Page**: `frontend/src/pages/areas/FinancePage.tsx` (line 35) renders the `HomeTab` component:
  ```tsx
  { key: '1', label: <><LayoutDashboard size={14} /> Home</>, children: <HomeTab onNavigateTab={setActiveKey} /> }
  ```
- **Finance Home Tab**: `frontend/src/components/areas/finance/HomeTab.tsx` contains the layout, cards, and query states.

---

### B. Identified Cards and Elements
Within `frontend/src/components/areas/finance/HomeTab.tsx`:

1. **The KPI Cards Grid**:
   - **Location**: Lines 478–493
   - **Component**: `<KpiGrid>` containing 4 `<StatTile>` components:
     ```tsx
     <KpiGrid>
       <StatTile
         label="Net Worth"
         value={formatCurrency(Number(netWorth?.net_worth ?? 0))}
         sub="assets − liabilities"
         accent={Number(netWorth?.net_worth ?? 0) < 0 ? 'var(--accent)' : undefined}
       />
       <StatTile label="Spent · This month" value={formatCurrency(totalExpenses)} sub={`${expenseItems.length} transactions`} accent="var(--accent)" />
       <StatTile label="Income · This month" value={formatCurrency(totalIncome)} sub={`${(income ?? []).length} entries`} accent="var(--primary)" />
       <StatTile
         label="Savings Rate"
         value={savingsRate === null ? '—' : `${savingsRate}%`}
         sub={savingsRate === null ? 'log income to see' : savingsRate >= 20 ? 'healthy' : 'aim for 20%+'}
         accent={savingsRate !== null && savingsRate >= 20 ? 'var(--primary)' : undefined}
       />
     </KpiGrid>
     ```
   - **Styling**: `KpiGrid` is a styled-component wrapping elements in a CSS grid (2 columns on mobile, 4 on desktop). `StatTile` renders a styled `StatTileContainer` (with theme-based card background, border, shadow, and column layout).
   - **State/Query Hook**: Uses local React Query hooks:
     - `netWorth` (lines 351-354): `financeApi.netWorth` query.
     - `totalExpenses` (line 406): derived via `useMemo` from `expenses?.items` query.
     - `totalIncome` (line 407): derived via `useMemo` from `income` query.
     - `savingsRate` (line 408): calculated via `useMemo` based on `totalExpenses` and `totalIncome`.

2. **The "Recent Activity" Card**:
   - **Location**: Lines 509–528
   - **Component**: `<GlassCard title="Recent Activity" action={<NavButton onClick={() => onNavigateTab('2')} />} hoverable fadeIn="up" delay={0}>`
   - **Styling/Layout**: Rendered inside `<AnalyticsGrid>` (styled-component for 2x2 cards layout). Displays a list using `ListContainer`, `ListItem`, `ItemTitle`, `ItemSubtitle`, and `ItemAmountText` styled-components.
   - **State/Query Hook**: Uses the memoized `recentActivity` list (lines 436-443) which merges and sorts expense items, income, and transfers.

3. **The "Accounts" Card**:
   - **Location**: Lines 555–584
   - **Component**: `<GlassCard title="Accounts" action={<NavButton onClick={() => onNavigateTab('4')} />} hoverable fadeIn="up" delay={200}>`
   - **Styling/Layout**: Renders a list of account balances with type icons. Uses `ListContainer`, `ListItem`, `ItemContent`, `ItemTitle`, `ItemSubtitle`, and `ItemAmountText` styled-components.
   - **State/Query Hook**: Uses the `accounts` list from query key `['finance', 'accounts']` (`financeApi.accounts`).

4. **The "AI Financial Insights" Card**:
   - **Location**: Line 600 inside `<InsightsGrid>`
   - **Component**: `<AIInsightsEngine />`
   - **File Definition**: `frontend/src/components/areas/finance/AdvancedWidgets.tsx` (lines 119-218)
     - Wraps elements inside a GlassCard:
       ```tsx
       <GlassCard title="AI Financial Insights" icon={<Sparkles size={16} color={theme.color.accent} />}>
       ```
   - **Styling/Layout**: Uses `AIInsightWrapper`, `InsightIconWrapper`, and `InsightText` styled-components to display list-based warnings or notifications.
   - **State/Query Hook**: Fetches `cashflow`, `goals`, and `bills` inside `AIInsightsEngine` via React Query hooks.

5. **The "Explain This Month" Card**:
   - **Location**: Line 599 inside `<InsightsGrid>`
   - **Component**: `<AiInsightCard area="finance" style={{ height: '100%' }} />`
   - **File Definition**: `frontend/src/components/AiInsightCard.tsx` (lines 67-105)
     - Displays a custom GlassCard:
       ```tsx
       <GlassCard className={className}>
       ```
     - Uses a card title that defaults to `"Explain This Month"` for the finance area (line 78).
   - **Styling/Layout**: Styled elements such as `CardHeader`, `TitleRow`, `CardTitle`, `SkeletonStack`, `ResultText`, and `HintText`.
   - **State/Query Hook**: Uses a React Query `useMutation` hook invoking `aiApi.explain('finance')` triggered by clicking the "Analyse" or "Refresh" buttons.

---

### C. HeaderActionPortal Usage Patterns
- **Import Statement**: `import { HeaderActionPortal } from '@ledgr/ui'`
- **Usage Pattern**: Wrap action buttons (such as `Button` or `SegmentedControl` components) inside the `<HeaderActionPortal>` wrapper within the component's JSX. The provider at the root/page level intercepts these and mounts them to the page header toolbar dynamically.
- **Example from `frontend/src/components/areas/finance/AccountsTab.tsx`**:
  ```tsx
  import { AreaToolbar, HeaderActionPortal } from '@ledgr/ui'
  // ... inside AccountsTab component
  <HeaderActionPortal>
    <Button size="sm" variant="primary" onClick={() => setModalOpen(true)}>
      <Plus size={12} style={{ marginRight: 4 }} /> Add {activeTab}
    </Button>
  </HeaderActionPortal>
  ```

---

## 2. Logic Chain
1. Trace the rendering structure of `FinancePage.tsx` to find `HomeTab.tsx` as the main landing component (Observation A).
2. Inspect `HomeTab.tsx` to map out the structure and query hooks for the KPI cards grid, "Recent Activity" card, and "Accounts" card (Observation B.1, B.2, B.3).
3. Trace the imported child components `<AIInsightsEngine>` and `<AiInsightCard>` to confirm they define and render the "AI Financial Insights" and "Explain This Month" cards, respectively, using GlassCard layouts (Observation B.4, B.5).
4. Grep the repository for `HeaderActionPortal` to verify its import path from `@ledgr/ui` and usage patterns inside area tabs like `AccountsTab.tsx` (Observation C).
5. Synthesize these findings to confirm that we can streamline the page by modifying `HomeTab.tsx` directly to remove the "Recent Activity" and "Accounts" cards, relocating `<AIInsightsEngine />` and `<AiInsightCard />` to be under the `<KpiGrid>`, and adding visibility toggle states bound to action buttons in `<HeaderActionPortal>`.

---

## 3. Caveats
- No actual code modifications have been made as the task is purely investigative (complying with the explorer role constraint).
- The behavior of the React context underlying `HeaderActionPortal` has not been modified; we assume it functions exactly as observed in other tabs.

---

## 4. Conclusion
The codebase explorer task is complete. All components and styling structures are identified:
- Card removals will happen in `HomeTab.tsx` (remove lines for Recent Activity and Accounts).
- Card movements will also happen in `HomeTab.tsx` (relocate `AIInsightsEngine` and `AiInsightCard` to be placed directly beneath `<KpiGrid>`).
- Dynamic toggles will be implemented using `useState` hooks inside `HomeTab.tsx` and controlling conditional renders.
- Toggle buttons will be portalled using `<HeaderActionPortal>` from `@ledgr/ui`.

---

## 5. Verification Method
Verify that the following file locations, lines, and structures correspond to the reported locations:
- `frontend/src/pages/areas/FinancePage.tsx`
- `frontend/src/components/areas/finance/HomeTab.tsx`
- `frontend/src/components/areas/finance/AdvancedWidgets.tsx`
- `frontend/src/components/AiInsightCard.tsx`
- `frontend/src/components/areas/finance/AccountsTab.tsx`
