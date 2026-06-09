# State Management

> 前端以 React Query 作为 server-state 层，页面局部状态用 React state。

## Overview

当前没有引入全局状态管理库。主要状态来源有三个：

- React Query：API 数据与缓存
- React state：页面 UI 切换
- Auth context：当前用户与 workspace

Reference files:
- `frontend/src/hooks/use-auth.tsx`
- `frontend/src/hooks/use-dishes.ts`
- `frontend/src/pages/home-page.tsx`

## Local State

当前页面局部状态用于：

- 当前 tab
- 是否展开表单
- 当前选中对象（dish、recipe、image）
- 筛选条件

Reference files:
- `frontend/src/pages/home-page.tsx`

这些状态不适合提升到全局。

## Global State

当前唯一需要全局共享的是 auth 信息，通过 `AuthProvider` 向下传递：

- `user`
- `workspace`
- `isLoading`
- `logout`

Reference files:
- `frontend/src/hooks/use-auth.tsx`
- `frontend/src/main.tsx`

## Server State

server-state 的原则是：

- 不复制到组件局部变量长期保存
- 用 query key 区分查询条件
- mutation 成功后通过 `invalidateQueries` 同步最新状态

Reference files:
- `frontend/src/hooks/use-meal-records.ts`
- `frontend/src/hooks/use-dishes.ts`

## Common Mistakes

### Don't: 把 server-state 和 UI 状态混在一起

当前代码库分层存储，便于缓存和重试。不要把 API 结果、筛选条件、弹窗开关全部塞进同一个 `useState`。

### Don: 在已使用 React Query 时再自造 store

当前项目已用 React Query 管理 API 数据。除非有明确跨页面本地状态需求，不应再引入额外 store。

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:build
```
