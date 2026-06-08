# 手动新增用餐记录入口

## Goal

为 WaterMenu 增加手动新增用餐记录入口，让用户可以记录外食、临时吃过但未录入菜品的内容。第一版创建的记录不关联菜品，只保存标题、餐次、用餐时间和备注。

## What I already know

* 用户已明确：用餐记录编辑第一版不允许改关联菜品，只编辑标题、餐次、时间、备注。
* 用户已明确：后端更新接口遇到 `dishId` 更新应返回 400，明确拒绝 `dishId` 更新。
* 后端 `POST /api/meal-records` 已支持 `dishId` 可选；不传 `dishId` 时创建 `dishId: null` 的文本用餐记录。
* 后端 e2e 已覆盖“登录后可以创建文本用餐记录和关联当前 workspace 菜品的用餐记录”。
* 后端全局 `ValidationPipe` 开启 `whitelist: true` 和 `forbidNonWhitelisted: true`，`UpdateMealRecordDto` 不包含 `dishId`，更新时提交 `dishId` 会返回 400。
* 后端 e2e 已覆盖更新时拒绝修改或解除 `dishId`，并保持原 `dishId` 不变。
* 前端已有 `useCreateMealRecord`，成功后会 invalidate `meal-records` 和 `dishes`。
* 前端已有从菜品 / 推荐结果进入的 `MealRecordForm`，但它要求传入 `dish`，当前没有手动新增入口。
* 前端历史页 `HistoryRecordsPanel` 已具备记录管理语境、筛选、搜索和记录列表。
* 前端推荐页底部 `RecentMealRecords` 只展示最近 5 条，并提示从推荐结果或菜品列表点击“记录已吃”开始记录。
* 首页已有 `resetRecommendationState`，记录变化后会清空推荐和盲盒旧结果。
* 用户已确认：手动记录入口第一版先放在“历史记录”页顶部。
* 用户已确认：手动新增成功后清空历史页搜索和筛选，并回到第 1 页。
* 用户已确认：手动记录表单在历史页顶部内联展开，不使用弹窗或抽屉。
* 用户已确认：手动记录表单默认餐次按当前本地时间自动推断，用户可手动修改。
* 用户已确认：默认餐次时间段为 `05:00-10:59` 早餐、`11:00-14:59` 午餐、`17:00-20:59` 晚餐，其他时间加餐。
* 用户已确认：默认当前时间或较近时间创建后可在第 1 页看到；补录很早以前的记录遵循历史排序，不强行置顶。

## Assumptions

* 本任务优先补前端手动新增入口；后端创建 API 已满足第一版非关联记录需求。
* 手动新增表单复用当前餐次枚举：早餐、午餐、晚餐、加餐。
* 手动新增记录不提供菜品选择器，不提交 `dishId`，也不尝试从标题匹配菜品。
* 成功新增后刷新历史 / 最近用餐，并触发推荐与盲盒状态重置。
* 手动记录入口第一版只放在“历史记录”页顶部。
* 手动新增成功后清空历史页搜索和筛选，并回到第 1 页，确保新记录立刻可见。
* 手动记录表单在入口下方内联展开，交互风格跟现有新增菜品、记录已吃和编辑记录保持一致。
* 手动记录表单默认餐次按浏览器本地时间自动推断，不依赖推荐页餐次状态。
* 默认餐次时间段：`05:00-10:59` 早餐、`11:00-14:59` 午餐、`17:00-20:59` 晚餐、其他时间加餐。
* 历史列表继续遵循现有 `eatenAt` 倒序；补录很早以前的记录不强行置顶。

## Requirements

* 在“历史记录”页顶部提供一个用户可发现的“手动记录”入口。
* 表单字段只包含：标题、餐次、用餐时间、备注。
* 标题必填，前端 trim 后不能为空。
* 餐次必填，使用现有 `MealType`。
* 用餐时间必填，默认当前时间。
* 餐次默认值按当前本地时间推断，且允许用户手动修改。
* 餐次默认值时间段规则固定为：`05:00-10:59` 早餐、`11:00-14:59` 午餐、`17:00-20:59` 晚餐、其他时间加餐。
* 备注可选，trim 后为空则不提交。
* 创建请求不得包含 `dishId`。
* 创建成功后关闭表单，并刷新用餐记录相关查询。
* 创建成功后调用现有推荐状态 reset，避免旧推荐结果继续显示。
* 创建成功后重置历史页筛选状态：关键词、餐次、菜品、反馈、反馈范围、时间范围和分页。
* 创建成功后清空筛选并回到第 1 页；默认当前时间或较近时间的记录应可在第 1 页看到，补录很早以前的记录遵循历史排序。
* 表单打开方式使用历史页顶部内联展开，不新增弹窗或抽屉组件。
* 第一版不做关联菜品选择、自动匹配菜品、创建菜品、反馈同步填写。

## Open Questions

* 无。

## Acceptance Criteria

* [x] 用户能从历史记录页顶部打开手动记录表单。
* [x] 用户能填写标题、餐次、用餐时间、备注并创建非关联用餐记录。
* [x] 前端创建请求不包含 `dishId`。
* [x] 创建成功后清空历史页搜索和筛选，回到第 1 页；默认当前时间或较近时间创建的记录可在第 1 页看到。
* [x] 创建成功后推荐和盲盒旧状态被重置。
* [x] 表单校验阻止空标题和无效时间。
* [x] 不改变现有“从菜品记录已吃”的流程。
* [x] 不改变现有编辑记录时拒绝更新 `dishId` 的后端契约。

## Implementation Plan

| Step | Verification Criteria |
|---|---|
| 新增或抽取手动用餐记录表单组件，复用 `useCreateMealRecord`、RHF 和 Zod 模式 | 表单只提交 `title`、`mealType`、`eatenAt`、`note`，请求体不包含 `dishId` |
| 在 `HistoryRecordsPanel` 顶部增加“手动记录”按钮和内联展开区域 | 用户能在历史页顶部打开 / 收起表单，不影响现有筛选面板 |
| 实现默认时间和默认餐次规则 | 用餐时间默认当前本地时间；餐次按 `05:00-10:59` 早餐、`11:00-14:59` 午餐、`17:00-20:59` 晚餐、其他时间加餐 |
| 处理创建成功后的状态重置 | 表单关闭；关键词、餐次、菜品、反馈、反馈范围、时间范围和分页重置；触发 `onRecordChange` |
| 验证质量 | 前端 typecheck / build 通过；必要时补充聚焦测试 |

## Definition of Done

* 前端类型检查通过：`pnpm --filter @watermenu/frontend typecheck`。
* 前端构建通过：`pnpm --filter @watermenu/frontend build`。
* 如实现触及后端，后端类型检查、lint、测试通过。
* 行为变化有必要的前端测试或后端测试覆盖。
* 不引入无关重构。

## Spec Update Review

本任务只复用既有前端表单、TanStack Query hook、RHF + Zod、历史页本地状态模式；没有新增 API、数据库、跨层契约或项目级编码约定。因此无需更新 `.trellis/spec/`。

## Out of Scope

* 不允许在编辑用餐记录时改 `dishId` 或解除关联菜品。
* 不做手动记录与菜品的后续关联。
* 不做菜品搜索 / 选择器。
* 不做自动创建菜品。
* 不做图片、食谱、成员邀请、推荐算法调整。
* 不做历史记录筛选能力扩展。

## Technical Notes

* 后端创建 DTO：`backend/src/meal-records/dto/create-meal-record.dto.ts`。
* 后端更新 DTO：`backend/src/meal-records/dto/update-meal-record.dto.ts`。
* 后端用餐记录服务：`backend/src/meal-records/meal-records.service.ts`。
* 后端全局校验：`backend/src/app.setup.ts`。
* 后端相关测试：`backend/test/meal-records-feedback.e2e-spec.ts`。
* 前端用餐记录 hook：`frontend/src/hooks/use-meal-records.ts`。
* 前端现有关联菜品记录表单：`frontend/src/components/meal-record-form.tsx`。
* 前端最近用餐卡片与编辑删除：`frontend/src/components/recent-meal-records.tsx`。
* 前端历史记录面板：`frontend/src/components/history-records-panel.tsx`。
* 首页状态回调：`frontend/src/pages/home-page.tsx`。
* API 类型：`frontend/src/api/types.ts`。
