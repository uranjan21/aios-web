# AGENTS.md — working agreement

Applies to everyone changing this repo, human or AI (Claude Code, Codex, Cursor,
anything else).

## Read the right file first

| Before you touch | Read |
|---|---|
| Anything | `CLAUDE.md` |
| `backend/` | `backend/CLAUDE.md` |
| `frontend/` | `frontend/CLAUDE.md` |
| Docker, CI, env vars | `docs/DEPLOYMENT.md` |

Add a new rule to the file that owns it. Do not restate it upward.

## Non-negotiables

**Multi-tenant isolation.** Every user-data table has `user_id`; every query
filters on it. A new user-data endpoint needs a case in
`backend/tests/test_isolation.py`. Cross-tenant access must return 404, not 403 —
a 403 confirms the row exists.

**No server-side LLM key.** Every model call runs on the authenticated user's own
key. See the box in `CLAUDE.md` for why this one is not negotiable.

**Never commit secrets or personal data.** The repository is public. `.env.*` is
git-ignored by default; check your diff before committing, especially
`seed_dummy_data.py`.

**Do not weaken a guard to make a deploy easier.** The startup checks in
`backend/app/core/config.py` — Redis required, https required, vault sync
refused, secret strength enforced — each exist because the alternative was a
silent failure. Every one is covered both ways in `tests/test_config_guards.py`.

## Verify, don't assert

State what you actually ran. "Backend 362 passed; tsc and vitest clean" is a
claim someone can check. "Should work" is not.

Before saying a change works:

```bash
cd backend  && uv run pytest
cd frontend && pnpm typecheck && pnpm exec vitest --run && pnpm lint
cd frontend && node scripts/token-lint.mjs && pnpm build
```

For anything touching how the app is served — routing, static files, headers,
Docker — run it and make the request. Several bugs in this repo's history looked
correct in the source and failed in the browser.

## Commits

Conventional prefixes: `feat:` `fix:` `refactor:` `chore:` `test:` `docs:` `build:`

Write the body for someone who has the diff but not the context: what was wrong,
why the fix is shaped this way, and what you verified. Note anything you
deliberately did *not* change and why — that is usually the most useful line in
the message.

## Scope

Fix what you were asked to fix. If you find something else broken, say so rather
than quietly widening the change. If you cannot finish part of the work, finish
the rest and state plainly what you left and why.
