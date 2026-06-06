# 接入 PostgreSQL

## Goal

为 WaterMenu 提供可重复启动的 PostgreSQL 数据库环境，并把现有后端认证、Prisma migration、seed、Session Cookie 存储流程接入到该数据库中，形成本地可运行的完整闭环。

## What I already know

* 用户要求：安装 PostgreSQL，并接入现有功能。
* 项目后端位于 `backend/`，使用 NestJS、Prisma、PostgreSQL、Session Cookie。
* `backend/package.json` 已包含 `@prisma/client`、`prisma`、`pg`、`connect-pg-simple`、`express-session` 等依赖。
* `backend/prisma/schema.prisma` 已配置 datasource provider 为 `postgresql`，并已有 `Workspace`、`User` 模型。
* `backend/prisma/migrations/20260606000000_init_auth/migration.sql` 已创建 `workspaces`、`users` 表。
* `backend/src/session/session.config.ts` 已用 `DATABASE_URL` 初始化 `pg.Pool`，并用 `connect-pg-simple` 自动创建 `session` 表。
* `backend/.env.example` 默认 `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/watermenu`。
* `backend/README.md` 已记录 `pnpm backend:prisma:generate`、`pnpm backend:prisma:migrate`、`pnpm backend:prisma:seed`、`pnpm backend:dev` 启动流程。
* `docs/project-definition.md` 已确认数据库使用 PostgreSQL + Prisma，部署倾向单服务器 + Docker Compose。

## Assumptions (temporary)

* 现有业务代码不需要替换 ORM，继续使用 Prisma。
* “接入现有功能”主要指让登录、用户 seed、workspace、session 持久化使用真实 PostgreSQL。
* 当前缺口更可能是数据库运行环境与一键启动文档/脚本，而不是 Prisma 模型本身。

## Decisions

* 本地 PostgreSQL 采用 Docker Compose 提供，不直接安装到当前系统服务中。
* 本次 Docker Compose 只提供 PostgreSQL 服务；后端继续通过 `pnpm backend:dev` 在本机运行。
* 根目录增加数据库快捷脚本，优先使用 `pnpm db:*` 命令管理本地数据库。

## Open Questions

* 无。

## Requirements (evolving)

* 通过 Docker Compose 提供可重复创建/启动的 PostgreSQL 数据库实例。
* Docker Compose 当前只包含 PostgreSQL 服务，不在本任务中容器化后端。
* 根目录提供数据库启动、停止、重置等快捷脚本。
* 保持现有 `DATABASE_URL`、Prisma migration、seed、Session Store 流程可用。
* 登录、`/api/auth/me`、logout 继续通过后端测试与本地手动流程验证。

## Acceptance Criteria (evolving)

* [x] `pnpm db:up` 能启动 PostgreSQL，并创建 `watermenu` 数据库。
* [x] `pnpm backend:prisma:migrate` 能成功应用迁移。
* [x] `pnpm backend:prisma:seed` 能成功写入初始 workspace/user。
* [x] `pnpm backend:dev` 启动后，认证接口能使用 PostgreSQL 中的数据完成登录。
* [x] Session 数据持久化到 PostgreSQL session 表。
* [x] 后端 lint、typecheck、test 通过。

## Definition of Done

* Tests added/updated where appropriate。
* Lint / typecheck / tests green。
* README / env 示例 / Docker Compose 启动说明与实际流程一致。
* Rollout/rollback considered if PostgreSQL 启动方式改变本地开发流程。

## Out of Scope (explicit)

* 不更换 Prisma。
* 不引入非 PostgreSQL 数据库。
* 不实现新业务功能。
* 不容器化后端。
* 不直接安装系统级 PostgreSQL 服务。
* 不提前实现生产级备份、Nginx、完整部署流水线，除非后续明确纳入本任务。

## Validation Notes

* 已通过：`docker compose config --quiet`。
* 已通过：`pnpm backend:prisma:generate`。
* 已通过：`pnpm backend:typecheck`。
* 已通过：`pnpm backend:lint`。
* 已通过：`pnpm backend:test`，认证 e2e 5 个测试通过。
* 已通过：`pnpm db:up`，PostgreSQL 容器 `watermenu-postgres` 已启动且 healthy。
* 已通过：复制 `backend/.env.example` 到本地忽略文件 `backend/.env` 后，`pnpm backend:prisma:migrate` 成功应用迁移。
* 已通过：`pnpm backend:prisma:seed` 成功写入初始 workspace/user。
* 已通过：真实后端登录闭环验证：`POST /api/auth/login` 成功、`GET /api/auth/me` 成功、`POST /api/auth/logout` 成功、logout 后 `/api/auth/me` 返回 401。
* 已通过：登录后 PostgreSQL `session` 表记录数为 1，logout 后记录数为 0。

## Technical Notes

* 已查看：`backend/package.json`、`backend/README.md`、`backend/.env.example`、`backend/prisma/schema.prisma`、`backend/prisma/migrations/20260606000000_init_auth/migration.sql`、`backend/src/session/session.config.ts`、`backend/src/auth/auth.service.ts`、`backend/test/auth.e2e-spec.ts`、`docs/project-definition.md`。
* 当前证据显示 PostgreSQL 接入代码已基本存在；实现重点是增加 Docker Compose 数据库环境、根目录快捷脚本、文档，并验证 Prisma / seed / auth / session 闭环。
