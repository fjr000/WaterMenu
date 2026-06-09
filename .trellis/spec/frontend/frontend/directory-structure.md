# Directory Structure

> 前端按页面 + hooks + components 组织，API 通信集中在 `src/api/`。

## Overview

当前前端没有独立 router，入口在 `frontend/src/main.tsx`，由轻量路径逻辑决定展示：

- `/invite/:token` → `InvitePage`
- 未登录 → `LoginPage`
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

职责划分明确：

- `api/client.ts` 统一请求封装
- `api/types.ts` 集中维护接口类型
- `hooks/` 封装 server-state
- `pages/` 负责页面组合
- `components/` 放业务组件和通用 UI

Reference files:
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/hooks/use-dishes.ts`
- `frontend/src/components/create-dish-form.tsx`

## Module Organization

新增功能优先走三层结构：

1. 在 `hooks/` 新建数据 hook
2. 在 `components/` 新建业务组件
3. 在 `pages/` 组合到页面

如果页面已经很长，优先提取组件，而不是让页面继续膨胀。

Reference files:
- `frontend/src/pages/home-page.tsx`
- `frontend/src/components/history-records-panel.tsx`
- `frontend/src/hooks/use-meal-records.ts`

## Naming Conventions

当前稳定命名约定是：

- 文件名使用 kebab-case
- hook 以 `use-` 开头
- 页面以 `-page.tsx` 结尾
- 组件按功能命名

Reference files:
- `frontend/src/hooks/use-auth.tsx`
- `frontend/src/pages/invite-page.tsx`
- `frontend/src/components/recommendation-panel.tsx`

## Common Mistakes

### Don't: 让组件直接写 fetch

所有请求应继续走 `apiFetch`，不要绕过统一客户端。

### Don't: 把页面状态、请求状态、全局状态混在一起

当前做法是分层存储，这样更容易控制缓存和 UI 切换。

Reference files:
- `frontend/src/api/client.ts`
- `frontend/src/pages/home-page.tsx`

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:build
```
