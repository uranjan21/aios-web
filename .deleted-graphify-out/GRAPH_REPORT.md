# Graph Report - aios-web  (2026-06-09)

## Corpus Check
- 120 files · ~31,726 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 544 nodes · 945 edges · 47 communities (38 shown, 9 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9cf8acf0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 40 edges
2. `get_settings()` - 26 edges
3. `VaultWriteGuard` - 22 edges
4. `useUIStore` - 15 edges
5. `Skeleton()` - 12 edges
6. `formatRelativeTime()` - 11 edges
7. `handle_file_change()` - 11 edges
8. `reserve_budget()` - 11 edges
9. `stream_nvidia_chat_response()` - 11 edges
10. `formatCurrency()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `chat_ws_handler()` --calls--> `stream_chat_response()`  [INFERRED]
  backend/app/api/chat.py → backend/app/services/chat/agent.py
- `BackendStatus()` --calls--> `cn()`  [EXTRACTED]
  frontend/src/pages/SettingsPage.tsx → frontend/src/lib/utils.ts
- `TokenGauge()` --calls--> `cn()`  [EXTRACTED]
  frontend/src/pages/SettingsPage.tsx → frontend/src/lib/utils.ts
- `StatusBadge()` --calls--> `cn()`  [EXTRACTED]
  frontend/src/pages/AgentsPage.tsx → frontend/src/lib/utils.ts
- `IntegrationCard()` --calls--> `cn()`  [EXTRACTED]
  frontend/src/pages/IntegrationsPage.tsx → frontend/src/lib/utils.ts

## Communities (47 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (31): CaptureCreate, create_capture(), chat_ws_handler(), token_budget(), BusinessEventCreate, HealthLogCreate, get_daily_tokens_used(), get_session_tokens_used() (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (21): ChangePasswordRequest, LoginRequest, ResolveRequest, CareerEventCreate, get_roadmap(), OpportunityCreate, OpportunityPatch, SkillUpdate (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (30): capturesApi, CommandPalette(), NAV_COMMANDS, GlobalCapture(), NotificationBell(), NotifItem(), TYPE_CONFIG, ThemeProvider() (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (24): login(), get_auth_url(), force_sync(), resolve_conflict(), BaseSettings, Config, get_settings(), Settings (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (23): chatApi, api, LocalMessage, useChat(), UseChatResult, ChatPage(), getToolMeta(), Message() (+15 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (25): get_nvidia_client(), Shared NVIDIA NIM OpenAI-compatible client., _count_tokens(), Claude API streaming caller + tool loop., Drop oldest messages until total estimated tokens < _HISTORY_TOKEN_LIMIT., stream_chat_response(), _trim_history(), build_system_prompt() (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (21): _dispatch(), get_scheduler(), APScheduler-based cron runner for AIOS agents., Called by APScheduler — fires the agent run pipeline., Load all active agents from DB and register cron jobs, then start., Call after PATCH /agents/:id to keep scheduler in sync., reschedule_agent(), start_scheduler() (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (17): PlaceholderPage(), RouteErrorBoundary, State, App(), queryClient, AgentsPage, BusinessPage, CareerPage (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (13): careerApi, contentApi, healthApi, HealthPage(), cardEntrance, PageTransition(), staggerContainer, variants (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (16): detect_area(), detect_file_type(), extract_frontmatter_field(), parse_finance_expense_entry(), parse_health_log_entry(), Extract structured data from vault markdown files., Extract a value from YAML-style frontmatter or inline `field: value` lines., Parse a log line like:     2026-06-09 — Gym: Push day, 45 min     2026-06-09 — W (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (16): OpportunityRow(), ColumnDropZone(), ContentPage(), ItemCard(), PLATFORM_BADGE, STATUS_ACCENT, STATUS_COLS, STATUS_LABELS (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (10): businessApi, EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, LEVEL_LABELS, LEVEL_STYLES, OPP_STATUS_CONFIG, EmptyState(), EmptyStateProps (+2 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (9): BudgetUpsert, ExpenseCreate, get_goals(), Create or replace budget limit for a category., upsert_budget(), BudgetLimit, FinanceExpense, FinanceSnapshot (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.27
Nodes (10): financeApi, BusinessPage(), BalanceWidget(), ExpensesDonutWidget(), LastTransactionsWidget(), MonthlyBudgetWidget(), QuickTransactionsWidget(), VisaCardWidget() (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (7): integrationsApi, IntegrationCard(), PROVIDER_INFO, Integration, AlertDialogContent(), AlertDialogFooter(), AlertDialogHeader()

### Community 15 - "Community 15"
Cohesion: 0.27
Nodes (11): BudgetLimit, BusinessEvent, CareerEvent, ChatMessage, FinanceExpense, FinanceSnapshot, HealthLog, HealthStreak (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.23
Nodes (4): FileSystemEventHandler, _DebounceHandler, _should_ignore(), VaultWatcher

### Community 17 - "Community 17"
Cohesion: 0.32
Nodes (4): agentsApi, AgentRow(), StatusBadge(), Agent

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (6): Active Projects / Initiatives, AIOS Memory, Architecture & Tech Stack, Database Schema Highlights, Design Tokens (Tailwind), Known Issues / Backlog

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (3): BaseHTTPMiddleware, RequestLoggingMiddleware, SecurityHeadersMiddleware

## Knowledge Gaps
- **94 isolated node(s):** `queryClient`, `LoginPage`, `DashboardPage`, `ChatPage`, `AgentsPage` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_settings()` connect `Community 3` to `Community 0`, `Community 1`, `Community 5`, `Community 6`, `Community 9`, `Community 12`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 10` to `Community 2`, `Community 4`, `Community 8`, `Community 11`, `Community 13`, `Community 14`, `Community 17`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `lifespan()` connect `Community 6` to `Community 16`, `Community 3`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `get_settings()` (e.g. with `lifespan()` and `create_app()`) actually correct?**
  _`get_settings()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `VaultWriteGuard` (e.g. with `ResolveRequest` and `ExpenseCreate`) actually correct?**
  _`VaultWriteGuard` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `queryClient`, `LoginPage`, `DashboardPage` to the rest of the system?**
  _94 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._