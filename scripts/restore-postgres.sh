#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "用法：$0 <backup-file>" >&2
  echo "示例：$0 deploy/backups/postgres/watermenu-postgres-20260607T120000Z.dump" >&2
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "备份文件不存在：${BACKUP_FILE}" >&2
  exit 1
fi

cat <<EOF
危险操作：即将从以下备份恢复 PostgreSQL：
  ${BACKUP_FILE}

这会覆盖当前生产数据库中的同名对象。执行前请确认：
1. 已完成当前数据库备份。
2. 已停止后端写入：docker compose -f ${COMPOSE_FILE} stop backend
3. 该备份文件来自可信来源。

请输入 RESTORE 继续：
EOF

read -r CONFIRM
if [[ "$CONFIRM" != "RESTORE" ]]; then
  echo "已取消恢复。"
  exit 1
fi

echo "开始恢复 PostgreSQL。"
docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl' \
  < "$BACKUP_FILE"

echo "恢复完成。请重启后端：docker compose -f ${COMPOSE_FILE} up -d backend"
