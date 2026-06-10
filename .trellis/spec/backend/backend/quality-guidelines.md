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

## Scenario: Production Healthcheck and Compose Gate

### 1. Scope / Trigger

- Trigger: 新增或修改生产部署健康检查、Compose 服务依赖、后端公开健康接口。
- Scope: 后端 `/api/health`、`docker-compose.prod.yml` backend healthcheck、Nginx 对 backend 的启动依赖。

### 2. Signatures

后端健康检查 API：

```http
GET /api/health
```

期望响应：

```json
{ "status": "ok" }
```

生产 Compose 健康检查签名：

```yaml
backend:
  healthcheck:
    test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]
nginx:
  depends_on:
    backend:
      condition: service_healthy
```

### 3. Contracts

- `/api/health` 必须公开可访问，不依赖 session、Prisma 或业务 workspace 数据。
- `/api/health` 成功时返回 HTTP 200，body 至少包含 `status: "ok"`。
- backend 容器 healthcheck 必须访问容器内部 `127.0.0.1:3000/api/health`，避免依赖 Nginx 或外部网络。
- Nginx 生产服务应等待 backend `service_healthy`，避免后端未就绪时提前对外代理。
- 生产验证文档应包含 `https://<domain>/api/health` 检查步骤。

### 4. Validation & Error Matrix

| Condition | Expected failure |
|---|---|
| `/api/health` 未注册在 `AppModule` | e2e 测试返回 404 |
| `/api/health` 被 auth guard 保护 | 未登录健康检查返回 401，容器 healthcheck 失败 |
| healthcheck 指向 `/health` 而不是 `/api/health` | Compose backend 健康检查失败 |
| Nginx 只依赖 backend 启动而非 healthy | 后端启动中时 Nginx 可能提前接流量 |
| 文档未说明健康检查 | 上线验证遗漏部署就绪检查 |

### 5. Good/Base/Bad Cases

- Good: 新增健康接口时同步添加 e2e、Compose healthcheck、Nginx `service_healthy` 依赖和部署文档。
- Base: 只添加 `/api/health` 和 e2e，用于本地/API 层验证。
- Bad: 只在 Dockerfile 或 Compose 里写健康检查，但没有后端测试覆盖对应 endpoint。

### 6. Tests Required

- E2E: `GET /api/health` 返回 `200` 和 `{ status: "ok" }`。
- Compose: `docker compose -f docker-compose.prod.yml config` 能解析生产配置。
- Build: `docker compose -f docker-compose.prod.yml build` 能构建 backend 与 nginx 镜像。
- Nginx: 使用临时证书或真实证书执行 `nginx -t`，确认配置语法有效。

### 7. Wrong vs Correct

#### Wrong

```yaml
nginx:
  depends_on:
    - backend
```

只等待容器启动，不等待后端健康。

#### Correct

```yaml
nginx:
  depends_on:
    backend:
      condition: service_healthy
```

由后端 `/api/health` 决定 Nginx 是否进入依赖就绪状态。

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
