# AGENTS.md — frontend

The repo-wide agreement is in the root `AGENTS.md`. `frontend/CLAUDE.md` is the
source of truth for this folder. This file is the short list of what breaks most
often.

- **Build `@ledgr/ui` before trusting a type error.** It is the one workspace
  package consumed from `dist/`, not source. `pnpm install` builds it via the
  root `prepare` script; after editing `packages/ui`, run `pnpm build:ui`, clear
  `apps/shell/node_modules/.vite`, and restart the dev server.
- **Check a component's real props before using it.** `Button` has `variant`,
  not `tone`. `Checkbox` is a bare input, not a labelled control. Read the
  interface; the design system is small enough to check in seconds and guessing
  costs a typecheck cycle.
- **Both lint gates are ratchets.** `pnpm lint` (289 warnings) and
  `node scripts/token-lint.mjs` fail on any *new* violation. Fix what you added;
  never raise the cap to make your change pass.
- **Verify UI changes in the browser by measuring**, not by reading the source.
  `getBoundingClientRect()` beats an assumption about what a token resolves to.

## Before you say it works

```bash
pnpm typecheck && pnpm exec vitest --run && pnpm lint
node scripts/token-lint.mjs && pnpm build
```
