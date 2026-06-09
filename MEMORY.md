# AIOS Memory

## Architecture & Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Radix UI, Framer Motion, Zustand, React Query.
  - Theme: Modern geometric (Outfit font), glassmorphism, soft premium shadows (`.premium-shadow`). Light gray background (`#F8F9FA`), pure white cards (`#FFFFFF`).
- **Backend**: Python, FastAPI, SQLAlchemy (asyncpg), PostgreSQL (with pgvector), Alembic.
  - Dependencies managed via `uv`.

## Active Projects / Initiatives
1. **Wallet Dashboard UI Overhaul**: Implementing a premium, bento-box style finance dashboard matching the reference mockup (glassmorphism, 3D abstract assets, custom donut/bar charts).
2. **Backend Robustness**: Subagents are auditing security (weak secrets) and QA.
3. **Product Addictiveness**: Subagents are strategizing gamification, streaks, and AI financial insights.

## Design Tokens (Tailwind)
- `--radius`: `1.5rem` (Cards use `rounded-3xl` for a soft look).
- Primary Action: Near black (`#111111` or Tailwind `primary`).
- Negative/Expense: Red (`#EF4444`).
- Positive/Income: Orange/Green.
- Blue/Purple: Active states / brand accents.

## Database Schema Highlights
*(To be populated by agents as they audit the db/models)*

## Known Issues / Backlog
- Replace default secure keys in backend `get_settings`.
- Implement staggered Framer Motion entrances for all dashboard widgets.
