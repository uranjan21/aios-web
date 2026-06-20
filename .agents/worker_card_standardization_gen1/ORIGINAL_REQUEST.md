## 2026-06-20T17:49:50Z
You are teamwork_preview_worker.
Your working directory is: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/worker_card_standardization_gen1
Your task is to standardize Card and GlassCard layouts across all pages and tabs in the aios-web frontend to use standard Card/GlassCard layout with icon, subtitle, and filters/legends in the action prop.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT
hardcode test results, create dummy/facade implementations, or
circumvent the intended task. A Forensic Auditor will independently
verify your work. Integrity violations WILL be detected and your
work WILL be rejected.

Please read the complete checklist and audit summary of findings from the file:
/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/orchestrator_card_standardization/audit_summary.md

Please make the requested changes in all files listed in audit_summary.md:
1. Standardize general and layout files:
   - frontend/src/pages/DashboardPage.tsx (SummaryCard, AreaTile, Quick Capture)
   - frontend/src/pages/LoginPage.tsx (LoginCard)
   - frontend/src/pages/SettingsPage.tsx (Sections, Account Card)
   - frontend/src/components/layout/WorkspaceLayout.tsx (Rail)
2. Standardize Card imports and component layout in Finance components:
   - AccountManager.tsx, BudgetsTab.tsx, CategoryManager.tsx, GoalsTab.tsx, InvestmentsTab.tsx, LoansTab.tsx (change imports to '@ledgr/ui')
   - TransactionsTab.tsx (SummaryBar)
   - FinanceStats.tsx (Income vs Expense Chart legend, Spending by Category Chart legend, Drill-down Card CloseBtn, Budget vs Actual, Trend Chart)
   - HomeTab.tsx (HealthScoreCard, StatTile (Net Worth), StatTile (Spent), StatTile (Income), StatTile (Savings Rate), Upcoming Payments)
3. Standardize Other Area Components (Business, Career, Health, Content):
   - Business: BusinessPage.tsx (Runway Calculator, Ledgr Project Card, Event Timeline), SummaryTab.tsx (MRR Trend, MetricTile), EventsTab.tsx (Event Log)
   - Career: CareerPage.tsx (CareerStat KPI tiles, Opportunities Pipeline, Career Timeline, Skills Radar), OpportunitiesTab.tsx (OppListSection), SkillGapCard.tsx (AI Skill-Gap Analysis)
   - Health: BodySleepTab.tsx (KpiCard tiles, Weight & Body Fat Trend, Sleep Duration Trend, Sleep Last 7 Days), FitnessTab.tsx (GoalCard, Personal Records, Habits Stats, SessionCard), HistoryTab.tsx (Health Logs Table wrapping Table), NutritionTab.tsx (Today's Nutrition)
   - Content: ContentPage.tsx (Content Summary, Published Content PublishedZoneRoot)

Requirements:
- Make sure to use standard @ledgr/ui Card/GlassCard.
- Ensure every card has a contextually appropriate icon (from lucide-react) and a 1-line faded subtitle.
- All filters, SegmentedControls, dropdowns, and extracted chart legends must be passed in the Card's action prop.
- If a card lacks filters, add a relevant filter (e.g. status or period select).
- For charts, extract legends from the chart canvas and render them as HTML inside the action prop.
- Verify the layout is fully responsive and does not cause styling overrides.
- After all edits, run the build command (e.g., 'pnpm build' in the 'frontend/' directory) to verify compilation success with zero TypeScript errors. Document the build command and results in your handoff.

Write your change log to changes.md and summarize in handoff.md in your working directory. Notify your parent when complete.
