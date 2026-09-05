# Production runbook

Operating Control Tower once it is live. Setup is `DEPLOYMENT.md`.

## Where things are

| | |
|---|---|
| App | One container on your PaaS |
| Database | Supabase — SQL editor, logs and backups in its dashboard |
| Redis | Your platform's managed instance |
| Errors | Sentry, if `SENTRY_DSN` is set |
| Logs | Your platform's log stream — structured JSON, one line per request |

Every request log carries an `X-Request-ID`, and the response returns it. When a
user reports a failure, ask for the time and search the logs around it.

## Health

```bash
curl -s https://<origin>/health
```

- `{"status":"ok","db":true}` — serving normally.
- `{"status":"degraded","db":false}` with **503** — the app is up, Postgres is
  not. Check Supabase first: project paused, connection limit reached, or
  credentials rotated.

`/health` is deliberately not rate-limited. It is a single `SELECT 1`, and
putting it behind the limiter means a rate-limiter failure makes a healthy app
look dead — and takes the platform's health check down with it.

## Common failures

### Login appears to do nothing

Almost always `ALLOWED_ORIGIN` not matching the address users actually type,
scheme included. The server returns 200 with a valid `Set-Cookie`; the browser
declines to store it; every later request is anonymous; nothing is logged as an
error.

Check the response headers of `POST /api/auth/login` in devtools. If the cookie
is set but never sent back, this is the cause.

### The container will not start

Read the first lines of the log. The production guards in
`backend/app/core/config.py` raise with a message that names the variable and
explains what it protects. They are guards, not obstacles — fix the variable
rather than removing the check.

If it starts and then exits, `alembic upgrade head` failed. The traceback names
the revision. The container deliberately dies rather than serving against a
stale schema.

### `DuplicatePreparedStatementError`

You are pointed at a transaction pooler that was not detected as one. Supabase's
pooler is port 6543 and `app/db/url.py` recognises it; another provider may use
a different port. Add `?pgbouncer=true` to `DATABASE_URL`, which forces the same
handling.

### Rate limits fire too early

`REDIS_URL` is unset or unreachable, so each worker counts separately and the
effective limit is a fraction of the configured one. Production refuses to boot
without it, so this means Redis became unreachable after startup.

### Scheduled agents stopped running

Only the worker holding the Postgres advisory lock runs the scheduler. Check the
startup logs for `SCHEDULER LEADER`. If no instance claims it, the lock is held
by a connection that never closed — restart the service.

On Fly, also check the machine has not auto-stopped. `fly.toml` sets
`auto_stop_machines = false` for exactly this reason: a stopped machine runs no
scheduler, and the app looks healthy while doing nothing.

### A user says the assistant does not respond

Most often they have not added their own API key: Settings → AI & knowledge.
There is no server-side key by design, so an unconfigured user gets no model
calls. Beyond that, check the WebSocket connects at all — a failing
`/ws/chat` handshake usually traces back to `ALLOWED_ORIGIN` or a CSP
`connect-src` that does not include the origin.

## Routine tasks

**Deploy.** Push to `main`. CI runs the suites, builds the image and boots it
against a real database before anything ships.

**Roll back.** Use your platform's redeploy-previous control. Note that
migrations are **not** reversed by rolling back the image — if the bad deploy
included a schema change, downgrade it deliberately with `alembic downgrade`.

**Rotate `APP_SECRET_KEY`.** Signs out every user. Safe, just disruptive.

**Rotate `TOKEN_ENCRYPTION_KEY`.** Do not, unless it has leaked. It makes every
stored API key and OAuth token permanently unreadable and every user has to
re-enter theirs. There is no re-encryption path.

**Make someone an admin.** Through the Supabase SQL editor:

```sql
UPDATE users SET is_admin = true WHERE email = 'you@example.com';
```

## Backups

Supabase owns them. Check what your plan retains — the free tier's window is
short and has no point-in-time recovery.

**Test a restore before you need one.** An untested backup is a belief, not a
backup.

## Security posture

- `/docs`, `/redoc` and `/openapi.json` are not served in production.
- The document and API share one CSP: no inline script, no framing.
- Admin endpoints require `is_admin` and are rate-limited.
- Account deletion derives its table list from live ORM metadata, so a new table
  is included automatically rather than being silently missed.
- Vault sync must stay off. It shares one filesystem across all users.
