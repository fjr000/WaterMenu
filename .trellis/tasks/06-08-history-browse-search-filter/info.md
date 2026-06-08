# 历史记录浏览 / 搜索 / 筛选第一版：设计方案

## 约束

* 必须保持 Session Cookie 登录态与 workspace 隔离。
* 历史查询不能再由前端全量拉取后过滤；分页、筛选、搜索必须在后端数据库查询层完成。
* 前端组件不得直接调用 `apiFetch`；所有 meal records API 调用集中在 `frontend/src/hooks/use-meal-records.ts`。
* 第一版移动端优先，使用“加载更多”而不是桌面表格 / 页码器。
* 第一版搜索只匹配 `MealRecord.title` 和 `MealRecord.note`。
* 时间范围 UI 使用快捷项：全部 / 最近 7 天 / 最近 30 天 / 最近 90 天；后端仍接收 `from` / `to`。
* 不引入 Redux / Zustand，不新增 shared package，不做统计图表、日历、导出、批量编辑。

## 成功标准

* 用户可以进入 `历史记录` tab，按时间倒序浏览完整用餐历史。
* 用户可以按餐次、菜品、反馈、时间范围、关键词组合筛选。
* 历史页首屏只请求第一页，点击“加载更多”继续请求下一页。
* 现有“最近用餐”仍只显示最近 5 条，并且反馈交互不退化。
* 后端 e2e 覆盖分页、筛选、搜索、workspace 隔离、非法 query。
* `pnpm backend:typecheck`、`pnpm frontend:typecheck`、`pnpm backend:test` 通过。

## 推荐设计

### 后端 API 契约

扩展既有接口：

```text
GET /api/meal-records?page=1&pageSize=20&mealType=LUNCH&dishId=...&rating=GOOD&from=...&to=...&q=...
```

响应从数组改为分页对象：

```ts
{
  items: MealRecord[];
  total: number;
  page: number;
  pageSize: number;
}
```

默认值建议：

* `page=1`
* `pageSize=20`
* 最大 `pageSize=50`
* 排序固定 `eatenAt desc`，同时间可用 `createdAt desc` 或 `id` 做稳定补充排序。

### 后端查询实现

新增 `ListMealRecordsQueryDto`：

* `page?: number`
* `pageSize?: number`
* `mealType?: MealType`
* `dishId?: string`
* `rating?: FeedbackRating`
* `ratingScope?: 'mine' | 'workspace'`
* `from?: string`
* `to?: string`
* `q?: string`

Service 中构造 Prisma `where`：

* 基础边界永远包含 `workspaceId`。
* `mealType`：`where.mealType = query.mealType`。
* `dishId`：`where.dishId = query.dishId`，同时仍被 `workspaceId` 限制，不额外泄露其他 workspace 菜品是否存在。
* `rating`：通过 `feedbacks.some` 过滤，并且 `workspaceId` 必须匹配当前 workspace。
* `ratingScope=mine`：反馈筛选同时限定当前 `userId`。
* `ratingScope=workspace`：反馈筛选匹配 workspace 内任意成员。
* `from/to`：映射到 `eatenAt.gte/lte`。
* `q`：trim 后如果非空，使用 `OR: [{ title: { contains: q, mode: 'insensitive' } }, { note: { contains: q, mode: 'insensitive' } }]`。
* 使用 transaction 或并行查询获取 `items` 与 `total`，确保分页对象完整。

### 前端数据流

`frontend/src/api/types.ts` 新增：

```ts
export interface MealRecordsQuery {
  page?: number;
  pageSize?: number;
  mealType?: MealType;
  dishId?: string;
  rating?: FeedbackRating;
  ratingScope?: "mine" | "workspace";
  from?: string;
  to?: string;
  q?: string;
}

export interface MealRecordsPage {
  items: MealRecord[];
  total: number;
  page: number;
  pageSize: number;
}
```

`useMealRecords(query)`：

* query key 包含规范化后的 query。
* query fn 组装 `URLSearchParams`。
* 返回 `MealRecordsPage`。

`RecentMealRecords`：

* 改为 `useMealRecords({ page: 1, pageSize: 5 })`。
* 展示 `data.items`，不再 `.slice(0, 5)`。

`HistoryRecordsPanel`：

* 本地 UI 状态保存筛选条件、搜索词、已加载页数或累积记录。
* 筛选条件变化时重置到第一页。
* 点击“加载更多”请求下一页并累加展示。
* 复用已有用餐记录卡片的反馈按钮逻辑，避免最近记录和历史记录行为漂移。

### HomePage 结构

`activeTab` 从：

```ts
"recommend" | "dishes"
```

扩展为：

```ts
"recommend" | "dishes" | "history"
```

历史 tab 只展示历史页主体。当前页面级互斥面板规则仍保留：打开记录 / 做法 / 图库时避免多个大面板同时占用手机页面。

## 分歧点分析

### 分歧点 1：反馈筛选按“当前用户反馈”还是“workspace 内任意用户反馈”

用户已确认两种都需要。

设计结论：新增反馈筛选范围参数，例如：

```text
ratingScope=mine | workspace
```

语义：

* `mine`：筛选当前登录用户自己的反馈。
* `workspace`：筛选当前 workspace 内任意成员的反馈。

实现要求：

* 当未传 `rating` 时，`ratingScope` 不生效。
* 当传 `rating` 但未传 `ratingScope` 时，默认按 `mine` 处理。
* 两种语义都必须保持 `workspaceId` 过滤，不能跨 workspace 泄露反馈。

UI 风险：

* 当前记录卡片主要展示当前用户反馈。如果用户用 `workspace` 范围筛选，可能出现“筛选好吃，但当前用户没有好吃高亮”的记录。
* 为降低误解，历史页需要在筛选 UI 中明确标注“我的反馈 / 全部成员反馈”；如实现成本允许，卡片可在 workspace 范围筛选时显示简短提示，例如“有成员反馈：好吃”。

### 分歧点 2：分页响应是否破坏现有调用

现状 `GET /api/meal-records` 返回数组。改为分页对象会要求前端和后端测试同步更新。

推荐：接受这个破坏性内部契约变更，因为当前 API 只有本仓库前端使用；同时更新 `RecentMealRecords` 和测试，避免保留双响应形态造成复杂度。

### 分歧点 3：菜品筛选是否校验 dishId 存在

选项：

* 不单独校验，只加 `where: { workspaceId, dishId }`，不存在或其他 workspace 的 dishId 都返回空列表。
* 单独校验当前 workspace 是否存在该 dishId，不存在返回 404。

推荐：第一版不单独校验，统一返回空列表。原因是列表筛选不是写入动作，返回空结果不泄露资源存在性，且交互更自然。

### 分歧点 4：搜索是否 trim 空白并忽略空 q

推荐：trim 后为空则视为未传 `q`。纯空白搜索不应返回 400，避免前端输入状态造成无意义错误。

### 分歧点 5：时间范围边界

推荐：前端快捷项计算 `from`，不传 `to`；后端支持 `from` / `to`，按 ISO date string 校验。这样未来增加自定义结束日期不需要改后端契约。

## 不建议第一版包含的内容

* 搜索反馈备注或菜品名。
* 展示所有用户反馈列表。
* 表格页码器。
* 统计图 / 日历视图。
* 后端全文索引或 raw SQL 搜索。
* 删除 / 编辑历史记录入口。

## 设计结论

主要分歧点已明确：

* 搜索：只匹配记录标题和记录备注。
* 分页交互：移动端使用“加载更多”。
* 时间范围：第一版使用快捷项，后端保留 `from` / `to`。
* 反馈筛选：同时支持 `mine` 与 `workspace`；传 `rating` 但未传 `ratingScope` 时默认 `mine`。

当前方案已足够进入实现。
