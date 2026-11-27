#!/usr/bin/env bash
# Final data sync: take a FRESH copy of the hosted Supabase project and reload it into the
# self-hosted stack on this VPS. Safe to run any number of times, e.g. once as a rehearsal and
# once right before DNS cutover. It RESETS the self-hosted stack's database and storage (only
# /opt/zuu/supabase, the "supabase" compose project); nothing else on the server is touched
# and nothing on HOSTED is modified (read-only dumps).
#
#   read -rsp 'HOSTED DB URL: ' SRC_DB_URL; echo; export SRC_DB_URL     # one line, alone
#   export SRC_URL=https://<ref>.supabase.co
#   ./deploy/scripts/cutover-sync.sh
#
# Needs: SRC_DB_URL (session pooler, sslmode ok), SRC_URL. Optional: NEW_PUBLIC_URL
# (default https://supabase.zuutest.site), SB_DIR, APP_DIR, WORK, ASSUME_YES=1 to skip the prompt.

set -Eeuo pipefail

SB_DIR="${SB_DIR:-/opt/zuu/supabase}"
APP_DIR="${APP_DIR:-/opt/zuu/app}"
WORK="${WORK:-/var/backups/zuu/migration}"
NEW_PUBLIC_URL="${NEW_PUBLIC_URL:-https://supabase.zuutest.site}"
: "${SRC_DB_URL:?set SRC_DB_URL (read -rsp ...; export SRC_DB_URL)}"
: "${SRC_URL:?set SRC_URL=https://<project-ref>.supabase.co}"

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*" >&2; exit 1; }
trap 'die "FAILED at line $LINENO. The self-hosted DB may be partly loaded; just re-run this script."' ERR

[ -f "$SB_DIR/docker-compose.yml" ] || die "$SB_DIR is not a Supabase stack"
[ "$(cd "$SB_DIR" && pwd)" = "/opt/zuu/supabase" ] || [ -n "${SB_DIR_OVERRIDE_OK:-}" ] || die "SB_DIR must be /opt/zuu/supabase (safety check)"

srcdocker() { docker run --rm -i -e SRC_DB_URL postgres:17-alpine "$@"; }
dst()       { docker exec -i supabase-db psql -X -v ON_ERROR_STOP=1 "$@"; }
pg_filter() { sed -e '/^CREATE SCHEMA public;$/d' -e '/^ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin /d'; }

say "Checking the HOSTED connection (read-only)"
n=$(srcdocker sh -c 'psql "$SRC_DB_URL" -X -At -c "select count(*) from auth.users"')
echo "hosted users: $n"

if [ -z "${ASSUME_YES:-}" ]; then
  echo
  echo "This will RESET the self-hosted Supabase database and storage in $SB_DIR and reload it from HOSTED."
  echo "muur.site, chadwar, otp-broker and Caddy are not touched."
  read -rp "Type WIPE to continue: " ans
  [ "$ans" = "WIPE" ] || die "aborted"
fi

D="$WORK/final-$(date +%F-%H%M)"; mkdir -p "$D"; chmod 700 "$D"

say "1/8 Dumping HOSTED (read-only) -> $D"
srcdocker sh -c 'pg_dump "$SRC_DB_URL" --schema=public --no-owner --no-publications --no-subscriptions' > "$D/public.sql"
srcdocker sh -c 'pg_dump "$SRC_DB_URL" --data-only --schema=auth --no-owner --exclude-table=auth.schema_migrations --exclude-table=auth.sessions --exclude-table=auth.refresh_tokens --exclude-table=auth.mfa_amr_claims --exclude-table=auth.flow_state --exclude-table=auth.one_time_tokens --exclude-table=auth.audit_log_entries' > "$D/auth-data.sql"
srcdocker sh -c 'psql "$SRC_DB_URL" -X -q -A -t -f -' < "$APP_DIR/deploy/sql/export-storage-policies.sql" > "$D/storage-policies.sql"
srcdocker sh -c 'psql "$SRC_DB_URL" -X -A -t -F" " -f -' < "$APP_DIR/deploy/sql/verify-counts.sql" > "$D/counts.src"
srcdocker sh -c 'psql "$SRC_DB_URL" -X -At -c "select bucket_id || chr(47) || name from storage.objects order by 1"' > "$D/objects.txt"
for f in public.sql auth-data.sql counts.src; do [ -s "$D/$f" ] || die "$D/$f is empty"; done
echo "dumped: $(wc -l < "$D/counts.src") count rows, $(wc -l < "$D/objects.txt") storage objects"

say "2/8 Resetting the self-hosted Supabase stack ($SB_DIR)"
cd "$SB_DIR"
docker compose down -v
rm -rf "$SB_DIR/volumes/db/data"
find "$SB_DIR/volumes/storage" -mindepth 1 -not -name .gitkeep -delete
docker compose up -d

say "3/8 Waiting for it to become healthy"
for _ in $(seq 1 60); do
  ok=1
  for c in supabase-db supabase-auth supabase-rest supabase-storage; do
    [ "$(docker inspect -f '{{.State.Health.Status}}' "$c" 2>/dev/null || echo none)" = healthy ] || ok=0
  done
  [ "$ok" = 1 ] && break
  sleep 5
done
[ "$ok" = 1 ] || die "stack not healthy after 5 minutes (docker compose ps in $SB_DIR)"

say "4/8 Loading users (auth), then the app data (public)"
{ echo "set session_replication_role = replica;"; cat "$D/auth-data.sql"; } | dst -U supabase_admin -d postgres --single-transaction -f - >/dev/null
pg_filter < "$D/public.sql" | dst -U postgres -d postgres --single-transaction -f - >/dev/null

say "5/8 Trigger, Realtime, storage rules"
dst -U supabase_admin -d postgres -f - < "$APP_DIR/deploy/sql/post-restore.sql" >/dev/null
dst -U supabase_admin -d postgres -f - < "$D/storage-policies.sql" >/dev/null
dst -U supabase_admin -d postgres -f - < "$APP_DIR/deploy/sql/storage-extra.sql" >/dev/null
dst -U postgres -d postgres -c "notify pgrst, 'reload schema'" >/dev/null

say "6/8 Comparing row counts with HOSTED"
dst -U postgres -d postgres -A -t -F" " -f - < "$APP_DIR/deploy/sql/verify-counts.sql" > "$D/counts.dst"
diff "$D/counts.src" "$D/counts.dst" && echo "ROW COUNTS IDENTICAL"

say "7/8 Copying storage files (public URLs, no hosted key needed)"
DST_KEY=$(grep '^SERVICE_ROLE_KEY=' "$SB_DIR/.env" | cut -d= -f2-)
if [ -s "$D/objects.txt" ]; then
  docker run --rm -i --network host -e SRC_URL -e DST_URL=http://127.0.0.1:8100 -e DST_SERVICE_ROLE_KEY="$DST_KEY" \
    -v "$APP_DIR/deploy/scripts:/s:ro" node:22-alpine node /s/copy-storage-public.mjs < "$D/objects.txt"
else
  echo "no storage objects on hosted"
fi

say "8/8 Rewriting stored image URLs to $NEW_PUBLIC_URL"
rw() { dst -U supabase_admin -d postgres -v old="$SRC_URL" -v new="$NEW_PUBLIC_URL" -v apply="$1" -f - < "$APP_DIR/deploy/sql/rewrite-urls.sql" 2>&1 | grep -E "NOTICE" | sed 's/^psql:<stdin>:[0-9]*: //'; }
rw 1
rw 0 | tee "$D/rewrite-verify.txt"
grep -q "0 value(s) would change" "$D/rewrite-verify.txt" || die "URL rewrite left old URLs behind"

trap - ERR
say "DONE. Data from HOSTED is loaded. Now run the smoke test."
echo "Saved dumps: $D"
