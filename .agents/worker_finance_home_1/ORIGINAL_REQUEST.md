## 2026-06-20T15:51:10Z

You are the worker for the Finance Home page streamlining task.
Your working directory is: /Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/worker_finance_home_1
Identity: teamwork_preview_worker

Your task is to implement the following changes in `frontend/src/components/areas/finance/HomeTab.tsx`:
1. Import `Button` and `HeaderActionPortal` from `@ledgr/ui` (on line 5 or wherever appropriate).
2. Inside the `HomeTab` component, add state variables `showInsights` and `showExplainMonth` initialized to `false`.
3. Add a `<HeaderActionPortal>` containing two buttons:
   - Button 1: Label "Insights", size "sm", toggles `showInsights`. Visually toggles variant: `variant={showInsights ? "primary" : "outline"}`.
   - Button 2: Label "Explain Month", size "sm", toggles `showExplainMonth`. Visually toggles variant: `variant={showExplainMonth ? "primary" : "outline"}`.
4. Position the `HeaderActionPortal` inside the return statement of `HomeTab`.
5. Remove the "Recent Activity" and "Accounts" cards completely from the layout (they are rendered inside `<AnalyticsGrid>`).
6. Remove the `<InsightsGrid>` from the bottom of the page layout.
7. Insert the `<InsightsGrid>` containing `<AiInsightCard>` (Explain This Month card) and `<AIInsightsEngine />` (AI Financial Insights card) immediately below the `<KpiGrid>` component. The grid or cards must be hidden by default and only visible if their respective toggle states are true.
   Specifically, if `showInsights || showExplainMonth` is true, render `<InsightsGrid>`. Within it:
   - If `showExplainMonth` is true, render `<AiInsightCard area="finance" style={{ height: '100%' }} />`.
   - If `showInsights` is true, render `<AIInsightsEngine />`.
8. Once implemented, run `pnpm build` in the `frontend/` directory to verify that the build compiles cleanly with zero TypeScript errors.
9. Verify that there are no unused imports/variables causing warnings or errors.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

Please save your changes, document your implementation, run the build verification, and write a handoff report at `/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/worker_finance_home_1/handoff.md`. Then notify the orchestrator (conversation ID: 1f940ced-92c6-4746-b450-4de2082242cb) with a summary.
