#!/bin/sh
#
# Install the trimmed, self-hosted Supabase stack for zuutest.site.
#
# What it does (idempotent; refuses to touch an existing install):
#   1. Fetches ONLY docker/ from supabase/supabase at a pinned commit
#   2. Adds our overlay (docker-compose.zuu.yml) + email templates
#   3. Creates .env from upstream's example, generates all secrets with
#      upstream's utils/generate-keys.sh (output is NOT printed), and applies
#      the non-secret settings for zuutest.site
#   4. Does NOT start anything and never touches ports 80/443 or other containers
#
# Usage (on the VPS, as a user that can run docker):
#   SB_DIR=/opt/zuu/supabase \
#   API_HOST=supabase.zuutest.site SITE_URL=https://zuutest.site \
#   sh deploy/supabase/setup.sh
#
# Then follow deploy/supabase/README.md.

set -eu
umask 077

# Pinned upstream commit this overlay was validated against (2026-10-28).
# To upgrade, change this, re-run `docker compose config`, read upstream's
# CHANGELOG.md/versions.md, and follow deploy/supabase/README.md "Upgrades".
SB_REF="${SB_REF:-ce5227754604d8d2e60e5781f0b973967107924c}"
SB_DIR="${SB_DIR:-/opt/zuu/supabase}"
API_HOST="${API_HOST:-supabase.zuutest.site}"
SITE_URL="${SITE_URL:-https://zuutest.site}"
EXTRA_REDIRECTS="${EXTRA_REDIRECTS:-https://www.zuutest.site/**,https://next.zuutest.site/**}"
API_GW_HTTP_PORT="${API_GW_HTTP_PORT:-8100}"

HERE="$(cd "$(dirname "$0")" && pwd)"

log() { printf '===> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

for bin in git openssl docker awk; do
  command -v "$bin" >/dev/null 2>&1 || die "$bin is required but not installed"
done
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 plugin is required"

# !override / !reset need Compose >= 2.24
cv="$(docker compose version --short 2>/dev/null | sed 's/^v//')"
cmaj="${cv%%.*}"; rest="${cv#*.}"; cmin="${rest%%.*}"
if [ "${cmaj:-0}" -lt 2 ] || { [ "${cmaj:-0}" -eq 2 ] && [ "${cmin:-0}" -lt 24 ]; }; then
  die "Docker Compose >= 2.24 required (found $cv)"
fi

[ -e "$SB_DIR/docker-compose.yml" ] && die "$SB_DIR already contains a Supabase install; refusing to overwrite. See README 'Upgrades'."

if command -v ss >/dev/null 2>&1 && ss -tln 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${API_GW_HTTP_PORT}\$"; then
  die "port ${API_GW_HTTP_PORT} is already in use on this host; pick another with API_GW_HTTP_PORT=..."
fi

log "Fetching supabase/docker @ ${SB_REF}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git init -q "$tmp"
git -C "$tmp" remote add origin https://github.com/supabase/supabase.git
git -C "$tmp" sparse-checkout set docker
git -C "$tmp" fetch -q --depth 1 --filter=blob:none origin "$SB_REF"
git -C "$tmp" checkout -q FETCH_HEAD

mkdir -p "$SB_DIR"
cp -a "$tmp/docker/." "$SB_DIR/"
printf '%s\n' "$SB_REF" > "$SB_DIR/.supabase-ref"

log "Adding zuutest.site overlay + email templates"
cp "$HERE/docker-compose.zuu.yml" "$HERE/docker-compose.edge.yml" "$SB_DIR/"
mkdir -p "$SB_DIR/volumes/zuu-templates"
cp "$HERE"/templates/*.html "$SB_DIR/volumes/zuu-templates/"

cd "$SB_DIR"

set_env() { # set_env KEY VALUE  (values may contain | & = /)
  if grep -q "^$1=" .env; then
    K="$1" V="$2" awk 'BEGIN{FS="="} $1==ENVIRON["K"]{print ENVIRON["K"] "=" ENVIRON["V"]; next} {print}' .env > .env.tmp
    mv .env.tmp .env
  else
    printf '%s=%s\n' "$1" "$2" >> .env
  fi
}

log "Creating .env and generating secrets (not printed)"
cp .env.example .env
sh utils/generate-keys.sh --update-env >/dev/null
rm -f .env.old

set_env COMPOSE_FILE "docker-compose.yml:docker-compose.zuu.yml"
set_env API_GW_HTTP_PORT "$API_GW_HTTP_PORT"
set_env SUPABASE_PUBLIC_URL "https://${API_HOST}"
set_env API_EXTERNAL_URL "https://${API_HOST}/auth/v1"
set_env SITE_URL "$SITE_URL"
set_env ADDITIONAL_REDIRECT_URLS "${SITE_URL}/**,${EXTRA_REDIRECTS}"
set_env ENABLE_EMAIL_SIGNUP true
set_env ENABLE_EMAIL_AUTOCONFIRM false
set_env ENABLE_PHONE_SIGNUP false
set_env ENABLE_PHONE_AUTOCONFIRM false
set_env ENABLE_ANONYMOUS_USERS false
set_env DISABLE_SIGNUP false
set_env SMTP_HOST smtp.resend.com
set_env SMTP_PORT 465
set_env SMTP_USER resend
set_env SMTP_ADMIN_EMAIL "no-reply@${SITE_URL#https://}"
set_env SMTP_SENDER_NAME "Zuu Academy"
set_env STUDIO_DEFAULT_ORGANIZATION "Zuu Academy"
set_env STUDIO_DEFAULT_PROJECT "zuutest"
# Not set here on purpose: SMTP_PASS (your Resend API key) and the app's keys.
set_env SMTP_PASS "CHANGE_ME_resend_api_key"
chmod 600 .env

log "Validating compose config"
docker compose config --quiet

cat <<MSG

Done. Nothing has been started.

Next:
  1. Edit ${SB_DIR}/.env: set SMTP_PASS (Resend API key). If the proxy serving
     muur.site runs in Docker, append :docker-compose.edge.yml to COMPOSE_FILE.
  2. cd ${SB_DIR} && docker compose pull && docker compose up -d
  3. Read the anon/service keys for the app (they stay on this server):
       grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=' ${SB_DIR}/.env
MSG
