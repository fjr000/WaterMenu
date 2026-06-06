# 实现后端基础登录闭环

## Goal

为 WaterMenu 建立后端身份认证地基，让后续菜品、用餐记录、反馈、推荐等 workspace 级数据都有稳定的用户身份、登录态和数据归属基础。

## What I already know

- 项目当前实现目录基本为空：`backend/` 和 `frontend/` 仅有 `.gitkeep`。
- 项目已确认后端技术栈为 NestJS + TypeScript、Prisma + PostgreSQL、REST JSON API、OpenAPI、Session Cookie 登录。
- MVP 不开放注册，由管理员创建初始用户。
- 未登录用户只能看到登录页；后端需要保护需要登录的 API。
- 用户属于 workspace，后续所有核心业务数据都需要 workspace 数据隔离。
- 密码必须哈希存储。
- 本任务只做后端基础登录闭环，不实现前端页面。

## Requirements

- 初始化最小 pnpm workspace 配置，并初始化 `backend/` 后端项目基础结构，使用 NestJS + TypeScript。
- 接入 Prisma，并定义最小数据模型：`Workspace`、`User`。
- `User` 必须属于一个 `Workspace`。
- 用户密码必须哈希存储，不允许明文存储。
- 提供管理员/初始用户种子能力，便于本地启动后登录。
- 使用 Session Cookie 保存登录态，Session 存储使用 PostgreSQL 持久化。
- 使用 email + password 登录，`User.email` 全局唯一。
- 实现 REST JSON API：
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- 提供至少一个受保护 API 行为：未登录访问 `/api/auth/me` 应返回未授权。
- 登录成功后，`/api/auth/me` 返回当前用户基础信息和所属 workspace 基础信息。
- 后端校验必须作为最终防线，不依赖前端校验。

## Acceptance Criteria

- [ ] 可以安装并启动后端开发服务。
- [ ] 可以通过 Prisma 创建数据库结构。
- [ ] 可以通过 seed 创建初始 workspace 和初始用户。
- [ ] 使用正确账号密码调用 `POST /api/auth/login` 后，响应设置 Session Cookie。
- [ ] 未登录调用 `GET /api/auth/me` 返回 401。
- [ ] 登录后携带 Cookie 调用 `GET /api/auth/me` 返回当前 user 和 workspace。
- [ ] 调用 `POST /api/auth/logout` 后，原 Cookie 不再能访问 `/api/auth/me`。
- [ ] 密码字段不通过 API 返回。
- [ ] 后端关键测试覆盖登录态访问控制与密码校验。
- [ ] lint/type-check/test 通过，或在当前脚手架限制下记录无法运行的原因。

## Definition of Done

- 后端基础项目和认证闭环代码已落地。
- Prisma schema 与 seed 脚本可用于本地初始化。
- 测试覆盖本任务核心安全边界。
- 仅修改本任务相关文件，不实现菜品、食谱、用餐记录、反馈、推荐、前端页面。
- 如发现需要沉淀的新规范，更新 `.trellis/spec/` 或明确说明无需更新。

## Out of Scope

- 不实现开放注册、邀请码、找回密码。
- 不实现精细权限系统或多角色权限。
- 不实现前端登录页。
- 不实现菜品、食谱、图片上传、用餐记录、反馈、推荐、盲盒。
- 不实现生产部署脚本或 Docker Compose。
- 不引入 JWT 登录方案。

## Technical Approach

- 以后端为唯一实现重点，先建立最小 pnpm workspace 与 NestJS 应用骨架。
- 使用 Session Cookie 而非 JWT，符合项目定性文档。
- Session 存储使用 PostgreSQL 持久化，避免开发服务或部署重启后登录态全部丢失。
- 使用 Prisma 管理 `Workspace` 与 `User` 最小业务模型。
- Session 表作为基础设施表处理，不在 Prisma schema 中建业务 `Session` 模型；通过迁移 SQL/初始化 SQL 或 session store 支持的方式保证本地可初始化。
- 优先使用 `argon2` 保存密码哈希；如环境安装原生依赖失败，记录原因并改用同等适合密码存储的哈希库。
- 通过 NestJS Guard 保护 `/api/auth/me` 等需要登录态的接口。
- 使用 DTO + class-validator 校验登录请求。

## Decision (ADR-lite)

**Context**: 后续所有业务数据都依赖登录用户和 workspace 归属。如果先做菜品或推荐，会缺少身份和数据隔离基础，后续返工概率高。

**Decision**: 第一阶段只实现后端基础登录闭环，包括 Workspace/User、Session Cookie、登录/登出/当前用户 API、seed 与关键测试。

**Consequences**: 后续菜品、用餐记录、反馈、推荐都可以复用统一登录态和 workspace 归属；本阶段不会产生可用前端界面，需要通过 API 或测试验证。

## Open Questions

- 无。

## Research References

- [`research/postgres-session-store.md`](research/postgres-session-store.md) — 推荐使用 `express-session + connect-pg-simple + PostgreSQL` 持久化 Session；Prisma 管业务表，session store 管 session 表。

## Technical Notes

- 项目定性参考：`docs/project-definition.md`。
- 后端规范索引：`.trellis/spec/backend/index.md`。
- 后端技术契约：`.trellis/spec/backend/technical-contracts.md`。
- 当前后端目录为空，尚无既有源码模式可复用。
