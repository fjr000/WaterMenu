# 实现食谱做法记录

## Goal

补齐 WaterMenu MVP 中尚未落地的「食谱 / 做法记录」能力，让用户在已有菜品、推荐和用餐记录闭环之外，能够记录并查看某个菜品的做法。目标是解决「推荐出来以后怎么做」的问题，同时保持第一版足够轻量。

## What I already know

* 用户已选择下一步优先做 A：实现「食谱 / 做法记录」。
* `docs/project-definition.md` 明确 MVP 包含：菜品管理、食谱 / 做法记录、用餐记录、反馈、规则推荐、盲盒。
* 当前代码已完成登录、菜品、用餐记录、反馈、推荐、盲盒主闭环。
* 当前 `backend/prisma/schema.prisma` 已有 `Workspace`、`User`、`Dish`、`MealRecord`、`Feedback`，但没有 `Recipe`。
* 当前后端没有 `recipes` module / controller / service。
* 当前前端没有 recipe 类型、hook、组件或页面。
* 当前 `HomePage` 有两个主 tab：「今天吃什么」和「菜品管理」。
* 当前推荐结果和菜品卡片都能触发「记录已吃」，但不能查看做法。
* 当前项目采用 NestJS + Prisma + PostgreSQL + React + TanStack Query + React Hook Form + Zod。

## Assumptions (temporary)

* 每个菜品允许 0 到多条做法。
* 食谱属于 workspace，并关联到 dish。
* 第一版支持查看、新增、编辑，不做删除。
* 做法入口放在菜品管理、推荐结果和盲盒结果中。

## Open Questions

* 无。

## Requirements (evolving)

* 第一版食谱采用纯文本形式：标题 + 做法正文。
* 后端新增 Recipe 数据模型，关联 workspace 与 dish。
* 后端提供按菜品读取做法列表的接口。
* 后端提供新增做法接口。
* 后端提供编辑做法接口。
* 所有食谱操作必须保持登录保护与 workspace 数据隔离。
* 前端在菜品管理、推荐结果和盲盒结果中提供菜品做法查看入口。
* 做法面板与记录已吃表单互斥，避免手机端同时展开两个大面板。
* 前端支持新增做法。
* 前端支持编辑已有做法。
* 前端服务端数据继续使用 TanStack Query 管理。

## Acceptance Criteria (evolving)

* [ ] 登录用户能在某个菜品下新增一条做法。
* [ ] 登录用户能查看某个菜品已有做法列表。
* [ ] 登录用户能编辑某条已有做法。
* [ ] 用户不能访问或修改其他 workspace 的菜品做法。
* [ ] 没有做法时，前端显示明确的空状态。
* [ ] 新增或编辑做法后，前端列表刷新。
* [ ] 空 title/content 或纯空白 title/content 会被前后端校验拒绝。
* [ ] 推荐 / 盲盒 / 用餐记录现有流程不被破坏。
* [ ] 后端 lint / typecheck / 测试通过。
* [ ] 前端 typecheck / build 通过。

## Definition of Done (team quality bar)

* Tests added/updated where appropriate，尤其是后端 workspace 隔离和基础 CRUD。
* Lint / typecheck / build 通过。
* OpenAPI / DTO / API 类型与前后端契约一致。
* 不引入未请求的复杂功能。
* 文档或 Trellis spec 如有新约定则更新。

## Out of Scope (explicit)

* 图片上传。
* AI 自动生成食谱。
* 营养分析。
* 购物清单。
* 公开菜谱分享。
* 食材库存。
* 复杂权限系统。
* Recipe 删除功能。
* 结构化 ingredients / steps，除非用户明确选择。

## Technical Notes

* 任务目录：`.trellis/tasks/06-07-recipe-records/`
* 项目定义：`docs/project-definition.md`
* 当前 Prisma 模型：`backend/prisma/schema.prisma`
* 现有后端模式参考：
  * `backend/src/dishes/`
  * `backend/src/meal-records/`
  * `backend/src/feedback/`
  * `backend/src/recommendations/`
* 现有前端模式参考：
  * `frontend/src/hooks/use-dishes.ts`
  * `frontend/src/hooks/use-meal-records.ts`
  * `frontend/src/components/create-dish-form.tsx`
  * `frontend/src/components/recent-meal-records.tsx`
  * `frontend/src/pages/home-page.tsx`

## Technical Approach (draft)

推荐第一版采用轻量文本做法：

* Prisma 新增 `Recipe`：`id`、`workspaceId`、`dishId`、`title`、`content`、时间戳。
* 后端新增 recipes 模块。
* 路由建议：
  * `GET /api/dishes/:dishId/recipes`
  * `POST /api/dishes/:dishId/recipes`
  * `PATCH /api/recipes/:id`
* 前端新增 Recipe 类型与 hook。
* 菜品管理卡片增加「做法」入口，展开后可查看、新增、编辑。
* 推荐结果和盲盒结果卡片增加「查看做法」入口，复用同一套做法查看 / 新增 / 编辑组件。

## Decision (ADR-lite, draft)

**Context**: MVP 文档要求食谱 / 做法记录，但当前代码只有菜品、记录、反馈和推荐，缺少「怎么做」的信息承载。

**Decision**: 第一版实现文本型做法记录：标题 + 做法正文，避免第一版过早引入结构化食材、步骤、图片和复杂编辑器。

**Consequences**: 第一版实现成本低、易维护、能补齐核心闭环；未来若需要结构化食谱，需要迁移或扩展 Recipe 数据模型。
