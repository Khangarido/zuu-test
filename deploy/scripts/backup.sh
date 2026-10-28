#!/usr/bin/env bash
# Nightly backup of the self-hosted Supabase stack. Run as root from cron:
#   17 3 * * *  /opt/zuu/app/deploy/scripts/backup.sh >> /var/log/zuu-backup.log 2>&1
#
# Produces, under $BACKUP_DIR/<UTC timestamp>/:
#   public.sql.gz    app schema + data        } same two files the migration uses, so
#   auth-data.sql.gz users, identities, ...   } restore = MIGRATION.md steps 5-6
#   storage-data.sql.gz  storage.buckets / storage.objects rows }  a PAIR: restore both
#   storage.tar.gz       uploaded files (with xattrs)           }  together or neither
#   storage-policies.sql storage RLS policies (re-runnable)
#   full.dump        pg_dump -Fc of the whole DB (forensics / belt and braces)
#   env.supabase     the stack's .env (JWT secret, DB password): needed to restore
#   SHA256SUMS
#
# These contain password hashes and personal data. Offsite copies MUST be encrypted
# (rclone "crypt" remote, or age/gpg). Nothing is copied offsite unless you set one:
#   RCLONE_REMOTE=remote:path        (rclone copy)    or    RSYNC_DEST=user@host:/path
# Optional: HEALTHCHECK_URL=https://hc-ping.com/<uuid>  (pinged on success, /fail on error)

set -Eeuo pipefail
umask 077

SB_DIR="${SB_DIR:-/opt/zuu/supabase}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/zuu}"
KEEP_DAYS="${KEEP_DAYS:-14}"
DB_CONTAINER="${DB_CONTAINER:-supabase-db}"
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/$ts"

ping() { [ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS -m 10 --retry 3 "${HEALTHCHECK_URL}${1:-}" >/dev/null || true; }
trap 'echo "[$ts] BACKUP FAILED" >&2; ping /fail; rm -rf "$out"' ERR

mkdir -p "$out"
pgdump() { docker exec -i "$DB_CONTAINER" pg_dump "$@"; }

echo "[$ts] dumping database"
pgdump -U postgres -d postgres --schema=public --no-owner --no-publications --no-subscriptions \
  | gzip -9 > "$out/public.sql.gz"
pgdump -U postgres -d postgres --data-only --schema=auth --no-owner \
  --exclude-table=auth.schema_migrations --exclude-table=auth.sessions \
  --exclude-table=auth.refresh_tokens --exclude-table=auth.mfa_amr_claims \
  --exclude-table=auth.flow_state --exclude-table=auth.one_time_tokens \
  --exclude-table=auth.audit_log_entries \
  | gzip -9 > "$out/auth-data.sql.gz"
pgdump -U postgres -d postgres --data-only --schema=storage --no-owner \
  --exclude-table=storage.migrations \
  | gzip -9 > "$out/storage-data.sql.gz"
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -X -q -A -t -f - \
  < "$REPO_DIR/deploy/sql/export-storage-policies.sql" > "$out/storage-policies.sql"
pgdump -U supabase_admin -d postgres -Fc > "$out/full.dump"

echo "[$ts] archiving storage"
tar --xattrs -C "$SB_DIR/volumes" -czf "$out/storage.tar.gz" storage
cp "$SB_DIR/.env" "$out/env.supabase"

# Refuse to call an empty dump a success.
for f in public.sql.gz auth-data.sql.gz full.dump; do   # (storage.tar.gz may legitimately be tiny)
  [ "$(stat -c %s "$out/$f")" -gt 200 ] || { echo "$f is suspiciously small" >&2; false; }
done
(cd "$out" && sha256sum -- * > SHA256SUMS)

if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[$ts] rclone -> $RCLONE_REMOTE/$ts"
  rclone copy "$out" "$RCLONE_REMOTE/$ts"
elif [ -n "${RSYNC_DEST:-}" ]; then
  echo "[$ts] rsync -> $RSYNC_DEST"
  rsync -a "$out" "$RSYNC_DEST/"
else
  echo "[$ts] WARNING: no offsite copy configured (RCLONE_REMOTE / RSYNC_DEST). A VPS loss loses the backups too." >&2
fi

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +
trap - ERR
echo "[$ts] ok: $(du -sh "$out" | cut -f1)"
ping
