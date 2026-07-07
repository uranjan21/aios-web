# Project: AIOS Web Audit and Enhancement

## Architecture
- **Frontend**: React 18, TypeScript, styled-components, `@ledgr/ui` theme tokens.
- **Backend**: FastAPI, SQLModel, asyncpg, PostgreSQL.
- **Database**: PostgreSQL with Alembic migrations.
- **Entitlements**: Gated access based on modules.

## Milestones
| # | Name | Track | Scope | Dependencies | Status | Conversation ID |
|---|------|-------|-------|--------------|--------|-----------------|
| E2E | E2E Testing Suite | Testing | Create E2E test suite (Tiers 1-4) | None | DONE | 26aa0522-1eb1-44fe-a817-5fdc6be28bb0 |
| 1 | Workspace & General UI Polish | Implementation | R1 (Domain Syncing), R2 (PageHeader alignment), R3 (Content UI), R4 (Collapsible Sections) | None | DONE | 996a099d-7d40-499e-9d2c-c704dde5a50b |
| 2 | Dashboard & Interactive Features | Implementation | R5 (Dashboard layout), R6 (Saved Quotes), R7 (Contextual Quick Capture) | None | DONE | 996a099d-7d40-499e-9d2c-c704dde5a50b |
| 3 | Phase 1: E2E Test Pass | Implementation | Run and pass 100% of E2E tests (Tiers 1-4) | E2E, 1, 2 | DONE | 996a099d-7d40-499e-9d2c-c704dde5a50b |
| 4 | Phase 2: Adversarial Hardening | Implementation | Tier 5 white-box coverage and adversarial tests | 3 | PLANNED | TBD |

## Interface Contracts
### R6: Saved Quotes Database Table and Endpoints
- **Model**: `SavedQuote`
  - `id`: UUID (Primary Key)
  - `user_id`: UUID (Foreign Key -> `users.id`)
  - `text`: String
  - `author`: String (optional)
  - `saved_at`: DateTime (naive UTC)
- **Endpoints**:
  - `POST /api/areas/dashboard/quotes/save` - Save a quote to database
  - `GET /api/areas/dashboard/quotes/saved` - Get all saved quotes for the current user

### R7: Contextual Quick Capture Routing
- Quick Capture (⌘L) routes:
  - If viewing `/app/projects/:id` -> Default action: Add Task with project pre-selected.
  - If viewing `/app/sprints/:id` -> Default action: Add Task with sprint pre-selected.
  - Else -> Fallback to global capture modal.

## Code Layout
- **Frontend Components**:
  - `frontend/src/components/areas/`
  - `frontend/src/components/ui/`
  - `frontend/src/pages/`
- **Backend Routers**:
  - `backend/app/api/areas/`
- **Backend Models**:
  - `backend/app/models/`
- **Backend Services**:
  - `backend/app/services/`
