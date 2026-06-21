# Standardized Card Layouts & Filter Behaviors Audit

This analysis details the audit of interactive filter behaviors and layout alignment on standardized Card/GlassCard layouts across the Finance, Business, Health, Career, and Content pages in the AIOS web application.

---

## 1. Executive Summary

- **Interactive Filters Audit**: Evaluated if action-prop filters actually interact with card contents.
  - **Result**: **CRITICAL ISSUES**. A total of **8 interactive filter bugs** were identified across Finance, Business, and Content modules where filter components update state but are completely decoupled from the data calculation/rendering.
- **Layout Alignment & Legend Extraction**: Verified if chart legends extracted to the `action` prop align with card titles and do not overlap filters.
  - **Result**: **PASS**. Chart legends (such as in `HealthPage` Weight Progression and `HomeTab` Budget Tracking) are correctly aligned parallel to the Title in the flex layout and positioned immediately preceding the filters, preventing visual overlaps.

---

## 2. Detailed Findings — Interactive Filter Bugs

### Bug 1: BusinessPage Runway Calculator Filter Ignored
- **File**: `frontend/src/pages/areas/BusinessPage.tsx`
- **Location**: Lines 238–297 (`RunwayCalculator` component)
- **Code Snippet**:
  ```tsx
  const [runwayPeriod, setRunwayPeriod] = useState('monthly')
  const runwayMonths = burnRate > 0 ? (cash / burnRate).toFixed(1) : '∞'
  const isHealthy = burnRate === 0 || cash / burnRate > 6
  ...
  action={
    <Select
      size="sm"
      fullWidth={false}
      options={[
        { label: 'Monthly Scope', value: 'monthly' },
        { label: 'Quarterly Scope', value: 'quarterly' },
      ]}
      value={runwayPeriod}
      onChange={(val) => setRunwayPeriod(val as string)}
    />
  }
  ```
- **Description**: The card declares the `runwayPeriod` state and allows users to toggle between `'monthly'` and `'quarterly'` scopes. However, `runwayMonths` and `isHealthy` are hardcoded to monthly values (`cash / burnRate`). Selecting "Quarterly Scope" does not divide burn rate or scale runway calculation (e.g. converting runway to quarters).
- **Blast Radius**: MEDIUM. Calculator behaves statically; users toggling the select will see no UI updates.
- **Mitigation/Fix**: Update the calculations to respect the selected period:
  ```tsx
  const multiplier = runwayPeriod === 'quarterly' ? 3 : 1;
  const adjustedBurnRate = burnRate * multiplier;
  const runwayValue = adjustedBurnRate > 0 ? (cash / adjustedBurnRate).toFixed(1) : '∞';
  const runwayUnit = runwayPeriod === 'quarterly' ? 'quarters' : 'months';
  ```

---

### Bug 2: FinanceStats Income vs Expense Filter Ignored
- **File**: `frontend/src/components/areas/finance/FinanceStats.tsx`
- **Location**: Lines 332–348 (`donutData` calculation) and Lines 418–427 (`Select` action)
- **Code Snippet**:
  ```tsx
  const [incExpPeriod, setIncExpPeriod] = useState('monthly')
  ...
  const donutData = useMemo(() => {
    if (period === 'This Year') { ... }
    if (period === 'This Week') { ... }
    return [{ name: 'Income', value: cashflow?.income_total ?? 0 }, { name: 'Expense', value: cashflow?.expense_total ?? 0 }]
  }, [period, cashflow, yearQueries])
  ```
- **Description**: The `Select` dropdown updates local state `incExpPeriod` (options: 'monthly' and 'yearly'). However, `donutData` calculation references the global prop `period` (values: 'This Week', 'This Month', 'This Year') instead of the local state `incExpPeriod`.
- **Blast Radius**: HIGH. The "Income vs Expense" donut chart does not respond to dropdown selections.
- **Mitigation/Fix**: Change the memo to calculate data based on `incExpPeriod` rather than the global prop `period` (or align the select value to update `period` via a callback if it is controlled from the parent).

---

### Bug 3: FinanceStats Spending by Category Filter Ignored
- **File**: `frontend/src/components/areas/finance/FinanceStats.tsx`
- **Location**: Lines 352–364 (`pieData` calculation) and Lines 482–491 (`Select` action)
- **Code Snippet**:
  ```tsx
  const [spendPeriod, setSpendPeriod] = useState('monthly')
  ...
  const pieData = useMemo(() => {
    let items = expensesPage?.items ?? []
    if (period === 'This Week') { ... }
    ...
  }, [expensesPage, period])
  ```
- **Description**: The local `Select` dropdown updates state `spendPeriod`. The data rendering memo (`pieData`), however, binds to the global prop `period` instead of `spendPeriod`.
- **Blast Radius**: HIGH. Pie chart values for category spending are completely static relative to the select element.
- **Mitigation/Fix**: Re-bind the `pieData` memo dependencies to read from `spendPeriod` instead of `period`.

---

### Bug 4: FinanceStats Trend Chart Timeline Filter Ignored
- **File**: `frontend/src/components/areas/finance/FinanceStats.tsx`
- **Location**: Lines 366–396 (`trendOptions` calculation) and Lines 603–613 (`Select` action)
- **Code Snippet**:
  ```tsx
  const [trendTimeline, setTrendTimeline] = useState('6m')
  ...
  const trendOptions = useMemo(() => {
    if (period === 'This Year') { ... }
    ...
  }, [period, cashflow, yearQueries, last12Months, theme])
  ```
- **Description**: The `Select` updates local state `trendTimeline` (options: '6m', '12m', 'all'). But the `trendOptions` memo hook doesn't include `trendTimeline` in its dependency array, nor is the variable read inside the memo. The chart is driven solely by the global `period` prop.
- **Blast Radius**: HIGH. Trend timelines of 6 months / 12 months / All Time cannot be applied by the user.
- **Mitigation/Fix**: Re-compute column/area charts to slice the timeline data dynamically based on the state `trendTimeline`.

---

### Bug 5: Finance HomeTab Upcoming Payments Filter Ignored
- **File**: `frontend/src/components/areas/finance/HomeTab.tsx`
- **Location**: Lines 489–507 (`upcoming` calculation) and Lines 596–605 (`Select` action)
- **Code Snippet**:
  ```tsx
  const [upcomingFilter, setUpcomingFilter] = useState('all')
  ...
  const upcoming = useMemo(() => {
    const billItems = (bills ?? []).filter(b => b.is_active).map(...)
    const loanItems = (loans ?? []).filter(l => l.is_active).map(...)
    return [...billItems, ...loanItems].sort((a, b) => a.days - b.days).slice(0, 5)
  }, [bills, loans])
  ```
- **Description**: The user can toggle the dropdown between "All Due" and "Next 7 Days", which updates `upcomingFilter`. The memo calculation for the payments list `upcoming`, however, never reads `upcomingFilter` and is not triggered on its changes. It always returns the first 5 upcoming payments.
- **Blast Radius**: HIGH. Payment listing is not filtered; selecting "Next 7 Days" does nothing.
- **Mitigation/Fix**: Filter the payments within the `useMemo` block before slicing:
  ```tsx
  const filtered = [...billItems, ...loanItems].filter(item => {
    if (upcomingFilter === '7d') return item.days <= 7;
    return true;
  });
  return filtered.sort((a, b) => a.days - b.days).slice(0, 5);
  ```

---

### Bug 6: Finance HomeTab Financial Health Period Filter Ignored
- **File**: `frontend/src/components/areas/finance/HomeTab.tsx`
- **Location**: Lines 284–343 (`HealthScoreCard` component)
- **Code Snippet**:
  ```tsx
  const [healthPeriod, setHealthPeriod] = useState('current')
  ...
  return (
    <GlassCard
      title="Financial Health"
      ...
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          ...
          <Select
            size="sm"
            fullWidth={false}
            options={[
              { label: 'Current', value: 'current' },
              { label: 'Previous', value: 'prev' },
            ]}
            value={healthPeriod}
            onChange={(val) => setHealthPeriod(val as string)}
          />
        </div>
      }
    >
      <HealthScoreTop>
        <HealthScoreValue>{data.score}</HealthScoreValue>
  ```
- **Description**: The card provides a dropdown to select between "Current" and "Previous" financial scores. However, the component only displays the `data` properties (e.g. `data.score`) directly, which contain only the current score. The state `healthPeriod` is never used to fetch, index, or display the previous data.
- **Blast Radius**: HIGH. User interaction is completely non-functional.
- **Mitigation/Fix**: Retrieve and pass the previous health score details in the API/query payload, and conditionally render `score`, `band`, and `components` based on `healthPeriod === 'prev'`.

---

### Bug 7: Finance HomeTab Top Categories Period Filter Ignored
- **File**: `frontend/src/components/areas/finance/HomeTab.tsx`
- **Location**: Lines 419–430 (`topCategories` calculation) and Lines 696–708 (`SegmentedControl` action)
- **Code Snippet**:
  ```tsx
  const [period, setPeriod] = useState<'This Week' | 'This Month' | 'This Year'>('This Month')
  ...
  const { data: expenses } = useQuery({
    queryKey: ['finance', 'expenses', month],
    queryFn: () => financeApi.expenses(month),
  })
  const expenseItems = expenses?.items ?? []
  ```
- **Description**: The Top Categories segmented control allows toggling `period` (Week, Month, Year). But the expense query is strictly bound to `month = format(new Date(), 'yyyy-MM')`, and the categories are derived directly from these monthly items without any filtering on `period`.
- **Blast Radius**: HIGH. Toggling "Week" or "Year" does not filter or group the top category spending.
- **Mitigation/Fix**: Ensure that either the API queries are updated using the `period` parameter, or filter `expenseItems` inside the frontend component:
  ```tsx
  const filteredExpenseItems = useMemo(() => {
    if (period === 'This Week') {
      const weekAgo = dayjs().subtract(7, 'days');
      return expenseItems.filter(item => dayjs(item.logged_at).isAfter(weekAgo));
    }
    // Handle Year (would require querying yearly data instead of just month)
    return expenseItems;
  }, [expenseItems, period]);
  ```

---

### Bug 8: ContentPage engagementWidget / Content Summary Period Filter Ignored
- **File**: `frontend/src/pages/areas/ContentPage.tsx`
- **Location**: Lines 319–355 (`EngagementWidget` component)
- **Code Snippet**:
  ```tsx
  function EngagementWidget({ publishedCount }: { publishedCount: number }) {
    const [period, setPeriod] = useState('30d')
    return (
      <AppCard
        title="Content Summary"
        ...
        action={
          <Select
            value={period}
            onChange={(val: any) => setPeriod(val)}
            options={[
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
            ]}
          />
        }
      >
        <StatItemValue>{publishedCount} pieces</StatItemValue>
  ```
- **Description**: Toggling the select between 7, 30, and 90 days changes the state `period`, but the card content renders the static prop `publishedCount` regardless of the period select state.
- **Blast Radius**: MEDIUM. The filter dropdown has no influence on the counts shown in the widget.
- **Mitigation/Fix**: Pass filtered counts from the parent component or fetch engagement details from the API using the selected `period` as a query parameter.

---

## 3. Layout and Chart Legend Alignment

The standardized Card layout guidelines specify:
1. **Standardized Card Headers**: All cards must have an icon, a title, and a 1-line faded subtitle.
2. **Parallel Controls**: Card filters or tabs should be positioned in the top-right side parallel to the card header (via the `action` prop).
3. **Chart Legends Location**: Chart legends must be positioned at the top parallel to the Title, adjacent to (just before) the filters.

### Alignment Check List:
1. **HealthPage Weight Progression Card**:
   - Layout: Renders `<SectionCard title="Weight Progression" subtitle="..." icon={<LineChartIcon />} action={...}>`.
   - Action Prop:
     ```tsx
     <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
         <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: theme.color?.accent }} />
         <span>Weight</span>
       </div>
       <SegmentedControl ... />
     </div>
     ```
     *Verification*: Renders inline. The dot legend "Weight" sits immediately left of the SegmentedControl. This is aligned parallel to the Title in the header and complies with the design system.
2. **Finance HomeTab Budget Tracking Card**:
   - Layout: Renders `<GlassCard title="Budget Tracking" subtitle="..." icon={<Target />} action={...}>`.
   - Action Prop: Renders `renderBudgetLegend()` and `<SegmentedControl ... />` side-by-side in a flex container with a gap of 16px.
     *Verification*: The legend ("Budget" and "Actual" dots) is properly aligned to the left of the SegmentedControl filter in the header, remaining adjacent and avoiding overlap.

---

## 4. Adversarial Challenges & Risks

- **Fake Interaction Vulnerability**: Passing filter inputs to the `action` prop creates the illusion of interactive dashboard widgets. Since these states are decoupled from the component logic, users will assume the system is broken or returning bad data (e.g. why does the runway stay identical when selecting Quarterly scope?).
- **Cramped Flex Headers**: Extracted legends and filters are packed into the action prop using a single horizontal row (`display: 'flex', alignItems: 'center'`). In mobile viewport sizes, this will squeeze out the Card Title or wrap onto multiple lines, breaking vertical layout flow.

---

*Prepared by teamwork_preview_challenger*
