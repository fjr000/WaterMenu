# WaterMenu Backend

最小后端认证闭环，使用 NestJS、Prisma、PostgreSQL、Session Cookie。

## 本地启动

本地 PostgreSQL 由根目录 `docker-compose.yml` 提供，只包含数据库服务；后端仍在本机通过 pnpm 启动。

```bash
pnpm install
cp backend/.env.example backend/.env
pnpm db:up
pnpm backend:prisma:generate
pnpm backend:prisma:migrate
pnpm backend:prisma:seed
pnpm backend:dev
```

默认 `DATABASE_URL` 为 `postgresql://postgres:postgres@localhost:5432/watermenu`，与 Docker Compose 中的数据库名、账号、密码和端口一致。默认 API 前缀为 `/api`，OpenAPI 文档为 `/api/docs`。

## 数据库命令

```bash
pnpm db:up      # 启动 PostgreSQL，并创建 watermenu 数据库
pnpm db:down    # 停止并移除 PostgreSQL 容器，保留数据卷
pnpm db:reset   # 停止容器、删除数据卷，并重新启动空数据库
```

`pnpm db:reset` 会删除本地 PostgreSQL 数据卷；重置后需要重新执行：

```bash
pnpm backend:prisma:migrate
pnpm backend:prisma:seed
```

## Session 表

业务表由 Prisma migration 创建。Session 是基础设施数据，不在 Prisma schema 中建业务模型；后端启动时由 `connect-pg-simple` 使用 `DATABASE_URL` 在 PostgreSQL 中自动创建 `session` 表，并通过 Docker Compose 数据卷持久化。

## 初始用户

seed 读取以下变量：

- `SEED_WORKSPACE_NAME`
- `SEED_USER_EMAIL`
- `SEED_USER_PASSWORD`
- `SEED_USER_NAME`

密码会用 argon2 哈希后写入 `users.passwordHash`。
