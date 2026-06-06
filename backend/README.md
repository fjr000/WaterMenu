# WaterMenu Backend

最小后端认证闭环，使用 NestJS、Prisma、PostgreSQL、Session Cookie。

## 本地启动

```bash
pnpm install
cp backend/.env.example backend/.env
pnpm backend:prisma:generate
pnpm backend:prisma:migrate
pnpm backend:prisma:seed
pnpm backend:dev
```

默认 API 前缀为 `/api`，OpenAPI 文档为 `/api/docs`。

## Session 表

业务表由 Prisma migration 创建。Session 是基础设施数据，不在 Prisma schema 中建业务模型；后端启动时由 `connect-pg-simple` 使用 `DATABASE_URL` 在 PostgreSQL 中自动创建 `session` 表。

## 初始用户

seed 读取以下变量：

- `SEED_WORKSPACE_NAME`
- `SEED_USER_EMAIL`
- `SEED_USER_PASSWORD`
- `SEED_USER_NAME`

密码会用 argon2 哈希后写入 `users.passwordHash`。
