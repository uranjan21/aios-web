# Handoff Report — Card Filter & Layout Alignment Verification

This report summarizes the verification of interactive filter behaviors and layout alignment on the standardized Card layouts.

## 1. Observation

- **Observation 1 (Business Runway Calculator)**: In `frontend/src/pages/areas/BusinessPage.tsx` (Lines 238-297), the state `runwayPeriod` is changed by the `Select` component in the `action` prop but the calculation uses hardcoded monthly burn rate values:
  ```tsx
  const runwayMonths = burnRate > 0 ? (cash / burnRate).toFixed(1) : '∞'
  ```
- **Observation 2 (FinanceStats Filters)**: In `frontend/src/components/areas/finance/FinanceStats.tsx` (Lines 332–396), changing the selections for `incExpPeriod`, `spendPeriod`, and `trendTimeline` in the `action` prop updates state variables that are completely ignored by the data rendering logic (`donutData`, `pieData`, and `trendOptions`), which instead use the global `period` prop.
- **Observation 3 (Finance HomeTab Filters)**: In `frontend/src/components/areas/finance/HomeTab.tsx` (Lines 489–507, 284–343, 419–430), the `upcomingFilter`, `healthPeriod`, and `period` filters in the `Upcoming Payments`, `Financial Health`, and `Top Categories` cards change states that are not used to filter or adjust the card display data.
- **Observation 4 (ContentPage engagementWidget Filter)**: In `frontend/src/pages/areas/ContentPage.tsx` (Lines 319–355), the `period` select in the `Content Summary` card modifies state `period` but the card content renders the static prop `publishedCount`.
- **Observation 5 (Layout Legend Extraction)**: Extracted legends in the `action` prop (e.g. `HealthPage.tsx` Weight Progression and `HomeTab.tsx` Budget Tracking) are positioned inside a horizontal flex row immediately left of the filters, aligning parallel to the card header titles.

## 2. Logic Chain

1. **Step 1**: Toggling a filter component updates a local component state (e.g. `runwayPeriod`, `upcomingFilter`, `healthPeriod`). (Supported by Observations 1, 2, 3, 4)
2. **Step 2**: The data computation or query hook that drives the card contents does not read from or depend on this local component state. (Supported by Observations 1, 2, 3, 4)
3. **Step 3**: As a result, user interactions with the filters update the state variables but fail to update the rendered chart or list data, causing non-functional "dead" UI filters.
4. **Step 4**: The chart legends (such as in Weight Progression and Budget Tracking cards) are grouped side-by-side with the filters inside a flex container within the `action` prop. This aligns them next to each other, parallel to the card Title in the header, satisfying layout constraints. (Supported by Observation 5)

## 3. Caveats

- **API Capabilities**: Did not audit if the backend API endpoints support querying by these specific periods (e.g., retrieving previous health score data or historical top category data over multiple weeks/years). The mitigations assume the backend is capable of returning the required datasets.
- **Build commands**: Build and lint commands could not be run synchronously on the host system because the permission prompt timed out. Verification is based entirely on source code analysis.

## 4. Conclusion

- The layout alignment for standardized card headers and legends is compliant with the specifications in `AGENTS.md`. Legends align parallel to titles and sit adjacent to filters.
- There are **8 interactive filter bugs** across `Finance`, `Business`, and `Content` pages where filters are disconnected from the data calculation logic. The implementer must refactor these files to correctly bind local filter states to the queries/computations.

## 5. Verification Method

To verify these findings, inspect the following files:
1. `frontend/src/pages/areas/BusinessPage.tsx` — check `RunwayCalculator` state binding.
2. `frontend/src/components/areas/finance/FinanceStats.tsx` — check `donutData`, `pieData`, and `trendOptions` state dependencies.
3. `frontend/src/components/areas/finance/HomeTab.tsx` — check `upcoming`, `HealthScoreCard`, and `topCategories` state dependencies.
4. `frontend/src/pages/areas/ContentPage.tsx` — check `EngagementWidget` state binding.
5. Inspect the UI layout in the browser: interact with the card dropdown filters to confirm that card contents are static.
