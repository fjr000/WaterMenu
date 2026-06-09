# Error Handling

> 后端错误按 NestJS 异常体系处理，前端只能看到 HTTP status 与可读文本。

## Overview

当前项目不自定义统一错误 JSON 格式，而是直接使用 Nest 内置异常。关键规则是：

- 未登录 → `UnauthorizedException`
- 非管理员访问管理接口 → `ForbiddenException`
- 资源不存在或不属于当前 workspace → `NotFoundException`
- 唯一约束冲突 → `ConflictException`
- DTO 不合法由 `ValidationPipe` 自动返回 `400`

Reference files:
- `backend/src/app.setup.ts`
- `backend/src/auth/auth.guard.ts`
- `backend/src/dishes/dishes.service.ts`
- `backend/src/invites/invites.service.ts`

## Error Types

当前业务中主要错误类型来源有两个：

1. Nest 异常：`UnauthorizedException`、`ForbiddenException`、`NotFoundException`、`ConflictException`、`BadRequestException`
2. Prisma 错误：`Prisma.PrismaClientKnownRequestError`，当前项目主要处理 `P2002`

Reference files:
- `backend/src/dishes/dishes.service.ts`
- `backend/src/invites/invites.service.ts`

## Error Handling Patterns

Service 层负责把底层错误转成业务语义。当前常见模式是：

- 先校验当前用户和 workspace 存在性
- 再执行 Prisma 查询
- 对于跨 workspace 结果直接返回 `404`
- 对于唯一约束错误捕获后返回 `409`

Reference files:
- `backend/src/dishes/dishes.service.ts`
- `backend/src/invites/invites.service.ts`

controller 层不要自己编排复杂错误逻辑。当前 controller 通常只接收请求、取 `userId`，然后让 service 处理异常。

Reference files:
- `backend/src/dishes/dishes.controller.ts`
- `backend/src/auth/auth.controller.ts`

## API Error Responses

当前项目没有自定义统一 error body。前端统一依赖 HTTP status code，客户端实现为：

- 非 2xx 响应会被包装成 `ApiError(status, text)`
- 401 会触发前端清缓存和跳转登录态逻辑

Reference files:
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/main.tsx`

因此后端新增接口时，应优先复用现有 Nest 异常语义，而不是自造错误结构。

## Common Mistakes

### Don't: 对跨 workspace 错误返回 403 或 401

当前项目更倾向返回 `NotFoundException`，避免暴露“资源存在但不属于你”。

Instead:
- 资源不存在 → `NotFoundException`
- 明确是管理权限不足 → `ForbiddenException`
- 明确是未登录 → `UnauthorizedException`

### Don't: 在 controller 中直接 catch Prisma 错误

当前稳定模式是在 service 层处理 Prisma 错误映射，例如唯一约束冲突转 `ConflictException`。

Reference files:
- `backend/src/dishes/dishes.service.ts`
- `backend/src/invites/invites.service.ts`

## Verification

```bash
pnpm backend:typecheck
pnpm backend:test
```
