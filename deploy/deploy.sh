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

# ---- where dumps go ---------------------------------------------------------
# /var/backups needs root, but deploy.sh and its cron run as the unprivileged
# deploy user. Rather than emit backups that silently fail to write, fall back
# to a directory we definitely own. Same disk as the DB is a weak backup, but
# it is the difference between having a restore point and not having one —
# copy them off the box separately.
resolve_backup_dir() {
  local preferred="${BACKUP_DIR:-/var/backups/control-tower}"
  if mkdir -p "$preferred" 2>/dev/null && [ -w "$preferred" ]; then
    echo "$preferred"; return 0
  fi
  local fallback="${APP_DIR}/backups"
  mkdir -p "$fallback" 2>/dev/null || true
  echo "$fallback"
}

# ---- pre-migration safety net ----------------------------------------------
# The backend entrypoint runs `alembic upgrade head` on every boot, and the
# rollback below only restores IMAGE TAGS — it cannot un-migrate the database.
# So a bad migration leaves old code against a new schema with nothing to
# restore from. Dump first. Deliberately non-fatal: a failed dump must not be
# able to block an emergency hotfix, but it has to be loud.
pre_deploy_backup() {
  local dir; dir="$(resolve_backup_dir)"
  local out="${dir}/pre-deploy-$(date +%Y%m%d-%H%M%S).sql.gz"
  if ! $COMPOSE ps --status running db 2>/dev/null | grep -q db; then
    echo "==> no running db container (first deploy?) — skipping pre-deploy backup"
    return 0
  fi
  # shellcheck disable=SC1091
  set -a; . ./.env.prod; set +a
  if $COMPOSE exec -T db pg_dump -U "${DB_USER:-control_tower}" -d "${DB_NAME:-control_tower}" \
       | gzip -9 > "$out" \
     && gzip -dc "$out" | head -c 4096 | grep -q "PostgreSQL database dump"; then
    chmod 600 "$out"
    echo "==> pre-deploy backup: $out ($(du -h "$out" | cut -f1))"
  else
    rm -f "$out"
    echo "!!! WARNING: pre-deploy backup FAILED — continuing without a restore point" >&2
  fi
}

# ---- nightly backup cron ----------------------------------------------------
# Installing this was a manual step in the runbook, which means it existed only
# if someone remembered — and a database with no dump is one `docker compose
# down -v` away from gone. Install it into the deploy user's own crontab
# (no sudo needed) and keep it idempotent so re-running deploy.sh is a no-op.
ensure_backup_cron() {
  local script="${APP_DIR}/deploy/backup-db.sh"
  local marker="ct-backup-nightly"
  [ -f "$script" ] || { echo "==> $script not found — skipping backup cron install"; return 0; }
  chmod +x "$script" 2>/dev/null || true
  if crontab -l 2>/dev/null | grep -q "$marker"; then
    return 0
  fi
  local dir; dir="$(resolve_backup_dir)"
  # BACKUP_REMOTE must be carried into the cron line explicitly — cron runs with
  # a near-empty environment, so a remote set only in the deploy shell would
  # silently never apply to the nightly dumps.
  local remote="${BACKUP_REMOTE:-}"
  local line="30 2 * * * APP_DIR=${APP_DIR} BACKUP_DIR=${dir} BACKUP_REMOTE=${remote} ${script} >> ${dir}/backup.log 2>&1 # ${marker}"
  if { crontab -l 2>/dev/null; echo "$line"; } | crontab - 2>/dev/null; then
    echo "==> installed nightly backup cron (02:30 → ${dir})"
  else
    echo "!!! WARNING: could not install backup cron — install it by hand (see deploy/backup-db.sh)" >&2
  fi
}

# ---- deploy -----------------------------------------------------------------
ensure_backup_cron
pre_deploy_backup

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
