# Control Tower Web — Production Runbook

**Audience:** On-call engineer. Assume you have SSH/kubectl access and the `.env.prod` file.

---

## 0. Before you take real users

Four items. Until all four are done you cannot detect an incident and cannot
recover from one. None takes more than 15 minutes.

**1 · Error tracking.** Free tier at sentry.io → Project → Client Keys.

```bash
# On the VPS, in /opt/control-tower/.env.prod
SENTRY_DSN=https://<key>@o123456.ingest.sentry.io/456
CSP_CONNECT_EXTRA=https://o123456.ingest.sentry.io   # or the browser blocks FE reports
docker compose -f docker-compose.prod.yml up -d backend web   # `restart` does NOT re-read env_file
```

Frontend is **build-time**: add `VITE_SENTRY_DSN` as a GitHub repo secret
(Settings → Secrets → Actions), then re-run the deploy workflow. Verify both
arrive by forcing one error and checking the Sentry issue stream.

**2 · Uptime monitor.** Nothing currently watches `/health`. Point a free
external check (UptimeRobot / BetterStack / Healthchecks.io) at
`https://<SITE_ADDRESS>/health`, 1–5 min interval, alerting to email **and** SMS.
Alert on non-200 **and** on the body containing `"db": false` — the endpoint
returns `degraded` when Postgres is unreachable while the process is alive.

```bash
curl -sf https://<SITE_ADDRESS>/health | jq .
# {"status":"ok","service":"control-tower","db":true,"watcher":false}
```

**3 · Off-box backups.** `BACKUP_REMOTE` unset ⇒ dumps sit on the database's own
disk and losing the VPS loses the data permanently.

```bash
curl https://rclone.org/install.sh | sudo bash
rclone config                                    # add an s3/b2/drive remote
echo 'BACKUP_REMOTE=s3:my-bucket/control-tower' >> /opt/control-tower/.env.prod
BACKUP_REMOTE=s3:my-bucket/control-tower APP_DIR=/opt/control-tower \
  /opt/control-tower/deploy/backup-db.sh        # run once by hand
rclone ls s3:my-bucket/control-tower             # prove the object landed
```

`deploy.sh` reinstalls the nightly cron with `BACKUP_REMOTE` baked into the line,
so re-run a deploy (or `crontab -e`) after setting it.

**4 · One restore drill.** An untested backup is a guess. Restore a real dump
into a throwaway container and record the wall-clock time — that number is your
RTO. Do it once now, not during the incident.

```bash
docker run -d --name restore-drill -e POSTGRES_PASSWORD=x pgvector/pgvector:pg15
sleep 10
time (gzip -dc /var/backups/control-tower/control_tower-<stamp>.sql.gz \
      | docker exec -i restore-drill psql -U postgres postgres)
docker exec restore-drill psql -U postgres postgres -c '\dt' | wc -l   # expect ~77 tables
docker rm -f restore-drill
```

Write the measured RTO and the dump size here: `RTO = ____ · size = ____`.

---

## 1. Required environment variables

Set these in `.env.prod` before first deploy. Missing any will cause the backend to refuse to start.

| Variable | Notes |
|---|---|
| `ENVIRONMENT` | Must be `production` |
| `APP_SECRET_KEY` | Min 32 chars, random. `python -c "import secrets; print(secrets.token_urlsafe(48))"`. **One value for the whole fleet** — every worker signs JWTs with it, so a per-worker value 401s roughly half of all requests. Production refuses to boot if it is unset. |
| `APP_PASSWORD` | Not a default value. Used only for the legacy env-credential login (dev-only anyway). |
| `DATABASE_URL` | Required by the backend, but **injected by `docker-compose.prod.yml` `environment:`** from `DB_USER`/`DB_PASSWORD`/`DB_NAME`. Do not set it in `.env.prod` — compose's `environment:` outranks `env_file`, so it would be ignored. |
| `REDIS_URL` | Same — injected by compose as `redis://redis:6379/0`. Required for distributed rate limiting; production refuses to boot without it. |
| `BACKUP_REMOTE` | rclone remote or `s3://` URL. Unset means dumps never leave the DB's own disk. |
| `SENTRY_DSN` | Unset means production errors are invisible. See §0. |
| `RESEND_API_KEY` | For transactional email (verification). Get at resend.com. |
| `ALLOWED_ORIGIN` | Your deployed frontend URL, no trailing slash. No `localhost`. |
| `VAULT_SYNC_ENABLED` | `false` for public multi-tenant SaaS. |
| `STRIPE_SECRET_KEY` | Must start `sk_live_` in production. |
| `STRIPE_PUBLISHABLE_KEY` | Starts `pk_live_`. |
| `STRIPE_WEBHOOK_SECRET` | From Stripe dashboard → Webhooks. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | At least one required for AI features. |
| `WEB_CONCURRENCY` | Number of gunicorn workers (default 4). Set to `2×vCPUs`. |

---

## 2. Deploy procedure

```bash
# 1. Pull the new image
docker pull ghcr.io/your-org/control-tower:latest

# 2. Bring up the stack (migrations run automatically via entrypoint.sh)
docker compose -f docker-compose.prod.yml up -d

# 3. Tail logs briefly to confirm startup
docker compose -f docker-compose.prod.yml logs -f backend --tail=50
```

`entrypoint.sh` runs `alembic upgrade head` before starting gunicorn. If migrations fail the container exits and the orchestrator will not route traffic to it.

---

## 3. Database migration (manual)

```bash
# Against a running container
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Review pending migrations first
docker compose -f docker-compose.prod.yml exec backend alembic history --verbose
docker compose -f docker-compose.prod.yml exec backend alembic current

# Rollback one revision (careful — data loss if migration has destructive ops)
docker compose -f docker-compose.prod.yml exec backend alembic downgrade -1
```

**Always review autogenerated migrations for unintended `DROP TABLE` ops before running.**

---

## 4. Secret rotation

### APP_SECRET_KEY rotation (invalidates all active JWTs)

All users will be logged out immediately.

```bash
# 1. Generate a new key
python -c "import secrets; print(secrets.token_urlsafe(48))"

# 2. Update .env.prod
# 3. Rolling restart (zero-downtime if behind a load balancer)
docker compose -f docker-compose.prod.yml up -d --no-deps backend
```

### Stripe webhook secret rotation

1. In Stripe dashboard, regenerate the webhook secret.
2. Update `STRIPE_WEBHOOK_SECRET` in `.env.prod`.
3. Restart backend.

### Database password rotation

1. Update the password in PostgreSQL: `ALTER USER control_tower WITH PASSWORD 'new_pass';`
2. Update `DATABASE_URL` in `.env.prod`.
3. Restart backend (asyncpg reconnects using the new URL on next connection).

---

## 5. Database backup and restore

### Backup

```bash
# Dump to a timestamped file
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U control_tower control_tower | gzip > "control_tower_$(date +%Y%m%d_%H%M%S).sql.gz"
```

Set up a daily cron or use managed DB snapshots (RDS, Supabase, Neon, etc.).

### Restore

```bash
# Restore from a dump (DESTRUCTIVE — drops all existing data)
gunzip -c control_tower_20260714_000000.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U control_tower control_tower
```

---

## 6. Redis failover

Redis is used for:
- HTTP rate limiting (slowapi, shared counters across workers — `app/core/rate_limit.py`)
- WebSocket chat rate limiting (per-user sliding window — `app/api/chat.py`)
- Pending chat tool-call confirmations (300s TTL keys)
- **Not** APScheduler leader election — that is a Postgres `pg_try_advisory_lock`.

### What actually happens when Redis goes down

Two different paths, and they behave differently. Know which one you are looking at.

| Path | Behaviour |
|---|---|
| **HTTP endpoints** (`app/core/rate_limit.py`) | The limiter is built with `in_memory_fallback_enabled=True`, so it **degrades to per-process counters** and requests keep serving. Limits become per-worker, i.e. effectively `WEB_CONCURRENCY ×` more permissive. |
| **WebSocket chat** (`app/api/chat.py`) | Redis calls are wrapped in `try/except` — **fail-open**, all messages allowed, per-connection deque fallback. |
| **Pending tool confirmations** | Fall back to a per-connection dict; a confirmation will not survive a WS reconnect. |

No data loss either way — Redis holds no durable state.

> ⚠️ **This section previously documented fail-open for everything.** That was
> only ever true of the WebSocket path. Before the 2026-08-16 fix the HTTP
> limiter ran on slowapi's defaults (`swallow_errors=False`, no fallback), so a
> Redis outage **500'd every rate-limited endpoint** — and `/health` was itself
> rate-limited, so `deploy.sh wait_healthy()` failed and the next deploy rolled
> back blaming the new image. `/health` is no longer rate-limited, for exactly
> that reason: it must report on the app, not on the rate limiter.

**Triage:** if HTTP endpoints are 500ing, Redis is *not* the cause — look at
Postgres and the app logs. Rate-limit counters resetting or users reporting
looser limits than configured is the real Redis-down signature.

```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli ping   # expect PONG
docker compose -f docker-compose.prod.yml logs redis --tail=50
```

**Recovery:** restart the Redis container. The limiter reconnects on its own and
resumes using shared storage; no backend restart needed.

---

## 7. LLM quota incident

### Symptoms
- Chat responses return `{"type": "error", "code": "ai_quota_exceeded"}` for all users.
- `AIUsageRecord` rows accumulate near `AI_FREE_MONTHLY_CREDITS` (default 200/user/month).

### Triage

```bash
# Check top consumers this month
docker compose -f docker-compose.prod.yml exec db psql -U control_tower control_tower -c \
  "SELECT user_id, SUM(units) AS total FROM ai_usage_records
   WHERE created_at >= date_trunc('month', now()) GROUP BY user_id ORDER BY total DESC LIMIT 10;"
```

### Remediation

- Raise `AI_FREE_MONTHLY_CREDITS` in `.env.prod` and restart backend (takes effect immediately for new requests).
- Or reset a specific user's usage counter by deleting their records for the current month (rare, manual operation).

---

## 8. Health check

```bash
curl -sf https://your-domain.com/api/health | jq .
# Expected: {"status":"ok","service":"control-tower","db":true,"watcher":false}
```

`db: false` means the backend cannot reach PostgreSQL. Check database container and connection string.

---

## 9. Rollback

```bash
# Roll back to the previous image tag
docker compose -f docker-compose.prod.yml \
  up -d --no-deps --pull never backend  # with previous image pinned in compose

# Or roll back Alembic one step and restart
docker compose -f docker-compose.prod.yml exec backend alembic downgrade -1
docker compose -f docker-compose.prod.yml restart backend
```

---

## 10. On-call escalation

1. Check `/api/health` for `db` status.
2. Check backend logs: `docker compose logs backend --tail=100 | grep -i error`.
3. Check Stripe webhook failures: `SELECT * FROM failed_webhooks ORDER BY created_at DESC LIMIT 10;`
4. If an agent run is spinning: `SELECT * FROM agents WHERE is_active=true AND last_run_at < now() - interval '2 hours';`

Contact: utsavranjan.sk@gmail.com
