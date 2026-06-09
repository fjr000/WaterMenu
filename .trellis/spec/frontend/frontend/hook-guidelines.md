# Hook Guidelines

> 前端使用 React Query 管理 server-state，hooks 是数据层核心。

## Overview

当前数据访问规则一致：

- GET 请求用 `useQuery`
- POST/PATCH/DELETE 用 `useMutation`
- mutation 成功后 invalidate 相关 query
- 401 统一清缓存

Reference files:
- `frontend/src/hooks/use-dishes.ts`
- `frontend/src/hooks/use-meal-records.ts`
- `frontend/src/hooks/use-auth.tsx`
- `frontend/src/main.tsx`

## Custom Hook Patterns

当前 hook 分两类：

- 数据 hook：封装 `apiFetch`、query key、失效逻辑
- 状态 hook：封装 auth context 或公共 UI 判断

新 hook 应保持一个文件一个职责，不把页面状态和 server-state 混在一起。

Reference files:
- `frontend/src/hooks/use-auth.tsx`
- `frontend/src/hooks/use-recommendations.ts`

## Data Fetching

当前稳定模式是：

- 请求和返回类型来自 `api/types.ts`
- query key 经过 normalize，避免无意义缓存不命中
- mutation 成功后连带失效依赖缓存

Reference files:
- `frontend/src/hooks/use-meal-records.ts`
- `frontend/src/hooks/use-dishes.ts`

401 处理分两层：

- React Query cache/mutation cache 捕获异常
- auth hook 负责维护登录态

Reference files:
- `frontend/src/main.tsx`
- `frontend/src/hooks/use-auth.tsx`

## Naming Conventions

当前命名约定是：

- 读取型：`use<Feature>`
- mutation 型：`useCreate<Feature>`、`useUpdate<Feature>`、`useDelete<Feature>`
- key 常量：`<feature>Key`

Reference files:
- `frontend/src/hooks/use-dishes.ts`
- `frontend/src/hooks/use-meal-records.ts`

## Common Mistakes

### Don't: 在组件里手拼缓存 key

当前 hook 已封装 key 与失效策略。组件手拼 key 时，通常说明逻辑应下沉到 hook。

### Don't: 忽略 loading/error

当前 hook 返回的 `isLoading`、`isPending`、`isError` 都要被页面消费。

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:build
```
