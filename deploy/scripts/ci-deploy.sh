#!/usr/bin/env bash
# Forced command for the GitHub Actions deploy key. In ~/.ssh/authorized_keys the key is pinned to
# this script, so even if the key leaks it can do exactly one thing: deploy an image of this project.
#
#   command="/opt/zuu/app/deploy/scripts/ci-deploy.sh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAA...
#
# The workflow runs:  ssh deploy@host "deploy ghcr.io/<owner>/<repo> <git-sha>"
# which arrives here in $SSH_ORIGINAL_COMMAND. Nothing else is accepted.

set -Eeuo pipefail

main() {
  local verb image tag extra
  read -r verb image tag extra <<<"${SSH_ORIGINAL_COMMAND:-}" || true
  [ "${verb:-}" = deploy ] && [ -z "${extra:-}" ] || { echo "refused: expected 'deploy <image> <tag>'" >&2; return 2; }
  [[ "${image:-}" =~ ^ghcr\.io/[a-z0-9._-]+/[a-z0-9._-]+$ ]] || { echo "refused: bad image name" >&2; return 2; }
  [[ "${tag:-}" =~ ^[a-f0-9]{7,40}$ ]] || { echo "refused: bad tag" >&2; return 2; }

  cd "${APP_DIR:-/opt/zuu/app}"
  # The server always runs exactly what is on main. (Local edits to tracked files are discarded;
  # deploy/.env and other untracked files are never touched.)
  git fetch -q origin main
  git checkout -q main
  git reset -q --hard origin/main

  # exec: the freshly checked-out deploy.sh takes over (this script may itself have just changed).
  APP_IMAGE="$image" APP_TAG="$tag" SKIP_GIT=1 exec ./deploy/scripts/deploy.sh
}

# One line, so bash has parsed everything before git replaces this file.
main "$@"; exit $?
