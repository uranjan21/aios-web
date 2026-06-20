# Handoff Report — Card Standard Audit

## 1. Observation

An audit was conducted across the `Health`, `Career`, `Business`, and `Content` area pages and tab components to analyze compliance with the layout conventions described in `AGENTS.md`. The following locations and lines were inspected:

1. **Venture / Business Area**:
   - `frontend/src/pages/areas/BusinessPage.tsx`: Renders `<GlassCard>` for Runway Calculator (line 270) and Event Timeline (line 372). Renders a custom project card with a div wrapper `<ProjectHeader>` (line 338).
   - `frontend/src/components/areas/business/SummaryTab.tsx`: Renders `<Card>` for MRR Trend (line 33) and `<MetricTile>` (line 116), which duplicates subtitle rendering inside the card body (line 127).
   - `frontend/src/components/areas/business/EventsTab.tsx`: Renders `<Card>` for Event Log (line 259) with `Log Event` action.

2. **Growth / Career Area**:
   - `frontend/src/pages/areas/CareerPage.tsx`: Renders `<AppCard>` for KPI tiles via `<CareerStat>` (line 280), which lack icons. Renders `<GlassCard>` for Opportunities Pipeline (line 324), Career Timeline (line 336), and Skills Radar (line 382).
   - `frontend/src/components/areas/career/OpportunitiesTab.tsx`: Renders `<Card>` for `OppListSection` (line 506).
   - `frontend/src/components/areas/career/RoadmapTab.tsx`: Renders `<Card>` for Career Timeline (line 186).
   - `frontend/src/components/areas/career/SkillGapCard.tsx`: Renders `<Card>` for AI Skill-Gap Analysis (line 69).
   - `frontend/src/components/CareerRadar.tsx`: Renders `<FullWidthCard>` (derived from `GlassCard`, line 118) nested inside the parent `Skills Radar` card.

3. **Wellness / Health Area**:
   - `frontend/src/pages/areas/HealthPage.tsx`: Renders `<KpiCard>` for dashboard KPI tiles (line 239) and `<SectionCard>` for Weight Progression (line 253).
   - `frontend/src/components/areas/health/BodySleepTab.tsx`: Renders `<KpiCard>` for body/sleep KPI tiles (line 296), which lack subtitles, and `<SectionCard>` for Weight Trend (line 304), Sleep Trend (line 344), and 7-day sleep log (line 393).
   - `frontend/src/components/areas/health/FitnessTab.tsx`: Renders `<GlassCard>` for custom goals (line 203) with headers inside body, and `Personal Records` (line 812), `Habits Stats` (line 835, no headers/icons), `Daily Habits` (line 841), and custom `SessionCard`s (line 331).
   - `frontend/src/components/areas/health/HistoryTab.tsx`: Renders raw `<Table>` (line 166) without any enclosing card container.
   - `frontend/src/components/areas/health/NutritionTab.tsx`: Renders `<Card>` for Today's Nutrition (line 472) and Today's Meals (line 493).
   - `frontend/src/components/areas/health/WaterTrackerWidget.tsx`: Renders `<Card>` for Water Intake (line 97).

4. **Creator / Content Area**:
   - `frontend/src/pages/areas/ContentPage.tsx`: Renders `<AppCard>` for drag-and-drop `ItemCard`s (line 223), `<AppCard>` for `EngagementWidget` (line 321), and custom `<PublishedZoneRoot>` (line 423) for published drop zone.
   - `frontend/src/components/areas/content/TwitterQueueCard.tsx`: Renders `<Card>` for Twitter Queue (line 80).

---

## 2. Logic Chain

The project layout guidelines in `AGENTS.md` require:
1. **Dynamic Header Actions**: Portal-beamed primary actions rather than hardcoded header buttons.
2. **Standardized Card Headers**: All charts, tables, and KPI tiles must have an icon, a 1-line faded subtitle, and filters/actions positioned in the top-right side (`action` prop) instead of inside the card body.

By matching the observed components against these rules:
- **Missing Subtitles**: Cards/GlassCards (like Runway Calculator, Event Timeline, Opportunities Pipeline, Career Timeline, Skills Radar, Weight & Body Fat Trend, Sleep Duration Trend, and Goals) either omit subtitles or implement them as custom elements within the card body.
- **Nested Card Layouts**: The `Skills Radar` (in `CareerPage.tsx`) wraps `<CareerRadar>`, which inside itself wraps the chart in an additional `GlassCard`. This creates visual bugs with nested borders/glows.
- **Duplicate Subtitle Rendering**: In `MetricTile` (in `SummaryTab.tsx`), the subtitle is passed as a prop but also rendered within the card body.
- **KPI Tile Standardization**: KPI tiles under Career page (`CareerStat`) and Fitness tab (`Habits Stats` tiles) use raw `Card`/`GlassCard` wrappers without icons and subtitles. The `BodySleepTab` uses `KpiCard` but fails to provide the `sub` subtitle prop.
- **Missing Card Wrappers**: The Health `HistoryTab` renders a table raw on the page. It should be wrapped in a Card, and its filter toolbar moved into the `action` prop.
- **Chart Legends**: `Weight Progression` (in `HealthPage.tsx`) renders a chart with a default canvas legend. This should be disabled in Highcharts and moved to the `action` prop as HTML.

---

## 3. Caveats

- **Draggable Kanban Items**: Draggable tasks/items (such as `ItemCard` in Content pipeline) are excluded from standard card header requirements (icons/subtitles) since they represent individual tasks rather than layout widgets.
- **External CSS/Themes**: Recommended icons and subtitles assume standard `lucide-react` icons and `@ledgr/ui` style props.

---

## 4. Conclusion

A comprehensive layout audit of the `Health`, `Career`, `Business`, and `Content` sections has identified multiple instances of non-standard card usages, missing icons/subtitles on widgets/KPI tiles, nested card wrappers, and misplaced filter actions. 
An exhaustive itemization of every card and standard recommendation has been compiled in `analysis.md` inside this agent's folder.

---

## 5. Verification Method

To verify the audit findings:
1. **Visual Code Inspection**: Inspect `analysis.md` inside the agent's folder to review specific line number matches and corresponding recommendations.
2. **Component References**: Open files using `view_file` at the exact line numbers specified in `analysis.md` to confirm the presence of custom div wrappers or missing properties.
3. **Build Check**: Run `npm run build` or `npm run lint` inside the `frontend` folder to ensure code compiles and matches compiler-level standards.
