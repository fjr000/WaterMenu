# Component Guidelines

> 前端组件以表单、业务面板和 UI 原子组件分层，样式统一使用 Tailwind。

## Overview

当前组件分成三类：

- `ui.tsx`：通用基础组件
- 业务组件：表单、面板、成员管理等
- 页面组件：首页、登录页、邀请页

Reference files:
- `frontend/src/components/ui.tsx`
- `frontend/src/components/create-dish-form.tsx`
- `frontend/src/pages/home-page.tsx`

## Component Structure

当前稳定结构是：

- 页面组件做状态编排和条件渲染
- 业务组件做局部交互
- 通用 UI 组件做最小视觉单元

如果一个组件同时负责 API 调用、复杂表单状态、页面布局，说明它承担过多。

Reference files:
- `frontend/src/pages/home-page.tsx`
- `frontend/src/components/history-records-panel.tsx`

## Props Conventions

当前 props 多采用回调函数，例如：

- `onSuccess`
- `onCancel`
- `onRecordDish`
- `onRetry`

表单组件通常接收默认值、错误状态、pending 状态和提交回调，不自己持有路由状态。

Reference files:
- `frontend/src/components/create-dish-form.tsx`
- `frontend/src/components/history-records-panel.tsx`

## Styling Patterns

样式统一用 Tailwind：

- 通过 `className` 组合
- 不使用 CSS modules
- 自定义色板定义在 `frontend/src/index.css`
- UI 文案保持中文

Reference files:
- `frontend/src/index.css`
- `frontend/vite.config.ts`
- `frontend/src/components/ui.tsx`

## Accessibility

当前已有的 a11y 做法包括：

- `label` + `htmlFor`
- `aria-label`
- `aria-current`
- 全局 `prefers-reduced-motion` 处理

Reference files:
- `frontend/src/index.css`
- `frontend/src/pages/home-page.tsx`
- `frontend/src/components/create-dish-form.tsx`

## Common Mistakes

### Don't: 在组件里直接写请求逻辑

请求应放 hook，组件只调用 hook。

### Don't: 忽略 pending / error

当前 UI 大量使用 `Spinner`、`ErrorBanner`、disabled 按钮，新功能也应保持一致。

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:build
```
