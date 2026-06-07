#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-deploy/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${BACKUP_DIR}/watermenu-postgres-${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

if ! docker compose -f "$COMPOSE_FILE" ps "$POSTGRES_SERVICE" >/dev/null 2>&1; then
  echo "未找到 PostgreSQL 服务：${POSTGRES_SERVICE}。请确认 ${COMPOSE_FILE} 已启动。" >&2
  exit 1
fi

echo "开始备份 PostgreSQL 到 ${BACKUP_FILE}"
docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "$BACKUP_FILE"

find "$BACKUP_DIR" -type f -name 'watermenu-postgres-*.dump' -mtime +"$RETENTION_DAYS" -delete

echo "备份完成：${BACKUP_FILE}"
echo "已清理 ${RETENTION_DAYS} 天以前的 PostgreSQL 备份。"
