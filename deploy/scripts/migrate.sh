#!/usr/bin/env bash
# Apply pending SQL files from supabase/migrations/ to the self-hosted database, each exactly once,
# in file-name order. Called by deploy.sh BEFORE the new app version starts, so the schema is ready
# when the new code runs. If a file fails, nothing after it runs, the deploy stops, and the running
# app version keeps serving.
#
# Rules for migration files (so a rollback of the app stays possible):
#   - name: YYYYMMDDHHMMSS_short_description.sql (sorted by name)
#   - additive and idempotent (add column if not exists, create table if not exists)
#   - no BEGIN/COMMIT inside; each file already runs in one transaction
# Applied names are recorded in app_private.migrations (a schema PostgREST does not expose).

set -Eeuo pipefail
cd "$(dirname "$0")/../.."

DB="${DB_CONTAINER:-supabase-db}"
psql_() { docker exec -i "$DB" psql -X -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }

shopt -s nullglob
files=(supabase/migrations/*.sql)

psql_ -q <<'SQL'
create schema if not exists app_private;
create table if not exists app_private.migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);
SQL

applied="$(psql_ -At -c 'select name from app_private.migrations')"
count=0
for f in "${files[@]}"; do
  name="$(basename "$f")"
  [[ "$name" =~ ^[0-9]{14}_[A-Za-z0-9_]+\.sql$ ]] || { echo "!! bad migration file name: $name" >&2; exit 1; }
  if grep -qxF "$name" <<<"$applied"; then continue; fi
  echo "==> applying $name"
  { echo "begin;"; cat "$f"; printf '\n'; echo "insert into app_private.migrations (name) values ('$name');"; echo "commit;"; } | psql_ -q -f -
  count=$((count + 1))
done
echo "==> migrations: $count applied now, ${#files[@]} total"
