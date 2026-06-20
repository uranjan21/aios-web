# Handoff Report — Card Standardization Audit

## 1. Observation
* Observed primitive `Card` component implementation at `/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/ledgr-ui/src/primitives/Card/Card.tsx`. It supports:
  * `title`, `subtitle`, `icon` (ReactNode), and `action` (ReactNode) props.
  * Generates `<CardHeader>` containing a `<TitleGroup>` with `{icon}` and a block with `{title}` and `{subtitle}` inside.
* Observed custom card elements and non-standard usages across various modules via `grep_search`:
  1. `frontend/src/pages/LoginPage.tsx` (Lines 232, 431) uses custom `LoginCard = styled.form` styled-component and custom header `<DesktopWelcome>` (Lines 210, 426).
  2. `frontend/src/pages/DashboardPage.tsx` (Lines 463-548) renders `SummaryCard` and `AreaTile` where the `icon` prop is passed as a constructor reference rather than a JSX element:
     ```tsx
     <SummaryCard
       icon={IndianRupee}
       title="Finance"
       ...
     ```
  3. `frontend/src/pages/SettingsPage.tsx` (Line 459) renders `Account` `GlassCard` with the "Sign out" button placed inside the children body block rather than the `action` prop.
  4. `frontend/src/pages/areas/BusinessPage.tsx` (Line 337) renders a `GlassCard` with custom `ProjectHeader` layout block inside the children instead of standard header props:
     ```tsx
     <ProjectHeader>
       <IconBadge icon={Rocket} color="primary" size="md" />
       <div>
         <ProjectTitle>Ledgr</ProjectTitle>
         <ProjectDescription>SaaS accounting for Indian freelancers</ProjectDescription>
       </div>
       <BadgeWrapper>
         <Badge tone="info">Building</Badge>
       </BadgeWrapper>
     </ProjectHeader>
     ```
  5. `frontend/src/components/areas/business/SummaryTab.tsx` (Lines 116-129) renders `sub` in `subtitle={sub}` prop of `Card` AND within the card body as `<TileSub>{sub}</TileSub>`.
  6. `frontend/src/pages/areas/CareerPage.tsx` (Line 280) uses custom `CareerStat` wrapping `AppCard` without header props, laying out stats manually inside the body.
  7. `frontend/src/components/CareerRadar.tsx` (Line 123) wraps the Highcharts chart in a `FullWidthCard` which is a `GlassCard`, resulting in nested card boxes when rendered in `CareerPage.tsx`'s `Skills Radar` card.
  8. `frontend/src/components/areas/health/HistoryTab.tsx` (Line 166) renders the canonical `<Table>` component without `title`, `subtitle`, `icon` or header actions.
  9. `frontend/src/components/areas/health/FitnessTab.tsx`:
     * `GoalCard` (Line 203) uses custom `<StyledGoalCardHeader>` layout inside the card children block.
     * Habits Stats (Line 835) renders custom `GlassCard` wrappers instead of standard `KpiCard` elements.
     * Workout Sessions (Line 893) renders raw `Recent Workouts` header above a list of `SessionCard`s which themselves define custom header layouts inside the body.
  10. `frontend/src/pages/areas/ContentPage.tsx` (Line 423) renders `PublishedDropZone` inside custom `PublishedZoneRoot` div.
  11. `frontend/src/components/AiInsightCard.tsx` (Line 74) renders a custom `<CardHeader>` component (Line 10) inside the `GlassCard` body.
  12. `frontend/src/components/areas/finance/TransactionsTab.tsx` (Line 847) renders the transaction list `{body}` raw without a card container.

---

## 2. Logic Chain
* **Step 1**: The primitive `Card` component from `@ledgr/ui` is designed to be the single source of truth for card containers. It supports native title, subtitle, icon, and action header layouts.
* **Step 2**: The `AGENTS.md` standard layout conventions mandate that all charts, table cards, and KPI tiles must use the standard `Card` or `GlassCard` layout with `icon`, `subtitle`, and `action` props, avoiding custom headers inside the children body.
* **Step 3**: By comparing observed codebase implementations (Observation 1) against the standard (Observation 2), several visual anomalies were discovered:
  * Custom card wrappers (`LoginPage` `LoginCard`, `ContentPage` `PublishedZoneRoot`).
  * Custom headers inside the card body (`BusinessPage` Ledgr Card, `FitnessTab` GoalCard, `AiInsightCard` header).
  * Redundant nested card wrappers (`CareerRadar` inside `Skills Radar`).
  * Icon bugs where the component constructor is passed instead of a JSX element (`DashboardPage`).
  * Duplicate subtitle rendering (`SummaryTab` MetricTile).
  * Cards missing subtitles (`BusinessPage` RunwayCalculator, `CareerPage` Opportunities/Radar, `DashboardPage` SummaryCard/AreaTile).
  * Lists and tables missing standard Card wrappers and title/action alignment (`TransactionsTab`, `HistoryTab`).
* **Step 4**: Standardizing these occurrences requires a targeted refactoring plan to replace custom HTML/styled structures with the native props of `Card`/`GlassCard`.

---

## 3. Caveats
* We assumed that all custom card containers (like `LoginCard` and `PublishedZoneRoot`) can be seamlessly replaced by `@ledgr/ui`'s `Card` or `GlassCard` without breaking styled components layouts. Since `Card` accepts custom styles and custom tag names (via `as="..."`), this assumption is highly likely to hold.
* We have not run any build or runtime test command, as the requirement specifically limits the scope to a static analysis audit ("DO NOT modify any source code files yet").

---

## 4. Conclusion
* All primary page files and area tab components have been successfully audited. A comprehensive list of deviations and a concrete refactoring plan have been drafted in `analysis.md` inside the working directory.

---

## 5. Verification Method
* **Files to Inspect**:
  * `/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_explorer_card_std/analysis.md`
* **Validation Criteria**:
  * Verify that `analysis.md` lists all audited files, documents their specific deviations from standard conventions, and outlines concrete refactoring plans.
