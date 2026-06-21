# Combined Implementation Request - Card Standardization

## Working Directory
/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_impl

## Objective
Implement all the card standardization updates across the `aios-web` frontend files identified during the audit.

## Task Details
Please refer to the audit findings in `/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_explorer_card_std/analysis.md`.
You need to modify the following files:
1. `frontend/src/pages/LoginPage.tsx` (Use standard Card/GlassCard as form, add title/subtitle/icon props)
2. `frontend/src/pages/DashboardPage.tsx` (Fix icon class vs JSX bugs, add subtitles to all summary cards & area tiles)
3. `frontend/src/pages/SettingsPage.tsx` (Move Sign out button to action prop of the Card)
4. `frontend/src/components/AiInsightCard.tsx` (Pass title, subtitle, icon, and actions as standard props instead of custom header divs in body)
5. `frontend/src/components/CareerRadar.tsx` (Remove FullWidthCard wrapper, return Highcharts directly)
6. `frontend/src/pages/areas/BusinessPage.tsx` (Add runway calculator subtitle, use standard GlassCard props for Ledgr project, add subtitle for timeline)
7. `frontend/src/components/areas/business/SummaryTab.tsx` (Remove duplicate subtitle in metric tile body)
8. `frontend/src/pages/areas/CareerPage.tsx` (Refactor CareerStat to use KpiCard or standard Card, add subtitles to opportunities, timeline, skills radar)
9. `frontend/src/components/areas/health/HistoryTab.tsx` (Wrap table in standard Card, move search/export filters to action prop)
10. `frontend/src/components/areas/health/FitnessTab.tsx` (Replace custom GoalCard headers, convert habits stats to standard KpiCards, wrap recent workouts in a parent Card, convert session headers to standard props)
11. `frontend/src/components/areas/finance/TransactionsTab.tsx` (Wrap transaction body in standard Card)
12. `frontend/src/pages/areas/ContentPage.tsx` (Replace PublishedZoneRoot with standard Card)

## Integrity Constraints
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

## Completion Criteria
- Update all 12 files cleanly.
- Run `pnpm build` or `npm run build` from `frontend/` to confirm zero compilation errors.
- Write a detailed `handoff.md` with your changes.

## 2026-06-21T01:40:09Z
Read /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_impl/ORIGINAL_REQUEST.md and implement the card standardization. Write progress to progress.md and handoff details to handoff.md. Use /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_card_std_impl as your working directory.
