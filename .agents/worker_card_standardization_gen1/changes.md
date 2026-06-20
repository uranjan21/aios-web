# Change Log - Card Standardization

Standardized `Card` and `GlassCard` layouts to use standard `@ledgr/ui` header components (title, subtitle, icon, action) with interactive filter dropdowns, buttons, and HTML legends.

## Modified Files and Details

### 1. Career Area Components
* **`frontend/src/components/areas/career/SkillGapCard.tsx`**
  * Moved the "Analyse" button from the input row in the body to the card header's `action` prop.
  * Stopped click propagation on action button (`onClick={(e: any) => { e.stopPropagation(); mutate() }}`).

### 2. Health Area Components & Pages
* **`frontend/src/pages/areas/HealthPage.tsx`**
  * Disabled default Highcharts legend in `weightOptions` using `legend: { enabled: false }`.
  * Added an HTML legend showing the Weight indicator dot next to the `SegmentedControl` in the card's `action` prop.
* **`frontend/src/components/areas/health/BodySleepTab.tsx`**
  * Declared `bodyPeriod`, `sleepPeriod`, and `sleepQualityFilter` filter states.
  * Added subtitles to all five `KpiCard` tiles via the `sub` prop.
  * Standardized **Weight & Body Fat Trend** card header actions to include HTML legends and period select.
  * Standardized **Sleep Duration Trend** card header actions to include HTML legends and period select.
  * Standardized **Sleep — Last 7 Days** card header actions to include a sleep quality select dropdown.
  * Sliced and filtered weight, sleep trend charts, and lists accordingly.
* **`frontend/src/components/areas/health/FitnessTab.tsx`**
  * Imported `Select` and `KpiCard` from `@ledgr/ui`.
  * Standardized **GoalCard** component: converted custom headers in body to standard `GlassCard` title, subtitle, icon, and action props.
  * Refactored habits summary card grid to use standard `KpiCard` components with subtitles and icons (`Repeat`, `CheckCircle2`, `Flame`).
  * Wrapped recent workouts list in a parent `GlassCard` with a session limit select dropdown in the `action` prop.
  * Converted **SessionCard** inner headers to standard `GlassCard` header props and modernized delete button.
  * Added a PR limit select dropdown inside the **Personal Records** card's `action` prop.
* **`frontend/src/components/areas/health/HistoryTab.tsx`**
  * Wrapped the health logs `Table` in a standard `@ledgr/ui` `Card`, transferring the header settings (`title`, `subtitle`, `icon`, `action`) to the Card.
  * Stopped click propagation on actions.
* **`frontend/src/components/areas/health/NutritionTab.tsx`**
  * Added `nutritionPeriod` filter state.
  * Passed a period selection dropdown (`Select`) into the "Today's Nutrition" card's `action` prop.

### 3. Content Area Components & Pages
* **`frontend/src/pages/areas/ContentPage.tsx`**
  * Imported `Select` from `@ledgr/ui`.
  * Added period filter dropdown to **Content Summary** (`EngagementWidget`) card header actions.
  * Refactored **Published Content** drop zone to use standard Card header props and converted the custom `PublishedZoneRoot` div wrapper to a styled `AppCard` component.
* **`frontend/src/components/areas/content/TwitterQueueCard.tsx`**
  * Imported `Select` and `useState`.
  * Added a drafts type select filter next to the item count inside the card's `action` prop.
