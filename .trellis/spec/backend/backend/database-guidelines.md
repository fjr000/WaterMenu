# Database Guidelines

> 后端使用 Prisma 操作 PostgreSQL，所有业务数据按 workspace 隔离。

## Overview

当前数据库访问通过 `PrismaService` 完成，模型定义在 `backend/prisma/schema.prisma`。Session 表不在 Prisma schema 中，而是由 `connect-pg-simple` 自动创建。

Reference files:
- `backend/prisma/schema.prisma`
- `backend/prisma/prisma.config.ts`
- `backend/src/prisma/prisma.service.ts`
- `backend/README.md`

## Query Patterns

所有业务查询必须先解析当前用户所属 `workspaceId`，再把该字段加入查询条件。当前服务层的稳定模式是：

1. `userId -> workspaceId`
2. 创建时写入 `workspaceId`
3. 列表/详情/更新/删除都加 `workspaceId`
4. 跨 workspace 资源统一视为不存在或无权访问

Reference files:
- `backend/src/dishes/dishes.service.ts`
- `backend/src/meal-records/meal-records.service.ts`
- `backend/src/dish-images/dish-images.service.ts`

当前列表查询优先使用明确排序，而不是依赖数据库默认顺序。例如菜品按 `updatedAt`、`createdAt`、`id` 稳定排序。

Reference files:
- `backend/src/dishes/dishes.service.ts`
- `backend/src/meal-records/meal-records.service.ts`

## Migrations

Migration 由 Prisma 管理，本地使用：

```bash
pnpm backend:prisma:migrate
```

部署目标使用：

```bash
pnpm --filter @watermenu/backend prisma:deploy
```

`backend/prisma.config.ts` 中还配置了 seed 命令，因此本地初始化常用链路为：

```bash
pnpm backend:prisma:generate
pnpm backend:prisma:migrate
pnpm backend:prisma:seed
```

Reference files:
- `backend/prisma.config.ts`
- `backend/prisma/seed.ts`
- `backend/README.md`

## Naming Conventions

当前 schema 采用以下约定：

- 表名用 `@@map(...)` 转成 snake_case 复数形式（`workspaces`, `dishes`, `meal_records`）
- 字段名保持 Prisma camelCase
- 枚举名用 PascalCase（`MealType`, `FeedbackRating`, `UserRole`）
- 关系字段保持业务语义（`createdByUserId`, `usedByUserId`）

Reference files:
- `backend/prisma/schema.prisma`

## Transactions

当前项目在以下场景使用事务：

- 邀请接受：创建用户并标记邀请已使用，要求原子完成
- 封面图切换：先清除旧封面，再设置新封面
- 图片创建：先检查图片数量上限，再写入记录；失败时清理已写入文件

如果多个写操作需要一致成功或失败，应放在 `$transaction` 内。

Reference files:
- `backend/src/invites/invites.service.ts`
- `backend/src/dish-images/dish-images.service.ts`

## Common Mistakes

### Don't: 忘记 workspaceId

常见错误是只按 `id` 查询，而不检查资源是否属于当前 workspace。当前代码库统一避免了这种模式。

Instead:
- 创建时写入 `workspaceId`
- 读写时同时过滤 `id` 与 `workspaceId`

### Don't: 把 Session 当业务模型迁移

Session 数据属于基础设施，当前不进 Prisma schema，而是通过 PostgreSQL session store 自动建表。

Reference files:
- `backend/README.md`
- `backend/src/session/session.config.ts`

## Verification

```bash
pnpm backend:typecheck
pnpm backend:test
pnpm backend:prisma:migrate
```
