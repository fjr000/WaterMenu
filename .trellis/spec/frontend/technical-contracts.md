# 前端技术契约

> 基于 `frontend/` 的真实源码，记录已实现的技术契约和代码模式。

---

## 场景：手机优先 React 前端

### 1. 范围 / 触发

- 触发：项目已确定前端技术栈、PWA、状态管理、表单校验和 API 风格。
- 范围：`frontend/` 下的浏览器端实现。

### 2. 签名

前端主技术栈：

```text
React 19 + Vite 7 + TypeScript 5.8
Tailwind CSS 4（@tailwindcss/vite 插件）
TanStack Query 5
React Hook Form 7 + Zod 4
REST JSON API + Session Cookie
基础 PWA
```

MVP 不使用：

```text
Next.js
Redux
Zustand
复杂离线同步
```

### 3. 契约

使用端契约：

```text
手机浏览器为主
电脑浏览器用于调试、批量录入和管理
先按手机宽度设计，再兼容电脑宽度
```

PWA 契约：

```text
支持添加到手机桌面
配置应用名称、图标、manifest、主题色
允许基础静态资源缓存
不承诺离线新增、离线编辑、离线图片上传或离线同步
```

服务端数据契约：

```text
TanStack Query 管理服务端数据
React useState/useReducer 管理本地 UI 状态
不把后端数据复制到 Redux/Zustand 类全局 store
```

表单契约：

```text
React Hook Form 管理表单
Zod 做前端即时校验
后端 DTO + class-validator 是最终校验防线
```

API 契约：

```text
前端调用 REST JSON API
登录态通过 Session Cookie 维持
前端不手动保存 JWT
后续可基于 OpenAPI 生成类型
```

UI 契约：

```text
Tailwind CSS 实现手机优先界面
优先自定义轻量组件
不在 MVP 引入大型桌面组件库
```

---

## 源码示例

### API Client（`src/api/client.ts`）

```typescript
import { ApiError } from "./types.ts";

const BASE = "/api";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE}${path}`;

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (
    options.body &&
    typeof options.body === "string" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    credentials: "same-origin",  // Session Cookie
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text || response.statusText);
  }

  return response.json() as Promise<T>;
}
```

### TanStack Query Hook（`src/hooks/use-dishes.ts`）

```typescript
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import type { CreateDishRequest, Dish, MealType } from "../api/types.ts";

const dishesKey = (mealType?: MealType): QueryKey => [
  "dishes",
  mealType ?? null,
];

export function useDishes(mealType?: MealType) {
  return useQuery({
    queryKey: dishesKey(mealType),
    queryFn: () => {
      const params = new URLSearchParams();
      if (mealType) {
        params.set("mealType", mealType);
      }
      const qs = params.toString();
      return apiFetch<Dish[]>(`/dishes${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useCreateDish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateDishRequest) =>
      apiFetch<Dish>("/dishes", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dishes"] });
    },
  });
}
```

### React Hook Form + Zod（`src/pages/login-page.tsx`）

```typescript
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  email: z.email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values);
  });

  return (
    <form onSubmit={onSubmit}>
      <Input {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}
      {/* ... */}
    </form>
  );
}
```

### 认证状态管理（`src/hooks/use-auth.tsx`）

```typescript
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import { ApiError } from "../api/types.ts";
import type { MeResponse } from "../api/types.ts";

export const authMeKey = ["auth", "me"] as const;

interface AuthContextValue {
  user: MeResponse["user"] | null;
  workspace: MeResponse["workspace"] | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery<MeResponse | null>({
    queryKey: authMeKey,
    queryFn: () => apiFetch<MeResponse>("/auth/me"),
    retry: false,
  });

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ ok: boolean }>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      // 忽略退出登录错误
    } finally {
      queryClient.setQueryData(authMeKey, null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      });
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data?.user ?? null,
      workspace: meQuery.data?.workspace ?? null,
      isLoading: meQuery.isLoading,
      logout,
    }),
    [meQuery.data, meQuery.isLoading, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
```

### 全局 401 处理（`src/main.tsx`）

```typescript
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleUnauthorizedError,
  }),
  mutationCache: new MutationCache({
    onError: handleUnauthorizedError,
  }),
});

function handleUnauthorizedError(error: unknown) {
  if (isUnauthorized(error)) {
    queryClient.setQueryData(authMeKey, null);
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "auth",
    });
  }
}
```

---

## Tailwind CSS v4 配置

### `src/index.css`

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  --color-slate-300: #cbd5e1;
  --color-slate-400: #94a3b8;
  --color-slate-500: #64748b;
  --color-slate-600: #475569;
  --color-slate-700: #334155;
  --color-slate-800: #1e293b;
  --color-slate-900: #0f172a;
  --color-slate-950: #020617;
  --color-emerald-500: #10b981;
  --color-emerald-600: #059669;
  --color-red-500: #ef4444;
  --color-red-600: #dc2626;
  --color-amber-500: #f59e0b;
}

:root {
  color-scheme: light;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  background: var(--color-slate-50);
  color: var(--color-slate-900);
}
```

---

## 场景：前端用餐记录与反馈闭环

### 1. 范围 / 触发

- 触发：前端接入后端 `meal-records` 与 `feedback` API，让推荐 / 盲盒、菜品列表、最近用餐记录形成真实使用闭环。
- 范围：`frontend/src/api/types.ts`、`frontend/src/hooks/use-meal-records.ts`、`frontend/src/components/meal-record-form.tsx`、`frontend/src/components/recent-meal-records.tsx`、`frontend/src/components/recommendation-panel.tsx`、`frontend/src/pages/home-page.tsx`。
- 不包含：Recipe / 做法记录、复杂日历、历史统计、删除记录、离线同步、后端推荐算法调整。

### 2. 签名

前端 API 类型：

```typescript
export type FeedbackRating = "GOOD" | "OK" | "BAD";

export interface MealRecord {
  id: string;
  workspaceId: string;
  dishId: string | null;
  title: string;
  mealType: MealType;
  eatenAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  feedbacks: Feedback[];
}

export interface CreateMealRecordRequest {
  dishId?: string;
  title: string;
  mealType: MealType;
  eatenAt: string;
  note?: string;
}

export interface UpsertFeedbackRequest {
  mealRecordId: string;
  rating: FeedbackRating;
  note?: string;
}
```

Hook 签名：

```typescript
useMealRecords();
useCreateMealRecord();
useUpsertFeedback();
```

API 路径：

```text
GET  /api/meal-records
POST /api/meal-records
POST /api/feedback
```

### 3. 契约

创建用餐记录：

```text
点击“记录已吃”后必须先展示轻量确认表单，不直接创建记录。
表单至少包含餐次、默认当前时间、可选备注、确认与取消。
从推荐 / 盲盒结果和菜品列表进入时复用同一个表单。
提交时传 dishId、title、mealType、eatenAt、note。
```

最近用餐记录：

```text
首页展示最近用餐记录区域。
默认只展示最近 5 条记录。
记录按后端返回顺序消费；当前后端按 eatenAt desc 返回。
每条记录展示好吃 / 一般 / 不好吃反馈按钮。
当前登录用户已有反馈时高亮对应按钮。
```

反馈：

```text
反馈提交目标是 MealRecord，不是 Dish。
点击好吃 / 一般 / 不好吃立即 POST /api/feedback upsert。
反馈备注为可选入口，按需展开；备注更新必须带已有 rating。
```

推荐 / 盲盒状态：

```text
推荐和盲盒结果由 useMutation 保存，不会被 query invalidation 自动清空。
创建用餐记录或提交反馈成功后，必须刷新 meal-records 查询。
当历史或反馈变化会让当前推荐明显陈旧时，页面层 reset 推荐 / 盲盒 mutation 结果，或显式重新触发推荐。
MVP 优先 reset，不自动重跑盲盒。
```

### 4. 校验与错误矩阵

| 条件 | 前端处理 |
|------|----------|
| 未登录访问首页 | 认证层显示登录页或清理当前用户状态 |
| 用餐记录列表加载中 | 显示加载状态 |
| 用餐记录列表加载失败 | 显示错误提示并允许重试 |
| 点击记录入口 | 打开确认表单，不直接创建 |
| 餐次为空 | Zod / 表单校验阻止提交 |
| 时间为空或非法 | Zod / 表单校验阻止提交 |
| 创建记录成功 | 关闭表单，刷新 `meal-records`，reset 推荐 / 盲盒结果 |
| 创建记录失败 | 保留表单，显示错误提示 |
| 反馈提交中 | 禁用对应重复操作或展示 pending 状态 |
| 反馈提交失败 | 保留原状态或回滚本地高亮，显示错误提示 |
| 已有反馈备注 | 展开备注时预填当前备注 |

### 5. Good / Base / Bad Cases

- Good：用餐记录和反馈 API 调用集中在 `use-meal-records.ts`，组件不直接调用 `apiFetch`。
- Good：用餐记录确认表单使用 React Hook Form + Zod，后端 DTO 仍是最终校验防线。
- Good：记录创建和反馈成功后刷新 `meal-records`，并处理推荐 / 盲盒 mutation 结果陈旧问题。
- Base：最近用餐记录区域前端取前 5 条展示，后续历史页或分页单独设计。
- Base：最近记录只显示 `title`，不强依赖后端 include `dish`。
- Bad：点击“记录已吃”直接创建记录，导致误点产生脏数据。
- Bad：把反馈直接挂在 Dish 上，丢失具体用餐事件语义。
- Bad：只 invalidate `meal-records`，但页面继续展示旧推荐 / 盲盒结果。

### 6. 测试要求

MVP 前端至少验证：

- `pnpm frontend:typecheck` 通过。
- `pnpm frontend:build` 通过。
- 手动检查：登录 → 推荐 / 盲盒 → 记录已吃 → 最近用餐出现记录 → 提交 / 修改反馈 → 刷新后记录仍存在。
- 手动检查：创建用餐记录成功后旧推荐 / 盲盒结果不继续误导用户。
- 手动检查：反馈备注按需展开，且无 rating 时不允许提交单独备注。

### 7. Wrong vs Correct

#### Wrong

```text
POST /api/meal-records 成功 -> invalidate meal-records -> 页面继续展示旧推荐结果
```

问题：推荐 / 盲盒结果来自 mutation `data`，不会因为 `meal-records` query invalidation 自动消失；用户可能看到刚记录已吃的菜仍作为当前推荐。

#### Correct

```text
POST /api/meal-records 成功 -> invalidate meal-records -> reset recommendMutation / blindBoxMutation
```

原因：历史数据变化会影响推荐候选池，MVP 先清空旧结果，避免展示明显陈旧状态；用户可手动重新推荐。

---

## 场景：前端食谱做法记录

### 1. 范围 / 触发

- 触发：前端接入后端 recipes API，让用户能在菜品管理、推荐结果、盲盒结果中查看、新增、编辑某个菜品的纯文本做法。
- 范围：`frontend/src/api/types.ts`、`frontend/src/hooks/use-recipes.ts`、`frontend/src/components/recipe-panel.tsx`、`frontend/src/components/recommendation-panel.tsx`、`frontend/src/pages/home-page.tsx`。
- 不包含：Recipe 删除、默认做法、图片上传、富文本编辑器、markdown 渲染、结构化 ingredients / steps、独立食谱 tab、弹窗 / drawer。

### 2. 签名

前端 API 类型：

```typescript
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

Hook 签名：

```typescript
recipesKey(dishId: string): QueryKey;
useRecipes(dishId: string, enabled?: boolean);
useCreateRecipe(dishId: string);
useUpdateRecipe(dishId: string);
```

API 路径：

```text
GET   /api/dishes/:dishId/recipes
POST  /api/dishes/:dishId/recipes
PATCH /api/recipes/:id
```

组件入口：

```typescript
<RecipePanel dish={dish} onClose={...} />
```

### 3. 契约

RecipePanel：

```text
RecipePanel 是页面级单个面板，由 HomePage 持有 recipeDish: Dish | null 控制。
不要在每张菜品卡片内展开多个 RecipePanel。
不要使用弹窗 / drawer。
面板接收 dish 后通过 useRecipes(dish.id) 拉取做法列表。
面板必须展示 loading / error / empty / list 状态。
没有做法时显示明确空状态，并提供新增入口。
```

入口范围：

```text
菜品管理 DishCard 提供“做法”入口。
推荐结果 CandidateCard 提供“查看做法”入口。
盲盒结果复用 CandidateCard，因此也必须有“查看做法”入口。
三处入口都调用同一个 onViewRecipes(dish) 页面层回调。
```

与记录已吃互斥：

```typescript
点击查看做法 -> setRecordDish(null); setRecipeDish(dish);
点击记录已吃 -> setRecipeDish(null); setRecordDish(dish);
```

表单：

```text
新增和编辑表单使用 React Hook Form + Zod。
title/content 必填，trim 后必须包含非空白字符。
提交给 API 前 trim title/content。
content 使用原生 textarea + Tailwind；不要为了单一场景扩展基础 UI。
新增成功后关闭新增表单并刷新列表。
编辑成功后退出编辑态并刷新列表。
```

缓存：

```text
recipes query key 使用 ["recipes", dishId]。
create/update 成功后 invalidateQueries({ queryKey: ["recipes", dishId] })。
不做乐观更新；不手动复制服务端列表到本地状态作为真实数据源。
```

### 4. 校验与错误矩阵

| 条件 | 前端处理 |
|------|----------|
| recipes 列表加载中 | 显示加载状态 |
| recipes 列表加载失败 | 显示错误提示并允许重试 |
| recipes 列表为空 | 显示空状态和新增入口 |
| title 为空或纯空白 | Zod 阻止提交并显示错误 |
| content 为空或纯空白 | Zod 阻止提交并显示错误 |
| 新增 recipe 成功 | 关闭新增表单,刷新 `['recipes', dishId]` |
| 新增 recipe 失败 | 保留表单,显示错误提示 |
| 编辑 recipe 成功 | 退出编辑态,刷新 `['recipes', dishId]` |
| 编辑 recipe 失败 | 保留编辑态,显示错误提示 |
| 点击查看做法时已有记录表单展开 | 关闭记录表单,打开做法面板 |
| 点击记录已吃时已有做法面板展开 | 关闭做法面板,打开记录表单 |

### 5. Good / Base / Bad Cases

- Good：recipes API 调用集中在 `use-recipes.ts`，组件不直接调用 `apiFetch`。
- Good：Recipe API 类型集中在 `frontend/src/api/types.ts`，不要在组件里重复定义响应形状。
- Good：页面层维护单个 `recipeDish`，让菜品管理、推荐、盲盒共用同一个 RecipePanel。
- Good：前端 trim 后提交，后端 DTO 仍是最终校验防线。
- Base：RecipePanel 使用原生 textarea；后续多个场景需要 textarea 时再抽基础 UI。
- Base：新增 / 编辑成功后只 invalidate，不做乐观更新。
- Bad：在每个 DishCard / CandidateCard 内各自挂一个 RecipePanel，导致手机端多个大面板同时展开。
- Bad：打开做法面板时不关闭 MealRecordForm，导致两个大面板同时占用手机页面。
- Bad：为了未来预留默认做法 UI 或 `isDefault` 状态，但后端没有对应语义。
- Bad：只校验 `.min(1)`，允许纯空白 title/content 通过。

### 6. 测试要求

MVP 前端至少验证：

- `pnpm frontend:typecheck` 通过。
- `pnpm frontend:build` 通过。
- 手动检查：登录 → 菜品管理 → 打开做法面板 → 空状态 → 新增做法 → 列表刷新。
- 手动检查：编辑已有做法后退出编辑态,刷新后展示新内容。
- 手动检查：推荐结果 / 盲盒结果点击“查看做法”能打开同一个页面级面板。
- 手动检查：打开做法时记录已吃表单关闭；打开记录已吃时做法面板关闭。
- 手动检查：title/content 空字符串或纯空白时前端阻止提交。

### 7. Wrong vs Correct

#### Wrong

```text
每个 CandidateCard 内部 useRecipes(candidate.dish.id) 并展开自己的做法面板
```

问题：推荐结果、盲盒结果和菜品列表会产生多个服务端查询和多个大面板，手机端状态难以维护。

#### Correct

```text
CandidateCard 点击“查看做法” -> HomePage setRecipeDish(dish) -> 页面级 RecipePanel useRecipes(dish.id)
```

原因：服务端数据仍由 TanStack Query 管理，但 UI 只维护一个当前做法上下文，符合手机优先和最小状态原则。

---

## 场景：前端菜品图库与封面展示

### 1. 范围 / 触发

- 触发：前端接入后端菜品图片 API，在菜品管理中管理多图图库，并在菜品列表、推荐、盲盒展示封面。
- 范围：`frontend/src/api/types.ts`、`frontend/src/hooks/use-dish-images.ts`、`frontend/src/components/dish-image-panel.tsx`、`frontend/src/components/dish-cover-image.tsx`、`frontend/src/components/recommendation-panel.tsx`、`frontend/src/pages/home-page.tsx`。
- 不包含：批量上传、手动排序、裁剪 / 滤镜 / 压缩编辑器、推荐 / 盲盒图库管理入口、离线图片上传。

### 2. 签名

前端 API 类型：

```typescript
export interface DishImage {
  id: string;
  workspaceId: string;
  dishId: string;
  storageKey: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  sortOrder: number;
  isCover: boolean;
  fileUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dish {
  // ...既有字段
  coverImage: DishImage | null;
}
```

Hook 签名：

```typescript
useDishImages(dishId: string);
useUploadDishImage(dishId: string);
useSetDishImageCover(dishId: string);
useDeleteDishImage(dishId: string);
```

API 路径：

```text
GET    /api/dishes/:dishId/images
POST   /api/dishes/:dishId/images   FormData file
PATCH  /api/dish-images/:id/cover
DELETE /api/dish-images/:id
GET    /api/dish-images/:id/file    用作 img src
```

### 3. 契约

图库管理入口：

```text
只有菜品管理卡片提供“图库”入口。
HomePage 维护单个 imageDish: Dish | null，页面级展示 DishImagePanel。
打开图库时关闭做法面板和记录已吃表单；打开做法或记录时关闭图库。
```

推荐 / 盲盒展示：

```text
推荐结果与盲盒结果只展示 dish.coverImage。
推荐 / 盲盒不提供图库管理入口。
没有 coverImage 时保留现有纯文本卡片或轻量占位，不阻断记录已吃 / 查看做法。
```

上传与缓存：

```text
上传使用 FormData，字段名 file，不手动设置 Content-Type。
文件 input accept="image/jpeg,image/png,image/webp" 只是前端提示，后端仍是最终校验。
图片变更成功后 invalidate ['dish-images', dishId] 和 ['dishes']。
推荐 / 盲盒结果来自 mutation data；图片变更不自动重跑推荐或盲盒，只保证后续查询刷新。
```

图片 URL：

```text
DishImage.fileUrl 是受保护后端接口路径，可直接作为 img src。
前端不要拼接 uploads 静态路径，也不要假设 storageKey 可公开访问。
```

### 4. 校验与错误矩阵

| 条件 | 前端处理 |
|------|----------|
| 图库列表加载中 | 显示加载状态 |
| 图库列表加载失败 | 显示错误提示并允许重试 |
| 图库为空 | 显示空状态，提示上传第一张图片 |
| 未选择文件点击上传 | 禁用上传按钮或无操作 |
| 上传中 | 禁用重复上传按钮 |
| 上传失败 | 保留面板并显示错误提示 |
| 设置封面 / 删除中 | 禁用对应操作，避免重复提交 |
| 设置封面 / 删除失败 | 显示错误提示并保留当前列表 |
| 菜品没有封面 | 不阻断卡片主要操作 |
| API 返回 401 | 由全局认证错误处理清理登录态 |

### 5. Good / Base / Bad Cases

- Good：图片 API 调用集中在 `use-dish-images.ts`，组件不直接调用 `apiFetch`。
- Good：`DishImage` 和 `Dish.coverImage` 类型集中在 `frontend/src/api/types.ts`。
- Good：页面层只维护一个当前图库面板，避免每张卡片各自展开复杂状态。
- Good：`img src` 使用 `image.fileUrl`，由后端鉴权读取文件。
- Base：单文件上传；用户需要多张图片时重复选择上传。
- Base：图库按后端返回顺序展示，不做前端排序拖拽。
- Bad：组件中直接请求 `/api/dishes/:id/images` 或手写 fetch。
- Bad：前端拼接 `/uploads/${storageKey}` 读取图片，绕过权限契约。
- Bad：推荐 / 盲盒卡片提供图库管理入口，导致核心推荐流程状态变重。

### 6. 测试要求

前端至少验证：

- `pnpm --filter @watermenu/frontend typecheck` 通过。
- `pnpm --filter @watermenu/frontend build` 通过。
- 手动检查：登录 → 菜品管理 → 打开图库 → 空状态 → 上传图片 → 图片出现且第一张为封面。
- 手动检查：上传多张图片 → 设置封面 → 菜品卡片封面刷新。
- 手动检查：删除封面 → 自动显示新封面。
- 手动检查：推荐 / 盲盒结果展示封面，但没有图库管理入口。
- 手动检查：无封面菜品仍能记录已吃和查看做法。

### 7. Wrong vs Correct

#### Wrong

```typescript
<img src={`/uploads/${image.storageKey}`} />
```

问题：前端假设 uploads 可公开访问，会绕过后端登录态和 workspace 校验。

#### Correct

```typescript
<img src={image.fileUrl} loading="lazy" />
```

原因：`fileUrl` 指向受保护后端接口，浏览器会携带同域 Session Cookie，由后端校验权限后返回图片文件。

---

## 校验与错误矩阵

| 条件 | 前端处理 |
|------|----------|
| 未登录 | 显示登录页或跳转登录 |
| API 返回未认证 | 清理当前用户查询缓存并引导登录 |
| 表单字段非法 | Zod 即时提示，不提交无效表单 |
| 后端返回校验错误 | 显示字段级或表单级错误 |
| 推荐候选为空 | 显示可解释空状态，不显示崩溃页面 |
| 手机网络慢 | 显示加载状态，避免重复提交 |
| PWA 离线访问动态数据 | 不承诺可用，应提示需要网络 |

---

## Good / Base / Bad Cases

- Good：菜品列表、食谱、用餐记录、当前用户等服务端数据通过 TanStack Query 获取和刷新。
- Good：弹窗开关、当前 tab、盲盒动画状态使用 React 本地状态。
- Base：MVP 页面以手机布局为主，电脑端自然响应式兼容。
- Bad：把菜品列表和用餐记录放入 Redux/Zustand 作为真实数据源。
- Bad：前端把 JWT 存入 localStorage；本项目登录态使用 Session Cookie。
- Bad：MVP 承诺离线记录和自动同步。

---

## 测试要求

MVP 前端验证：

- TypeScript type-check。
- 移动端宽度 DevTools 检查。
- 手机真机访问。
- 表单校验手动检查。
- PWA 添加到桌面检查。

E2E 暂缓到核心流程稳定后补，优先覆盖：

```text
登录 -> 新增菜品 -> 记录用餐 -> 提交反馈 -> 获取推荐
```

---

## Wrong vs Correct

#### Wrong

```text
服务端数据 -> Zustand/Redux 全局 store -> 页面读取
```

问题：后端数据容易和前端缓存不同步。

#### Correct

```text
服务端数据 -> TanStack Query -> 页面读取
本地 UI 状态 -> useState/useReducer
```

原因：服务端数据和本地 UI 状态边界清晰，提交后可通过 query invalidation 刷新。
