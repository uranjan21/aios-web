# syntax=docker/dockerfile:1

# =============================================================================
# Control Tower — web edge image (built SPA + reverse proxy)
#
# Build context MUST be `frontend/` — the pnpm workspace root
# (`docker build -f apps/shell/Dockerfile ./frontend` from the repo root) — so
# the workspace packages resolve. It was the repo root until the 2026-07-28
# restructure moved the whole JS workspace under frontend/.
#
# This image is the ONLY thing exposed to the internet. Caddy serves the
# compiled SPA and proxies /api + /ws to the backend container, which is why
# the frontend can use a relative `/api` baseURL and `location.host` for
# WebSockets — everything is same-origin.
# =============================================================================

# ---- build ------------------------------------------------------------------
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

WORKDIR /app

# Workspace manifests first so `pnpm install` is cached independently of source.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json vitest.config.ts ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
COPY apps/shell/package.json ./apps/shell/
COPY apps/finance/package.json ./apps/finance/
COPY apps/health/package.json ./apps/health/
COPY apps/career/package.json ./apps/career/

# --frozen-lockfile: a deploy must never silently resolve different versions
# than CI tested. Fails loudly if pnpm-lock.yaml is stale.
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps ./apps

# @ledgr/ui builds to dist/ (tsup); the shell typechecks the whole graph via
# the root tsconfig, then Vite bundles.
RUN pnpm --filter @ledgr/ui build \
 && pnpm --filter @ct/shell build

# ---- runtime ----------------------------------------------------------------
FROM caddy:2.8-alpine AS runtime

COPY --from=build /app/apps/shell/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443

# No HEALTHCHECK on purpose. Once SITE_ADDRESS is a hostname, Caddy serves on
# :443 and 308-redirects :80 to the public name — an in-container probe against
# 127.0.0.1 would then report "unhealthy" on a perfectly working edge. The real
# gate is deploy.sh polling /health from outside, which exercises Caddy, the
# API and Postgres in one request.
