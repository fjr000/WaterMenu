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

### 全局 401 处理

- 在 `QueryClient` 的 `QueryCache` 与 `MutationCache` 注册统一 `onError`。
- 任一服务端查询或变更返回 401 时，将 `authMeKey` 设为 `null`，并移除非 `auth` 查询缓存。
- 登录失败的 401 仍由登录页 mutation 的 `onError` 显示“邮箱或密码错误”。

---

## Query Key 约定

- 使用数组形式：`["dishes", mealType]`
- 参数为可选时使用 `null`：`["dishes", mealType ?? null]`
- 变更时失效相关查询：`queryClient.invalidateQueries({ queryKey: ["dishes"] })`

---

## Good / Base / Bad Cases

- Good：服务端数据通过 TanStack Query 获取和缓存
- Good：变更成功后失效相关查询，自动刷新列表
- Good：认证状态使用 Context + Query 组合
- Base：复杂逻辑可以封装到自定义 Hook
- Bad：把服务端数据复制到本地状态
- Bad：在组件中直接调用 apiFetch
- Bad：手动管理缓存失效

---

## 常见错误

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
