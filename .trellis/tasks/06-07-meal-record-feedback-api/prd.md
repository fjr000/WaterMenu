# 实现用餐记录与反馈后端基础 API

## Goal

为 WaterMenu 补齐推荐闭环所需的用餐历史与反馈数据来源。基于已完成的登录、workspace、菜品 API 和 PostgreSQL 地基，新增用餐记录与反馈的基础后端模型和受保护 API，为后续规则推荐与盲盒提供可计算的历史与偏好数据。

## What I already know

* 项目 MVP 闭环包括登录、菜品管理、食谱 / 做法记录、用餐记录、反馈、规则推荐和盲盒。
* 当前已完成 NestJS + Prisma + PostgreSQL + Session Cookie 认证闭环。
* 当前已完成 `Dish` / `MealType` 模型与受保护菜品 API。
* 当前 Prisma schema 中已有 `Workspace`、`User`、`Dish`，尚未实现 `Recipe`、`MealRecord`、`Feedback`、`Recommendation`。
* 用餐记录应归属 workspace，并可以关联菜品，也可以只写文本。
* 项目定义中 `MealRecord` 字段方向为：`dishId` 可选、`title` 必填、`mealType` 必填、`eatenAt` 必填、`note` 可选。
* 反馈使用三档：好吃、一般、不好吃，并支持可选备注。
* 反馈应关联用餐记录，而不是只挂在菜品上。
* 如果用餐记录关联菜品，反馈可以回流到菜品推荐权重；如果不关联菜品，只作为历史记录，暂不参与推荐权重。
* API 风格采用 REST JSON API + OpenAPI。
* 现有受保护业务 API 模式位于 `backend/src/dishes/`，通过 Session `userId` 获取 workspace，并用 workspace 限制查询。

## Assumptions (temporary)

* 本任务只实现后端模型、API 与测试，不实现前端页面。
* 本任务只实现记录与反馈数据写入 / 查询基础能力，不实现推荐排序、盲盒抽取、统计报表或食谱。
* 本任务复用现有 `MealType` enum，不新增“全部 / 不限”作为数据库值。
* 用餐记录列表暂不做分页、搜索或复杂排序，除非实现时发现现有测试或规范要求必须补充。

## Open Questions

* 无。

## Requirements (evolving)

* 新增 `MealRecord` 业务模型，并归属 `Workspace`。
* `MealRecord` 支持可选关联 `Dish`。
* `MealRecord` 基础字段包含 `title`、`mealType`、`eatenAt`、可选 `note`。
* 创建用餐记录时，如果提供 `dishId`，必须校验菜品属于当前用户 workspace。
* 创建用餐记录时 `title` 始终由请求显式提供；即使提供了 `dishId`，后端也不自动用菜品名称填充标题。
* 更新用餐记录时允许修改 `dishId`；传新 `dishId` 必须校验菜品属于当前 workspace。
* 更新用餐记录时允许传 `dishId: null` 解除菜品关联；不传 `dishId` 则保持原关联不变。
* 用餐记录 API 必须要求登录。
* 用餐记录读取与写入必须限制在当前登录用户所属 workspace 内。
* 用餐记录列表与详情必须包含当前 workspace 内该记录的所有反馈基础信息。
* 反馈基础信息包含 `id`、`userId`、`rating`、可选 `note`、`createdAt`、`updatedAt`。
* 新增 `Feedback` 业务模型，并归属 `Workspace`、`MealRecord` 与提交反馈的 `User`。
* 同一个用户对同一条用餐记录最多只能有 1 条反馈。
* 已有反馈必须允许当前提交用户修改。
* `Feedback` 使用固定三档枚举：好吃、一般、不好吃。
* `Feedback` 支持可选备注。
* 反馈 API 必须要求登录。
* 提交或修改反馈时必须校验用餐记录 / 反馈属于当前用户 workspace。
* API 不允许通过 ID 泄露其他 workspace 的用餐记录、菜品或反馈是否存在。
* 请求字段必须使用 DTO + class-validator 校验。

## Candidate API Scope

* `GET /api/meal-records`
* `POST /api/meal-records`
* `GET /api/meal-records/:id`
* `PATCH /api/meal-records/:id`
* `POST /api/feedback`：按当前用户与 `mealRecordId` upsert 反馈；已有则更新，没有则创建。

## Acceptance Criteria (evolving)

* [ ] Prisma schema 中存在 `MealRecord` 模型，并与 `Workspace` 建立归属关系。
* [ ] Prisma schema 中存在 `Feedback` 模型，并与 `Workspace`、`MealRecord` 建立归属关系。
* [ ] 可以通过 Prisma migration 创建用餐记录与反馈相关数据库结构。
* [ ] 未登录访问用餐记录与反馈 API 返回 401。
* [ ] 登录后可以创建只写文本、不关联菜品的用餐记录。
* [ ] 登录后可以创建关联当前 workspace 菜品的用餐记录。
* [ ] 不能用其他 workspace 的 `dishId` 创建用餐记录。
* [ ] 用餐记录列表只返回当前 workspace 的记录，并包含每条记录当前 workspace 内的反馈基础信息。
* [ ] 用餐记录详情只能读取当前 workspace 的记录，并包含当前 workspace 内的反馈基础信息。
* [ ] 更新用餐记录只能影响当前 workspace 的记录。
* [ ] 更新用餐记录支持修改 `dishId`、传 `dishId: null` 解除关联，以及不传 `dishId` 保持原关联。
* [ ] 登录后可以为当前 workspace 的用餐记录提交三档反馈与可选备注。
* [ ] 同一用户对同一用餐记录重复提交反馈时，通过 `POST /api/feedback` 更新原反馈，不会产生多条重复反馈。
* [ ] 当前用户可以通过 `POST /api/feedback` 修改自己对用餐记录的反馈。
* [ ] 不能为其他 workspace 的用餐记录提交反馈。
* [ ] 非法 `mealType` 与非法反馈值由后端校验拒绝。
* [ ] 后端 lint、typecheck、test 通过。

## Definition of Done

* Tests added/updated where appropriate.
* Lint / typecheck / tests green.
* Docs/notes updated if behavior changes.
* Rollout/rollback considered if risky.
* 如发现需要沉淀的新规范，更新 `.trellis/spec/` 或明确说明无需更新。

## Out of Scope (explicit)

* 不实现前端页面。
* 不实现 Recipe / 食谱。
* 不实现 Recommendation / 推荐规则。
* 不实现 BlindBox / 盲盒。
* 不实现图片上传或 uploads 静态访问。
* 不实现统计报表。
* 不实现列表搜索、分页、复杂排序。
* 不实现 AI 或算法服务。
* 不引入共享包或前端类型生成。

## Technical Notes

* 项目定义：`docs/project-definition.md`。
* 当前 Prisma schema：`backend/prisma/schema.prisma`。
* 当前菜品 API：`backend/src/dishes/dishes.controller.ts`、`backend/src/dishes/dishes.service.ts`。
* 当前认证 API：`backend/src/auth/auth.controller.ts`、`backend/src/auth/auth.service.ts`、`backend/src/auth/auth.guard.ts`。
* 当前后端测试模式：`backend/test/auth.e2e-spec.ts`、`backend/test/dishes.e2e-spec.ts`。
* 当前根命令：`pnpm backend:prisma:generate`、`pnpm backend:prisma:migrate`、`pnpm backend:typecheck`、`pnpm backend:lint`、`pnpm backend:test`。
