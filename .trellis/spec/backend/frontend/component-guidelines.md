# Component Guidelines

> 前端组件以表单、业务面板和 UI 原子组件分层，样式统一使用 Tailwind。

## Overview

当前组件大致分三类：

- `ui.tsx`：通用基础组件（Button、Card、Input、Select、Spinner）
- 业务组件：`create-dish-form.tsx`、`meal-record-form.tsx`、`members-panel.tsx` 等
- 页面组件：`home-page.tsx`、`invite-page.tsx`

Reference files:
- `frontend/src/components/ui.tsx`
- `frontend/src/components/create-dish-form.tsx`
- `frontend/src/components/members-panel.tsx`

## Component Structure

当前稳定结构是：

- 页面组件负责状态编排与条件渲染
- 业务组件负责局部交互、表单、展示
- 通用 UI 组件负责最小视觉单元

如果一个组件既负责 API 调用、又负责复杂表单状态、还承担页面布局，说明它承担过多。

Reference files:
- `frontend/src/pages/home-page.tsx`
- `frontend/src/components/history-records-panel.tsx`

## Props Conventions

当前 props 以函数式回调为主，例如：

- `onSuccess`
- `onCancel`
- `onRecordDish`
- `onRecordChange`
- `onRetry`

表单组件通常接收默认值、错误状态、pending 状态和提交回调，而不是自己持有全局路由状态。

Reference files:
- `frontend/src/components/create-dish-form.tsx`
- `frontend/src/components/history-records-panel.tsx`

## Styling Patterns

样式统一使用 Tailwind：

- 通过 `className` 组合样式
- 不使用 CSS modules
- 自定义色板在 `frontend/src/index.css` 中通过 `@theme` / CSS 变量定义
- 组件保留中文 UI 文案，不要随意改成英文

Reference files:
- `frontend/src/index.css`
- `frontend/vite.config.ts`
- `frontend/src/components/ui.tsx`

## Accessibility

当前已有的 a11y 实践包括：

- 表单 label 与 input 通过 `id`/`htmlFor` 关联
- 交互按钮提供 `aria-label`
- tab 导航提供 `aria-current`
- `prefers-reduced-motion` 已在全局 CSS 中处理

Reference files:
- `frontend/src/index.css`
- `frontend/src/pages/home-page.tsx`
- `frontend/src/components/create-dish-form.tsx`

## Common Mistakes

### Don't: 在组件中直接写业务请求逻辑

当前模式是把请求放到 hook，组件只调用 hook。这样页面和组件更容易复用和测试。

### Don't: 忽略 pending / error 状态

当前 UI 组件大量使用 `Spinner`、`ErrorBanner`、`Button disabled`，新功能应保持一致，避免只做 happy path。

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:build
```
