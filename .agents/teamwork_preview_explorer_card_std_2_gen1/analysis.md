# Finance Cards Standardization Audit

This report presents a comprehensive audit of Card, GlassCard, and custom card wrapper usages in the Finance area page and its tab components, assessing alignment with the layout and UI conventions specified in `AGENTS.md`.

---

## Executive Summary

- **Overall Alignment**: The codebase makes extensive use of the standardized `<Card>` and `<GlassCard>` components, with most cards correctly utilizing the `title`, `subtitle`, `icon`, and `action` props.
- **Key Issues Identified**:
  1. **Local Card Re-exports**: Several components (`AccountManager.tsx`, `CategoryManager.tsx`, `InvestmentsTab.tsx`, `LoansTab.tsx`, and `GoalsTab.tsx`) import `Card` from `@/components/ui/Card` (which internally re-exports `@ledgr/ui`). To keep imports clean, these should import directly from `@ledgr/ui`.
  2. **Custom Containers**: The `SummaryBar` in `TransactionsTab.tsx` uses custom `div` wrappers (`SummaryGrid` and `SumPill`) with custom colors and inline margins, lacking the standard card structure, icons, and subtitles.
  3. **Missing Filters**: Several analytic cards and charts (`AIInsightsEngine`, `CashflowForecasting`, `Income vs Expense` chart, `Spending by Category` chart, `Budget vs Actual` chart, and `Trend` chart) do not provide filters. Relevant status/period filters should be added to their `action` props.
  4. **Embedded HTML Legends**: In `FinanceStats.tsx` (the "Income vs Expense" and "Spending by Category" widgets), custom HTML legends (`LegendList` and `PieScroll`) are placed in the card body next to the chart. These should be extracted to the `action` prop parallel to the header.
  5. **Absolute Inline Controls**: The drill-down category widget in `FinanceStats.tsx` hardcodes an absolute-positioned `CloseBtn` with an `X` icon inside the card body. This should be moved to the `action` prop of the header.

---

## Detailed Card Audit

| File Path & Component | Card Type / Wrapper | Header Icon | Header Subtitle | Action/Filter Placement | Audit Assessment & Recommendations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`HomeTab.tsx`**<br>HealthScoreCard | `<GlassCard>` | `<HeartPulse size={16} />` | `"Your overall financial score"` | Tone Badge passed to `action` | **Compliant.** Suggest adding a period filter (e.g. `"This Month"`, `"Last Month"`) to the `action` prop. |
| **`HomeTab.tsx`**<br>StatTile (Net Worth) | `<GlassCard>` | `<Wallet size={16} />` | `"assets − liabilities"` | None | **Compliant.** Suggest adding a status filter to `action`. |
| **`HomeTab.tsx`**<br>StatTile (Spent) | `<GlassCard>` | `<TrendingDown size={16} />` | `"${expenseItems.length} transactions this month"` | None | **Compliant.** Suggest adding a period selector filter (e.g. `"This Week"`, `"This Month"`) to `action`. |
| **`HomeTab.tsx`**<br>StatTile (Income) | `<GlassCard>` | `<TrendingUp size={16} />` | `"${(income ?? []).length} entries this month"` | None | **Compliant.** Suggest adding a period selector filter to `action`. |
| **`HomeTab.tsx`**<br>StatTile (Savings Rate) | `<GlassCard>` | `<PiggyBank size={16} />` | `"healthy"` or `"aim for 20%+"` | None | **Compliant.** Suggest adding a period selector filter to `action`. |
| **`HomeTab.tsx`**<br>Upcoming Payments | `<GlassCard>` | `<CalendarClock size={16} />` | `"Upcoming bills and EMIs"` | `"See all"` Button passed to `action` | **Compliant.** Suggest adding a category/status filter (e.g., `"Bills"`, `"EMIs"`, `"All"`) next to the navigation button. |
| **`HomeTab.tsx`**<br>Budget Tracking Chart | `<GlassCard>` | `<Target size={16} />` | `"Actual spent vs allocated limit"` | HTML Legend & `<SegmentedControl>` in `action` | **Fully Compliant (Best Practice).** Both the HTML legend and period filters are correctly beamed into the header via the `action` prop. |
| **`HomeTab.tsx`**<br>Top Categories Chart | `<GlassCard>` | `<PieChartIcon size={16} />` | `"Highest spending categories"` | `<SegmentedControl>` in `action` | **Compliant.** Period filter is correctly placed in `action`. |
| **`TransactionsTab.tsx`**<br>SummaryBar | Custom `div` wrappers (`SumPill`) | None | None | None | **Non-Compliant.** Recommends refactoring these 3 pills (Income, Expenses, Net) into small standard `<GlassCard>` or `<Card>` containers. Assign icons (`TrendingUp`, `TrendingDown`, `Wallet`), subtitles ("Total income", etc.), and move any future scope actions to the `action` prop. |
| **`AccountManager.tsx`**<br>Accounts | `<Card>` (local import) | `<Wallet size={16} />` | `"Your cash, bank, and wallet balances"` | `<Select>` filter in `action` | **Compliant structure.** Recommendation: Change import path from ` '@/components/ui/Card'` to direct import from `'@ledgr/ui'`. |
| **`CategoryManager.tsx`**<br>Categories | `<Card>` (local import) | `<Tags size={16} />` | `"Organize spending into a category tree"` | Add Button in `action` | **Compliant structure.** Suggest adding a "Collapse / Expand All" toggle in `action`. Recommendation: Change import to `'@ledgr/ui'`. |
| **`InvestmentsTab.tsx`**<br>Portfolio Holdings | `<Card>` (local import) | `<TrendingUp size={16} />` | `"Your investments and their current returns"` | `<Select>` asset filter in `action` | **Compliant structure.** Recommendation: Change import to `'@ledgr/ui'`. |
| **`LoansTab.tsx`**<br>Loans & EMIs | `<Card>` (local import) | `<Landmark size={16} />` | `"Outstanding balances and monthly EMI obligations"` | `<SegmentedControl>` status filter in `action` | **Compliant structure.** Recommendation: Change import to `'@ledgr/ui'`. |
| **`PayoffPlanner.tsx`**<br>Debt Payoff Planner | `<Card>` | `<Landmark size={16} />` | `"Project debt-free date and savings under your chosen strategy"` | Strategy switcher & extra amount input in `action` | **Compliant.** Excellent usage of the `action` prop for inline controls. |
| **`BudgetsTab.tsx`**<br>Limits by Category | `<Card>` (local import) | `<Gauge size={16} />` | `"Monthly spending caps and how much you've used"` | `<SegmentedControl>` filter in `action` | **Compliant structure.** Recommendation: Change import to `'@ledgr/ui'`. |
| **`BillsTab.tsx`**<br>Recurring Bills | `<Table>` (custom wrapper around `<Card>`) | `<Receipt size={16} />` | `"Upcoming monthly bills sorted by due date"` | `<SegmentedControl>` status filter in `action` | **Compliant.** Internally standardizes header styling via the `<Table>` wrapper component. |
| **`GoalsTab.tsx`**<br>Savings Goals | `<Card>` (local import) | `<Target size={16} />` | `"Track progress toward each savings target"` | `<SegmentedControl>` filter in `action` | **Compliant structure.** Recommendation: Change import to `'@ledgr/ui'`. |
| **`AdvancedWidgets.tsx`**<br>AIInsightsEngine | `<GlassCard>` | `<Sparkles size={16} />` | `"Patterns and tips inferred from your recent activity"` | None | **Compliant structure.** Suggest adding a period/type filter in the `action` prop. |
| **`AdvancedWidgets.tsx`**<br>Cashflow Trend Chart | `<GlassCard>` | `<TrendingUp size={16} />` | `"Daily net inflow minus outflow over the period"` | None | **Compliant structure.** Suggest adding a range/horizon filter (e.g. `"30d"`, `"90d"`) to `action`. |
| **`AdvancedWidgets.tsx`**<br>Subscriptions | `<GlassCard>` | `<Repeat size={16} />` | `"Recurring service charges and their state"` | `<SegmentedControl>` status filter in `action` | **Compliant.** |
| **`FinanceStats.tsx`**<br>Income vs Expense Chart | `<ChartCard>` (wraps `<Card>`) | `<Layers size={16} />` | `"Period totals and the resulting net cashflow"` | None | **Legend Placement Issue.** Custom HTML legend `LegendList` is rendered inside the card body. Recommends extracting it to the `action` prop. Suggest adding a period filter (e.g., `"M"`, `"Y"`) to `action`. |
| **`FinanceStats.tsx`**<br>Spending by Category Chart | `<ChartCard>` (wraps `<Card>`) | `<PieChartIcon size={16} />` | `"Tap a slice to drill into its transactions"` | None | **Legend Placement Issue.** Custom scroll list legend `PieScroll` is in the card body. Recommends extracting or linking it to the `action` prop. Suggest adding a period filter to `action`. |
| **`FinanceStats.tsx`**<br>Drill-down Card | `<ChartCard>` (wraps `<Card>`) | `<Receipt size={16} />` | `"Drill-down view for the selected category"` | None | **Action/Control Placement Issue.** An absolute-positioned `CloseBtn` is placed in the card body. Recommends moving this button to the `action` prop of the card header. |
| **`FinanceStats.tsx`**<br>Budget vs Actual Chart | `<ChartCard>` (wraps `<Card>`) | `<Target size={16} />` | `"How much of each category limit you've used"` | None | **Compliant structure.** Suggest adding a status filter (e.g., `"All"`, `"Over Budget"`, `"On Track"`) in the `action` prop. |
| **`FinanceStats.tsx`**<br>Trend Chart | `<ChartCard>` (wraps `<Card>`) | `<Layers size={16} />` | `"Net cashflow over the selected horizon"` | None | **Compliant structure.** Suggest adding a timeline filter (e.g., `"This Week"`, `"This Month"`, `"This Year"`) in `action`. |
| **`WalletWidgets.tsx`**<br>BalanceWidget | `<GlassCard>` | `<Wallet size={16} />` | `"Balance over time, broken down by cashflow type"` | `<SegmentedControl>` tab switcher in `action` | **Compliant.** |

---

## Action Plan & Proposals

Below are the recommended file modifications in unified patch diffs and snippets.

### 1. Standardize Card Imports
To minimize internal redirection and ensure visual consistency, modify the import statement in `AccountManager.tsx`, `CategoryManager.tsx`, `InvestmentsTab.tsx`, `LoansTab.tsx`, `BudgetsTab.tsx`, and `GoalsTab.tsx` from:
```tsx
import { Card } from '@/components/ui/Card';
```
to:
```tsx
import { Card } from '@ledgr/ui';
```

### 2. Refactor `TransactionsTab.tsx` `SummaryBar`
To replace the custom `div` pills, define a sub-component utilizing `GlassCard` or `Card`:
```tsx
// Proposed replacement snippet
function SummaryBar({ income, expense }: { income: number; expense: number }) {
  const net = income - expense;
  return (
    <SummaryGrid>
      <GlassCard
        title="Income"
        subtitle="Total income logged"
        icon={<TrendingUp size={14} color="var(--primary)" />}
        style={{ minHeight: '80px' }}
      >
        <SumValue $color="var(--primary)">{formatCurrency(income)}</SumValue>
      </GlassCard>
      <GlassCard
        title="Expenses"
        subtitle="Total expenses logged"
        icon={<TrendingDown size={14} color="var(--accent)" />}
        style={{ minHeight: '80px' }}
      >
        <SumValue $color="var(--accent)">{formatCurrency(expense)}</SumValue>
      </GlassCard>
      <GlassCard
        title="Net Cashflow"
        subtitle="Difference (Income - Expenses)"
        icon={<Wallet size={14} />}
        style={{ minHeight: '80px' }}
      >
        <SumValue $color={net >= 0 ? 'var(--foreground)' : 'var(--accent)'}>
          {formatCurrency(net)}
        </SumValue>
      </GlassCard>
    </SummaryGrid>
  );
}
```

### 3. Extract Close Button in `FinanceStats.tsx`
Move the drill-down category card's absolute close button into the `action` prop of the `ChartCard`:
```tsx
// Current
<ChartCard
  title={`${drillCategory} — Transactions This Month`}
  subtitle="Drill-down view for the selected category"
  icon={<Receipt size={16} />}
>
  <CloseBtn onClick={() => setDrillCategory(null)} aria-label="Close drill-down">
    <X size={14} />
  </CloseBtn>
  ...
</ChartCard>

// Proposed
<ChartCard
  title={`${drillCategory} — Transactions This Month`}
  subtitle="Drill-down view for the selected category"
  icon={<Receipt size={16} />}
  action={
    <Button variant="ghost" size="icon" onClick={() => setDrillCategory(null)} aria-label="Close drill-down">
      <X size={14} />
    </Button>
  }
>
  ...
</ChartCard>
```

### 4. Extract HTML Legends in `FinanceStats.tsx`
Move `LegendList` (Income vs Expense) and `PieScroll` (Spending by Category) from the card content body to the `action` prop:
```tsx
// Proposed for Income vs Expense
<ChartCard
  title="Income vs Expense"
  subtitle="Period totals and the resulting net cashflow"
  icon={<Layers size={16} />}
  action={
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {/* HTML Legend List placed here */}
      <LegendListHorizontal>
        <LegendRow>
          <LegendDot $color={theme.color.accent} />
          <LegendLabel>Income: {formatCurrency(donutData[0].value)}</LegendLabel>
        </LegendRow>
        <LegendRow>
          <LegendDot $color={theme.color.mutedForeground} />
          <LegendLabel>Expense: {formatCurrency(donutData[1].value)}</LegendLabel>
        </LegendRow>
      </LegendListHorizontal>
      {/* Period Filter (Future Scope) */}
    </div>
  }
>
  {/* Render Highcharts only inside Card content */}
</ChartCard>
```
