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

## Scenario: Dish Variant Ownership and Meal Record Linkage

### 1. Scope / Trigger

- Trigger: 新增 `DishVariant` 模型、`MealRecord.variantId` 字段，或修改菜品版本/来源相关 API。
- Scope: `backend/prisma/schema.prisma`、`DishVariant` 相关 service/controller、`MealRecord` 创建与列表返回结构。

### 2. Signatures

Prisma schema 签名：

```prisma
model DishVariant {
  id          String          @id @default(cuid())
  workspaceId String
  dishId      String
  name        String
  type        DishVariantType @default(OTHER)
  isActive    Boolean         @default(true)

  @@unique([dishId, name])
}

model MealRecord {
  dishId    String?
  variantId String?
  variant   DishVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
}
```

API 签名：

```http
GET /api/dishes/:dishId/variants
POST /api/dishes/:dishId/variants
PATCH /api/dish-variants/:id
POST /api/meal-records
```

### 3. Contracts

- `DishVariant` 必须同时保存 `workspaceId` 与 `dishId`，不能只依赖 `dishId` 间接推断 workspace。
- 同一 `dishId` 下 `name` 唯一；不同菜品允许同名版本。
- `POST /api/meal-records` 请求里：
  - `dishId` 可空
  - `variantId` 可空
  - 只要传 `variantId`，就必须同时传匹配的 `dishId`
- `variantId` 命中记录时必须满足：属于当前 `workspaceId`、属于当前 `dishId`、且 `isActive=true`。
- `MealRecord` 列表/详情返回应包含结构化的 `dish` 与 `variant`，前端历史展示不要再依赖 `title` 字符串拆分。
- 停用版本不能用于新建记录，但历史记录保留 `variantId` 时仍可继续展示当前版本名。

### 4. Validation & Error Matrix

| Condition | Expected failure |
|---|---|
| `POST /api/dishes/:dishId/variants` 命中同菜品重名版本 | `409 Conflict` |
| `dishId` 不属于当前 workspace | `404 NotFound` |
| `variantId` 不属于当前 workspace | `404 NotFound` |
| `variantId` 属于其他 `dishId` | `404 NotFound` |
| `variantId` 已停用但仍用于创建记录 | `404 NotFound` |
| 传了 `variantId` 但没传 `dishId` | `404 NotFound` |
| DTO 缺字段或空字符串 | `400 Bad Request` |

### 5. Good/Base/Bad Cases

- Good: 先按当前用户解析 `workspaceId`，再按 `dishId + workspaceId` 校验菜品，最后按 `id + dishId + workspaceId + isActive` 校验版本。
- Base: 记录只关联 `dishId`，`variantId` 为空，兼容老数据。
- Bad: 只按 `variantId` 查询版本，或允许停用版本继续出现在新增记录选择中。

### 6. Tests Required

- E2E: `GET /api/dishes/:dishId/variants` 覆盖未登录 `401`、跨 workspace `404`、正常返回列表。
- E2E: `POST /api/dishes/:dishId/variants` 覆盖创建成功、同菜品重名 `409`、非法 payload `400`。
- E2E: `PATCH /api/dish-variants/:id` 覆盖启用/停用、跨 workspace `404`。
- E2E: `POST /api/meal-records` 覆盖：
  - 仅 `dishId` 成功
  - `dishId + variantId` 成功
  - 停用版本 `404`
  - 版本属于其他菜品 `404`
  - 版本属于其他 workspace `404`
- Assertion points: 响应体应返回结构化 `dish` / `variant` 字段，确保前端可直接展示当前名称。

### 7. Wrong vs Correct

#### Wrong

```ts
const variant = await prisma.dishVariant.findUnique({
  where: { id: variantId },
});
```

只校验主键，漏掉 `workspaceId`、`dishId` 和 `isActive`。

#### Correct

```ts
const variant = await prisma.dishVariant.findFirst({
  where: { id: variantId, dishId, workspaceId, isActive: true },
  select: { id: true },
});
```

把版本归属、启用状态和菜品绑定一次性校验完整。

## Verification

```bash
pnpm backend:typecheck
pnpm backend:test
pnpm backend:prisma:migrate
```
