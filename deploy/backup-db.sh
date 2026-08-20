#!/usr/bin/env bash
# =============================================================================
# Nightly Postgres backup. Install on the VPS:
#
#   sudo cp deploy/backup-db.sh /usr/local/bin/ct-backup
#   sudo chmod +x /usr/local/bin/ct-backup
#   sudo crontab -e
#   #  m  h  dom mon dow  command
#      30 2  *   *   *    BACKUP_REMOTE=s3:my-bucket/ct /usr/local/bin/ct-backup >> /var/log/ct-backup.log 2>&1
#
# (deploy/deploy.sh installs this cron itself and passes BACKUP_REMOTE through.)
#
# The database lives in a Docker named volume. Deleting that volume — which
# `docker compose down -v` does without asking — is unrecoverable without these
# dumps. Set BACKUP_REMOTE to get them off the box; a backup on the same disk as
# the database is not a backup — it does not survive losing the VPS, which is
# the exact scenario backups exist for.
#
#   BACKUP_REMOTE=s3:my-bucket/control-tower   # any rclone remote, or
#   BACKUP_REMOTE=s3://my-bucket/control-tower # an s3 URL for the aws cli
#
# Requires `rclone` (configured) or `aws` on PATH. The upload is best-effort:
# it is never allowed to fail the backup or a deploy.
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/control-tower}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/control-tower}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"

# Push a verified dump off-box. Non-fatal by design — a broken remote must not
# cost you the local restore point or block an emergency deploy.
upload_offbox() {
  local file="$1"
  if [ -z "$BACKUP_REMOTE" ]; then
    echo "!!! WARNING: BACKUP_REMOTE unset — this dump lives on the database's own disk" >&2
    echo "!!!          and will NOT survive losing the VPS. Set BACKUP_REMOTE (see header)." >&2
    return 0
  fi
  if command -v rclone >/dev/null 2>&1; then
    if rclone copy --no-traverse "$file" "$BACKUP_REMOTE" 2>&1; then
      echo "==> uploaded to ${BACKUP_REMOTE}"
    else
      echo "!!! WARNING: rclone upload to ${BACKUP_REMOTE} FAILED — dump is local-only" >&2
    fi
  elif command -v aws >/dev/null 2>&1; then
    if aws s3 cp "$file" "${BACKUP_REMOTE%/}/$(basename "$file")" 2>&1; then
      echo "==> uploaded to ${BACKUP_REMOTE}"
    else
      echo "!!! WARNING: aws s3 cp to ${BACKUP_REMOTE} FAILED — dump is local-only" >&2
    fi
  else
    echo "!!! WARNING: BACKUP_REMOTE is set but neither rclone nor aws is installed —" >&2
    echo "!!!          nothing was uploaded. Install one:  curl https://rclone.org/install.sh | sudo bash" >&2
  fi
}

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
upload_offbox "$OUT"
find "$BACKUP_DIR" -name 'control_tower-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "$(date -Is) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"
