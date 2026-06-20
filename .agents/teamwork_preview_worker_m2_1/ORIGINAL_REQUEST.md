## 2026-06-20T20:40:19Z

You are teamwork_preview_worker. Your working directory is `/Users/utsavranjan/Projects - Agentic AI/Project - AiOs/aios-web/.agents/teamwork_preview_worker_m2_1`. Do not write to any other agent's folder or parent directories.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement the refactoring plan for the Card component and Area tabs. Please perform the following steps:

1. Update `ledgr-ui/src/primitives/Card/Card.tsx` to:
   - Add a bottom border below `CardHeader` separating title/actions from content. For example, add `border-bottom: 1px solid ${({ theme }) => theme.color.border};`, `padding-bottom: 12px;`, `margin-bottom: 16px;`.
   - Reduce the bottom padding of `Card` component universally (e.g., using `SIZE_PADDING_BOTTOM` map or setting `padding-bottom` individually for sm, md, lg sizes to be ~8px smaller: 16px for lg, 12px for md, 8px for sm).
   - Refactor the `glass` variant styling to use true glassmorphism style rules: translucent background (with 65%-75% opacity) combined with backdrop-filter blur (12px), and a matching border transparency.
   - Support keyboard accessibility for interactive cards: when `$interactive` is true, pass `tabIndex={0}` to the Card root element, and add a focus-visible outline ring using `theme.color.ring` with `outline-offset: 2px`.
   - Add a premium hover style for interactive cards: a subtle scale-up effect (`transform: translateY(-4px) scale(1.01)`) and a gold border highlight glow (e.g. `border-color: ${({ theme }) => theme.color.accent}55;`). Ensure the transition is smooth.

2. Update `frontend/src/components/areas/finance/WalletWidgets.tsx` to:
   - Replace the custom `TabContainer` and `TabButton` tab switcher for "Net Worth Trend" with the library's `SegmentedControl` component from `@ledgr/ui` (size="sm").
   - Pass this `SegmentedControl` into the Card's `action` slot (in `GlassCard`) and delete the custom `TabContainer` and `TabButton` definitions from the file.

3. In the health tab files:
   - `frontend/src/components/areas/health/BodySleepTab.tsx`
   - `frontend/src/components/areas/health/FitnessTab.tsx`
   - `frontend/src/components/areas/health/NutritionTab.tsx`
   - Remove `TabToolbar` imports.
   - Wrap the primary log button (e.g., "Log Body Stats / Sleep", "Log Workout", "Log Meal") in `<HeaderActionPortal>` imported from `@ledgr/ui`.
   - Remove the `<TabToolbar>` component call entirely.

4. In the career tab file `frontend/src/components/areas/career/OpportunitiesTab.tsx`:
   - Wrap the "Add" button in `<HeaderActionPortal>` from `@ledgr/ui`.
   - Remove the custom local `Toolbar` styling wrapper if it's no longer needed, keeping the `SegmentedControl` correctly placed.

5. Delete `frontend/src/components/ui/TabToolbar.tsx` entirely from the project.

6. Update the global `PROJECT.md` in the workspace root:
   - Set Milestone 6 status to `DONE`.
   - Add Milestone 7: "Card Redesign & Action Portal Extraction" with status `IN_PROGRESS` or `DONE` (as you complete it).

7. Verify your changes by compiling the application. Run build commands in `ledgr-ui` and/or `frontend` directories, verify there are no TypeScript compile errors, and document the build outputs/commands in your handoff.

When done, write a detailed report of the changes and build/test verification results to `changes.md` in your directory, write a handoff report to `handoff.md`, and send me a message (conversation ID: eab5cb35-7873-4fb2-86f1-96af81be0924) with the summary of your work and paths to your reports.
