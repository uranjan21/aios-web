# AIOS Memory

## Architecture & Tech Stack
- **Frontend**: React, Vite, Ant Design (`antd`), Styled Components, Highcharts (`highcharts-react-official`), Framer Motion, Zustand, React Query.
  - *Note: We recently migrated from Tailwind/Radix/Recharts to Ant Design and Styled Components for a more premium, programmatic, and customizable UI.*
  - **Theme**: Premium Dark Mode. Uses deep backgrounds (`#09090b`, `#0f172a`), frosted glassmorphism (`backdrop-filter: blur`), gradient borders, glowing pulse animations for active states, and Highcharts for advanced visualizations (spider webs, gauges, heatmaps, areasplines).
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
