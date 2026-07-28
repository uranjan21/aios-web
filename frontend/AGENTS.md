# AGENTS.md — frontend

> The repo-wide working agreement is in the root `AGENTS.md` — read it first.
> **The mandatory end-of-session `PROGRESS.md` entry applies here too.**

## Read before writing frontend code

`frontend/CLAUDE.md` is the source of truth for this folder: design system
tokens, the UI/UX rule set, the monorepo package graph, and the frontend
gotchas. Do not restate its rules elsewhere — extend it.

## Hard rules (the ones most often broken)

- **Styling is styled-components + `@ledgr/ui` tokens only.** Tailwind is fully
  removed; a `className` on a styled component is a CSS selector hook, never a
  utility class.
- **Never hardcode a spacing/radius/colour/font value.** Everything traces to a
  `theme.*` token. `node scripts/token-lint.mjs` ratchets this — run it before
  committing.
- **Use `@ledgr/ui` primitives directly.** Never wrap `Card` in a custom
  component; never roll your own modal instead of `Dialog`.
- **Settings pages** use the two-panel `AreaSettingsPage` layout. No inline
  settings tabs, no bespoke settings layouts.
- **Toolbar/action placement:** `AreaToolbar` only when there are multiple
  controls. A single button goes in the Card header, or is elevated to
  `PageHeader` via `HeaderActionPortal`.
- **After editing `packages/ui`:** rebuild → clear `apps/shell/node_modules/.vite`
  → restart the dev server → **verify in the browser by measuring**, not by
  reading the source. The full sequence is in `frontend/CLAUDE.md`.

## Skills

`frontend/.claude/skills/` holds this folder's skills (currently
`ui-ux-pro-max`). They are versioned deliberately — see the `.claude/` rules in
the root `.gitignore`.
