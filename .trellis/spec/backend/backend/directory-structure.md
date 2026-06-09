# Directory Structure

> 后端按 NestJS feature module 组织，业务代码集中在 `backend/src/`。

## Overview

当前后端没有独立的 `controllers/`、`services/`、`models/` 顶层目录，模块边界按业务域拆分。默认模式是：

- `src/<feature>/` 一个目录对应一个业务模块
- `src/<feature>/<feature>.module.ts` 定义 Nest module
- `src/<feature>/<feature>.controller.ts` 定义 HTTP 边界
- `src/<feature>/<feature>.service.ts` 放业务逻辑
- `src/<feature>/dto/` 放入参校验对象

Reference files:
- `backend/src/app.module.ts`
- `backend/src/dishes/dishes.module.ts`
- `backend/src/recipes/recipes.module.ts`
- `backend/src/invites/invites.module.ts`

## Current Layout

```
backend/src/
  main.ts
  app.module.ts
  app.setup.ts
  auth/
  dishes/
  dish-images/
  meal-records/
  feedback/
  recipes/
  recommendations/
  members/
  invites/
  prisma/
  session/
```

跨模块共享基础设施放在这两个目录：

- `src/prisma/`：共享数据库连接与模块
- `src/session/`：session cookie 与 express-session 配置

Reference files:
- `backend/src/prisma/prisma.module.ts`
- `backend/src/prisma/prisma.service.ts`
- `backend/src/session/session.config.ts`

## Module Rules

新功能优先新建 feature 目录，而不是把逻辑塞进现有模块。当前目录已按边界拆分，不要把 controller/service/dto 混进共享目录。

推荐顺序：

1. `controller.ts` 定义路由和入参边界
2. `service.ts` 封装 Prisma 查询和业务规则
3. `module.ts` 注册 controller、service、必要 provider
4. `dto/*.ts` 定义 `class-validator` + `class-transformer` 输入对象

Reference files:
- `backend/src/dishes/dishes.controller.ts`
- `backend/src/dishes/dishes.service.ts`
- `backend/src/dishes/dto/create-dish.dto.ts`

## Naming Conventions

当前命名约定已经统一：

- 文件名用 kebab-case
- 模块名用 feature 名单数形式（`dishes`, `recipes`, `meal-records`）
- DTO 以 `create-*`, `update-*`, `list-*`, `upsert-*` 前缀区分用途
- `AuthGuard` 是全局鉴权常用对象，放入 `auth/auth.guard.ts`

Reference files:
- `backend/src/auth/auth.guard.ts`
- `backend/src/meal-records/dto/create-meal-record.dto.ts`
- `backend/src/meal-records/dto/list-meal-records-query.dto.ts`

## Common Mistakes

### Don't: 把业务规则放进 controller

当前 controller 主要做两件事：

- 从 session 中取 `userId`
- 转发参数给 service

如果 controller 开始直接查询 Prisma 或拼业务条件，说明拆分失败。

Instead:
- controller 只负责边界转译
- service 负责 workspace 校验、查询条件、返回值组装

Reference files:
- `backend/src/dishes/dishes.controller.ts`
- `backend/src/dishes/dishes.service.ts`

### Don't: 把数据库逻辑分散到多个地方

当前模式是 service 内部统一查 `workspaceId`，再统一构造 `where`。不要在 controller、module、middleware 中各自重复拼查询条件。

## Verification

```bash
pnpm backend:typecheck
pnpm backend:test
```
