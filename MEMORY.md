# AIOS Memory

## STRICT GLOBAL UI/UX GUIDELINES
Before making *any* code changes in any session, all Agents MUST adhere to these absolute rules:
1. **No Page-Level Headers/Titles**: Page-level headers/titles should be rendered via the standard `@ledgr/ui` `<PageHeader>` component (which is what pages actually implement) rather than hardcoded within individual content cards.
2. **Max Grid Layout & Extreme Density**: Every single page must use a max 12-column grid layout, but cards must NOT unnecessarily stretch (avoid massive `col-span-12` wrappers). Cards should **only take the space required for them**. Use strict auto-fitting grids or tightly packed columns (e.g. `col-span-3` or `col-span-4`) to ensure maximum data density.
3. **No Chart Bloat**: NEVER use massive data visualizations (like giant Highcharts area charts, massive Radar charts, or oversized Heatmaps) that force cards to become artificially large. Cards must remain tiny and horizontally tight.
4. **Optimized Space & Catalyst Design**: Cards/widgets should use the Catalyst/AlignUI aesthetic: pure `bg-card` (white) on a soft gray background, faint borders (`border border-border/60`), and flat shadows (`shadow-sm`). Border radii should be compact and consistent: use `10px` for cards, table shells, and modal/dialog surfaces (avoid oversized corners). Use tight padding (`p-2` or `p-3`, never `p-4` or `p-6`).
5. **Theme**: Default Light Mode for all app elements. Global theme management must be used.
6. **Responsiveness**: All designs must be responsive for mobile, tablet, and laptop screens.
7. **Catalyst Aesthetics & Sidebar Typography**: Use ONLY premium, clean sans-serif fonts (like `Inter`). NEVER use `font-mono`. Widget titles must be Title Case, styled as `text-xs font-medium text-muted-foreground`. **CRITICAL**: KPI numbers and values must STRICTLY match the compact sidebar font sizes (e.g., `text-[12px]` or `text-xs`). NEVER use `font-bold`, `text-lg`, `text-2xl`, or `text-3xl` for values inside widget cards. The user strictly hates massive, bold fonts. Add small top-right action buttons (e.g., "Report") styled as `text-[10px] px-2 py-0.5 bg-muted/50 text-muted-foreground rounded` where appropriate.
8. **Navigation & Area Tabs**: The Sidebar must ONLY contain top-level links (e.g., Finance, Health). **NEVER use sub-menus or accordions in the Sidebar**. All sub-navigation within an Area MUST be handled by the shared `<AreaTabs>` component placed at the top of the Area page (e.g., Dashboard, Log Transaction, Budgets).
9. **Flat Tabs Only**: Do NOT use nested tabs (e.g., an outer `<Tabs>` wrapping an inner `<Tabs>`). Flatten all sections into a single, top-level `<AreaTabs>` list to avoid UI stacking and clutter.
10. **AreaTabs Styling**: Always import `<AreaTabs>` from `@/components/ui/AreaTabs`. It ensures semantic coloring for light/dark modes (`hsl(var(--foreground))`), tight spacing (`margin-right: 20px`), and left padding to prevent sidebar clipping.
11. **Logging Forms & Toolbars**: For any data logging or quick-add actions, use generic buttons placed in a Toolbar just below the `AreaTabs`. Clicking these buttons should open a Modal Dialog containing the logging forms (using a Segmented control for tabs inside the modal if there are multiple related forms to switch between). Do not render logging forms directly inline on the page grid.
12. **Dashboard & Data Density**: Keep dashboard layouts in a compact two-column shell with the right side reserved for sticky schedule/overview content. Lower rows should stay aligned under the left content area rather than leaving awkward gaps.
13. **Agents Page Pattern**: Prefer a dense card/table presentation for agent listings with clear columns for status, schedule, last run, and actions.
14. **Strict Page Layout**: Every page MUST adhere exactly to this structural hierarchy:
    1. **Top Level Title + Global Buttons**: Page title on the top left, global action buttons on the top right.
    2. **Tabs**: Sub-navigation via `<AreaTabs>`.
    3. **Toolbar**: Filter controls and specific context actions directly below the tabs.
    4. **Main Content**: Grids, lists, and content below the toolbar.

## Architecture & Tech Stack
- **Backend**: Python, FastAPI, SQLModel (SQLAlchemy/asyncpg), PostgreSQL (with pgvector), Alembic.
  - Dependencies managed via `uv`.

## Data Models
- **Finance Area**: `FinanceSnapshot`, `FinanceExpense`. Recently added `Account` (Checking, Savings, Credit, Investment, Loan) and `Category` (hierarchical with `parent_id` and emoji `icon`).
- **Health Area**: `HealthLog`, `HealthGoal, Habit, HabitCheck, WorkoutSession`.
- **Career/Biz Area**: `CareerEvent`, `SkillInventory`, `JobOpportunity`, `BusinessEvent`.
- **Agents Core**: `Agent` (tracks status, cron expression, output streams).

## Active Projects / Completed Work
1. **Premium Area Redesigns (Complete)**: 
   - Finance: Tabbed layout with AI Insights, Cashflow Forecasting, Goal Rings, Subscription management.
   - Health: Balance Radar charts, Fasting solid gauges, Muscle Heatmaps, and PR celebration widgets.
   - Career & Business: Career Radar and Business Runway Calculators using Antd Sliders and Timelines.
   - Agents Page: Glowing glassmorphic grid with live Terminal slide-out drawers and Highcharts sparklines.
2. **Foundational Architecture**: Built frontend `AccountManager` and `CategoryManager` integrated with backend endpoints for robust finance tracking.
3. **Multi-Agent Orchestration**: We heavily utilize an "Agent Swarm" architecture where a Principal Engineer Orchestrator spins up specialized subagents (FinanceAgent, HealthAgent, UIUXAgent) to build features concurrently. Future sessions should continue this pattern for massive overhauls.

## Known Issues / Backlog
- Replace default secure keys in backend `get_settings`.
- Continue rolling out the Ant Design + Styled Components system to the Chat and Settings pages, which may still be using older Tailwind/Radix components.
