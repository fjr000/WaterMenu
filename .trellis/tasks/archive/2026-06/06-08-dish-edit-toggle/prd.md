# 完善菜品编辑与启停用管理

## Goal

补齐 WaterMenu 菜品管理的真实使用闭环：用户可以在前端修改已有菜品信息，并通过启用 / 停用控制推荐与盲盒候选池，避免错误菜品或暂时不想吃的菜污染推荐结果。

## What I already know

* 用户已确认下一步做“菜品编辑 + 启停用，不做硬删除”。
* 项目 MVP 包含登录、菜品管理、食谱 / 做法、用餐记录、反馈、规则推荐和盲盒。
* 后端已支持 `PATCH /dishes/:id`，可更新 `name`、`description`、`mealTypes`、`isActive`。
* 推荐服务已通过 `isActive: true` 过滤候选菜品。
* 前端 `frontend/src/hooks/use-dishes.ts` 目前只有 `useDishes` 与 `useCreateDish`，没有 update hook。
* 前端首页 `frontend/src/pages/home-page.tsx` 已有菜品列表、图库、做法、记录已吃入口，并能显示“已停用”标签，但没有编辑 / 启停用入口。
* 当前没有硬删除 API；保留历史记录、做法、图片关系更安全。

## Assumptions (temporary)

* 第一版继续在“菜品”tab 内完成编辑与启停用，不新增独立页面。
* 第一版不增加复杂筛选；停用菜品仍在列表中展示，并带“已停用”标签。
* 编辑表单应尽量复用创建菜品的字段和校验。

## Open Questions

* 已解决：启停用交互采用菜品卡片上的直接按钮，不放进编辑表单作为唯一入口。

## Requirements (evolving)

* 支持在前端编辑已有菜品的名称、描述、餐次。
* 菜品卡片直接提供“停用 / 启用”按钮，支持快速停用和重新启用菜品。
* 停用菜品不进入推荐 / 盲盒候选池，沿用后端现有 `isActive` 逻辑。
* 停用菜品仍保留历史记录、做法、图片，并继续在菜品列表中可见。
* 更新成功后刷新菜品列表，并清空当前推荐 / 盲盒结果，避免展示旧候选。
* 不实现硬删除。

## Acceptance Criteria (evolving)

* [x] 菜品卡片可进入编辑状态并提交名称、描述、餐次修改。
* [x] 菜品卡片可停用启用，UI 状态与后端 `isActive` 一致。
* [x] 停用菜品显示“已停用”标签，且不会出现在推荐 / 盲盒结果中。
* [x] 更新菜品后，菜品列表刷新，推荐 / 盲盒旧结果被重置。
* [x] 前端 typecheck / build 通过。

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint / typecheck / build green for touched layer.
* Docs/notes updated if behavior changes.
* Rollout/rollback considered if risky.

## Out of Scope (explicit)

* 不做菜品硬删除。
* 不做菜品列表搜索 / 筛选 / 分页。
* 不做批量启停用。
* 不修改推荐算法权重。
* 不新增用户注册或权限模型。

## Technical Approach

* 新增 `UpdateDishRequest` 与 `useUpdateDish()`，统一从 hook 调用 `PATCH /dishes/:id` 并刷新 `['dishes']`。
* 将创建菜品表单抽成可复用的 `DishForm`，保留 `CreateDishForm`，新增 `EditDishForm`，共用名称、简介、餐次校验。
* 菜品卡片直接提供“编辑”和“停用 / 启用”入口；停用 / 启用只提交 `isActive`，避免误覆盖其他字段。
* 编辑成功和启停用成功后清空推荐 / 盲盒 mutation 旧结果。
* 编辑时允许把简介清空，并提交 `description: ""`；创建时空简介仍不传。

## Decision (ADR-lite)

**Context**: 启停用是控制推荐候选池的高频管理动作，若只能进入编辑表单处理，会让日常操作路径过深。

**Decision**: 在菜品卡片上直接展示“停用 / 启用”按钮；编辑表单只负责名称、简介和餐次。

**Consequences**: 卡片按钮数量增加，因此按钮区使用移动端友好的两列网格；换来更快的候选池管理操作。不做硬删除，继续通过后端 `isActive` 契约保护历史记录、做法和图片关系。

## Technical Notes

* 主要前端文件：`frontend/src/pages/home-page.tsx`、`frontend/src/components/create-dish-form.tsx`、`frontend/src/hooks/use-dishes.ts`、`frontend/src/api/types.ts`。
* 主要后端参考：`backend/src/dishes/dishes.controller.ts`、`backend/src/dishes/dishes.service.ts`、`backend/src/recommendations/recommendations.service.ts`。
* 后端已提供更新能力，本任务主要补齐前端闭环。
* 验证已通过：`pnpm --filter @watermenu/frontend typecheck`、`pnpm --filter @watermenu/frontend build`。
