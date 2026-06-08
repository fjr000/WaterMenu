# 后端数据库规范

> 当前后端已接入 Prisma + PostgreSQL。本规范记录真实 schema、迁移、seed 和 Session 表分工。

---

## 当前状态

- 数据库使用 PostgreSQL，业务数据访问使用 Prisma。
- Prisma CLI 配置：`backend/prisma.config.ts`。
- Prisma schema：`backend/prisma/schema.prisma`。
- Prisma migration：`backend/prisma/migrations/`。
- Seed 脚本：`backend/prisma/seed.ts`。
- Prisma Service：`backend/src/prisma/prisma.service.ts`。
- 当前业务表：`workspaces`、`users`、`dishes`、`dish_images`、`recipes`、`meal_records`、`feedbacks`。
- 当前业务枚举：`MealType`，取值为 `BREAKFAST`、`LUNCH`、`DINNER`、`SNACK`；`FeedbackRating`，取值为 `GOOD`、`OK`、`BAD`。
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
- Prisma CLI 路径通过 `backend/prisma.config.ts` 配置，保持 schema 为 `prisma/schema.prisma`、migration 目录为 `prisma/migrations`、seed 命令为 `tsx prisma/seed.ts`。
- 不在 `backend/package.json#prisma` 配置 seed，避免 Prisma CLI deprecated warning。
- `User.email` 当前为全局唯一登录标识。
- `User.workspaceId` 必填，并关联 `Workspace`。
- `Dish.workspaceId` 必填，并关联 `Workspace`；所有菜品查询、读取、更新都必须带当前用户 workspace 边界。
- `Dish.mealTypes` 使用 Prisma enum 数组；“不限 / 全部”不是可存储枚举值。
- 同一 workspace 内 `Dish.name` 必须唯一，不同 workspace 可以同名。
- `DishImage.workspaceId` 必填，并关联 `Workspace`；`DishImage.dishId` 必填，并关联 `Dish`，Dish 删除时图片记录级联删除。
- `DishImage.storageKey` 只保存 uploads 下的相对存储键，图片本体不进入 PostgreSQL；读取文件必须经受保护 API 校验 workspace，不能公开整个 uploads 目录。
- `DishImage.mimeType` 只允许 JPEG / PNG / WebP 对应 MIME；`size`、`width`、`height` 必须在上传时由后端保存。
- 同一 Dish 最多 9 张 `DishImage`；同一 Dish 最多一张封面图，`isCover` 唯一性由 service 事务逻辑保证。
- 删除 `DishImage` 时业务层必须同步删除本地文件；删除封面后如果还有剩余图片，业务层自动补选最早的一张为封面。
- `Recipe.workspaceId` 必填，并关联 `Workspace`；`Recipe.dishId` 必填，并关联 `Dish`，Dish 删除时 recipe 级联删除。
- `Recipe` 第一版只包含 `title` / `content` 纯文本做法，不包含 `isDefault`、图片、结构化 ingredients / steps。
- 所有 recipe list/create 必须先校验 `dishId + workspaceId`；recipe update 必须用 `id + workspaceId` 查找，找不到统一返回不存在。
- `Recipe.title` / `Recipe.content` API 入参必须 trim 后包含非空白字符，不能只依赖前端校验。
- `MealRecord.workspaceId` 必填，并关联 `Workspace`；所有用餐记录查询、读取、更新都必须带当前用户 workspace 边界。
- `MealRecord.dishId` 可选；创建 / 更新传入 `dishId` 时必须先校验菜品属于当前 workspace，更新传 `dishId: null` 表示解除关联。
- `Feedback.workspaceId`、`Feedback.mealRecordId`、`Feedback.userId` 必填；提交反馈前必须确认用餐记录属于当前 workspace。
- 同一用户对同一条用餐记录最多一条反馈，使用 `@@unique([mealRecordId, userId])` 约束，并通过 `POST /api/feedback` upsert 修改。
- 密码只存 `passwordHash`，seed 必须先 hash 再写入。
- API 返回 DTO 不得包含 `passwordHash`。
- Session 中只保存 `userId`，不要保存完整用户、workspace 或权限快照。

## 场景：本地 PostgreSQL Docker Compose 环境

### 1. Scope / Trigger

- 触发：本地开发需要可重复启动的 PostgreSQL，并让 Prisma migration、seed、认证和 Session Store 使用同一数据库。
- 范围：根目录 `docker-compose.yml` 的 `postgres` 服务、根目录 `package.json` 的 `db:*` 脚本、`backend/.env.example` 的 `DATABASE_URL`。
- 不包含：后端容器化、Nginx、生产备份流水线、替换 Prisma。

### 2. Signatures

根目录数据库命令：

```bash
pnpm db:up
pnpm db:down
pnpm db:reset
```

本地开发闭环命令：

```bash
pnpm db:up
pnpm backend:prisma:generate
pnpm backend:prisma:migrate
pnpm backend:prisma:seed
pnpm backend:dev
```

### 3. Contracts

Compose 与环境变量必须保持一致：

```text
服务名: postgres
POSTGRES_DB: watermenu
POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres
端口: 5432:5432
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/watermenu
数据卷: postgres_data
```

Session 表契约：

```text
业务表由 Prisma migration 创建
session 表由 connect-pg-simple createTableIfMissing 自动创建
session 表不进入 Prisma schema
postgres_data 保留时 session 数据持久化
```

### 4. Validation & Error Matrix

| 条件 | 处理 |
|------|------|
| Docker daemon 无法访问 | 不能声称真实数据库验证通过；只记录权限阻塞并运行可用静态检查 |
| `DATABASE_URL` 与 Compose 配置不匹配 | 先修正配置一致性，再运行 migration / seed |
| `pnpm db:reset` 后数据丢失 | 这是预期行为；必须重新运行 migrate 和 seed |
| Session 表不存在 | 启动后端并触发 Session Store 初始化，由 `connect-pg-simple` 自动创建 |
| 本地 `prisma migrate dev` 因既有 `session` 表提示 drift | 不擅自 reset 数据库；需要保留数据时用 `prisma migrate deploy` 做非破坏性验证，只有用户明确接受清库时才执行 reset |
| Prisma migration 失败 | 不手工改迁移历史；先检查数据库连接和 schema / migration 状态 |

### 5. Good / Base / Bad Cases

- Good：`pnpm db:up` 只启动 PostgreSQL，后端继续用 `pnpm backend:dev` 本机运行。
- Good：`pnpm db:down` 停止容器但保留 `postgres_data`，避免误删本地数据。
- Good：本地库存在 session 基础设施表且 `migrate dev` 提示 drift 时，使用 `prisma migrate deploy` 验证新业务迁移，避免误清开发数据。
- Base：新环境先复制 `backend/.env.example`，再启动数据库、迁移、seed、启动后端。
- Bad：把后端顺手加入 Compose，扩大本地数据库接入任务范围。
- Bad：看到 `session` 表 drift 就直接 reset 本地库，导致用户开发数据丢失。
- Bad：`db:reset` 不提醒数据卷会被删除。

### 6. Tests Required

- `docker compose config --quiet` 校验 Compose 语法。
- Docker 可用时运行 `pnpm db:up`，再运行 `pnpm backend:prisma:migrate` 和 `pnpm backend:prisma:seed`。
- 运行 `pnpm backend:prisma:generate`、`pnpm backend:typecheck`、`pnpm backend:lint`、`pnpm backend:test`。
- 手动认证验证应覆盖登录、`GET /api/auth/me`、logout，并确认 session 表写入 PostgreSQL。

### 7. Wrong vs Correct

#### Wrong

```text
新增 Docker Compose 时顺手容器化 backend，并把 DATABASE_URL 改成 postgres 容器内主机名。
```

问题：本地后端仍在宿主机运行，`localhost:5432` 才匹配当前开发闭环；容器化后端是独立任务。

#### Correct

```text
Docker Compose 只提供 PostgreSQL；backend/.env 使用 postgresql://postgres:postgres@localhost:5432/watermenu。
```

原因：改动最小，数据库实例、Prisma、seed、Session Store 与现有本机后端开发流程一致。

---

## 源码示例

实际参考路径：

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/prisma/prisma.service.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/dishes/dishes.service.ts`
