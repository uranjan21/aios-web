# AGENTS.md — Working Agreement for ALL AI Tools

> Applies to every AI working in this repo: Claude Code, Codex, Antigravity, Cursor, anything.
> This repo is one organ of Utsav's larger AI OS (Obsidian vault). Follow this contract so the OS stays aware of this project.

## MANDATORY — end-of-session duty

Before finishing ANY work session, append one entry to the TOP of `PROGRESS.md` (below its header):

```
## YYYY-MM-DD — <tool: claude-code | codex | antigravity | ...>
- Shipped: <what actually got built/fixed, 1–3 lines>
- Blockers: <what's stuck, or "none">
- Next: <the logical next step>
```

Also update `FEATURES.md` (if features changed) and the relevant doc under `docs/`.

**Why:** Utsav's AI OS syncs from this repo by reading `git log` + `PROGRESS.md` + repo docs. Commits show WHAT changed; PROGRESS.md carries blockers and intent that commits can't. Skip it and the sync is blind.

## Where the rules live

Context is split per folder (restructured 2026-07-28). Read the file for the
side you are touching **before** writing code:

| File | Covers |
|---|---|
| `CLAUDE.md` | Product, stack, deploy topology, change history, backlog |
| `frontend/CLAUDE.md` + `frontend/AGENTS.md` | Design system, UI/UX rules, monorepo graph, React conventions |
| `backend/CLAUDE.md` + `backend/AGENTS.md` | FastAPI/SQLModel conventions, migrations, multi-tenancy |

Add new rules to the file that owns them. Do not copy them upward into this one.

## Repo rules

- Conventional commits: `feat:` / `fix:` / `refactor:` / `chore:` / `test:` / `docs:`
- NEVER commit secrets, API keys, or Utsav's personal data (a seed-script leak happened once — check before committing)
- Architecture context: `SYSTEM_DESIGN.md` · Features: `FEATURES.md` · Deployment: `docs/DEPLOYMENT.md` · Roadmap: `docs/PRODUCT_ROADMAP.md`

> The old `.agent/AGENTS.md` was folded into these files on 2026-07-28. It
> pointed at `SAAS_IMPLEMENTATION_PLAN.md` and `lessons.md`, neither of which
> exists in this repo; its live rules now sit in the per-folder files above, and
> the colour-palette preference lives in Utsav's global user memory.
