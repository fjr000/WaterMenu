#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f backend/.env ]]; then
  echo '缺少 backend/.env，请先复制 backend/.env.example' >&2
  exit 1
fi

set -a
source backend/.env
set +a

DEV_DIR="$ROOT_DIR/.tmp/dev"
mkdir -p "$DEV_DIR"

if ! docker compose ps --format json 2>/dev/null | grep -q '"Name":"watermenu-postgres"'; then
  pnpm db:up
fi

until docker compose exec -T postgres pg_isready -U postgres -d watermenu >/dev/null 2>&1; do
  sleep 1
done

pnpm backend:prisma:generate
pnpm --dir backend exec prisma migrate deploy
pnpm backend:prisma:seed

stop_tree() {
  local pid="$1"
  if [[ -z "$pid" ]]; then
    return
  fi

  local pgid
  pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ' || true)"
  if [[ -n "$pgid" ]]; then
    kill -TERM -- "-$pgid" 2>/dev/null || true
    sleep 1
    kill -KILL -- "-$pgid" 2>/dev/null || true
    return
  fi

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  stop_tree "${backend_pid:-}"
  stop_tree "${frontend_pid:-}"
  rm -f "$DEV_DIR/backend.pid" "$DEV_DIR/frontend.pid"
}
trap cleanup EXIT INT TERM

pnpm backend:dev &
backend_pid=$!
printf '%s\n' "$backend_pid" > "$DEV_DIR/backend.pid"
pnpm frontend:dev &
frontend_pid=$!
printf '%s\n' "$frontend_pid" > "$DEV_DIR/frontend.pid"

echo "后端 PID: $backend_pid"
echo "前端 PID: $frontend_pid"
echo '按 Ctrl+C 退出'

while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done

cleanup
wait "$backend_pid" 2>/dev/null || true
wait "$frontend_pid" 2>/dev/null || true
