# Directory Structure

> 前端按页面 + hooks + components 组织，API 通信集中在 `src/api/`。

## Overview

当前前端没有 router 库，入口在 `frontend/src/main.tsx`，由轻量路径判断决定展示：

- 未登录 → `LoginPage`
- `/invite/:token` → `InvitePage`
- 已登录 → `HomePage`

Reference files:
- `frontend/src/main.tsx`
- `frontend/src/pages/home-page.tsx`
- `frontend/src/pages/login-page.tsx`
- `frontend/src/pages/invite-page.tsx`

## Current Layout

```
frontend/src/
  api/
  components/
  hooks/
  pages/
  index.css
  main.tsx
```

职责划分很明确：

- `api/client.ts` 负责统一请求封装
- `api/types.ts` 集中维护响应与请求类型
- `hooks/` 封装 server-state 读写
- `pages/` 组合 hook 和组件，承担页面状态编排
- `components/` 放可复用 UI，尤其是表单和业务面板

Reference files:
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/hooks/use-dishes.ts`
- `frontend/src/components/create-dish-form.tsx`

## Module Organization

新增前端功能时，优先沿用现有三层结构：

1. 在 `hooks/` 补数据 hook
2. 在 `components/` 补业务组件
3. 在 `pages/` 组合到页面

如果页面已经过长，优先提取组件；不要把 hook 逻辑直接堆进页面。

Reference files:
- `frontend/src/pages/home-page.tsx`
- `frontend/src/components/history-records-panel.tsx`
- `frontend/src/hooks/use-meal-records.ts`

## Naming Conventions

当前命名规则稳定：

- 文件名用 kebab-case
- hook 文件以 `use-` 开头
- 页面文件以 `-page.tsx` 结尾
- 组件文件按功能命名，例如 `create-dish-form.tsx`、`recipe-panel.tsx`

Reference files:
- `frontend/src/hooks/use-auth.tsx`
- `frontend/src/pages/invite-page.tsx`
- `frontend/src/components/recommendation-panel.tsx`

## Common Mistakes

### Don't: 在页面里写全部逻辑

`home-page.tsx` 已经很长，但它仍然主要做状态组合。如果新增逻辑复杂，应拆到组件或 hook，而不是继续膨胀页面文件。

### Don't: 让组件直接拼 `fetch`

当前所有请求都经过 `apiFetch`。新功能应继续走统一客户端，不要绕过它。

Reference files:
- `frontend/src/api/client.ts`
- `frontend/src/hooks/use-dishes.ts`

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:build
```
