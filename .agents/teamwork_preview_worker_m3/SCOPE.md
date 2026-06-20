# Scope: Premium UI/UX Polish (Milestone 3)

## 1. Bento Grid Layout on Dashboard
- In `DashboardPage.tsx`, rearrange the KPI summary grid (Finance, Health, Agents cards) into a visually varied, asymmetric bento grid.
- Currently, they are symmetric with `col-span-4` (on md) for each.
- Replace this with asymmetric sizes:
  - **Finance Card**: `col-span-5` (or `GridItem5` spanning 5 / 12 on md/desktop).
  - **Health Card**: `col-span-4` (or `GridItem4` spanning 4 / 12 on md/desktop).
  - **Agents Card**: `col-span-3` (or `GridItem3` spanning 3 / 12 on md/desktop).
- Create `GridItem5` and `GridItem3` styled components in `DashboardPage.tsx` to support this asymmetric layout.

## 2. Dashboard KPI Compact Typography
- Shrink the KPI numbers in `DashboardPage.tsx` to match the compact size standards:
  - `StatHeroValue` styled component should use `font-size: 13px;` (or `12px`), `line-height: 16px;`, and `font-weight: 600;` (avoid `font-bold` and `font-size: 30px` which the user hates).
  - Adjust titles and spacing of the cards to match this compact, high-density layout.

## 3. Empty States Action Compliance
- Ensure all `<EmptyState>` components render a clear CTA action button.
- Go through the list of pages and components and make sure every `<EmptyState>` call passes a valid `action` prop (with a compelling label like "Add Entry", "Log Workout", "Seed Agents", "Connect Integration" and a click handler).
- Files to verify/update:
  - `src/components/areas/career/OpportunitiesTab.tsx`
  - `src/components/areas/career/RoadmapTab.tsx`
  - `src/components/areas/health/FitnessTab.tsx` (Habits and Workouts empty states)
  - `src/components/areas/health/HistoryTab.tsx`
  - `src/pages/AgentsPage.tsx`
  - `src/pages/areas/BusinessPage.tsx` (Events empty state)
  - `src/pages/areas/CareerPage.tsx`
  - `src/pages/IntegrationsPage.tsx`
  - `src/pages/DashboardPage.tsx` (Recent captures empty state)

## 4. Frosted Glass TopBar
- Update `HeaderRoot` in `TopBar.tsx` to have a premium frosted glass look and a subtle shadow separating it from the page content.
- Use `backdrop-filter: blur(8px);` and a semi-transparent background using `color-mix` with `theme.color.card`, plus `box-shadow: ${({ theme }) => theme.shadow.sm};` (or a subtle default shadow).
- Ensure it works elegantly in both light and dark modes.

## 5. Micro-Interactions
- Add `hover:scale-[1.02]` and `transition: transform 200ms ease-out, box-shadow 200ms ease-out` to all clickable/hoverable cards on the Dashboard:
  - `SummaryCardWrapper`
  - `AreaTileWrapper`
  - Any other clickable widgets.

## 6. Build Integrity
- Run `pnpm build` in the `frontend/` directory to ensure all changes compile cleanly with zero TypeScript errors or warnings.
