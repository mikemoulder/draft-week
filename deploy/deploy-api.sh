#!/usr/bin/env bash
# Deploy the backend on the VPS: pull, rebuild, restart, check health, prune old images.
# Usage (from the repo root on the VPS): bash deploy/deploy-api.sh
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo ".env missing. Copy .env.example and fill it (chmod 600)."; exit 1; }

dc() { sg docker -c "docker compose $*"; }

git pull --ff-only
export GIT_SHA
GIT_SHA=$(git rev-parse --short HEAD)

dc build api
dc up -d
echo "waiting for health..."
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3940/health >/dev/null 2>&1; then
    curl -fsS http://127.0.0.1:3940/health; echo
    sg docker -c "docker image prune -f" >/dev/null
    df -h / | tail -1
    exit 0
  fi
  sleep 2
done
echo "api did not become healthy"; dc logs --tail 50 api; exit 1
