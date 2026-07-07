# PROGRESS.md — Session Journal (append-only, newest on top)

> Every AI tool appends an entry here at end of session — contract in `AGENTS.md`.
> Synced weekly into Utsav's AI OS (04-business/products/aios-web/progress.md).

## 2026-07-07 — claude-code (life-domain agents + knowledge base)
- Shipped: (1) **Knowledge Base connector** — per-user `knowledge_sources` table (migration `k001`), `/api/knowledge/source` CRUD + manual sync, 10-min scheduler pull, Settings → Knowledge Base section (Obsidian folder path on self-host / Notion on hosted); pulls feed the existing vault_files→pgvector RAG pipeline. (2) **Domain agents v2** — all agents now have real per-domain prompts + live context (calendar/fitness/gmail/knowledge RAG); 3 new defaults: Health Coach, Business Pulse, Inbox Triage (11 total); startup backfill wired (was never called — agents table was empty). (3) **Gmail integration** (read-only, `gmail_messages` table, 30-min background sync, `get_recent_emails` chat tool, UI card). (4) **Notion completed** — OAuth callback + client, pages mirror into RAG store, `get_notion_page` chat tool wired, syncable from UI. Fixes: RAG retriever had NO user filter (cross-tenant leak — now filtered + fails closed); `vault_files.path` unique → per-user; calendar date-filter tz crash. Verified: 136 tests pass, tsc+build clean, knowledge flow curl- AND UI-walked, agent run triggered live.
- Blockers: Gmail needs the Gmail API enabled on the gcal Google client (or `GMAIL_CLIENT_ID/SECRET`); Notion needs `NOTION_CLIENT_ID/SECRET` env keys. NVIDIA NIM timed out from this network — agents degraded to facts-only as designed.
- Next: connect real Gmail/Notion accounts end-to-end once env keys are set; consider surfacing agent outputs on Dashboard (Action Center); knowledge-source pull for Notion databases (pages only today).

## 2026-07-07 — claude (baseline import)
- Shipped: Journal initialized. Git baseline: 2026-07-06 workspace project/sprint/task management + LifeHeatmap; 2026-07-03 pre-Phase-5 WIP save; 2026-07-01 business settings page + health/nutrition UI.
- Blockers: personal financial data in seed script (must be removed/gitignored before repo goes public — critical); scope tension with Ledgr unresolved.
- Next: purge personal data from seed script; Phase 5 per SAAS_IMPLEMENTATION_PLAN.md.
