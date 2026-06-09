# Quality Guidelines

> 前端质量以 TypeScript 类型检查和 Vite 构建为主，UI 一致性依赖现有组件模式。

## Overview

当前前端验证命令是：

- `pnpm frontend:typecheck`
- `pnpm frontend:test`
- `pnpm frontend:build`

前端单测使用 Vitest + React Testing Library + jsdom，质量保障来自类型系统、统一 API 客户端、hooks 测试、组件测试和现有 UI 模式。

Reference files:
- `frontend/package.json`
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`

## Code Standards

当前前端遵循以下规则：

- 所有请求走 `apiFetch`
- API 类型集中在 `api/types.ts`
- 表单组件保持 pending、error、disabled 处理
- 前端测试优先验证用户可见行为、hook endpoint/参数、API client 统一请求约定
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

## Scenario: Frontend Vitest and CI Quality Gate

### 1. Scope / Trigger

- Trigger: 前端新增 Vitest/RTL 测试命令，根目录新增 CI 流水线，属于命令签名与基础设施集成变更。
- Scope: `@watermenu/frontend` 测试配置、根 `package.json` 脚本、GitHub Actions 质量门禁。

### 2. Signatures

命令签名：

```bash
pnpm frontend:typecheck
pnpm frontend:test
pnpm frontend:build
pnpm backend:lint
pnpm backend:typecheck
pnpm backend:test
pnpm backend:build
```

前端测试配置签名：

```ts
// frontend/vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
```

### 3. Contracts

- Test runner: Vitest run mode 通过 `pnpm frontend:test` 执行。
- DOM environment: React component tests 必须运行在 `jsdom`。
- Setup file: `frontend/src/test/setup.ts` 负责导入 `@testing-library/jest-dom/vitest`。
- CI install: 使用 `pnpm install --frozen-lockfile`，依赖变更必须同步提交 `pnpm-lock.yaml`。
- Prisma: CI 在后端 lint/typecheck/test/build 前必须先执行 `pnpm backend:prisma:generate`。

### 4. Validation & Error Matrix

| Condition | Expected failure |
|---|---|
| 修改前端依赖但未提交 lockfile | CI install 在 `--frozen-lockfile` 失败 |
| 组件测试缺少 jsdom | RTL DOM 查询或浏览器 API 相关测试失败 |
| 未加载 jest-dom setup | `toBeInTheDocument` 等 matcher 不存在 |
| 后端构建前未生成 Prisma client | 后端 typecheck/build 可能找不到 Prisma 类型 |
| 测试绕过 `apiFetch` 约定 | API client 行为变更无法被前端测试及时捕获 |

### 5. Good/Base/Bad Cases

- Good: 新增 hook 或组件行为时，同步添加 Vitest/RTL 测试，并运行 `pnpm frontend:test`。
- Base: 只改展示文案或 README，至少确认现有 `pnpm frontend:test` 不回归。
- Bad: 只运行 `pnpm frontend:typecheck`，跳过测试和构建就认为前端质量已通过。

### 6. Tests Required

- API client: 断言 `/api` 前缀、`credentials: "same-origin"`、JSON header、FormData、错误响应。
- Hooks: 使用 `renderHook` 断言 query 参数正规化、mutation endpoint、缓存相关行为。
- Components: 使用 RTL 断言用户可见文本、表单提交、pending/error/disabled 分支或回调触发。
- CI: 流水线至少执行 install、Prisma generate、lint、typecheck、test、build。

### 7. Wrong vs Correct

#### Wrong

```bash
pnpm frontend:typecheck
```

只做类型检查就提交前端交互或测试基础设施变更。

#### Correct

```bash
pnpm frontend:typecheck
pnpm frontend:test
pnpm frontend:build
```

前端变更同时验证类型、行为测试与生产构建。

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:test
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
