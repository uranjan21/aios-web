# Worker Task: Fix 8 Interactive Filter Bugs

You are spawned as a teamwork_preview_worker.
Your working directory is: `/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/worker_card_std_fix_gen2`

## Objective
Fix the 8 interactive filter bugs identified by Challenger 2 where action-prop filters update state but are completely decoupled from the data calculation/rendering.

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

## Details of the 8 Bugs

### Bug 1: BusinessPage Runway Calculator Filter Ignored
- **File**: `frontend/src/pages/areas/BusinessPage.tsx`
- **Location**: `RunwayCalculator` component
- **Fix**: Calculate runway based on adjusted burn rate (quarterly burn rate = burnRate * 3).
  Example:
  ```tsx
  const multiplier = runwayPeriod === 'quarterly' ? 3 : 1;
  const adjustedBurnRate = burnRate * multiplier;
  const runwayValue = adjustedBurnRate > 0 ? (cash / adjustedBurnRate).toFixed(1) : '∞';
  const runwayUnit = runwayPeriod === 'quarterly' ? 'quarters' : 'months';
  ```

### Bug 2: FinanceStats Income vs Expense Filter Ignored
- **File**: `frontend/src/components/areas/finance/FinanceStats.tsx`
- **Location**: `donutData` calculation
- **Fix**: Use `incExpPeriod` state (e.g., 'monthly', 'yearly') in `donutData` calculation instead of the global prop `period`.
  Please read the options/values for `incExpPeriod` in the select component to ensure they match.

### Bug 3: FinanceStats Spending by Category Filter Ignored
- **File**: `frontend/src/components/areas/finance/FinanceStats.tsx`
- **Location**: `pieData` calculation
- **Fix**: Use `spendPeriod` state in `pieData` calculation instead of the global prop `period`.
  Ensure `spendPeriod` is included in the memo dependencies.

### Bug 4: FinanceStats Trend Chart Timeline Filter Ignored
- **File**: `frontend/src/components/areas/finance/FinanceStats.tsx`
- **Location**: `trendOptions` calculation
- **Fix**: Filter/slice the timeline data in `trendOptions` dynamically based on the state `trendTimeline` ('6m', '12m', 'all').
  Ensure `trendTimeline` is in the dependency array of the memo.

### Bug 5: Finance HomeTab Upcoming Payments Filter Ignored
- **File**: `frontend/src/components/areas/finance/HomeTab.tsx`
- **Location**: `upcoming` payments list memo
- **Fix**: Filter payments within the `useMemo` block before slicing based on `upcomingFilter` state ('all', '7d').
  Example:
  ```tsx
  const filtered = [...billItems, ...loanItems].filter(item => {
    if (upcomingFilter === '7d') return item.days <= 7;
    return true;
  });
  ```

### Bug 6: Finance HomeTab Financial Health Period Filter Ignored
- **File**: `frontend/src/components/areas/finance/HomeTab.tsx`
- **Location**: `HealthScoreCard` component
- **Fix**: The card has a dropdown to select between 'current' and 'prev' health score details. Ensure the component renders the score, band, and breakdown values based on the selected `healthPeriod`. Check what fields are returned in the score data (e.g. check queries, `data.score`, `data.prevScore`, etc., or compute the previous score from the API response/history if present).

### Bug 7: Finance HomeTab Top Categories Period Filter Ignored
- **File**: `frontend/src/components/areas/finance/HomeTab.tsx`
- **Location**: `topCategories` calculation
- **Fix**: Filter or group the `expenseItems` in the frontend based on the selected `period` ('This Week', 'This Month', 'This Year').
  Example:
  ```tsx
  const filteredExpenseItems = useMemo(() => {
    if (period === 'This Week') {
      const weekAgo = dayjs().subtract(7, 'days');
      return expenseItems.filter(item => dayjs(item.logged_at).isAfter(weekAgo));
    }
    // Handle Year (would require querying/filtering yearly data if available, or filter items accordingly)
    return expenseItems;
  }, [expenseItems, period]);
  ```

### Bug 8: ContentPage engagementWidget / Content Summary Period Filter Ignored
- **File**: `frontend/src/pages/areas/ContentPage.tsx`
- **Location**: `EngagementWidget` component
- **Fix**: Count pieces of published content (or filter `publishedCount` / query data) based on `period` ('7d', '30d', '90d'). Check the inputs/props of `EngagementWidget` or where the data is fetched. If it receives a list of items or counts, filter them.

## Verification
1. Verify that your fixes compile properly without TypeScript errors. Run the frontend build `pnpm build` (or `npm run build`) in `frontend/`.
2. Write down your code changes, compile/build results, and handoff in a `handoff.md` file in your working directory.
