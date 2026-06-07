# 前端 Hook 规范

> 基于 `frontend/src/hooks/` 的真实源码，记录当前 Hook 实现模式、数据获取方式和副作用封装。

---

## 当前状态

- 技术栈：React 19 + TanStack Query 5
- 服务端数据：TanStack Query 管理
- 本地 UI 状态：React useState/useReducer
- 自定义 Hooks：在 `src/hooks/` 目录，使用 kebab-case 命名

---

## Hook 分层

### 数据获取 Hooks

- `use-dishes.ts`：菜品 CRUD 操作
- `use-meal-records.ts`：用餐记录查询、创建与反馈 upsert 操作
- `use-recommendations.ts`：推荐和盲盒操作

### 状态管理 Hooks

- `use-auth.tsx`：认证状态管理，包含 AuthProvider 和 useAuth

---

## 数据获取模式

### TanStack Query Hook

```typescript
import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";

// Query Key 定义
const dishesKey = (mealType?: MealType): QueryKey => [
  "dishes",
  mealType ?? null,
];

// 查询 Hook
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

// 变更 Hook
export function useCreateDish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateDishRequest) =>
      apiFetch<Dish>("/dishes", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      // 变更成功后失效相关查询
      void queryClient.invalidateQueries({ queryKey: ["dishes"] });
    },
  });
}
```

### 认证状态 Hook

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

### 全局 401 处理

- 在 `QueryClient` 的 `QueryCache` 与 `MutationCache` 注册统一 `onError`。
- 任一服务端查询或变更返回 401 时，将 `authMeKey` 设为 `null`，并移除非 `auth` 查询缓存。
- 登录失败的 401 仍由登录页 mutation 的 `onError` 显示“邮箱或密码错误”。

---

## Query Key 约定

- 使用数组形式：`["dishes", mealType]`
- 参数为可选时使用 `null`：`["dishes", mealType ?? null]`
- 用餐记录列表使用稳定 key：`["meal-records"]`
- 变更时失效相关查询：`queryClient.invalidateQueries({ queryKey: ["dishes"] })`、`queryClient.invalidateQueries({ queryKey: ["meal-records"] })`
- 对推荐 / 盲盒这类用户主动触发的 mutation 结果，相关历史数据变更后不能只依赖 query invalidation；页面层需要 reset mutation 结果或重新触发，避免展示明显陈旧的候选。

---

## Good / Base / Bad Cases

- Good：服务端数据通过 TanStack Query 获取和缓存
- Good：变更成功后失效相关查询，自动刷新列表
- Good：创建用餐记录或提交反馈后刷新 `meal-records` 查询，并由页面层处理推荐 / 盲盒 mutation 结果是否需要 reset。
- Good：认证状态使用 Context + Query 组合
- Base：复杂逻辑可以封装到自定义 Hook
- Bad：把服务端数据复制到本地状态
- Bad：在组件中直接调用 apiFetch
- Bad：手动管理缓存失效

---

## 常见错误

### 错误：退出登录时清空整个 QueryClient

**症状**：点击“退出”后后端 session 已失效，刷新会回到登录页，但当前页面不会立即切换到登录页。

**原因**：`queryClient.clear()` 会清理 QueryCache，可能让当前 `useQuery(authMeKey)` observer 无法收到后续 `setQueryData(authMeKey, null)` 的通知。

**修复**：先更新认证查询，再移除非 `auth` 的业务查询缓存；不要在 logout 中调用 `queryClient.clear()`。

```typescript
// Bad
queryClient.clear();
queryClient.setQueryData(authMeKey, null);

// Good
queryClient.setQueryData(authMeKey, null);
queryClient.removeQueries({
  predicate: (query) => query.queryKey[0] !== "auth",
});
```

### 错误：在组件中直接调用 API

```typescript
// Bad
function DishList() {
  const [dishes, setDishes] = useState([]);
  useEffect(() => {
    apiFetch("/dishes").then(setDishes);
  }, []);
}

// Good
function DishList() {
  const { data: dishes } = useDishes();
}
```

### 错误：忘记失效查询

```typescript
// Bad
useMutation({
  mutationFn: (body) => apiFetch("/dishes", { method: "POST", body: JSON.stringify(body) }),
});

// Good
useMutation({
  mutationFn: (body) => apiFetch("/dishes", { method: "POST", body: JSON.stringify(body) }),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ["dishes"] });
  },
});
```

### 错误：历史数据变了但推荐 mutation 结果仍停留

**症状**：用户把推荐菜记录为已吃后，页面上的推荐 / 盲盒结果仍显示刚吃过的菜；或反馈改变权重后旧候选仍作为当前结果展示。

**原因**：推荐和盲盒是 `useMutation` 主动触发结果，不是带 query key 的服务端列表；`invalidateQueries({ queryKey: ["meal-records"] })` 只会刷新记录列表，不会自动清空 mutation 的 `data`。

**修复**：用餐记录或反馈成功后，除刷新 `meal-records`，页面层还要 reset 推荐 / 盲盒 mutation 结果，或明确重新触发推荐。

```typescript
// Good
const resetRecommendationState = () => {
  recommendMutation.reset();
  blindBoxMutation.reset();
};

const handleRecordSuccess = () => {
  setRecordDish(null);
  resetRecommendationState();
};
```

MVP 优先 reset，不自动重跑推荐；自动重跑容易让盲盒结果无提示改变。
