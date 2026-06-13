# Frontend Development Guidelines

> 前端开发规范基于当前 Vite + React + React Query + Tailwind 代码库。

## Overview

本目录记录 `@watermenu/frontend` 的现有前端约定。当前前端实现比较简单直接，不依赖自动生成代码或复杂状态机，核心是 API 类型统一、hooks 统一、页面组合统一。

当前前端主线模式是：

- `frontend/src/main.tsx` 控制登录与路由判断
- `frontend/src/api/client.ts` 统一请求封装
- `frontend/src/api/types.ts` 维护接口类型
- `frontend/src/hooks/` 负责 server-state 访问
- `frontend/src/components/` 放业务组件和通用 UI

Reference files:
- `frontend/src/main.tsx`
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/hooks/use-dishes.ts`
- `frontend/src/components/create-dish-form.tsx`

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | 页面、组件、hook、api 目录组织 | Filled |
| [Component Guidelines](./component-guidelines.md) | 组件分层、props、样式、a11y | Filled |
| [Hook Guidelines](./hook-guidelines.md) | React Query hooks 与缓存失效规则 | Filled |
| [State Management](./state-management.md) | server-state、auth context、局部 UI 状态 | Filled |
| [Quality Guidelines](./quality-guidelines.md) | 类型检查、构建验证、禁止行为 | Filled |
| [Type Safety](./type-safety.md) | API 类型、Zod、React Hook Form 推导 | Filled |
| [File Upload Guidelines](../backend/file-upload-guidelines.md) | 图片上传、压缩、格式支持（前后端共享） | Filled |
