#!/usr/bin/env bash
# =============================================================================
# Nightly Postgres backup. Install on the VPS:
#
#   sudo cp deploy/backup-db.sh /usr/local/bin/ct-backup
#   sudo chmod +x /usr/local/bin/ct-backup
#   sudo crontab -e
#   #  m  h  dom mon dow  command
#      30 2  *   *   *    /usr/local/bin/ct-backup >> /var/log/ct-backup.log 2>&1
#
# The database lives in a Docker named volume. Deleting that volume — which
# `docker compose down -v` does without asking — is unrecoverable without these
# dumps. Copy them off the box periodically; a backup on the same disk as the
# database is not a backup.
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/control-tower}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/control-tower}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

cd "$APP_DIR"
# shellcheck disable=SC1091
set -a; . ./.env.prod; set +a

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/control_tower-${STAMP}.sql.gz"

docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db \
  pg_dump -U "${DB_USER:-control_tower}" -d "${DB_NAME:-control_tower}" \
  | gzip -9 > "$OUT"

# A pg_dump that fails mid-stream still leaves a valid-looking gzip, so check
# the dump actually contains a schema before trusting it.
if ! gzip -dc "$OUT" | head -c 4096 | grep -q "PostgreSQL database dump"; then
  echo "backup FAILED verification: $OUT" >&2
  rm -f "$OUT"
  exit 1
fi

chmod 600 "$OUT"
find "$BACKUP_DIR" -name 'control_tower-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "$(date -Is) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"
