# 实现菜品基础模型与管理 API

## Goal

为 WaterMenu 落地第一个核心业务资源：菜品。基于已完成的登录、Session Cookie、Workspace 与 PostgreSQL 地基，新增菜品数据模型和受保护管理 API，为后续食谱、用餐记录、反馈、推荐和盲盒提供候选池。

## What I already know

* 项目 MVP 闭环包括登录、菜品管理、食谱 / 做法记录、用餐记录、反馈、规则推荐和盲盒。
* 当前后端已完成 NestJS + Prisma + PostgreSQL + Session Cookie 认证闭环。
* 当前 Prisma 仅有 `Workspace` 与 `User`，还没有 `Dish`、`Recipe`、`MealRecord`、`Feedback`、`Recommendation` 等业务模型。
* 当前 `backend/src/app.module.ts` 只注册 `PrismaModule` 与 `AuthModule`。
* 后端 API 统一使用 `/api` 前缀，OpenAPI 文档路径为 `/api/docs`。
* 所有后续业务数据必须按当前登录用户所属 workspace 隔离。
* 项目定义中的菜品适用餐次为：早餐、午餐、晚餐、加餐 / 夜宵。
* 新建菜品默认餐次为午餐、晚餐。
* “不限 / 全部”不是菜品属性，只是推荐入口筛选条件。

## Assumptions (temporary)

* 本任务只实现菜品基础后端，不实现前端页面。
* 本任务只实现菜品基础字段与 CRUD，不实现图片上传、食谱、用餐记录、反馈、推荐和盲盒。
* 菜品餐次需要支持多选。

## Open Questions

* 无。

## Requirements (evolving)

* 新增 `Dish` 业务模型，并归属 `Workspace`。
* 菜品基础字段包含 `name`、可选 `description`、`mealTypes`、`isActive`。
* `description` 只用于轻量说明，不承载 Recipe / 做法步骤。
* 菜品餐次使用 Prisma enum 数组建模。
* 菜品必须支持多个适用餐次。
* 新建菜品在请求未显式提供餐次时默认使用午餐、晚餐。
* 菜品包含 `isActive` 字段，默认 `true`，用于后续从推荐 / 盲盒候选池中移除暂不想推荐的菜品。
* 同一个 workspace 内菜品名称必须唯一，不同 workspace 可以存在同名菜品。
* 实现受保护 REST JSON API：
  * `GET /api/dishes`
  * `POST /api/dishes`
  * `GET /api/dishes/:id`
  * `PATCH /api/dishes/:id`
* `GET /api/dishes` 支持基础筛选：`mealType` 与 `isActive`。
* 本任务不实现搜索、排序和分页。
* 所有菜品 API 都必须要求登录。
* 所有菜品查询、读取、更新都必须限制在当前登录用户所属 workspace 内。
* 请求字段必须使用 DTO + class-validator 校验。
* API 不允许通过 ID 泄露其他 workspace 菜品是否存在。

## Acceptance Criteria (evolving)

* [ ] Prisma schema 中存在 `Dish` 模型，并与 `Workspace` 建立归属关系。
* [ ] 可以通过 Prisma migration 创建菜品相关数据库结构。
* [ ] 未登录访问菜品 API 返回 401。
* [ ] 登录后可以创建菜品，且菜品归属当前用户 workspace。
* [ ] 创建菜品支持 `name`、可选 `description`、`mealTypes`、`isActive` 字段。
* [ ] 创建菜品未传餐次时默认使用午餐、晚餐。
* [ ] 创建菜品默认 `isActive=true`，并可通过更新 API 修改。
* [ ] 同一 workspace 内创建重名菜品会被拒绝。
* [ ] 列表 API 只返回当前 workspace 的菜品。
* [ ] 列表 API 支持按 `mealType` 和 `isActive` 筛选。
* [ ] 详情 API 只能读取当前 workspace 的菜品。
* [ ] 更新 API 只能更新当前 workspace 的菜品。
* [ ] 访问其他 workspace 的菜品返回不泄露存在性的错误。
* [ ] 餐次非法时由后端校验拒绝。
* [ ] 后端 lint、typecheck、test 通过。

## Definition of Done

* Tests added/updated where appropriate.
* Lint / typecheck / tests green.
* Docs/notes updated if behavior changes.
* Rollout/rollback considered if risky.
* 如发现需要沉淀的新规范，更新 `.trellis/spec/` 或明确说明无需更新。

## Decision (ADR-lite)

**Context**: 菜品需要支持多个适用餐次。项目定义已确认餐次是固定枚举：“早餐、午餐、晚餐、加餐 / 夜宵”，“不限 / 全部”不是菜品属性，只是推荐入口筛选条件。

**Decision**: 餐次在数据库中使用 Prisma enum 数组建模，例如 `Dish.mealTypes: MealType[]`。

**Consequences**: MVP 实现简单，适合当前固定枚举场景；如果未来需要用户自定义餐次、餐次排序或餐次元数据，再通过迁移拆成关联表。

## Out of Scope (explicit)

* 不实现前端页面。
* 不实现列表搜索、排序和分页。
* 不实现图片上传、图片元数据或 uploads 静态访问。
* 不实现 Recipe / 食谱详情。
* 不实现 MealRecord / 用餐记录。
* 不实现 Feedback / 反馈。
* 不实现 Recommendation / 推荐规则。
* 不实现 BlindBox / 盲盒。
* 不实现开放注册、邀请码或精细权限系统。
* 不引入共享包或前端类型生成。

## Technical Notes

* 项目定义：`docs/project-definition.md`。
* 后端规范索引：`.trellis/spec/backend/index.md`。
* 后端技术契约：`.trellis/spec/backend/technical-contracts.md`。
* 当前认证 API：`backend/src/auth/auth.controller.ts`、`backend/src/auth/auth.service.ts`、`backend/src/auth/auth.guard.ts`。
* 当前 Prisma schema：`backend/prisma/schema.prisma`。
* 当前后端测试模式：`backend/test/auth.e2e-spec.ts`。
* 当前根命令：`pnpm backend:prisma:generate`、`pnpm backend:prisma:migrate`、`pnpm backend:typecheck`、`pnpm backend:lint`、`pnpm backend:test`。
