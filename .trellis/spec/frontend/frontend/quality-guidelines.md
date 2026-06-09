# Quality Guidelines

> 前端质量以 TypeScript 类型检查和 Vite 构建为主，UI 一致性依赖现有组件模式。

## Overview

当前前端验证命令是：

- `pnpm frontend:typecheck`
- `pnpm frontend:build`

没有独立前端单测套件，质量保障来自类型系统、统一 API 客户端和现有 UI 模式。

Reference files:
- `frontend/package.json`
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`

## Code Standards

当前前端遵循以下规则：

- 所有请求走 `apiFetch`
- API 类型集中在 `api/types.ts`
- 表单组件保持 pending、error、disabled 处理
- UI 文案使用中文

Reference files:
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/components/create-dish-form.tsx`

## Forbidden Patterns

### Don't: 使用 `any`

应保持类型明确，尤其在 hooks、API 返回值、组件 props。

### Don't: 绕过统一客户端写裸 fetch

`apiFetch` 已统一处理 `/api` 前缀、`credentials`、JSON header 和错误包装。绕过它会导致行为不一致。

Reference files:
- `frontend/src/api/client.ts`

### Don't: 靠字符串处理 API 数据

当字段变化时，应先改 `api/types.ts`，再更新 hooks 与组件。

## Common Mistakes

### 忘记同步类型

前端类型是手写维护的。新增或修改接口时，一定要同步更新 `api/types.ts`。

Reference files:
- `frontend/src/api/types.ts`

### 只测 happy path

当前表单和页面普遍有 pending、error、disabled 处理，新功能也要保持一致。

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:build
```

## Convention: Spec Bootstrap Readiness Gate

**What**: 当前端相关的 `.trellis/spec/` 占位内容全部补齐后，应同步更新对应 bootstrap 任务的完成状态，并进入收尾归档。

**Why**: 前端规范一旦从模板变成真实约定，就会影响后续前端实现与检查行为。如果此时 bootstrap 任务一直挂着，容易让 AI 误判项目还处于初始填充阶段。

**Example**:
```bash
grep -Rn 'To be filled\|Fill in each file\|placeholder' .trellis/spec/frontend
python3 ./.trellis/scripts/task.py finish
python3 ./.trellis/scripts/task.py archive 00-bootstrap-guidelines
```

**Good/Base/Bad**:
- Good: spec 已填完 -> PRD checklist 已更新 -> 收尾归档
- Base: spec 已填完，但 bootstrap checklist 没更新
- Bad: 还有占位内容，就声称 bootstrap 完成

**Tests Required / Assertion Points**:
- 确认前端 spec 不再包含占位文本
- 确认 `index.md` 状态已更新为 `Filled`
- 确认 bootstrap 任务可被正常 `finish` 与 `archive`

**Wrong vs Correct**:
- Wrong: 只写 spec，不闭环任务状态
- Correct: 写 spec + 更新 checklist + 验证 + 归档
