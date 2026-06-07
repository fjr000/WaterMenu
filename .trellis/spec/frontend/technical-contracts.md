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
      queryClient.clear();
      queryClient.setQueryData(authMeKey, null);
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
