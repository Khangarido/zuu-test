#!/usr/bin/env bash
# Redeploy the Next.js app on the VPS with an automatic rollback if the new
# container does not become healthy. Touches ONLY the zuu-app compose project.
#
#   ./deploy/scripts/deploy.sh                 # build from this checkout (tag = git sha)
#   APP_IMAGE=ghcr.io/owner/repo APP_TAG=abc123 ./deploy/scripts/deploy.sh   # pull a prebuilt image
#
# Prebuilt images (GitHub Actions, see .github/workflows/deploy.yml) are preferred:
# `next build` needs roughly 1-2 GB of RAM, which you may not want to take from muur.site.
#
# Needs deploy/.env (copy of .env.example). NEXT_PUBLIC_* are build-time values.

set -euo pipefail
cd "$(dirname "$0")/../.."

ENV_FILE=deploy/.env
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE (cp .env.example deploy/.env)" >&2; exit 1; }

# Values already exported in the caller's environment win over the env file.
get() { local v; v="${!1:-}"; [ -n "$v" ] && { printf '%s' "$v"; return; }; grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true; }
IMAGE="$(get APP_IMAGE)"; IMAGE="${IMAGE:-zuu-app}"
CONTAINER=zuu-app
compose() { docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.app.yml "$@"; }

if [[ "$IMAGE" == */* ]]; then
  MODE=pull
  TAG="$(get APP_TAG)"; TAG="${TAG:-latest}"
else
  MODE=build
  if [ -d .git ] && [ -z "${SKIP_GIT:-}" ]; then
    git pull --ff-only
  fi
  TAG="$(git rev-parse --short=12 HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)"
fi

prev_image="$(docker inspect --format '{{.Image}}' "$CONTAINER" 2>/dev/null || true)"
if [ -n "$prev_image" ]; then
  docker tag "$prev_image" "$IMAGE:previous"
fi

echo "==> mode=$MODE image=$IMAGE:$TAG"
if [ "$MODE" = pull ]; then
  APP_IMAGE="$IMAGE" APP_TAG="$TAG" compose pull app
else
  # nice: don't let the build starve muur.site of CPU
  APP_IMAGE="$IMAGE" APP_TAG="$TAG" nice -n 19 \
    docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.app.yml build app
fi

APP_IMAGE="$IMAGE" APP_TAG="$TAG" compose up -d app

echo "==> waiting for healthy"
for _ in $(seq 1 40); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER" 2>/dev/null || echo missing)"
  [ "$status" = healthy ] && { echo "==> healthy: $IMAGE:$TAG"; docker image prune -f --filter "until=168h" >/dev/null; exit 0; }
  sleep 3
done

echo "!! $CONTAINER not healthy after 2 minutes (status=$status)" >&2
docker logs --tail 40 "$CONTAINER" >&2 || true
if [ -n "$prev_image" ]; then
  echo "==> rolling back to previous image" >&2
  APP_IMAGE="$IMAGE" APP_TAG=previous compose up -d app
fi
exit 1
