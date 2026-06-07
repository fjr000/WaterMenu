# WaterMenu 生产部署与备份说明

本文档说明单机 Docker Compose 生产部署流程。当前交付范围只包含仓库内部署资产与文档，不包含真实服务器登录、域名解析、证书签发、防火墙配置或真实数据迁移。

## 生产结构

- `docker-compose.prod.yml`：生产编排，包含 `postgres`、`backend`、`nginx`。
- `backend/Dockerfile`：构建 NestJS 后端，容器启动时先执行 `pnpm prisma:deploy`，再运行编译产物。
- `frontend/Dockerfile`：构建 Vite 静态产物，最终镜像基于 Nginx。
- `deploy/nginx/`：Nginx 主配置与站点配置。
- `deploy/env/prod.env.example`：生产环境变量模板。
- `deploy/certs/`：宿主机证书挂载目录，默认需要 `fullchain.pem` 与 `privkey.pem`。
- `deploy/uploads/`：预留 uploads 持久化目录，当前业务尚未实现图片上传。
- `scripts/backup-postgres.sh`：PostgreSQL 备份脚本。
- `scripts/restore-postgres.sh`：PostgreSQL 恢复脚本。

现有本地 `docker-compose.yml` 仍只服务本地 PostgreSQL 开发流程，生产部署使用独立的 `docker-compose.prod.yml`。

## 服务器前置条件

服务器需要：

1. 已安装 Docker 与 Docker Compose v2。
2. 80 / 443 端口可被公网访问。
3. 域名已解析到服务器。
4. 已取得 HTTPS 证书文件。
5. 服务器可以拉取本仓库代码。

服务器不需要安装 Node.js 或 pnpm；生产镜像会在 Docker build 阶段完成前后端构建。

## 首次部署

### 1. 准备代码

```bash
git clone <repo-url> WaterMenu
cd WaterMenu
```

### 2. 准备环境变量

```bash
cp deploy/env/prod.env.example deploy/env/prod.env
nano deploy/env/prod.env
```

必须替换：

- `POSTGRES_PASSWORD`：强随机数据库密码。
- `DATABASE_URL`：与 `POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB` 保持一致，主机名必须是 `postgres`。
- `SESSION_SECRET`：至少 32 个字符的强随机字符串。
- `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_NAME`：首次创建管理员时使用。

生产 `NODE_ENV=production` 时，后端 Session Cookie 会启用 `secure=true`，因此必须通过 HTTPS 访问。

### 3. 准备 HTTPS 证书

默认 Nginx 配置读取：

```text
deploy/certs/fullchain.pem
deploy/certs/privkey.pem
```

把服务器侧签发好的证书复制到上述路径。如果证书文件名不同，修改 `deploy/nginx/conf.d/watermenu.conf` 中的 `ssl_certificate` 与 `ssl_certificate_key`。

### 4. 构建镜像

```bash
docker compose -f docker-compose.prod.yml build
```

### 5. 启动服务

```bash
docker compose -f docker-compose.prod.yml up -d
```

后端容器启动时会自动执行：

```bash
pnpm prisma:deploy
pnpm start
```

如果迁移失败，后端不会继续启动，避免代码与数据库 schema 不一致。

### 6. 首次手动 seed 管理员

Seed 不会随容器启动自动执行。首次部署后手动执行一次：

```bash
docker compose -f docker-compose.prod.yml exec backend pnpm prisma:seed
```

如需修改初始用户信息，先编辑 `deploy/env/prod.env` 中的 `SEED_*` 变量，再执行 seed。

### 7. 验证主流程

1. 访问 `https://你的域名/`。
2. 使用 seed 创建的管理员登录。
3. 验证新增菜品、推荐 / 盲盒、记录已吃、反馈、查看做法等核心流程。
4. 访问 `https://你的域名/api/docs` 检查后端 OpenAPI 文档是否可用。

## Nginx 路由策略

- `http://` 入口统一 301 跳转到 `https://`。
- `/api` 反向代理到 `backend:3000`，保留 `/api` 前缀。
- `/` 服务前端静态文件。
- 其他前端路由使用 `try_files ... /index.html` 做 SPA fallback。
- Nginx 会传递 `X-Forwarded-Proto`，后端生产环境已启用 `trust proxy`，用于正确设置 secure Session Cookie。

## PostgreSQL 备份

手动执行一次备份：

```bash
./scripts/backup-postgres.sh
```

默认输出到：

```text
deploy/backups/postgres/watermenu-postgres-<UTC时间>.dump
```

默认清理 7 天以前的备份。可用环境变量覆盖：

```bash
BACKUP_DIR=/data/watermenu/backups RETENTION_DAYS=14 ./scripts/backup-postgres.sh
```

### cron 示例

每天凌晨 03:30 备份，并把日志写到宿主机：

```cron
30 3 * * * cd /path/to/WaterMenu && ./scripts/backup-postgres.sh >> /var/log/watermenu-backup.log 2>&1
```

正式长期使用前，建议把 `deploy/backups/`、`deploy/uploads/`、`deploy/env/prod.env` 与证书配置纳入异地备份。

## PostgreSQL 恢复

恢复会覆盖当前数据库对象。执行前先停止后端写入：

```bash
docker compose -f docker-compose.prod.yml stop backend
```

执行恢复：

```bash
./scripts/restore-postgres.sh deploy/backups/postgres/watermenu-postgres-20260607T120000Z.dump
```

脚本会要求输入 `RESTORE` 确认。恢复完成后重启后端：

```bash
docker compose -f docker-compose.prod.yml up -d backend
```

建议首次上线后在非生产环境验证一次备份可恢复性。

## uploads 持久化

生产 Compose 已把宿主机目录挂载到后端容器：

```text
./deploy/uploads -> /app/uploads
```

当前不实现图片上传 API 或 UI；该目录只是为后续图片功能和文件备份预留。

## 升级

```bash
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

后端重启时会自动执行 `prisma migrate deploy`。

升级前建议先执行：

```bash
./scripts/backup-postgres.sh
```

## 回滚

应用回滚：

```bash
git checkout <上一版commit>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

如果数据库迁移已经前进，应用回滚可能仍需要数据库恢复。使用 `restore-postgres.sh` 前必须确认会覆盖当前数据，并优先在非生产环境验证。

## 常见故障

### `docker compose config` 提示缺少环境文件

`docker-compose.prod.yml` 会读取 `deploy/env/prod.env.example`，并可选读取本地 `deploy/env/prod.env`。如果你的 Docker Compose 版本不支持可选 `env_file.required=false`，请升级 Docker Compose v2，或先复制：

```bash
cp deploy/env/prod.env.example deploy/env/prod.env
```

### Nginx 无法启动

检查证书文件是否存在且路径匹配：

```bash
ls -l deploy/certs/fullchain.pem deploy/certs/privkey.pem
```

### 登录后 Cookie 不生效

确认使用 `https://` 访问。生产环境 Cookie 使用 `secure=true`，HTTP 下浏览器不会保存或发送该 Cookie。

### 后端启动失败

查看日志：

```bash
docker compose -f docker-compose.prod.yml logs backend
```

常见原因：

- `SESSION_SECRET` 少于 32 个字符。
- `DATABASE_URL` 与 `POSTGRES_*` 不一致。
- Prisma migration 失败。
- PostgreSQL 尚未健康。

### 数据库不应向公网开放

生产 Compose 没有映射 PostgreSQL 端口；只有 Compose 内部服务可以访问 `postgres:5432`。
