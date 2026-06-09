# Frontend Development Guidelines

> 前端开发规范基于当前 Vite + React + React Query + Tailwind 代码库。

## Overview

本目录记录 `@watermenu/frontend` 在后端包上下文中的前端约定。当前前端没有独立路由库，也没有自动生成类型层，风格以轻量、集中、手写维护为主。

当前前端主线模式是：

- 所有请求经 `apiFetch`
- API 类型集中在 `api/types.ts`
- React Query 管理 server-state
- 页面负责状态组合，hooks 负责数据访问
- 表单使用 React Hook Form + Zod

Reference files:
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/hooks/use-meal-records.ts`
- `frontend/src/pages/home-page.tsx`

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | 页面、组件、hook、api 目录组织 | Filled |
| [Component Guidelines](./component-guidelines.md) | 组件分层、props、样式、a11y | Filled |
| [Hook Guidelines](./hook-guidelines.md) | React Query hooks 与缓存失效规则 | Filled |
| [State Management](./state-management.md) | server-state、auth context、局部 UI 状态 | Filled |
| [Quality Guidelines](./quality-guidelines.md) | 类型检查、构建验证、禁止行为 | Filled |
| [Type Safety](./type-safety.md) | API 类型、Zod、React Hook Form 推导 | Filled |
