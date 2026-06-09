# Quality Guidelines

> 前端质量以 TypeScript 类型检查和 Vite 构建为主，UI 一致性依赖现有组件模式。

## Overview

当前前端验证命令是：

- `pnpm frontend:typecheck`
- `pnpm frontend:build`

没有独立前端单测套件，质量保障主要来自类型系统、API 类型对齐、以及现有 UI 模式。

Reference files:
- `frontend/package.json`
- `frontend/src/api/types.ts`
- `frontend/src/api/client.ts`

## Code Standards

当前前端遵循以下规则：

- 所有请求走 `apiFetch`
- 所有 API 类型集中在 `api/types.ts`
- 表单组件保持受控模式，错误和 pending 状态要展示
- UI 文案使用中文，不要随意英文化

Reference files:
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/components/create-dish-form.tsx`

## Forbidden Patterns

### Don't: 使用 `any`

当前前端应保持类型明确，尤其是 API 返回值和 hook 入参出参。

### Don't: 绕过统一客户端写裸 fetch

`apiFetch` 已统一处理 `/api` 前缀、`credentials`、JSON header 和错误包装。绕过它会导致行为不一致。

Reference files:
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`

### Don't: 直接假设后端返回字段名

当后端字段变化时，应先改 `api/types.ts`，再更新 hooks 与组件。不要在组件内部靠字符串匹配修数据。

## Common Mistakes

### 忘记同步类型

前端类型是手写维护的，不是自动生成。新增或改接口时，一定要同步更新 `api/types.ts`。

Reference files:
- `frontend/src/api/types.ts`

### 只测 happy path UI

当前表单常见模式都有 pending、error、disabled 状态处理。新功能也应保持一致，避免按钮点了没反馈。

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:build
```
