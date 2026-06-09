# Quality Guidelines

> 后端质量以 TypeScript 类型检查和 Jest e2e 测试为主。

## Overview

当前质量流程是：

- `pnpm backend:typecheck` 检查类型
- `pnpm backend:test` 运行 Jest 测试
- e2e 测试优先覆盖鉴权、workspace 隔离、DTO 校验和业务边界

Reference files:
- `backend/package.json`
- `backend/test/dishes.e2e-spec.ts`
- `backend/test/members-invites.e2e-spec.ts`

## Testing Patterns

当前测试不连真实数据库，而是用 Nest testing module 替换 `PrismaService`。测试自己维护 mock store，按用例重置状态。

Reference files:
- `backend/test/dishes.e2e-spec.ts`
- `backend/test/members-invites.e2e-spec.ts`

登录模拟通过请求头注入：

- 测试中间件读取 `x-test-user-id`
- 将该 id 写入 `request.session.userId`

这种方式允许一个测试文件覆盖多个角色，而无需真正登录。

Reference files:
- `backend/test/dishes.e2e-spec.ts`
- `backend/test/members-invites.e2e-spec.ts`

## API Coverage Expectations

新接口建议至少覆盖：

1. 未登录返回 `401`
2. 普通成员越权返回 `403`（如果需要）
3. 跨 workspace 访问返回 `404`
4. 非法输入返回 `400`
5. 唯一冲突返回 `409`（如果业务存在唯一约束）

Reference files:
- `backend/test/dishes.e2e-spec.ts`
- `backend/test/members-invites.e2e-spec.ts`

## Code Standards

当前代码风格遵循以下约定：

- DTO 使用 `class-validator` 与 `class-transformer`
- 全局启用 `ValidationPipe`，并开启 `whitelist` 和 `forbidNonWhitelisted`
- controller 尽量保持薄层，只取 session 参数和转发请求
- service 承担查询构造、workspace 校验、结果拼装

Reference files:
- `backend/src/app.setup.ts`
- `backend/src/dishes/dishes.controller.ts`
- `backend/src/dishes/dishes.service.ts`
- `backend/src/dishes/dto/create-dish.dto.ts`

## Forbidden Patterns

### Don't: 在 controller 中直接查 Prisma

当前项目中 controller 主要做参数边界处理，不直接执行复杂数据库逻辑。

### Don: 用真实数据库依赖替代 mock 测试

当前后端测试风格是 mock `PrismaService`，保持测试快速、可重复。除非必要，不要引入完整数据库集成测试作为默认方式。

### Don't: 只测 happy path

当前稳定模块通常都会测鉴权失败、workspace 隔离、DTO 非法值。新功能也应遵循这个基线。

## Common Mistakes

### 忘记更新测试 mock 语义

mock 实现要覆盖真正 Prisma 查询使用到的字段，例如 `where.workspaceId`、`where.id`、`select`。只测返回形状，不测查询条件，会导致假绿。

### 只看 Swagger 不看测试

Swagger 可以辅助查看接口定义，但当前行为基线仍在 Jest e2e 测试里。

Reference files:
- `backend/src/app.setup.ts`
- `backend/test/dishes.e2e-spec.ts`

## Verification

```bash
pnpm backend:typecheck
pnpm backend:test
```

## Convention: Spec Bootstrap Readiness Gate

**What**: 当 `00-bootstrap-guidelines` 的 `.trellis/spec/` 全部填写完成且无占位文本后，该任务应立即进入收尾流程，而不是继续停在 `in_progress`。

**Why**: Trellis bootstrap 任务的价值不是“写过一些规范”，而是让后续 `trellis-implement` / `trellis-check` 真正拿到可执行约定。如果规范已完成但任务未归档，后续上下文会一直携带一个未闭合的初始化任务。

**Example**:
```bash
grep -Rn 'To be filled\|Fill in each file\|placeholder' .trellis/spec
python3 ./.trellis/scripts/task.py finish
python3 ./.trellis/scripts/task.py archive 00-bootstrap-guidelines
```

**Good/Base/Bad**:
- Good: spec 已填完 -> `finish` -> `archive` -> bootstrap 任务闭合
- Base: spec 已填完，但仍停在 `in_progress`
- Bad: spec 仍有占位内容，却直接归档 bootstrap 任务

**Tests Required / Assertion Points**:
- 确认 `grep` 不再返回占位文本
- 确认 `index.md` 中的状态已从 `To fill` 更新为 `Filled`
- 确认 `task.py finish` 和 `task.py archive` 可按顺序执行

**Wrong vs Correct**:
- Wrong: 只更新 spec 内容，不更新 PRD checklist 和任务状态
- Correct: 更新 spec -> 更新 checklist -> 验证无占位 -> `finish` -> `archive`
