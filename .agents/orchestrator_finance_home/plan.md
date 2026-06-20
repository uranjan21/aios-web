# Plan: Streamline Finance Home Page

## Objective
Streamline the Finance Home page by removing the "Recent Activity" and "Accounts" cards, reordering "AI Financial Insights" and "Explain This Month" cards to be immediately below the KPI grid, and hiding them by default with toggle buttons ("Insights" and "Explain Month") in the HeaderActionPortal.

## Task Assessment
- **Complexity**: Low-to-Medium (visual change on a single page, adding local state toggles and HeaderActionPortal integration).
- **Strategy**: Single implementation cycle. Decompose into Explorer analysis, Worker implementation, Reviewer/Challenger validation, and Forensic Auditor verification.

## Milestones & Decompositions
1. **Explorer Phase**: Find and analyze the relevant files (`FinanceHome.tsx` or similar, `HeaderActionPortal` usage).
2. **Worker Phase**: Modify codebase as per requirements.
3. **Reviewer & Challenger Phase**: Validate correctness, compilation, design guidelines (from AGENTS.md), and user functionality.
4. **Forensic Auditor Phase**: Verify integrity (no hardcoding, no dummy implementation).

## Detailed Steps
1. **Explorer Investigation**:
   - Locate where Finance Home is rendered.
   - Locate the components/cards: "Recent Activity", "Accounts", "AI Financial Insights", "Explain This Month".
   - Identify where KPI grid is rendered.
   - Investigate how `HeaderActionPortal` is imported and used in other parts of the application or `@ledgr/ui`.
2. **Implementation**:
   - Add state toggles (e.g. `showInsights`, `showExplainMonth` initialized to `false`).
   - Use `HeaderActionPortal` to render the "Insights" and "Explain Month" buttons.
   - Reorder the cards: put "AI Financial Insights" and "Explain This Month" cards under the KPI grid, controlled by the toggle states.
   - Remove "Recent Activity" and "Accounts" cards.
   - Verify layout and compilation.
3. **Review and Testing**:
   - Reviewer check: Check formatting, code styling, design token compliance, and layout.
   - Challenger check: Emulate clicks, verify state changes.
   - Run tests/build using worker/reviewer.
4. **Auditor**: Run integrity checks.
