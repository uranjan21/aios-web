# Project: AIOS Web

## What this is
A full-stack personal command center / AI OS web application for managing multiple life domains (Finance, Health, Career, Business, Content) with real-time AI-powered agents, vault file sync, and multi-LLM integration (Anthropic + OpenAI).

## Stack
- **Frontend**: React 18 + TypeScript + Vite + styled-components + Radix UI (via @ledgr/ui) + Ant Design
- **Backend**: Python 3.11+ + FastAPI + SQLModel (async SQLAlchemy ORM) + asyncpg
- **Database**: PostgreSQL + pgvector (for vector embeddings)
- **AI/LLMs**: Anthropic Claude SDK, OpenAI SDK, NVIDIA NIM (default llm_provider)
- **Real-time**: WebSockets (sync, chat, agents)
- **State (Frontend)**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: React Query (TanStack)
- **Package Managers**: pnpm (frontend), uv (backend)
- **Containerization**: Docker Compose

## Architecture

### Frontend Architecture
- **SPA Router**: React Router v6 for client-side navigation
- **Feature Areas**: Finance, Health, Career, Business, Content — each with dedicated pages and shared AreaTabs sub-navigation
- **API Client**: Centralized axios-based API client in `frontend/src/api`
- **State Management**: Zustand stores for global state (user, domain data, UI state)
- **Components**: Modular React components in `frontend/src/components` with Radix UI primitives + Ant Design
- **Styling**: styled-components and Ant Design; prefer @ledgr/ui theme values/tokens; light mode by default
- **Validation**: Zod schemas for form data and API responses

### Backend Architecture
- **Framework**: FastAPI with lifespan management for startup/shutdown hooks
- **Router-Based Modules**: Domain-specific routers (auth, sync, chat, agents, finance, health, career, business, content, captures, integrations)
- **Service Layer**: `backend/app/services` contains business logic (agents orchestration, AI calls, chat, RAG, vault sync)
- **Models Layer**: `backend/app/models` defines SQLModel schemas for all domains
- **Database**: AsyncPG + SQLAlchemy for async PostgreSQL access; Alembic for migrations
- **Real-time**: WebSocket handlers (`/ws/sync`, `/ws/chat`, `/ws/agents`) with token auth via `ws_auth` dependency
- **Middleware**: CORS, security headers, request logging, rate limiting (slowapi)
- **Scheduler**: APScheduler for background jobs (agents, cron tasks)
- **File Watcher**: VaultWatcher monitors vault directory for file changes and syncs to database

### Data Flow
1. **Frontend** makes REST/WebSocket calls to **Backend**
2. **Backend** validates requests, queries **PostgreSQL** (with pgvector for embeddings)
3. **Services** layer handles AI calls (Anthropic/OpenAI), RAG queries, agent orchestration
4. **WebSocket handlers** push real-time updates (sync state, chat messages, agent status) back to **Frontend**
5. **Vault Watcher** monitors local file system; triggers sync service on file changes

## Commands

### Frontend (Development)
```bash
cd frontend
pnpm dev              # Start Vite dev server (port 5173)
pnpm build            # Build for production
pnpm lint             # Run ESLint
pnpm preview          # Preview production build
```

### Backend (Development)
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest                # Run tests
pytest -v             # Verbose test output
```

### Docker Compose (Full Stack Local)
```bash
docker-compose up     # Start all services (db, backend, frontend)
docker-compose down   # Stop all services
```

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head  # Apply migrations
```

## Project Structure

```text
aios-web/
├── frontend/                    # React TypeScript SPA
│   ├── src/
│   │   ├── api/                 # Axios HTTP client + API hooks
│   │   ├── components/          # Reusable React components (UI, domain-specific)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utility functions
│   │   ├── pages/               # Page-level components (Finance, Health, Career, etc.)
│   │   ├── stores/              # Zustand state stores
│   │   ├── types/               # TypeScript interfaces
│   │   ├── App.tsx              # Root component
│   │   ├── main.tsx             # Entry point
│   │   └── router.tsx           # React Router config
│   ├── index.html               # HTML template
│   ├── vite.config.ts           # Vite bundler config
│   ├── tailwind.config.ts       # Tailwind CSS config
│   ├── package.json             # Dependencies (React, Radix, TanStack, etc.)
│   └── tsconfig.json            # TypeScript config
│
├── backend/                     # FastAPI Python backend
│   ├── app/
│   │   ├── api/                 # Route handlers (auth, sync, chat, agents, domains)
│   │   ├── services/            # Business logic
│   │   │   ├── agents/          # Agent orchestration + scheduler
│   │   │   ├── ai/              # LLM calls (Anthropic, OpenAI)
│   │   │   ├── chat/            # Chat service (message handling, context)
│   │   │   ├── rag/             # RAG pipeline (retrieval + embedding)
│   │   │   ├── vault_sync/      # File system watcher + sync engine
│   │   │   └── integrations/    # External API integrations
│   │   ├── models/              # SQLModel schemas (Finance, Health, Career, Business, Agents, etc.)
│   │   ├── core/                # Config, dependencies, middleware, rate limiting
│   │   ├── db/                  # Database session + engine setup
│   │   ├── main.py              # FastAPI app factory + lifespan
│   │   └── __init__.py
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # Unit + integration tests
│   ├── pyproject.toml           # Dependencies (FastAPI, SQLModel, pgvector, Anthropic, OpenAI)
│   ├── alembic.ini              # Alembic config
│   ├── Dockerfile               # Docker image for backend
│   └── seed_dummy_data.py       # Populate DB with test data
│
├── ledgr-ui/                    # Reusable React component library
├── docker-compose.yml           # Multi-container orchestration (db, backend, frontend)
├── MEMORY.md                    # UI/UX guidelines, known issues, active projects
├── PROJECT.md                   # Core project definition and layout conventions
├── CLAUDE.md                    # This file
├── .env.example                 # Environment template
├── setup.sh                     # Setup script
├── run.sh                       # Shell script to run application
└── .gitignore                   # Git ignore rules
```

## Conventions (Follow These)

### Backend Conventions
- **Async First**: All I/O is async (database, HTTP, file operations)
- **Router Naming**: `backend/app/api/areas/<domain>.py` defines routers for a domain (e.g., `finance.py`, `health.py`)
- **Service Layer**: `backend/app/services/` (only `finance`, `insights`, and `notifications` have dedicated service sub-folders; others query database models directly in routers); routers call services and return JSON
- **Error Handling**: Use FastAPI HTTPException with appropriate status codes; log errors with logger
- **Database**: Use SQLModel for schemas; all queries are async with `async with engine.begin() as conn:`
- **WebSocket Auth**: Always call `ws_auth(websocket)` before accepting frames; close with code 1008 on auth failure
- **Settings**: Environment vars via `get_settings()` from `app.core.config`; never hardcode secrets

### Frontend Conventions
- **API Client**: Use `frontend/src/api` functions for all HTTP calls; handle loading/error states with React Query
- **Components**: Functional components with hooks; use Zustand for global state, React Query for server state
- **Forms**: Use React Hook Form + Zod; validation happens at submit time
- **Styling**: styled-components and @ledgr/ui theme tokens; keep card/table/dialog corners at 10px by default
- **Responsive**: Mobile-first; test at 375px, 768px, 1024px, 1440px breakpoints
- **AreaTabs**: Sub-navigation within domains uses shared `<AreaTabs>` component; never nest `<Tabs>`

### UI/UX (from MEMORY.md)
- **No page-level titles**: Breadcrumbs only in global header
- **12-column grid**: Cards must NOT stretch unnecessarily; use auto-fit grids or tight col-spans (e.g., `col-span-3`)
- **Card Aesthetics**: `bg-card` on soft gray background; faint borders (`border-border/60`); compact `10px` radius; tight padding (`p-2` or `p-3`)
- **Typography**: Compact fonts (`text-xs`, `text-sm`); NO bold values inside cards; title case for widget titles
- **Dashboard Layout**: Keep the main dashboard in a tight two-column shell and avoid stray empty spaces in lower rows
- **Agents Page**: Use a dense table/card pattern with clear status, schedule, last-run, and actions columns
- **Sidebar**: Top-level links only; NO accordions or sub-menus

### Project Conventions
- **Naming**: snake_case for Python, camelCase for TypeScript
- **Imports**: Absolute imports using path aliases (`@/` for frontend, relative for backend)
- **Commits**: Conventional commits (feat:, fix:, refactor:, docs:, test:)
- **Branches**: feature/, bugfix/, hotfix/ prefixes

## Don't Touch / Gotchas

### Critical Gotchas
- **Vault Watcher**: Requires `VAULT_PATH` env var pointing to local vault directory. If path doesn't exist, watcher won't start (non-fatal warning). Ensure path exists before deploying.
- **Default Secrets**: Backend config uses weak defaults (e.g., `change-me-in-production`). Replace `APP_SECRET_KEY` and `APP_PASSWORD` in `.env` before production.
- **WebSocket Auth**: Must call `ws_auth(websocket)` BEFORE accepting frames. Missing auth can leak data.
- **pgvector Extension**: PostgreSQL must have pgvector installed. The docker-compose uses `pgvector/pgvector:pg15` image which includes it.
- **Database Migrations**: Always run `alembic upgrade head` after pulling new code. Missing migrations = runtime errors.
- **Environment Variables**: Copy `.env.example` to `.env` and fill in API keys (Anthropic, OpenAI), vault path, database URL, etc.

### Performance Considerations
- **Real-time Overload**: WebSocket handlers broadcast to all connected clients. For many users, consider message filtering or rooms.
- **Vector Embeddings**: pgvector queries with `<->` operator can be slow on large tables; add indexes on embedding columns.
- **RAG Performance**: Embedding + retrieval in `chat_service` blocks the WebSocket. Consider async task queue (Celery/RQ) for large documents.
- **Rate Limiting**: Backend uses `slowapi` for rate limits. Adjust thresholds in `app.core.rate_limit` for production.

### Known Issues (from MEMORY.md)
- Chat and Settings pages may still use older Tailwind/Radix components; consider migrating to Ant Design + Styled Components system
- Secrets in backend config need hardening
- Vault sync watcher may not handle rapid file changes well (debounce needed)

## Key Entry Points
- **Frontend**: `frontend/src/main.tsx` → App.tsx → Router → Pages
- **Backend**: `backend/app/main.py` → `create_app()` → FastAPI instance → Routers
- **Database**: `backend/alembic/` for migrations; `backend/app/db/session.py` for engine setup
- **WebSockets**: Backend: `backend/app/api/sync.py`, `chat.py`, `agents.py`; Frontend: Inline WebSocket instantiations in frontend/src/hooks/useChat.ts, useNotifications.ts, and useVaultSync.ts

## Development Workflow

1. **New Feature**: Create branch `feature/name`, build in `backend/app/services` + `backend/app/api` + `frontend/src`
2. **Database Schema Change**: Add model in `backend/app/models`, run `alembic revision --autogenerate`, apply with `alembic upgrade head`
3. **UI Update**: Respect MEMORY.md guidelines (AreaTabs, grid density, typography). Always use Catalyst aesthetics.
4. **Testing**: Write tests in `backend/tests/` for services; test frontend with React Testing Library or manual browser testing
5. **Commit & Push**: Use conventional commits; ensure no secrets leak into git history

---

**Last Updated**: 2026-06-21 | **Version**: 0.2.0
