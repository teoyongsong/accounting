#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

DOCKER_DESKTOP_EXE="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
MYSQL_CONTAINER_NAME="${MYSQL_CONTAINER_NAME:-sg-accounting-mysql}"

# IMPORTANT:
# This script intentionally uses Docker Desktop CLI only (docker.exe).
# It never calls /usr/bin/docker in WSL to avoid context/volume confusion.
docker_desktop() {
  "$DOCKER_DESKTOP_EXE" "$@"
}

echo "Stopping Accounting dev processes..."

stop_match() {
  local pattern="$1"
  local label="$2"
  local pids
  pids="$(pgrep -f "$pattern" || true)"
  if [[ -z "$pids" ]]; then
    echo "- $label: not running"
    return 0
  fi
  echo "- $label: stopping PID(s): $pids"
  # shellcheck disable=SC2086
  kill $pids >/dev/null 2>&1 || true
}

# Backend started via:
#   mvn -q spring-boot:run ... in backend dir
stop_match "${BACKEND_DIR}.*spring-boot:run|spring-boot:run.*${BACKEND_DIR}" "backend"

# Frontend started via:
#   npm run dev -- --host 0.0.0.0 --port ...
# and Vite child process in frontend dir.
stop_match "${FRONTEND_DIR}.*npm run dev|npm run dev.*${FRONTEND_DIR}|vite.*${FRONTEND_DIR}" "frontend"

if [[ ! -x "$DOCKER_DESKTOP_EXE" ]]; then
  echo "- mysql: Docker Desktop CLI not found at:"
  echo "         $DOCKER_DESKTOP_EXE"
  echo "         Start Docker Desktop and try again."
  exit 1
fi
if ! docker_desktop version >/dev/null 2>&1; then
  echo "- mysql: Docker Desktop is not reachable from WSL."
  echo "         Start Docker Desktop and try again."
  exit 1
fi

if docker_desktop inspect "$MYSQL_CONTAINER_NAME" >/dev/null 2>&1; then
  RUNNING="$(docker_desktop inspect -f '{{.State.Running}}' "$MYSQL_CONTAINER_NAME" 2>/dev/null || echo "false")"
  if [[ "$RUNNING" == "true" ]]; then
    echo "- mysql: stopping container ${MYSQL_CONTAINER_NAME}"
    docker_desktop stop "$MYSQL_CONTAINER_NAME" >/dev/null
  else
    echo "- mysql: container exists but already stopped (${MYSQL_CONTAINER_NAME})"
  fi
else
  echo "- mysql: container not found (${MYSQL_CONTAINER_NAME})"
fi

echo "Done."

