# Hook Guidelines

> 前端使用 React Query 管理 server-state，hooks 是数据层核心。

## Overview

当前数据访问规则非常一致：

- GET 请求用 `useQuery`
- POST/PATCH/DELETE 请求用 `useMutation`
- 成功后 invalidate 相关 query
- 401 统一触发清缓存

Reference files:
- `frontend/src/hooks/use-dishes.ts`
- `frontend/src/hooks/use-meal-records.ts`
- `frontend/src/hooks/use-auth.tsx`
- `frontend/src/main.tsx`

## Custom Hook Patterns

当前 hook 分两类：

1. 数据 hook：封装 `apiFetch`、query key、缓存失效
2. 状态 hook：封装 auth 上下文与公共判断逻辑

新 hook 应保持一个文件一个职责，不把页面状态和 server-state 混在一起。

Reference files:
- `frontend/src/hooks/use-auth.tsx`
- `frontend/src/hooks/use-recommendations.ts`

## Data Fetching

当前稳定模式：

- 请求类型和返回类型统一来自 `api/types.ts`
- query key 使用 normalize 后的对象，避免无意义缓存不命中
- mutation 成功后同时失效依赖缓存，例如记录变化后连带失效 `["dishes"]`

Reference files:
- `frontend/src/hooks/use-meal-records.ts`
- `frontend/src/hooks/use-dishes.ts`

当前 401 处理分两层：

- React Query 全局 cache/mutation cache 捕获 401
- auth hook 专门维护 `authMeKey`

Reference files:
- `frontend/src/main.tsx`
- `frontend/src/hooks/use-auth.tsx`

## Naming Conventions

当前命名规则是：

- 读取型 hook 用 `use<Feature>`
- mutation hook 用 `useCreate<Feature>`、`useUpdate<Feature>`、`useDelete<Feature>`
- key 常量通常命名为 `<feature>Key`

Reference files:
- `frontend/src/hooks/use-dishes.ts`
- `frontend/src/hooks/use-meal-records.ts`

## Common Mistakes

### Don't: 在组件中手写缓存 key 和失效逻辑

当前 hook 已经封装了 query key 和失效策略。如果组件开始手拼 key，通常意味着可以抽到 hook 里。

### Don't: 忘记处理错误和 pending

当前 UI 依赖 `isLoading`、`isPending`、`isError` 来控制显示。不要只取 `data` 而忽略这些状态。

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:build
```
