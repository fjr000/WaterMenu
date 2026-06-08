# 历史记录浏览 / 搜索 / 筛选第一版

## Goal

为 WaterMenu 补齐完整历史用餐浏览能力，把当前“最近 5 条”扩展为可分页、可筛选、可搜索的历史记录入口，让用户能回答“什么时候吃过某道菜，反馈怎么样”。第一版聚焦可长期使用的查询与移动端浏览体验，不做统计图表或复杂分析。

## What I already know

* 用户已确认下一步做“历史记录浏览 / 搜索 / 筛选”的第一版。
* 项目定位是手机优先的菜单推荐与饮食记录 Web 应用，核心问题包含“什么时候吃过，反馈怎么样”。
* 当前核心 MVP 已完成：登录、workspace 隔离、菜品管理、食谱 / 做法、用餐记录、反馈、规则推荐、盲盒、菜品图片图库、生产部署基础。
* 当前前端 `HomePage` 只有两个主 tab：`今天吃什么`、`菜品管理`。
* 当前前端 `RecentMealRecords` 只展示最近 5 条，用 `useMealRecords()` 拉取全部记录后在前端 `.slice(0, 5)`。
* 当前后端 `GET /api/meal-records` 返回当前 workspace 的全部记录，按 `eatenAt desc` 排序，没有分页、搜索或筛选参数。
* 当前 `MealRecord` 响应包含 `feedbacks`，但不包含关联 `Dish` 对象，只包含 `dishId` 与记录标题 `title`。
* 当前反馈通过 `POST /api/feedback` upsert；最近记录卡片已复用这个反馈交互。
* 后端测试当前覆盖用餐记录创建、更新、workspace 隔离、反馈 upsert、非法枚举等边界。
* 当前质量状态：`pnpm backend:typecheck`、`pnpm frontend:typecheck`、`pnpm backend:test` 均通过，后端 6 个测试套件 / 40 个测试全绿。

## Constraints

* 使用中文沟通与文档内容。
* 最小实现、复用优先，不做无关重构。
* 必须保持 session 登录态与 workspace 数据隔离。
* 后端筛选与分页必须在数据库层完成，不能继续依赖前端全量拉取后过滤。
* 第一版应保持移动端优先，避免桌面式复杂表格。
* 组件不得直接调用 `apiFetch`；API 调用集中在 hook 中。
* 后端校验继续使用 DTO + `class-validator`。
* 不引入 Redux / Zustand，不新增共享 package。

## Requirements (evolving)

* 新增完整历史记录浏览入口，建议作为 `HomePage` 第三个 tab：`历史记录`。
* 保留当前“最近用餐”模块作为首页轻量概览，避免推荐页失去快速反馈入口。
* 扩展 `GET /api/meal-records` 支持分页，默认按 `eatenAt desc`。
* 扩展 `GET /api/meal-records` 支持基础筛选：餐次、菜品、反馈、时间范围。
* 反馈筛选同时支持两种范围：当前用户自己的反馈、workspace 内任意成员反馈。
* 当传入 `rating` 但未传 `ratingScope` 时，默认按 `ratingScope=mine` 处理。
* 时间范围筛选第一版采用快捷项：全部 / 最近 7 天 / 最近 30 天 / 最近 90 天；后端仍使用 `from` / `to` 查询参数承载具体范围。
* 扩展 `GET /api/meal-records` 支持轻量关键词搜索：`q` 只匹配用餐记录标题 `MealRecord.title` 和记录备注 `MealRecord.note`。
* 扩展前端 meal records hook，使历史页可以传查询参数，并返回分页结果。
* 历史列表每条记录显示：标题、餐次、时间、记录备注、当前用户反馈状态 / 反馈备注。
* 历史页应支持加载失败重试、空结果状态和“加载更多”。
* 最近 5 条模块继续可用，不被历史页改坏。

## Open Questions

* 已确认：第一版搜索只匹配用餐记录标题 `MealRecord.title` 和记录备注 `MealRecord.note`。
* 已确认：历史页分页交互采用“加载更多”；后端仍使用 `page` / `pageSize` 分页契约，前端累加展示。
* 已确认：时间范围筛选第一版采用快捷项：全部 / 最近 7 天 / 最近 30 天 / 最近 90 天。

## Acceptance Criteria (evolving)

* [ ] 未登录访问历史记录 API 返回 401。
* [ ] `GET /api/meal-records` 默认返回当前 workspace 的第一页记录，按 `eatenAt desc` 排序。
* [ ] `GET /api/meal-records` 支持分页参数，并返回 `items`、`total`、`page`、`pageSize`。
* [ ] 筛选结果不会泄露其他 workspace 的记录、菜品或反馈。
* [ ] 可以按餐次筛选历史记录。
* [ ] 可以按菜品筛选历史记录。
* [ ] 可以按反馈筛选历史记录，并支持“我的反馈”和“全部成员反馈”两种范围。
* [ ] 可以按时间范围筛选历史记录。
* [ ] 可以按记录标题和记录备注进行关键词搜索。
* [ ] 前端新增历史记录入口，移动端可用。
* [ ] 历史页支持空结果、加载中、错误重试状态。
* [ ] 最近 5 条用餐模块仍显示最近记录并可提交反馈。
* [ ] 后端测试覆盖分页、筛选、搜索、workspace 隔离和非法参数。
* [ ] 前后端 typecheck 通过，后端测试通过。

## Definition of Done

* Tests added/updated（后端 e2e 至少覆盖查询契约与隔离）。
* Lint / typecheck / test green。
* Docs/notes updated if behavior changes。
* 如发现新的可复用查询契约或分页约定，评估是否更新 `.trellis/spec/`。
* 仅修改本任务相关文件，不做无关重构。

## Candidate Scope Options

### A. 结构化筛选优先（最小）

* 支持分页、餐次、菜品、反馈、时间范围。
* 不做关键词搜索。
* 优点：实现最稳，查询语义清晰。
* 缺点：不完全满足用户说的“搜索”。

### B. 结构化筛选 + 轻量关键词搜索（推荐）

* 在 A 的基础上增加 `q` 参数。
* 第一版关键词搜索只匹配记录标题与记录备注。
* 不搜索反馈备注或关联菜品名；菜品查询通过结构化 `dishId` 筛选完成。
* 优点：满足“浏览 / 搜索 / 筛选”，实现仍可控。
* 缺点：用户如果想搜反馈备注或菜品名，需要后续版本增强。

### C. 完整全文搜索 / 高级历史页

* 支持多字段全文、复杂组合、高亮、统计或日历视图。
* 优点：体验更强。
* 缺点：明显超过第一版，容易引入过度实现。

## Recommended Direction

推荐选择 B：结构化筛选 + 轻量关键词搜索。这样既补齐长期使用最需要的历史查询能力，又避免把第一版扩展成复杂分析页。

## Initial Technical Approach

* 后端新增 `ListMealRecordsQueryDto`，包含 `page`、`pageSize`、`mealType`、`dishId`、`rating`、`ratingScope`、`from`、`to`、`q`。`q` 只匹配 `title` 与 `note`。
* `MealRecordsController.list` 改为接收 query DTO。
* `MealRecordsService.list` 改为数据库层 `where` + `skip/take` + `count`，返回分页对象。
* 若筛选 `rating`，通过 feedback relation 限定当前 workspace 下存在对应反馈；`ratingScope=mine` 时同时限定当前 `userId`，`ratingScope=workspace` 时匹配 workspace 内任意成员；传了 `rating` 但未传 `ratingScope` 时默认 `mine`。
* 若筛选 `dishId`，必须确保查询条件包含 `workspaceId`，不泄露其他 workspace 菜品是否存在。
* 前端新增分页响应类型与查询参数类型。
* `useMealRecords` 支持查询参数；最近 5 条可请求 `pageSize=5`，历史页请求自己的参数。
* 新增 `HistoryRecordsPanel` 或同等组件，复用现有 `MealRecordCard` 的反馈交互逻辑，避免重复实现反馈按钮。
* `HomePage` 增加 `历史记录` tab。

## Out of Scope

* 不做统计图表。
* 不做日历视图。
* 不做导出 CSV / Excel。
* 不做批量编辑或删除历史记录。
* 不做高级全文搜索、高亮、拼音搜索或分词搜索。
* 不做推荐算法调整。
* 不做开放注册 / 邀请。
* 不做图片图库增强。

## Technical Notes

* 项目定义：`docs/project-definition.md`。
* 当前后端：`backend/src/meal-records/meal-records.controller.ts`、`backend/src/meal-records/meal-records.service.ts`。
* 当前 DTO：`backend/src/meal-records/dto/create-meal-record.dto.ts`、`backend/src/meal-records/dto/update-meal-record.dto.ts`。
* 当前测试：`backend/test/meal-records-feedback.e2e-spec.ts`。
* 当前前端 hook：`frontend/src/hooks/use-meal-records.ts`。
* 当前最近记录组件：`frontend/src/components/recent-meal-records.tsx`。
* 当前首页入口：`frontend/src/pages/home-page.tsx`。
* 当前类型文件：`frontend/src/api/types.ts`。
* 相关规范索引：`.trellis/spec/backend/index.md`、`.trellis/spec/frontend/index.md`、`.trellis/spec/guides/index.md`。
