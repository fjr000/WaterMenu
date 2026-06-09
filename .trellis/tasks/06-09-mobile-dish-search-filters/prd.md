# 移动端体验与菜品搜索/筛选

## Goal

提升 WaterMenu 在手机上的菜品管理体验，并让用户能更快找到菜品。当前菜品页在移动端可用，但列表信息密度较高，且前端没有搜索/筛选入口；后端已支持部分菜品筛选能力，应在明确 MVP 范围后做最小改动。

## What I already know

* 用户希望改进两个方向：移动端体验、菜品搜索/筛选。
* 当前没有活跃任务，仓库质量基线健康。
* 首页已有移动端底部 Tab：推荐、菜品、历史、成员。
* 菜品页目前用 `useDishes()` 拉取全量菜品并直接渲染列表。
* 后端 `GET /api/dishes` 已支持 `mealType` 与 `isActive` 查询参数。
* 前端 `useDishes(mealType?)` 目前只暴露 `mealType` 参数，未暴露 `isActive`。
* 后端当前没有菜品名称/描述关键词搜索参数。
* 菜品卡片在移动端包含图片横滑、状态、餐次、次数、评分、记录/编辑/图库/做法等操作，功能完整但信息密度高。

## Assumptions (temporary)

* 本任务应优先做一个可交付 MVP，而不是重新设计整个移动端视觉系统。
* 搜索/筛选应先作用于菜品管理页，不改变推荐页推荐算法。
* 移动端体验改进应保持桌面端现有行为不退化。

## Requirements

* 合并为一个小任务：菜品页顶部加搜索/筛选条，并顺手优化移动端列表密度。
* 扩展后端 `GET /api/dishes` 支持关键词查询，例如 `q=番茄`。
* 关键词只匹配菜名 `name` 和简介 `description`，不搜索做法内容。
* 菜品页筛选项包含：关键词、餐次、状态（全部/启用/停用）。
* 状态筛选 UI 使用“全部 / 启用 / 停用”；前端值为 `"" / "true" / "false"`，只有启用/停用时传 `isActive`。
* 搜索由后端执行，与现有 `mealType`、`isActive` 查询参数保持一致。
* 菜品列表增加稳定排序：`updatedAt desc`、`createdAt desc`、`id desc`，让新近更新的菜品靠前。
* 只有移动端菜品卡片采用折叠式交互；桌面端保持当前完整卡片行为。
* 移动端菜品卡片默认更紧凑，所有操作入口都放到展开后显示。
* 移动端折叠态默认展示核心摘要：菜名、启用状态、餐次标签、吃过次数/评分、封面缩略图。
* 移动端展开态显示完整图片、记录已吃、编辑、图库、做法等现有操作。
* 移动端折叠/展开通过明确的“展开/收起”按钮触发，不把整张卡片做成可点击区域。
* 展开按钮使用 `aria-expanded` / `aria-controls` 表达状态和控制关系。
* 打开记录、编辑、图库或做法操作时，对应移动端卡片保持展开。
* 移动端允许多张菜品卡同时展开，展开状态由单张卡片本地管理。
* 筛选、搜索或列表刷新后，移动端展开状态允许重置为默认折叠。
* 用户输入关键词时立即更新查询，不额外增加“应用筛选”步骤。
* 关键词在前后端都执行 trim；trim 后为空时忽略 `q`，等同未搜索。
* 新增/编辑菜品成功后不自动清空筛选；用户通过当前筛选状态和一键清空自行恢复全量列表。
* 用户可以清楚看到当前筛选状态，并能一键恢复全量列表。
* 空状态区分“还没有任何菜品”和“当前筛选无结果”。
* 复用现有 API/hooks/UI 风格，避免引入新依赖。
* 保持登录态、workspace 隔离和现有菜品管理行为不变。

## Acceptance Criteria

* [ ] `GET /api/dishes?q=<关键词>` 只返回当前 workspace 内名称或简介匹配的菜品。
* [ ] 空关键词或全空格关键词不会缩小结果集。
* [ ] `GET /api/dishes` 支持组合 `q`、`mealType`、`isActive` 查询参数。
* [ ] `GET /api/dishes` 返回稳定顺序：新近更新优先。
* [ ] 菜品管理页可以通过关键词、餐次、状态缩小列表。
* [ ] 状态筛选为“全部 / 启用 / 停用”，且只有启用/停用会向后端发送 `isActive`。
* [ ] 新增/编辑菜品成功后不会自动清空当前筛选。
* [ ] 筛选区能展示当前筛选状态，并提供一键清空。
* [ ] 移动端菜品卡片默认展示菜名、启用状态、餐次标签、吃过次数/评分、封面缩略图。
* [ ] 移动端菜品卡片折叠态不显示操作按钮。
* [ ] 移动端菜品卡片有明确的展开/收起按钮，并带 `aria-expanded` / `aria-controls`。
* [ ] 移动端菜品卡片展开后仍能完成记录已吃、编辑、图库、做法等现有操作。
* [ ] 打开记录、编辑、图库或做法操作时，对应移动端卡片保持展开。
* [ ] 移动端允许多张菜品卡同时展开，不强制手风琴单开。
* [ ] 搜索、筛选或列表刷新后，移动端卡片允许回到默认折叠。
* [ ] 无筛选且列表为空时提示新增第一道菜。
* [ ] 有筛选且列表为空时提示换条件或清空筛选。
* [ ] 桌面端菜品页仍可正常新增、编辑、停用、记录已吃、管理图片和做法。
* [ ] 后端类型检查、后端测试、前端类型检查、前端 build 通过。

## Definition of Done (team quality bar)

* Tests added/updated where backend contract changes.
* Lint / typecheck / relevant tests green.
* Docs/notes updated if behavior changes.
* Rollout/rollback considered if risky.

## Out of Scope (explicit)

* 不重做整套设计系统。
* 不改变推荐算法。
* 不做高级全文搜索、拼音搜索或模糊排序，除非后续明确纳入。
* 不搜索做法标题或做法内容。
* 不引入新的 UI 组件库或搜索库。
* 不处理生产部署事项。

## Technical Approach

* Backend: extend `ListDishesQueryDto` with optional trimmed `q`, add Prisma `OR` filtering on dish `name` / `description` within the current workspace, and add explicit `orderBy` for stable newest-updated-first ordering; match search semantics follow `MealRecordsService` keyword search.
* Frontend API: replace `useDishes(mealType?)` with a small query object supporting `q`, `mealType`, and `isActive`.
* Frontend UI: add a compact filter panel in the dishes tab; use existing button/input/card styling; keyword input changes immediately update the TanStack Query key, matching `HistoryRecordsPanel`.
* Mobile card: keep desktop card behavior unchanged; on small screens render a collapsed summary with an expand action before showing the heavier image/actions/recipe sections.

## Decision (ADR-lite)

**Context**: 菜品数量增长后，全量列表在移动端难以快速定位；后端已部分支持筛选。

**Decision**: 本任务合并完成菜品搜索/筛选与移动端折叠卡片；搜索放在后端，筛选包含关键词、餐次、状态；关键词输入即查询；移动端默认核心摘要，所有操作展开后显示；允许多张移动端卡片同时展开。

**Consequences**: API 合约会增加 `q` 查询参数，需要补后端 e2e 测试和前端类型；移动端交互变化较明显，但桌面端应保持现有行为。折叠态不保留“记录已吃”快捷入口，换取更干净的移动端列表。

## Implementation Plan

* PR1: 后端 `q` 查询参数、组合筛选逻辑、e2e 测试。
* PR2: 前端 `useDishes` 查询对象、筛选栏、清空筛选与空状态。
* PR3: 移动端折叠卡片与回归验证。

## Technical Notes

* Frontend page: `frontend/src/pages/home-page.tsx`.
* Frontend hook: `frontend/src/hooks/use-dishes.ts`.
* Frontend types: `frontend/src/api/types.ts`.
* Backend controller: `backend/src/dishes/dishes.controller.ts`.
* Backend query DTO: `backend/src/dishes/dto/list-dishes-query.dto.ts`.
* Backend service: `backend/src/dishes/dishes.service.ts`.
* Existing backend filters: `mealType`, `isActive`.
* Existing quality commands verified before planning: `pnpm backend:typecheck`, `pnpm frontend:typecheck`, `pnpm backend:test`, `pnpm backend:lint`, `pnpm frontend:build`, `docker compose -f docker-compose.prod.yml config`.
