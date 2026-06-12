#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEV_DIR="$ROOT_DIR/.tmp/dev"
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

stop_listen_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill $pids 2>/dev/null || true
    sleep 1
    kill -9 $pids 2>/dev/null || true
  fi
}

wait_for_port_clear() {
  local port="$1"
  local retries=20
  while [[ "$retries" -gt 0 ]]; do
    if [[ -z "$(lsof -ti tcp:"$port" 2>/dev/null || true)" ]]; then
      return 0
    fi
    sleep 1
    retries=$((retries - 1))
  done
  return 1
}

if [[ -f "$DEV_DIR/backend.pid" ]]; then
  stop_tree "$(cat "$DEV_DIR/backend.pid")"
fi

if [[ -f "$DEV_DIR/frontend.pid" ]]; then
  stop_tree "$(cat "$DEV_DIR/frontend.pid")"
fi

pkill -f 'pnpm --filter @watermenu/backend start:dev' 2>/dev/null || true
pkill -f 'pnpm --filter @watermenu/frontend dev' 2>/dev/null || true
pkill -f 'nest start --watch' 2>/dev/null || true
pkill -f 'vite/bin/vite\.js' 2>/dev/null || true
pkill -f 'backend/dist/src/main' 2>/dev/null || true
pkill -f 'pnpm --dir backend start:dev' 2>/dev/null || true
pkill -f 'pnpm --dir frontend dev' 2>/dev/null || true
stop_listen_port 3000
stop_listen_port 5173
stop_listen_port 5174
kill -9 $(lsof -ti tcp:3000 2>/dev/null || true) $(lsof -ti tcp:5173 2>/dev/null || true) $(lsof -ti tcp:5174 2>/dev/null || true) 2>/dev/null || true
wait_for_port_clear 3000 || true
wait_for_port_clear 5173 || true
wait_for_port_clear 5174 || true

rm -f "$DEV_DIR/backend.pid" "$DEV_DIR/frontend.pid"

docker compose down

echo '已停止后端、前端和 PostgreSQL。'
