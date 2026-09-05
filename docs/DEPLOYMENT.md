# Deployment

Control Tower deploys as **one container** against **Supabase Postgres** and a
managed Redis. This walks through it end to end.

Everything here assumes you have read why the topology is shaped this way:
the SPA and the API must share an origin, because the frontend uses a relative
`/api` baseURL, dials WebSockets at `location.host`, and authenticates with a
`SameSite=Strict` cookie. Splitting them across two hosts breaks login.

---

## 1. Create the database (Supabase)

1. Create a project at [supabase.com](https://supabase.com). Save the database
   password — it is shown once.
2. **Project Settings → Database → Connection string → URI.**
3. Use the **transaction pooler** entry (port **6543**), not the direct
   connection. Two reasons:
   - The direct connection on 5432 is IPv6-only for new projects, and several
     hosts cannot reach it.
   - The pooler holds far fewer server-side connections, which is what keeps
     you under the plan's cap as you add workers.
4. Change the scheme from `postgresql://` to `postgresql+asyncpg://`. Leave the
   rest exactly as printed, `?sslmode=require` included.

```
postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require
```

You do not need to clean that URL up by hand. `backend/app/db/url.py` translates
`sslmode` into what asyncpg actually accepts, drops parameters it does not, and
recognises port 6543 as a transaction pooler — which means disabling statement
caching and randomising prepared statement names, without which asyncpg raises
`DuplicatePreparedStatementError` under load.

**pgvector needs no setup.** The first migration runs
`CREATE EXTENSION IF NOT EXISTS vector`, and Supabase permits it.

**Migrations run themselves.** The container entrypoint runs
`alembic upgrade head` before the server binds, and a failure kills the
container rather than serving against a stale schema.

---

## 2. Generate secrets

```bash
# APP_SECRET_KEY — signs every JWT
python -c "import secrets; print(secrets.token_urlsafe(48))"

# TOKEN_ENCRYPTION_KEY — encrypts users' API keys and OAuth tokens
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

`APP_SECRET_KEY` must be identical across workers and across restarts, or users
are logged out at random with nothing in the logs.

**Back up `TOKEN_ENCRYPTION_KEY` with your other secrets.** Rotating it makes
every stored API key and OAuth token permanently unreadable, and every user has
to re-enter theirs.

---

## 3. Deploy

`.env.production.example` is the full manifest of variables with an explanation
of each. The required set is: `ENVIRONMENT`, `ALLOWED_ORIGIN`, `DATABASE_URL`,
`REDIS_URL`, `APP_SECRET_KEY`, `APP_PASSWORD`, `TOKEN_ENCRYPTION_KEY`,
`RESEND_API_KEY`, `EMAIL_FROM`, and `VAULT_SYNC_ENABLED=false`.

### Render

`render.yaml` is a Blueprint that defines the web service and a Key Value
instance and wires `REDIS_URL` between them.

1. **New → Blueprint**, point it at this repository.
2. Fill in the prompted variables. `ALLOWED_ORIGIN` is
   `https://<your-service>.onrender.com` unless you attach a custom domain.
3. Deploy. Render rebuilds on every push to the default branch.

### Railway

1. **New Project → Deploy from GitHub repo.** Railway detects the root
   `Dockerfile`.
2. Add a **Redis** service; copy its connection URL into `REDIS_URL`.
3. Set the rest of the variables from `.env.production.example`.
4. Set `ALLOWED_ORIGIN` to the generated domain once it exists.

### Fly.io

`fly.toml` is committed and ready.

```bash
fly launch --no-deploy --copy-config
fly redis create                       # or any managed Redis

fly secrets set \
  DATABASE_URL='postgresql+asyncpg://...' \
  REDIS_URL='redis://...' \
  ALLOWED_ORIGIN='https://<app>.fly.dev' \
  APP_SECRET_KEY='...' \
  APP_PASSWORD='...' \
  TOKEN_ENCRYPTION_KEY='...' \
  RESEND_API_KEY='...' \
  EMAIL_FROM='Control Tower <noreply@example.com>'

fly deploy
```

`fly.toml` sets `auto_stop_machines = false` deliberately. A stopped machine
runs no scheduler, so the daily agents, the briefing job and the hourly
automation tick simply never fire — and the app looks perfectly healthy while
quietly doing nothing.

`.github/workflows/deploy.yml` runs `flyctl deploy` on pushes to `main` when
`FLY_API_TOKEN` is set as a repository secret. Without that secret the job skips.

---

## 4. The variable that most often goes wrong

**`ALLOWED_ORIGIN` must be exactly what users type in the browser**, scheme
included, no trailing slash.

It drives three things at once: the CORS allowed origin, the CSP `connect-src`,
and whether the auth cookie carries `Secure`. A mismatch does not raise an
error — the browser simply refuses to store or send the cookie, every request
after login is anonymous, and nothing appears in the logs.

If login "does nothing" on a fresh deployment, check this first.

---

## 5. Startup guards

The backend **refuses to start** in production if any of these is wrong. Each
exists because the alternative was a silent failure, and each is covered in both
directions by `backend/tests/test_config_guards.py`.

| Guard | Why |
|---|---|
| `APP_SECRET_KEY` set, ≥32 chars, not a known default | A weak or per-process key means forged or randomly-invalid sessions |
| `APP_PASSWORD` not a known default | The legacy login path must not accept a published password |
| `REDIS_URL` set | Per-process rate limits multiply by worker count |
| `RESEND_API_KEY` set | Signup requires a verified email; no sender means no signups |
| `TOKEN_ENCRYPTION_KEY` set | Users' API keys and OAuth tokens would be stored unprotected |
| `ALLOWED_ORIGIN` is https (or `ALLOW_INSECURE_HTTP=true`) | Without TLS the cookie cannot carry `Secure` and every JWT crosses in cleartext |
| `ALLOWED_ORIGIN` is not localhost | A localhost origin in production is always a misconfiguration |
| Vault sync off (or `VAULT_SINGLE_TENANT_ACK=true`) | Vault sync shares one filesystem across all users |

---

## 6. Verify the deployment

```bash
curl -s https://<origin>/health
# {"status":"ok","service":"control-tower","db":true,"watcher":false}
```

`db: true` means migrations ran and Postgres is reachable. A 503 means the
database is not.

Then check the parts that only fail in a browser:

```bash
# The SPA is served by the same process
curl -s https://<origin>/ | grep '<div id="root">'

# A client-side route survives a refresh
curl -s -o /dev/null -w '%{http_code}\n' https://<origin>/app/workspace/goals   # 200

# An unknown API path is a JSON 404, not the HTML shell
curl -s https://<origin>/api/nope                                               # {"detail":"Not Found"}

# Security headers are on the document
curl -sI https://<origin>/ | grep -i 'content-security-policy\|x-frame-options'
```

Then sign up in a browser, confirm the verification email arrives, and open the
assistant to confirm the WebSocket connects.

CI runs these same assertions against the built image on every push, so a break
in any of them should fail before it reaches you.

---

## 7. Backups

Supabase owns backups now. Check what your plan includes — the free tier's
retention is short and has no point-in-time recovery. If this holds data you
care about, either move to a plan with PITR or schedule your own `pg_dump`
against the connection string and store the output somewhere else.

There is no backup script in this repository any more. The one that existed
wrote to the database server's own disk, which protected against `docker
compose down -v` and against nothing else.

---

## 8. Observability

Set `SENTRY_DSN`. Without it, production errors are invisible: there is no
metrics endpoint and platform logs are all you get.

Two separate variables, and they are not interchangeable:

- `SENTRY_DSN` — backend, read at runtime.
- `VITE_SENTRY_DSN` — frontend, **build-time only**. Vite inlines it into the
  bundle, so setting it as a runtime variable does nothing. It has to be a
  Docker build arg, which means a GitHub repository secret consumed by
  `.github/workflows/deploy.yml`.

When `SENTRY_DSN` is set, add its ingest host to `CSP_CONNECT_EXTRA` or the
browser blocks every frontend error report and the backend looks like the only
thing that ever fails. Read the host off the DSN:
`https://<key>@o123456.ingest.sentry.io/456` → `https://o123456.ingest.sentry.io`.

---

## 9. Scaling

Each gunicorn worker holds its own database connection pool, so server-side
connections are roughly `WEB_CONCURRENCY × (DB_POOL_SIZE + DB_MAX_OVERFLOW)`.
With the defaults that is 2 × 10 = 20.

If you approach Supabase's connection limit, point `DATABASE_URL` at the
transaction pooler rather than shrinking the pools — that is what it is for.

Only one worker runs the scheduler, elected by a Postgres advisory lock, so
scaling out does not multiply agent runs or push notifications.
