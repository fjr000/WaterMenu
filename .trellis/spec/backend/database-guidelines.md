# 后端数据库规范

> 当前后端已接入 Prisma + PostgreSQL。本规范记录真实 schema、迁移、seed 和 Session 表分工。

---

## 当前状态

- 数据库使用 PostgreSQL，业务数据访问使用 Prisma。
- Prisma schema：`backend/prisma/schema.prisma`。
- Prisma migration：`backend/prisma/migrations/`。
- Seed 脚本：`backend/prisma/seed.ts`。
- Prisma Service：`backend/src/prisma/prisma.service.ts`。
- 当前业务表：`workspaces`、`users`。
- Session 表是基础设施表，由 `connect-pg-simple` 使用 `createTableIfMissing: true` 创建，不在 Prisma schema 中建 `Session` 业务模型。

---

## 基础约束

1. **零假设**：不确定数据库、ORM、迁移流程时先询问。
2. **复用优先**：未来已有查询封装、仓储层或迁移目录时，优先沿用。
3. **最小实现**：只增加任务必需的表、字段、查询或迁移。
4. **手术式修改**：不得借任务机会重命名既有表字段或重排迁移历史。
5. **简单命名**：数据库相关命名应直观、可搜索，并匹配既有风格。

---

## 查询与迁移

- Prisma 是后端访问 PostgreSQL 的主要工具。
- Prisma 负责模型定义、迁移管理和常规 CRUD 查询。
- 复杂推荐或统计允许局部使用 Prisma raw SQL，但必须说明原因并补测试。
当前命令：

```bash
pnpm --filter @watermenu/backend prisma:generate
pnpm --filter @watermenu/backend prisma:migrate
pnpm --filter @watermenu/backend prisma:deploy
pnpm --filter @watermenu/backend prisma:seed
```

约束：

- 业务表通过 Prisma schema/migration 管理。
- `User.email` 当前为全局唯一登录标识。
- `User.workspaceId` 必填，并关联 `Workspace`。
- 密码只存 `passwordHash`，seed 必须先 hash 再写入。
- API 返回 DTO 不得包含 `passwordHash`。
- Session 中只保存 `userId`，不要保存完整用户、workspace 或权限快照。

---

## 源码示例

实际参考路径：

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/prisma/prisma.service.ts`
- `backend/src/auth/auth.service.ts`
