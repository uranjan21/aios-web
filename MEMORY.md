# AIOS Memory

## STRICT GLOBAL UI/UX GUIDELINES
Before making *any* code changes in any session, all Agents MUST adhere to these absolute rules:
1. **No Page-Level Headers/Titles**: Do NOT render titles or subtitles inside page content areas. The page title must ONLY be displayed as a Breadcrumb inside the global Header bar.
6. **Max Grid Layout & Extreme Density**: Every single page must use a max 12-column grid layout, but cards must NOT unnecessarily stretch (avoid massive `col-span-12` wrappers). Cards should **only take the space required for them**. Use strict auto-fitting grids or tightly packed columns (e.g. `col-span-3` or `col-span-4`) to ensure maximum data density.
7. **No Chart Bloat**: NEVER use massive data visualizations (like giant Highcharts area charts, massive Radar charts, or oversized Heatmaps) that force cards to become artificially large. Cards must remain tiny and horizontally tight.
8. **Optimized Space & Catalyst Design**: Cards/widgets should use the Catalyst/AlignUI aesthetic: pure `bg-card` (white) on a soft gray background, faint borders (`border border-border/60`), and flat shadows (`shadow-sm`). Border radii should be `rounded-xl` or `rounded-2xl` (~12px-16px). Use tight padding (`p-2` or `p-3`, never `p-4` or `p-6`).
9. **Theme**: Default Light Mode for all app elements. Global theme management must be used.
10. **Responsiveness**: All designs must be responsive for mobile, tablet, and laptop screens.
11. **Catalyst Aesthetics & Sidebar Typography**: Use ONLY premium, clean sans-serif fonts (like `Inter`). NEVER use `font-mono`. Widget titles must be Title Case, styled as `text-xs font-medium text-muted-foreground`. **CRITICAL**: KPI numbers and values must STRICTLY match the compact sidebar font sizes (e.g., `text-[12px]` or `text-xs`). NEVER use `font-bold`, `text-lg`, `text-2xl`, or `text-3xl` for values inside widget cards. The user strictly hates massive, bold fonts. Add small top-right action buttons (e.g., "Report") styled as `text-[10px] px-2 py-0.5 bg-muted/50 text-muted-foreground rounded` where appropriate.
12. **Navigation & Area Tabs**: The Sidebar must ONLY contain top-level links (e.g., Finance, Health). **NEVER use sub-menus or accordions in the Sidebar**. All sub-navigation within an Area MUST be handled by the shared `<AreaTabs>` component placed at the top of the Area page (e.g., Dashboard, Log Transaction, Budgets).
13. **Flat Tabs Only**: Do NOT use nested tabs (e.g., an outer `<Tabs>` wrapping an inner `<Tabs>`). Flatten all sections into a single, top-level `<AreaTabs>` list to avoid UI stacking and clutter.
14. **AreaTabs Styling**: Always import `<AreaTabs>` from `@/components/ui/AreaTabs`. It ensures semantic coloring for light/dark modes (`hsl(var(--foreground))`), tight spacing (`margin-right: 20px`), and left padding to prevent sidebar clipping.

## Architecture & Tech Stack
- **Backend**: Python, FastAPI, SQLModel (SQLAlchemy/asyncpg), PostgreSQL (with pgvector), Alembic.
  - Dependencies managed via `uv` / `poetry`.

## Data Models
- **Finance Area**: `FinanceSnapshot`, `FinanceExpense`. Recently added `Account` (Checking, Savings, Credit, Investment, Loan) and `Category` (hierarchical with `parent_id` and emoji `icon`).
- **Health Area**: `HealthLog`, `HealthStreak`.
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
