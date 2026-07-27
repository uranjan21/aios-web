#!/usr/bin/env bash
# =============================================================================
# Control Tower — VPS-side deploy step.
#
# Copied to the server by .github/workflows/deploy.yml and run there. Also safe
# to run by hand:  ./deploy.sh <backend-image> <frontend-image>
#
# Pulls the new images, swaps them in, waits for the app to answer, and rolls
# back to the previously running tags if it doesn't.
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/control-tower}"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"

NEW_BACKEND="${1:?usage: deploy.sh <backend-image> <frontend-image>}"
NEW_FRONTEND="${2:?usage: deploy.sh <backend-image> <frontend-image>}"

cd "$APP_DIR"

if [ ! -f .env.prod ]; then
  echo "FATAL: $APP_DIR/.env.prod is missing. Create it from .env.prod.example first." >&2
  exit 1
fi

# ---- remember what is currently live, for rollback --------------------------
PREV_BACKEND="$(grep -E '^BACKEND_IMAGE=' .env.prod | cut -d= -f2- || true)"
PREV_FRONTEND="$(grep -E '^FRONTEND_IMAGE=' .env.prod | cut -d= -f2- || true)"
echo "current: backend=${PREV_BACKEND:-<none>} frontend=${PREV_FRONTEND:-<none>}"
echo "target : backend=$NEW_BACKEND frontend=$NEW_FRONTEND"

set_images() {
  # Rewrite in place; append the key if it isn't there yet.
  local be="$1" fe="$2"
  if grep -qE '^BACKEND_IMAGE=' .env.prod; then
    sed -i "s|^BACKEND_IMAGE=.*|BACKEND_IMAGE=${be}|" .env.prod
  else
    echo "BACKEND_IMAGE=${be}" >> .env.prod
  fi
  if grep -qE '^FRONTEND_IMAGE=' .env.prod; then
    sed -i "s|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=${fe}|" .env.prod
  else
    echo "FRONTEND_IMAGE=${fe}" >> .env.prod
  fi
}

wait_healthy() {
  local deadline=$(( SECONDS + HEALTH_TIMEOUT ))
  while [ "$SECONDS" -lt "$deadline" ]; do
    # /health is proxied through Caddy to the backend and returns 503 while the
    # DB is unreachable, so a 200 proves edge + API + Postgres are all up.
    if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 3
  done
  return 1
}

# ---- deploy -----------------------------------------------------------------
set_images "$NEW_BACKEND" "$NEW_FRONTEND"

echo "==> pulling images"
$COMPOSE pull

echo "==> starting stack (alembic upgrade head runs in the backend entrypoint)"
$COMPOSE up -d --remove-orphans

echo "==> waiting up to ${HEALTH_TIMEOUT}s for $HEALTH_URL"
if wait_healthy; then
  echo "==> healthy"
  # Reclaim disk from superseded image layers. A VPS root disk fills up fast
  # otherwise and Postgres is the first thing to break when it does.
  docker image prune -af --filter "until=168h" >/dev/null 2>&1 || true
  $COMPOSE ps
  exit 0
fi

echo "!!! health check FAILED — rolling back" >&2
$COMPOSE logs --tail=80 backend web >&2 || true

if [ -n "$PREV_BACKEND" ] && [ -n "$PREV_FRONTEND" ]; then
  set_images "$PREV_BACKEND" "$PREV_FRONTEND"
  $COMPOSE up -d --remove-orphans
  if wait_healthy; then
    echo "rolled back to backend=$PREV_BACKEND frontend=$PREV_FRONTEND" >&2
  else
    echo "ROLLBACK ALSO UNHEALTHY — manual intervention required" >&2
  fi
else
  echo "no previous images recorded — cannot roll back" >&2
fi
exit 1
