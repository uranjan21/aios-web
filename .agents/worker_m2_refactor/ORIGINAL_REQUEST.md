## 2026-06-20T18:37:30Z
Remove the global FilterBars from the five area pages:
- `frontend/src/pages/areas/FinancePage.tsx`
- `frontend/src/pages/areas/HealthPage.tsx`
- `frontend/src/pages/areas/BusinessPage.tsx`
- `frontend/src/pages/areas/CareerPage.tsx`
- `frontend/src/pages/areas/ContentPage.tsx`
Specifically: remove the `toolbar` prop (containing the `<FilterBar ... />`) from the `<AreaTabs>` component calls. Clean up imports of `FilterBar` and `PeriodSelect`, and remove any unused page-level states (`query`, `status`, `type`, `period`, etc.) in these files.

Modify `frontend/src/components/ui/AreaToolbar.tsx`:
Update the styled-components styling of the `Shell` component to have:
- `border-radius: 16px;`
- `background: ${({ theme }) => theme.color.card};`
- `padding: 10px 12px;`
- `border: 1px solid ${({ theme }) => theme.color.border};`
- `box-shadow: ${({ theme }) => theme.shadow.xs};`

Ensure tab-specific toolbars are correctly restored and working:
- In `frontend/src/components/areas/finance/TransactionsTab.tsx`: Add a primary action button to the local `AreaToolbar` that calls `openAdd('expense')` (or triggers the transaction modal).
- In `frontend/src/components/areas/finance/AccountsTab.tsx`: Add an action button next to the `TextTabs` switcher to add the active tab item (Account, Category, Investment, Loan).
- In `frontend/src/components/areas/finance/BudgetTab.tsx`: Add an action button next to the `TextTabs` switcher to add the active tab item (Budget, Goal, Bill, Subscription).
- In `frontend/src/components/areas/health/BodySleepTab.tsx`, `NutritionTab.tsx`, `FitnessTab.tsx`: Render a local toolbar (using `AreaToolbar` or `TabToolbar`) containing their respective "Log Body Stats / Sleep", "Log Meal", "Log Workout" buttons, making sure they open their respective log modals.
- In `frontend/src/pages/areas/BusinessPage.tsx`: Render the "Log Event" button inside the "Event Timeline" card header on the Dashboard tab, or inside a local toolbar.
- In `frontend/src/pages/areas/CareerPage.tsx`: Render the "Log Milestone" button inside the "Career Timeline" card header on the Dashboard tab, or inside a local toolbar.
- In `frontend/src/pages/areas/ContentPage.tsx`: Move the "Capture Idea" button inside the local `<PageToolbar>` component.

Run `pnpm build` in the `frontend` directory and verify the build passes cleanly with zero TypeScript or lint errors.

Update progress.md and write handoff.md.
