# 用餐记录编辑与删除

## Goal

为 WaterMenu 补齐用餐记录纠错能力，让用户在历史记录或最近用餐中修改误填的餐次、时间、标题、备注，并删除误创建的记录，避免错误历史继续污染推荐近期排除、反馈权重和菜品统计。

## What I already know

* 用户已接受下一步锁定为“用餐记录编辑与删除”。
* 项目当前已具备登录、菜品管理、推荐 / 盲盒、记录已吃、反馈、历史筛选、做法、菜品图片、生产部署与备份。
* `backend/src/meal-records/meal-records.controller.ts` 已有 `PATCH /api/meal-records/:id`。
* `backend/src/meal-records/meal-records.service.ts` 已有 `update` 逻辑，并按当前用户 workspace 查找记录。
* `backend/src/meal-records/dto/update-meal-record.dto.ts` 支持更新 `dishId`、`title`、`mealType`、`eatenAt`、`note`。
* 当前后端没有 `DELETE /api/meal-records/:id`。
* 当前前端 `frontend/src/hooks/use-meal-records.ts` 只有创建记录和提交反馈，没有更新 / 删除 hook。
* 当前前端 `MealRecordCard` 支持反馈和反馈备注，但没有编辑 / 删除用餐记录入口。
* 当前历史记录面板已支持分页、餐次、菜品、反馈、时间范围和关键词筛选。
* 错误用餐记录会影响推荐的最近 3 天排除、反馈权重、菜品用餐次数和评分展示。

## Assumptions

* 第一版应优先服务真实使用中的“纠错”，不是做完整后台管理。
* 编辑入口应复用现有表单、校验和 TanStack Query 失效模式，避免引入新状态管理。
* 删除动作应明确影响反馈和统计，避免留下语义不清的孤儿数据。

## Open Questions

* 已确认：用餐记录删除采用永久删除，不做软删除、回收站或恢复。
* 已确认：第一版不允许修改用餐记录的关联菜品，只编辑标题、餐次、用餐时间和备注。
* 已确认：`PATCH /api/meal-records/:id` 如果收到 `dishId` 字段，应返回 400，明确拒绝关联菜品更新。

## Requirements

### 后端

* 新增 `DELETE /api/meal-records/:id`。
* 删除接口必须要求登录态。
* 删除接口必须按当前用户 workspace 查找记录；其他 workspace 的记录返回不存在或不可访问，不泄露数据存在性。
* 删除用餐记录后，对应反馈不能继续参与推荐权重、历史筛选或菜品评分统计。
* 删除采用永久删除；不新增 `deletedAt`。
* 继续保留并测试现有 `PATCH /api/meal-records/:id` 更新能力。
* 更新记录时，如果传入 `dishId` 字段，必须返回 400；第一版不支持修改或解除关联菜品。
* 更新记录后返回包含反馈列表的最新记录，保持现有响应形态。

### 前端

* 在最近用餐与历史记录卡片上提供编辑入口。
* 编辑第一版支持：标题、餐次、用餐时间、备注。
* 编辑第一版不提供关联菜品选择器。
* 编辑成功后关闭编辑态，并刷新历史记录、最近用餐、菜品统计和推荐旧结果相关缓存。
* 在最近用餐与历史记录卡片上提供删除入口。
* 删除必须有明确确认，避免误触。
* 删除成功后刷新历史记录、最近用餐、菜品统计和推荐旧结果相关缓存。
* 编辑 / 删除失败时展示轻量错误提示，不吞掉失败。
* 手机端优先，按钮不能挤压主要内容或造成卡片布局跳动。

### 数据与交互

* 删除记录后，该记录的反馈不应继续展示。
* 编辑记录标题不反向修改菜品名称。
* 编辑记录必须保留原 `dishId`，不允许修改或解除关联菜品；如果记错菜品，应删除后重新记录。
* 推荐 / 盲盒结果在记录被编辑或删除后应被重置或失效，避免继续展示基于旧历史的结果。

## Candidate Scope Options

### A. 编辑 + 永久删除 MVP（推荐）

* 前端支持编辑标题、餐次、时间、备注，不支持改关联菜品。
* 后端新增硬删除接口，利用当前数据模型的反馈级联删除或 service 明确删除。
* 后端收紧现有更新契约：`dishId` 出现在更新请求中时返回 400。
* 不做恢复站、不做删除审计、不做批量操作。
* 用户已确认选择此方案。

优点：最符合当前 MVP 简洁模型，实现小，数据语义清晰；误记录删除后立即不再影响推荐和统计。  
风险：误删不可恢复，需要确认提示降低误触。

### B. 编辑 + 软删除

* 数据库增加 `deletedAt`。
* 所有列表、推荐、统计、反馈查询都要排除软删除记录。
* 后续可做恢复。

优点：降低误删风险。  
风险：需要迁移和修改多处查询契约，容易漏过滤，超出当前纠错 MVP。

### C. 仅编辑，不删除

* 只接前端编辑能力，不新增删除 API。

优点：最小改动。  
风险：无法处理误点创建的记录，只能改成假数据，继续污染历史。

## Recommended Direction

选择 A：编辑 + 永久删除 MVP。当前项目没有审计和回收站模型，软删除会迫使推荐、历史、反馈、统计全部增加过滤条件，复杂度和漏改风险高于收益。永久删除配合确认提示，更适合当前小产品 MVP 阶段。

## Design Review

### 现有代码约束

* 用餐记录卡片组件是 `MealRecordCard`，同时被最近用餐和历史记录复用；编辑 / 删除入口应优先落在这个组件里，避免两处 UI 分叉。
* 菜品编辑已有 `EditDishForm` 的内联展开模式；用餐记录编辑沿用卡片内联表单，比新增全局弹窗更贴合现有代码。
* 当前没有通用 Modal / Dialog 组件；删除确认不应为本任务引入一套全局弹窗系统。
* `apiFetch` 默认对 JSON 响应调用 `response.json()`；删除接口如果返回 204 会导致前端解析失败，后端应返回 `{ ok: true }`。
* `useMealRecords` 当前 mutation 只会失效 `meal-records` 和 `dishes`；编辑 / 删除也必须同时失效这两类数据。
* 首页推荐结果是 mutation 本地结果，不会因 Query 失效自动清空；父组件已有 `onFeedbackSuccess={resetRecommendationState}` 模式，本任务应复用类似回调。
* 后端现有测试明确覆盖“更新用餐记录支持修改、解除和保持 dishId”，该测试与新需求冲突，必须改为 `dishId` 更新返回 400。

### 后端设计

* `UpdateMealRecordDto` 移除 `dishId` 的可更新语义，由全局 DTO 白名单在 API 边界拒绝 `dishId` 字段。
* 继续允许更新：
  * `title`
  * `mealType`
  * `eatenAt`
  * `note`
* `MealRecordsService.delete`：
  * 先按 `id + workspaceId` 查记录。
  * 找不到返回 `NotFoundException`。
  * 找到后永久删除 `MealRecord`。
  * 依赖 Prisma schema 中 `Feedback.mealRecord` 的 `onDelete: Cascade` 清理反馈。
  * 返回 `{ ok: true }`，便于前端 `apiFetch` 解析。
* `MealRecordsController` 新增 `@Delete(':id')`。

### 前端设计

* 新增 `UpdateMealRecordRequest` 类型，只包含 `title`、`mealType`、`eatenAt`、`note`，不包含 `dishId`。
* 新增 `DeleteResponse` 或局部使用 `{ ok: boolean }`。
* `use-meal-records.ts` 新增：
  * `useUpdateMealRecord`
  * `useDeleteMealRecord`
* 两个 mutation 成功后失效：
  * `meal-records`
  * `dishes`
* `MealRecordCard` 增加本地 UI 状态：
  * `isEditing`
  * `deleteConfirming`
* 编辑采用卡片内联表单：
  * 默认值来自当前 `record`。
  * 时间沿用 `datetime-local`，复用 `MealRecordForm` 中的本地时间转换思路。
  * 餐次使用现有 `mealLabel` 和 `Select`。
  * 标题使用 `Input`。
  * 备注使用 `Input`，空字符串提交为 `undefined` 或 `null` 需与后端更新语义保持一致。
* 删除采用卡片内二次确认，不用浏览器 `confirm`：
  * 第一击显示确认区。
  * 确认区提供“确认删除”和“取消”。
  * 删除 pending 时禁用相关按钮。
* `RecentMealRecords` 与 `HistoryRecordsPanel` 已复用 `MealRecordCard`，记录创建、编辑、删除和反馈变更后的父级通知统一命名为 `onRecordChange`。

### 测试设计

* 后端 e2e：
  * 更新标题、餐次、时间、备注成功。
  * 更新请求含 `dishId` 返回 400。
  * 删除当前 workspace 记录成功并返回 `{ ok: true }`。
  * 删除其他 workspace 记录返回 404。
  * 删除记录后，对应反馈被级联删除，历史列表不再返回该记录。
* 前端：
  * 本任务优先跑 typecheck / build。
  * 当前仓库没有前端单测体系，不为本任务新增测试框架。

### 风险审查

* 风险：`note` 清空语义不清。设计要求：用户清空备注后提交，应把记录备注清空，而不是保持旧值。
* 风险：`dishId` 只在 UI 不暴露但 API 仍可改。设计要求：后端返回 400，测试覆盖。
* 风险：删除记录后推荐 mutation 结果仍显示旧数据。设计要求：编辑 / 删除成功调用父级重置推荐状态。
* 风险：删除确认误触。设计要求：卡片内二次确认，不使用单击直接删除。
* 风险：后端删除返回 204 会破坏 `apiFetch`。设计要求：返回 `{ ok: true }`。

## Acceptance Criteria

* [x] 下一步功能方向已确认：用餐记录编辑与删除。
* [x] 用户确认删除语义：永久删除。
* [x] 用户确认第一版不允许修改关联菜品。
* [x] 用户确认 `PATCH /api/meal-records/:id` 收到 `dishId` 时返回 400。
* [x] 后端提供受保护的用餐记录删除接口。
* [x] 后端更新接口拒绝 `dishId` 字段。
* [x] 删除其他 workspace 的记录返回 404 或等价不可访问结果。
* [x] 删除记录后，该记录反馈不再参与推荐和统计。
* [x] 前端最近用餐和历史记录均能进入编辑态。
* [x] 用户能编辑标题、餐次、用餐时间和备注。
* [x] 用户能通过确认操作删除用餐记录。
* [x] 编辑 / 删除成功后相关列表、菜品统计和推荐状态刷新。
* [x] 编辑 / 删除失败有可见错误提示。
* [x] 不破坏现有记录创建、反馈、历史筛选、推荐和菜品统计。

## Definition of Done

* 后端测试覆盖更新和删除的权限、workspace 隔离、反馈影响。
* 前端通过 `pnpm --filter @watermenu/frontend typecheck` 和 build。
* 后端通过 `pnpm --filter @watermenu/backend typecheck`、lint、test 和 build。
* 如新增或调整 API 契约，更新 `.trellis/spec/backend/technical-contracts.md` 与 `.trellis/spec/frontend/technical-contracts.md` 中相关记录。

## Out of Scope

* 不做批量编辑或批量删除。
* 不做回收站、恢复记录、审计日志。
* 不做重新关联菜品的选择器。
* 不允许通过 API 修改或解除用餐记录的关联菜品。
* 不做反馈删除的单独管理入口。
* 不做统计报表或推荐算法改造。
* 不做开放注册、邀请码、权限角色。

## Technical Notes

* 当前任务目录：`.trellis/tasks/06-08-meal-record-edit-delete/`。
* 项目定义：`docs/project-definition.md`。
* 后端技术契约：`.trellis/spec/backend/technical-contracts.md`。
* 前端技术契约：`.trellis/spec/frontend/technical-contracts.md`。
* 后端相关代码：`backend/src/meal-records/`、`backend/src/feedback/`、`backend/src/recommendations/`、`backend/src/dishes/`。
* 前端相关代码：`frontend/src/hooks/use-meal-records.ts`、`frontend/src/components/recent-meal-records.tsx`、`frontend/src/components/history-records-panel.tsx`、`frontend/src/components/meal-record-form.tsx`。
* 现有后端测试：`backend/test/meal-records-feedback.e2e-spec.ts`。
