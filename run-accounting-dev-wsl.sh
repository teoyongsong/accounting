#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
MYSQL_HOST_PORT="${MYSQL_HOST_PORT:-3307}"

BACKEND_LOG="$ROOT/backend-dev.log"
FRONTEND_LOG="$ROOT/frontend-dev.log"

DOCKER_DESKTOP_EXE="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
MYSQL_CONTAINER_NAME="${MYSQL_CONTAINER_NAME:-sg-accounting-mysql}"
MYSQL_VOLUME_NAME="${MYSQL_VOLUME_NAME:-accounting_mysql_data}"

# IMPORTANT:
# This script intentionally uses Docker Desktop CLI only (docker.exe).
# It never calls /usr/bin/docker in WSL to avoid context/volume confusion.
docker_desktop() {
  "$DOCKER_DESKTOP_EXE" "$@"
}

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Backend folder not found: $BACKEND_DIR"
  exit 1
fi
if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend folder not found: $FRONTEND_DIR"
  exit 1
fi
if [[ ! -x "$DOCKER_DESKTOP_EXE" ]]; then
  echo "Docker Desktop CLI not found at:"
  echo "  $DOCKER_DESKTOP_EXE"
  echo "Start Docker Desktop on Windows and try again."
  exit 1
fi
if ! docker_desktop version >/dev/null 2>&1; then
  echo "Docker Desktop is not reachable from WSL."
  echo "Start Docker Desktop on Windows and try again."
  exit 1
fi

echo "Ensuring MySQL (Docker Desktop) is running from old volume..."
if docker_desktop inspect "$MYSQL_CONTAINER_NAME" >/dev/null 2>&1; then
  RUNNING="$(docker_desktop inspect -f '{{.State.Running}}' "$MYSQL_CONTAINER_NAME")"
  if [[ "$RUNNING" != "true" ]]; then
    docker_desktop start "$MYSQL_CONTAINER_NAME" >/dev/null
  fi
else
  docker_desktop run -d \
    --name "$MYSQL_CONTAINER_NAME" \
    -e MYSQL_ROOT_PASSWORD=root \
    -e MYSQL_DATABASE=sg_accounting \
    -e MYSQL_USER=sg_accounting \
    -e MYSQL_PASSWORD=sg_accounting \
    -p "${MYSQL_HOST_PORT}:3306" \
    -v "${MYSQL_VOLUME_NAME}:/var/lib/mysql" \
    mysql:8.0 \
    --default-authentication-plugin=mysql_native_password >/dev/null
fi

echo "Checking connectivity to MySQL from WSL..."
if ! timeout 2 bash -c "</dev/tcp/127.0.0.1/${MYSQL_HOST_PORT}" >/dev/null 2>&1; then
  echo "Cannot reach MySQL at 127.0.0.1:${MYSQL_HOST_PORT} from WSL."
  echo "This usually means Docker Desktop WSL integration is disabled."
  echo
  echo "Fix:"
  echo "1) Docker Desktop -> Settings -> Resources -> WSL Integration"
  echo "2) Enable your WSL distro (the one you are running in)"
  echo "3) Restart Docker Desktop"
  echo "4) Re-run: ./run-accounting-dev-wsl.sh"
  exit 1
fi

echo "Project root: $ROOT"
echo "Backend : http://localhost:${BACKEND_PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "MySQL   : localhost:${MYSQL_HOST_PORT} (Docker Desktop, volume: ${MYSQL_VOLUME_NAME})"
echo

echo "Starting backend (Spring Boot)..."
(
  cd "$BACKEND_DIR"
  mvn -q spring-boot:run \
    -Dspring-boot.run.arguments="--server.address=0.0.0.0 --server.port=${BACKEND_PORT}"
) >"$BACKEND_LOG" 2>&1 &
BACK_PID=$!

echo "Starting frontend (Vite)..."
(
  cd "$FRONTEND_DIR"
  npm run dev -- --host 0.0.0.0 --port "${FRONTEND_PORT}"
) >"$FRONTEND_LOG" 2>&1 &
FR_PID=$!

echo
echo "Servers started."
echo "Backend log  : $BACKEND_LOG"
echo "Frontend log : $FRONTEND_LOG"
echo

cleanup() {
  # Best-effort cleanup
  kill "$BACK_PID" "$FR_PID" >/dev/null 2>&1 || true
}
trap cleanup INT TERM EXIT

wait -n

