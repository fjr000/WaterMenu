# Type Safety

> 前端类型集中在 `api/types.ts`，表单校验使用 Zod，表单状态管理使用 React Hook Form。

## Overview

当前类型体系分两层：

- API 类型层：`frontend/src/api/types.ts`
- 组件表单层：Zod schema + `react-hook-form` 推导类型

Reference files:
- `frontend/src/api/types.ts`
- `frontend/src/components/create-dish-form.tsx`
- `frontend/src/pages/invite-page.tsx`

## Type Organization

所有接口字段先定义到 `api/types.ts`，hooks 再引用这些类型。组件不应临时自己定义整个 response shape。

当前已有的核心类型包括：

- `Dish`
- `MealRecord`
- `Recipe`
- `Feedback`
- `Member`
- `WorkspaceInvite`
- `RecommendationCandidate`

Reference files:
- `frontend/src/api/types.ts`

## Validation

当前前端校验用 Zod，常见模式是：

- `z.object(...)` 定义输入结构
- `.trim().min(1, ...)` 处理空输入
- `.refine(...)` 处理跨字段规则
- `zodResolver(schema)` 接入 `react-hook-form`

Reference files:
- `frontend/src/pages/invite-page.tsx`
- `frontend/src/components/create-dish-form.tsx`

当业务字段需要多选时，当前做法是组件内维护可选值数组，并在提交前做额外检查。

Reference files:
- `frontend/src/components/create-dish-form.tsx`

## Common Patterns

稳定模式是：

- API 类型用于请求与响应
- Zod schema 用于表单校验
- TypeScript 推导 `z.infer<typeof schema>` 避免重复声明

Reference files:
- `frontend/src/pages/invite-page.tsx`
- `frontend/src/components/create-dish-form.tsx`

## Forbidden Patterns

### Don't: 使用 `as any`

当类型不对时，应去改 `api/types.ts`，而不是压制类型错误。

### Don't: 把 Zod schema 当作后端返回结构

Zod schema 当前用于表单校验，不等于 response schema。

Reference files:
- `frontend/src/api/types.ts`
- `frontend/src/pages/invite-page.tsx`

## Common Mistakes

### 新增字段时只改后端，不改前端类型

当前前端类型是手写维护的。后端字段变化后，前端需要同步更新 `api/types.ts`、hooks 和组件。

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:build
```
