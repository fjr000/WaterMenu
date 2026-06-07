# 食谱做法记录技术设计

## 设计目标

补齐 MVP 的「某个菜怎么做」能力，在不引入复杂菜谱系统的前提下，让用户能围绕已有菜品查看、新增、编辑纯文本做法。

## 约束

* 必须复用当前 NestJS + Prisma + PostgreSQL 后端结构。
* 必须复用当前 Session Cookie 登录保护与 `AuthGuard`。
* 必须保持 workspace 数据隔离；任何 recipe 读写都不能跨 workspace。
* 前端服务端数据必须继续通过 TanStack Query 管理。
* 前端 API 类型集中在 `frontend/src/api/types.ts`。
* 前端表单校验使用 React Hook Form + Zod。
* 不引入新状态库、新编辑器、新上传能力。
* 不实现删除、图片、AI、结构化 ingredients / steps。

## 成功标准

* 登录用户能在自己 workspace 的菜品下新增做法。
* 登录用户能查看自己 workspace 的菜品做法列表。
* 登录用户能编辑自己 workspace 的做法。
* 跨 workspace 的 dish / recipe 访问返回 `404`，不暴露资源存在性。
* 未登录访问 recipes API 返回 `401`。
* 没有做法时前端显示空状态，并提供新增入口。
* 新增或编辑后相关 recipe query 自动刷新。
* 推荐、盲盒、记录已吃、反馈流程保持可用。

## 后端设计

### Prisma 模型

推荐新增：

```prisma
model Recipe {
  id          String    @id @default(cuid())
  workspaceId String
  dishId      String
  title       String
  content     String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  dish        Dish      @relation(fields: [dishId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([workspaceId])
  @@index([dishId])
  @@map("recipes")
}
```

同时给现有模型补关系：

```prisma
model Workspace {
  recipes Recipe[]
}

model Dish {
  recipes Recipe[]
}
```

### 关于 `isDefault`

PRD 草案曾提到 `isDefault`，但当前产品需求没有默认做法的展示、切换或唯一性规则。设计建议第一版不要加入 `isDefault`，否则会隐含这些问题：

* 一个菜多条做法时是否只能有一个默认？
* 新增第一条是否自动默认？
* 编辑时能否切换默认？
* 默认做法是否要优先显示？

如果第一版只展示列表，按 `createdAt asc` 或 `updatedAt desc` 排序即可，不需要默认语义。

### API

新增 `RecipesModule`，挂到 `AppModule`。

路由：

```text
GET   /api/dishes/:dishId/recipes
POST  /api/dishes/:dishId/recipes
PATCH /api/recipes/:id
```

DTO：

* `CreateRecipeDto`
  * `title`: string, required, trim 后必须包含非空白字符
  * `content`: string, required, trim 后必须包含非空白字符
* `UpdateRecipeDto`
  * `title`: string, optional, provided 时 trim 后必须包含非空白字符
  * `content`: string, optional, provided 时 trim 后必须包含非空白字符

后端校验必须作为最终防线，不能只依赖前端 trim；纯空白字符串应返回 400。

Service 关键逻辑：

* 每个方法先通过 `userId` 查 `workspaceId`。
* list/create 先断言 `dishId` 属于当前 workspace。
* update 先用 `id + workspaceId` 查 recipe；找不到返回 `NotFoundException`。
* create 写入 `workspaceId + dishId + title + content`。
* list 按 `createdAt asc` 返回，保持稳定阅读顺序。

### 错误语义

* 未登录：`AuthGuard` 返回 401。
* dish 不属于当前 workspace：404。
* recipe 不属于当前 workspace：404。
* DTO 非法：400。

### 测试

新增或扩展后端 e2e，至少覆盖：

* 未登录访问 recipes API 返回 401。
* 登录后能给当前 workspace 的 dish 创建 recipe。
* 列表只返回当前 workspace 的 recipe。
* 不能给其他 workspace 的 dish 创建 recipe。
* 不能编辑其他 workspace 的 recipe。
* 编辑后返回更新后的 title/content。
* 空 title/content 和纯空白 title/content 被 DTO 拒绝。

## 前端设计

### 类型

在 `frontend/src/api/types.ts` 新增：

```ts
export interface Recipe {
  id: string;
  workspaceId: string;
  dishId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecipeRequest {
  title: string;
  content: string;
}

export interface UpdateRecipeRequest {
  title?: string;
  content?: string;
}
```

### Hook

新增 `frontend/src/hooks/use-recipes.ts`：

* `recipesKey(dishId): ["recipes", dishId]`
* `useRecipes(dishId, enabled?)`
* `useCreateRecipe(dishId)`
* `useUpdateRecipe(dishId)`

变更成功后失效：

```ts
queryClient.invalidateQueries({ queryKey: ["recipes", dishId] })
```

### 组件

新增可复用组件 `frontend/src/components/recipe-panel.tsx`。

职责：

* 接收 `dish: Dish`。
* 拉取该 dish 的 recipes。
* 展示 loading / error / empty state。
* 展示 recipe 列表。
* 支持显示新增表单。
* 支持编辑某条 recipe。

表单：

* 使用 React Hook Form + Zod。
* `title` 必填，trim 后必须包含非空白字符。
* `content` 必填，trim 后必须包含非空白字符。
* 提交给 API 前对 `title` / `content` 做 trim，避免写入首尾无意义空白。
* `content` 使用 `<textarea>`；如当前 `ui.tsx` 没有 Textarea，可在组件内使用原生 textarea + Tailwind，避免为了一个场景扩大基础 UI。

### 页面接入

`HomePage` 维护一个当前查看做法的菜品：

```ts
const [recipeDish, setRecipeDish] = useState<Dish | null>(null);
```

接入点：

* 菜品管理 `DishCard` 增加「做法」按钮。
* 推荐结果 `CandidateCard` 增加「查看做法」按钮。
* 盲盒结果复用同一 `CandidateCard`，自然获得入口。
* `recipeDish` 不为空时，在当前主内容下方展示一个页面级 `RecipePanel`。
* 不在每张菜品卡片内展开多个 RecipePanel。
* 不使用弹窗 / drawer。
* `RecipePanel` 与 `MealRecordForm` 互斥：打开做法时关闭记录表单，打开记录表单时关闭做法面板。

避免复杂弹窗和多卡片同时展开，第一版使用页面级单个面板，符合当前 `HomePage` 通过本地状态控制主内容的模式。

## 数据流

```text
用户点击「查看做法」
  -> HomePage setRecordDish(null)
  -> HomePage 设置 recipeDish
  -> RecipePanel useRecipes(dish.id)
  -> GET /api/dishes/:dishId/recipes
  -> 展示列表 / 空状态

用户新增做法
  -> useCreateRecipe(dish.id)
  -> POST /api/dishes/:dishId/recipes
  -> invalidate ["recipes", dish.id]
  -> 列表刷新

用户编辑做法
  -> useUpdateRecipe(dish.id)
  -> PATCH /api/recipes/:id
  -> invalidate ["recipes", dish.id]
  -> 列表刷新
```

## 不做的设计

* 不做 Recipe 删除。
* 不做默认做法切换。
* 不做富文本编辑器。
* 不做 markdown 渲染，仅按纯文本换行展示。
* 不做独立食谱 tab。
* 不做卡片内多处同时展开 RecipePanel。
* 不做弹窗 / drawer。
* 不让 recipe 参与推荐权重。

## 质量命令

后端：

```bash
pnpm --filter @watermenu/backend prisma:generate
pnpm --filter @watermenu/backend typecheck
pnpm --filter @watermenu/backend lint
pnpm --filter @watermenu/backend test
pnpm --filter @watermenu/backend build
```

前端：

```bash
pnpm --filter @watermenu/frontend typecheck
pnpm --filter @watermenu/frontend build
```

## 已确认决策

* 第一版移除 `isDefault` 字段，只保留普通 recipe 列表。
* 做法列表按 `createdAt asc` 稳定展示。
* `RecipePanel` 使用页面级单个面板，由 `HomePage` 持有 `recipeDish: Dish | null` 控制。
* `RecipePanel` 与 `MealRecordForm` 互斥，避免手机端同时展开两个大面板。
* `title` / `content` 前后端都拒绝纯空白；前端提交前 trim，后端 DTO 作为最终防线。

