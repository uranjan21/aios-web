# Features

What Control Tower actually does today. Where something is partial or absent,
this says so — see `docs/PRODUCT_ROADMAP.md` for what is planned.

Everything below is per-user and isolated. The whole app is free; AI features
run on the user's own provider key.

## Daily

| | |
|---|---|
| **Today** (`/app`) | Dashboard: KPI tiles, today's focus, schedule, a twelve-week activity heat map |
| **This week** (`/app/week`) | Week planner |
| **Weekly review** (`/app/review`) | Structured end-of-week reflection, scored per goal |

## Finance (`/app/finance`)

- **Overview** — net position, cash and assets, what is owed
- **Transactions** — expenses, income and transfers with bulk operations, inline
  edit, CSV import, and alternate calendar/weekly/daily views
- **Budgets** — limits per category with alerts
- **Bills** — recurring bills and loans, with due reminders
- **Investments** — holdings and value tracking
- **Inbox** — transactions extracted from connected Gmail accounts, queued for
  review before they reach the ledger
- **Setup** — accounts and the two-level category tree

Accounts are created, edited and deleted from the accounts panel. Deleting one
detaches its transactions; transfers block the delete with an explicit message
rather than failing, because a transfer with one side missing is meaningless.

Deleted financial records are soft-deleted and restorable, and the delete still
reverses the account balance.

## Health (`/app/health`)

- **Workouts** — routines, sessions, personal records, adherence
- **Nutrition** — meal logging with a searchable food catalogue; macros for a
  known food are filled from the catalogue, and a one-off meal can be saved into
  it for next time
- **Body metrics** — weight, body fat and related measures over time
- **Sleep** — duration and quality
- **Habits** — daily habit tracking with streaks
- **Targets** — the numeric reference lines the other sections chart against

## Career (`/app/career`)

- **Journal** — dated entries with a writing streak and theme extraction
- **Skills** — an inventory with levels and update history
- **Learning** — courses and resources, linked to skills
- **Experience** — roles and their timeline
- **Opportunities** — a pipeline from applied through interview to offer

## Workspace (`/app/workspace/*`)

Projects, sprints, tasks, goals and milestones, filterable by life domain. Goals
live here for **every** domain rather than inside each area; an area page shows
read-only progress and nothing more.

The server enforces the relationships: a goal must match its domain, a task
inherits its project's domain and sprint, and deleting a goal unlinks its
children rather than orphaning them.

## Assistant

- **Chat** (`/app/chat`) — streaming conversation over WebSocket with a tool
  loop, so the assistant can read and write your actual data. Retrieval over
  your own indexed content via pgvector. Runs on your key, with your choice of
  OpenAI or Anthropic model.
- **Agents** (`/app/agents`) — seven scheduled agents, four active by default:
  a morning brief, a monthly finance review, a health coach and a vault
  extractor. Crons fire in your timezone. Two Gmail transaction trackers enable
  themselves when Gmail is connected.
- **Quick log** (⌘L) and the **command palette** (⌘K) — natural-language capture
  routed to the right domain, and navigation from anywhere.

## System

- **Settings** — profile, security and privacy, appearance, notifications,
  connections, and AI and knowledge (where your provider key goes)
- **Guide** (`/app/guide`) — the in-app product manual
- **Admin** (`/app/admin`) — user administration, for admins only

## Integrations

Google Calendar, Google Fit, Gmail (multiple accounts), Notion and GitHub, all
via OAuth. Gmail powers finance email ingestion: bank and UPI alerts are parsed
into pending transactions for review, and statement line items are reconciled
against the existing ledger so nothing is queued twice.

Every deploy origin must register its callback URLs with the provider — see
`.env.production.example`.

## Notifications

Web push (VAPID) plus in-app notifications over `/ws/agents`. Push is off unless
both VAPID keys and a contact subject are configured.

## Known limits

- **Vault sync is self-host only.** It uses one shared filesystem across all
  users, so it stays off in any hosted deployment and the backend refuses to
  start with it enabled in production without an explicit acknowledgement.
- **Career events** (`career_events`) have a working API but no UI. The
  timelines that rendered them were removed; the table and endpoints remain.
- **Saved quotes** have a complete, tested, isolated API and no UI. The
  components were deleted; the backend was not.
- **Some backend capability has no interface yet** — credit-card bill tracking,
  categorisation rules, the what-if simulator, forecasts and the discoveries
  feed all have endpoints without screens.
