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

Also update `FEATURES.md` (if features changed) and `docs/backlog if present.

**Why:** Utsav's AI OS syncs from this repo by reading `git log` + `PROGRESS.md` + repo docs. Commits show WHAT changed; PROGRESS.md carries blockers and intent that commits can't. Skip it and the sync is blind.

## Repo rules

- Conventional commits: `feat:` / `fix:` / `refactor:` / `chore:` / `test:` / `docs:`
- NEVER commit secrets, API keys, or Utsav's personal data (a seed-script leak happened once — check before committing)
- Architecture context: `ARCHITECTURE.md` · Features: `FEATURES.md` · Backlog: repo docs
