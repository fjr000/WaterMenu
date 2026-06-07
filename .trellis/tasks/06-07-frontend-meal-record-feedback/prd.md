# 前端补齐用餐记录与反馈闭环

## Goal

补齐前端用餐记录与反馈入口，让用户在已有登录、菜品、推荐/盲盒能力之上，可以把实际吃过的菜记录下来，并对用餐记录给出“好吃 / 一般 / 不好吃”反馈。目标是优先完成 MVP 的真实使用闭环，暂不实现 Recipe / 做法记录。

## What I already know

* 用户已确认：先做“前端用餐记录 + 反馈闭环”，暂不做 Recipe。
* 项目 MVP 包含登录、菜品管理、食谱/做法、用餐记录、反馈、规则推荐、盲盒。
* 当前后端已实现用餐记录与反馈 API：`backend/src/meal-records/`、`backend/src/feedback/`。
* 当前前端已实现登录、菜品列表/创建、推荐/盲盒面板，但没有用餐记录和反馈入口。
* 当前前端 API 基础设施位于 `frontend/src/api/client.ts`、类型位于 `frontend/src/api/types.ts`。
* 当前前端数据 hooks 模式位于 `frontend/src/hooks/use-dishes.ts`、`frontend/src/hooks/use-recommendations.ts`。
* 当前首页主要入口位于 `frontend/src/pages/home-page.tsx`，已有 recommend/dishes tab 和 mealType 状态。
* 质量门禁当前为绿：backend lint/typecheck/test、frontend typecheck/build 均通过。

## Assumptions (temporary)

* 本任务只补前端，不改后端 API，除非实现时发现类型或契约缺口。
* 第一版以最小可用为目标，不做复杂日历、统计、删除、批量编辑、离线同步。
* 用餐记录默认以当前时间作为 eatenAt。
* 反馈是针对用餐记录，而不是直接针对菜品。

## Open Questions

* 暂无。

## Requirements (evolving)

* 最近用餐记录区域默认展示最近 5 条记录。
* 最近用餐记录中默认展示“好吃 / 一般 / 不好吃”反馈按钮。
* 点击反馈按钮立即提交或更新反馈，并高亮当前反馈。
* 反馈备注为可选入口，按需展开后提交带备注的反馈。
* 点击“记录已吃”后打开轻量确认表单，而不是直接创建记录。
* 记录表单至少包含餐次、默认当前时间、可选备注和确认按钮。
* 从推荐/盲盒结果进入时预填对应菜品；从菜品列表进入时复用同一记录表单。
* “记录已吃”入口同时放在推荐/盲盒结果卡片和菜品列表卡片，其中推荐/盲盒结果是主路径。
* 最近用餐记录区域负责展示和反馈，不作为创建主入口。
* 补齐前端用餐记录和反馈相关 API 类型。
* 新增用餐记录相关 hooks，复用现有 TanStack Query 模式。
* 新增反馈提交 hook，复用现有 mutation + cache invalidation 模式。
* 首页展示最近用餐记录。
* 用户可以从前端创建一条用餐记录。
* 用户可以对一条用餐记录提交或更新反馈：好吃 / 一般 / 不好吃，可选备注。
* 成功创建记录或反馈后，相关列表和推荐状态不应明显陈旧。

## Acceptance Criteria (evolving)

* [ ] 登录后首页可以看到最近用餐记录区域。
* [ ] 最近用餐记录区域默认展示最近 5 条记录。
* [ ] 用户可以把某个菜记录为已吃。
* [ ] 点击记录入口后先出现轻量确认表单，不因误点直接创建记录。
* [ ] 创建记录时可设置餐次，默认时间为当前时间。
* [ ] 用户可以对用餐记录选择好吃 / 一般 / 不好吃反馈。
* [ ] 刷新页面后仍能看到已创建的最近用餐记录。
* [ ] `pnpm frontend:typecheck` 通过。
* [ ] `pnpm frontend:build` 通过。

## Definition of Done (team quality bar)

* Tests added/updated where appropriate; 本任务至少保证前端 typecheck/build 通过。
* Lint / typecheck / build 绿。
* 仅修改本任务相关文件。
* Docs/notes updated if behavior changes or new convention is discovered。
* Rollout/rollback considered if risky。

## Out of Scope (explicit)

* Recipe / 做法记录模型、API 或前端入口。
* 复杂日历视图。
* 历史统计、趋势分析。
* 删除用餐记录。
* 完整编辑历史记录流程，除非为了最小闭环必须。
* 离线记录或离线同步。
* 多人反馈聚合展示优化。
* 后端推荐算法调整。

## Technical Notes

* 任务目录：`.trellis/tasks/06-07-frontend-meal-record-feedback/`。
* 后端 API 参考：`backend/src/meal-records/meal-records.controller.ts`、`backend/src/feedback/feedback.controller.ts`。
* DTO 参考：`backend/src/meal-records/dto/create-meal-record.dto.ts`、`backend/src/feedback/dto/upsert-feedback.dto.ts`。
* 前端类型：`frontend/src/api/types.ts`。
* 前端 hooks 模式：`frontend/src/hooks/use-dishes.ts`、`frontend/src/hooks/use-recommendations.ts`。
* 首页入口：`frontend/src/pages/home-page.tsx`。
* 前端规范后续实现前需读取 `.trellis/spec/frontend/index.md` 及相关具体规范。
