# syntax=docker/dockerfile:1

# =============================================================================
# Control Tower — the deployable image
#
# ONE container: the API process serves the compiled SPA, so the frontend and
# the API share an origin. That is a hard requirement, not a simplification —
# the frontend uses a relative `/api` baseURL, dials WebSockets at
# `location.host`, and authenticates with a SameSite=Strict cookie. Split them
# across two hosts and login stops working.
#
# On a VPS a separate Caddy container provided that shared origin. A PaaS
# (Render, Railway, Fly) gives one container one port, so this image folds the
# edge into the app and the topology survives with nothing in front of it.
#
#   docker build -t control-tower .          # context = repo root
#
# =============================================================================

# ---- 1. build the SPA -------------------------------------------------------
FROM node:20-alpine AS web

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /web

# Manifests first, so the install layer is keyed on the lockfile alone and
# editing a component does not reinstall the world.
COPY frontend/pnpm-workspace.yaml frontend/package.json frontend/pnpm-lock.yaml ./
COPY frontend/tsconfig.json frontend/vitest.config.ts ./
# @ledgr/ui arrives in FULL, not just its manifest: the root `prepare` script
# builds it, and pnpm runs prepare as part of install. Its source changes far
# less often than the apps, so the install layer still caches well. Do not
# reach for --ignore-scripts to avoid this — that also skips esbuild's
# postinstall, and Vite then has no platform binary to build with.
COPY frontend/packages/ui ./packages/ui
COPY frontend/packages/shared/package.json ./packages/shared/
COPY frontend/apps/shell/package.json ./apps/shell/
COPY frontend/apps/finance/package.json ./apps/finance/
COPY frontend/apps/health/package.json ./apps/health/
COPY frontend/apps/career/package.json ./apps/career/

# --frozen-lockfile: a deploy must never resolve versions CI did not test.
RUN pnpm install --frozen-lockfile

COPY frontend/packages ./packages
COPY frontend/apps ./apps

# Vite inlines import.meta.env.VITE_* at BUILD time. Setting these on the
# running container does nothing — they have to arrive as build args or the
# analytics module short-circuits and ships inert. Empty = analytics off.
ARG VITE_SENTRY_DSN=""
ARG VITE_POSTHOG_KEY=""
ARG VITE_POSTHOG_HOST=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY \
    VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST

RUN pnpm build:ui && pnpm --filter @ct/shell build


# ---- 2. build the Python environment ----------------------------------------
FROM python:3.11-slim AS deps

# Both variables point at the same venv on purpose: `uv sync` targets
# UV_PROJECT_ENVIRONMENT and ignores VIRTUAL_ENV, while `uv pip install` reads
# VIRTUAL_ENV and errors out without it. Set only one and half the install
# lands somewhere else.
ENV PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    VIRTUAL_ENV=/opt/venv \
    UV_PROJECT_ENVIRONMENT=/opt/venv

RUN pip install --no-cache-dir uv==0.4.27
WORKDIR /build

# Dependencies come from uv.lock, not from a fresh resolve. `uv pip install .`
# re-resolves at build time, so the image would get whatever was published since
# CI last ran — the lockfile was committed and then ignored by every consumer,
# which is how anthropic drifted nine minor versions between what the tests ran
# against and what would have shipped.
#
# --frozen fails if uv.lock disagrees with pyproject.toml rather than quietly
# updating it. --no-install-project keeps this layer keyed on the manifests
# alone, so editing Python source does not reinstall every wheel.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv venv "$VIRTUAL_ENV" \
 && uv sync --frozen --no-dev --no-install-project \
 && uv pip install --no-cache "gunicorn==23.0.0"

# The source layer: the app package over the cached dependencies. gunicorn is
# the production process manager and deliberately not a project dependency —
# local development runs uvicorn directly.
COPY backend/app ./app
RUN uv pip install --no-cache --no-deps .

# Warm the tiktoken BPE cache at build time, where egress exists. app/core/tokens.py
# degrades to a character estimate if this is missing, so a failure here must not
# fail the build — it only means slightly less precise token counts at runtime.
ENV TIKTOKEN_CACHE_DIR=/opt/tiktoken
RUN mkdir -p "$TIKTOKEN_CACHE_DIR" \
 && ("$VIRTUAL_ENV/bin/python" -c "import tiktoken; tiktoken.get_encoding('cl100k_base')" \
     || echo "tiktoken warm-up skipped (no egress at build time)")


# ---- 3. runtime -------------------------------------------------------------
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    TIKTOKEN_CACHE_DIR=/opt/tiktoken \
    SPA_DIST_DIR=/app/static \
    WEB_CONCURRENCY=2

COPY --from=deps /opt/venv /opt/venv
COPY --from=deps /opt/tiktoken /opt/tiktoken

WORKDIR /app

# alembic/ and alembic.ini are runtime requirements: entrypoint.sh runs
# `alembic upgrade head` before the server binds.
COPY backend/alembic.ini backend/entrypoint.sh ./
COPY backend/alembic ./alembic
COPY backend/app ./app
COPY --from=web /web/apps/shell/dist ./static

RUN chmod +x entrypoint.sh \
 && useradd --system --uid 10001 --no-create-home appuser \
 && chown -R appuser:appuser /app
USER appuser

# PaaS platforms inject the port to listen on. 8000 is the local default.
ENV PORT=8000
EXPOSE 8000

# No curl in the slim image; urllib is already in the venv. /health returns 503
# when the database is unreachable, which raises HTTPError — exactly the signal
# an orchestrator should act on.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD ["sh", "-c", "python -c \"import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8000')+'/health', timeout=8)\""]

ENTRYPOINT ["./entrypoint.sh"]

# --forwarded-allow-ips: the PaaS router terminates TLS and forwards
# X-Forwarded-For. Trusting it is what makes per-IP rate limiting key on the
# real client rather than on the router, which would put every user in one bucket.
CMD ["sh", "-c", "exec gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  -w ${WEB_CONCURRENCY:-2} \
  --bind 0.0.0.0:${PORT:-8000} \
  --timeout 120 \
  --graceful-timeout 30 \
  --access-logfile - \
  --forwarded-allow-ips '*'"]
