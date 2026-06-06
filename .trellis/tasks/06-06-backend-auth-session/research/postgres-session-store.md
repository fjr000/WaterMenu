# PostgreSQL 持久化 Session Cookie 方案研究

## 任务约束

来源：`docs/project-definition.md`、`.trellis/spec/backend/technical-contracts.md`、当前任务 `prd.md`。

已确认约束：

- 后端：NestJS + TypeScript。
- 数据库：Prisma + PostgreSQL。
- API：REST JSON API，推荐 `/api` 前缀。
- 登录：账号密码 + Session Cookie，不使用 JWT。
- MVP 不开放注册，由 seed / 管理员创建初始用户。
- MVP 不引入额外服务。
- 密码必须哈希存储。
- 用户必须属于 workspace。
- 未登录访问受保护 API 返回未认证错误。

## 可行方式对比

### 1. 内存 Session Store

典型依赖：

- `express-session`
- `@types/express-session`

优点：

- 配置最少。
- 适合快速验证 NestJS session guard 和 cookie 行为。
- 不需要额外数据表。

缺点：

- 服务重启后登录态全部丢失。
- 多实例部署无法共享 session。
- `express-session` 默认 MemoryStore 不适合生产。
- 不满足本任务“Session 存储使用 PostgreSQL 持久化”的要求。

结论：只能作为临时 demo，不适合本任务落地。

### 2. `connect-pg-simple` + PostgreSQL Session Store

典型依赖：

- `express-session`
- `connect-pg-simple`
- `pg`
- `@types/express-session`
- 如当前版本缺少类型，再补 `@types/connect-pg-simple`

优点：

- 复用项目已选 PostgreSQL，不引入 Redis 等额外服务。
- 服务重启后 session 仍可保留。
- 与 NestJS Express 平台兼容，接入成本低。
- 满足任务要求的 PostgreSQL 持久化 Session Cookie。
- 与 Prisma 并存清晰：Prisma 管业务表，`connect-pg-simple` 管 session 表。

缺点：

- 需要额外维护 session 表结构。
- 需要额外使用 `pg` 连接池；Prisma Client 不直接作为 `connect-pg-simple` 的 store。
- 测试时需要清理 session 表，避免 cookie 状态污染。

结论：最符合当前项目约束，推荐采用。

### 3. Redis Session Store

典型依赖：

- `express-session`
- `connect-redis`
- `redis`

优点：

- Session 存取快。
- 更适合高并发和多实例共享 session。
- Session TTL 管理天然适合 Redis。

缺点：

- 需要引入 Redis 额外服务。
- 增加本地启动、部署、备份和故障排查复杂度。
- 当前 MVP 和项目定性是单服务器 + PostgreSQL；没有必须引入 Redis 的规模需求。
- 不符合“不引入额外服务”的当前任务约束。

结论：后续扩展可以考虑，MVP 不推荐。

## 推荐方案

推荐使用：

```text
NestJS Express 平台
+ express-session
+ connect-pg-simple
+ PostgreSQL
+ Prisma 业务模型
```

分工：

- `Prisma`：管理 `Workspace`、`User` 等业务模型、迁移和 seed。
- `connect-pg-simple`：管理 session 持久化表。
- `express-session`：设置和读取 Session Cookie。
- NestJS Guard：作为 API 登录态最终防线。

推荐不要把 session 表建成 Prisma 业务模型，原因：

- session 表是基础设施表，不属于业务领域。
- `connect-pg-simple` 有固定表结构预期。
- Prisma 不提供给 `connect-pg-simple` 直接使用的 store 接口。

## 必要依赖

运行依赖建议：

```text
@nestjs/common
@nestjs/core
@nestjs/platform-express
@nestjs/config
@nestjs/swagger
@prisma/client
prisma
express-session
connect-pg-simple
pg
argon2 或 bcrypt
class-validator
class-transformer
```

测试依赖建议：

```text
@nestjs/testing
supertest
jest / ts-jest
```

类型依赖建议：

```text
@types/express-session
@types/supertest
@types/pg
```

如果使用的 `connect-pg-simple` 版本没有内置类型，再加入：

```text
@types/connect-pg-simple
```

密码哈希库建议：

- 优先 `argon2`：现代密码哈希方案，API 简洁。
- 若安装原生依赖受环境限制，可用 `bcrypt`。
- 不允许使用普通 hash（如 SHA256）直接存密码。

## 配置要点

### 环境变量

建议最小环境变量：

```text
DATABASE_URL=postgresql://user:password@localhost:5432/watermenu
SESSION_SECRET=至少 32 字符随机字符串
SESSION_COOKIE_NAME=watermenu.sid
SESSION_MAX_AGE_MS=604800000
NODE_ENV=development
```

seed 相关：

```text
SEED_WORKSPACE_NAME=WaterMenu
SEED_USER_EMAIL=admin@example.com
SEED_USER_PASSWORD=change-me
SEED_USER_NAME=Admin
```

当前 PRD 尚未确认登录账号标识。结合 MVP 与 seed，建议第一版使用 `email` 登录，后续如需 username 再扩展；不要同时支持 email/username，避免 MVP 范围膨胀。

### Session 中只保存最小身份

Session 内容建议只保存：

```ts
req.session.userId = user.id;
```

不要把完整 user、workspace、密码哈希、权限快照放进 session。`GET /api/auth/me` 和 Guard 需要业务信息时从数据库查询。

### Cookie 安全配置

推荐配置：

```text
httpOnly: true
sameSite: 'lax'
secure: NODE_ENV === 'production'
maxAge: SESSION_MAX_AGE_MS
```

说明：

- `httpOnly` 防止前端 JS 读取 cookie。
- `sameSite: 'lax'` 适合同域前后端部署的 MVP。
- 生产 HTTPS 下启用 `secure`。
- 如果部署在 Nginx / 反向代理后，生产环境通常需要 `app.set('trust proxy', 1)`，否则 secure cookie 可能无法正确设置。

### express-session 配置

关键选项：

```text
secret: SESSION_SECRET
name: SESSION_COOKIE_NAME
resave: false
saveUninitialized: false
store: connect-pg-simple store
cookie: 安全配置
```

说明：

- `resave: false`：没有变更时不强制保存 session。
- `saveUninitialized: false`：未登录或未写入内容时不创建空 session。
- 登录成功后调用 `req.session.regenerate(...)` 再写入 `userId`，降低 session fixation 风险。
- 登出时调用 `req.session.destroy(...)`，并清除 cookie。

### PostgreSQL session 表

`connect-pg-simple` 常见表结构包含：

```text
sid varchar primary key
sess json not null
expire timestamp not null
```

实现选择：

1. 开发阶段可使用 `createTableIfMissing: true` 快速创建。
2. 更稳妥做法是在初始化 SQL / 迁移脚本中显式创建 session 表。

本任务若需要“可以通过 Prisma 创建数据库结构”，业务表应由 Prisma migration 创建。session 表是否由 Prisma migration 管理需要谨慎：推荐用独立 SQL 或 `connect-pg-simple` 自建，避免把基础设施表误纳入业务 schema。

如验收强调“一条命令初始化全部结构”，可以在 `prisma/migrations` 中添加原始 SQL 创建 session 表，但不要在 Prisma schema 中建 `Session` 业务模型。

### NestJS 请求类型扩展

需要给 TypeScript 扩展 session 字段，例如声明：

```ts
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}
```

Guard / Controller 使用 `Request` 时也应保持类型明确，避免大量 `any`。

## 推荐 API 行为

### `POST /api/auth/login`

输入：

```json
{
  "email": "admin@example.com",
  "password": "change-me"
}
```

流程：

1. DTO + class-validator 校验 email/password 非空且格式合理。
2. 通过 Prisma 查询用户，包含 workspace 基础信息。
3. 使用 argon2/bcrypt 校验密码。
4. 校验失败统一返回 401，不区分账号不存在或密码错误。
5. 登录成功后 regenerate session。
6. 写入 `session.userId`。
7. 返回不含密码字段的 user/workspace 基础信息。

### `GET /api/auth/me`

流程：

1. Guard 检查 `session.userId`。
2. 缺失则返回 401。
3. 查询当前用户和 workspace。
4. 用户不存在也返回 401，并可销毁当前 session。
5. 返回 user/workspace 基础信息，不返回 passwordHash。

### `POST /api/auth/logout`

流程：

1. 即使未登录也可返回成功，或通过 Guard 要求登录；MVP 建议允许幂等退出。
2. 调用 `req.session.destroy(...)`。
3. `res.clearCookie(cookieName)`。
4. 原 cookie 再访问 `/api/auth/me` 应返回 401。

## Prisma 最小模型关注点

建议业务模型最小包含：

```text
Workspace
- id
- name
- createdAt
- updatedAt

User
- id
- workspaceId
- email unique
- name
- passwordHash
- createdAt
- updatedAt
```

约束：

- `User.workspaceId` 必填。
- `User.email` 唯一。
- API 返回 DTO 不包含 `passwordHash`。
- seed 写入前必须 hash 密码。

## 测试关注点

### 访问控制

必须覆盖：

- 未登录访问 `GET /api/auth/me` 返回 401。
- 登录后携带 cookie 访问 `GET /api/auth/me` 返回 200。
- 登录后返回 user/workspace 基础信息。
- 返回体不包含 `passwordHash` / `password`。
- logout 后原 cookie 访问 `GET /api/auth/me` 返回 401。

### 密码校验

必须覆盖：

- 正确密码登录成功并设置 `Set-Cookie`。
- 错误密码返回 401。
- 不存在用户返回 401。
- 错误密码和不存在用户不要泄露差异化错误信息。

### Session Cookie

必须覆盖：

- 登录响应存在 `Set-Cookie`。
- `supertest.agent(app.getHttpServer())` 可保持 cookie。
- logout 后 cookie 不再有效。

### 数据库清理

测试环境需要清理：

- `User`
- `Workspace`
- session 表

注意清理顺序：先删除依赖表，再删除 workspace。session 表通常单独 `TRUNCATE TABLE "session"` 或对应表名。

## 风险与规避

### 风险：Prisma 和 pg 使用同一个 DATABASE_URL 但连接池独立

规避：

- 明确这是正常分工。
- 应用关闭时同时关闭 Prisma Client 和 pg pool。
- 不要试图从 Prisma Client 提取底层连接给 session store。

### 风险：生产 secure cookie 在代理后不生效

规避：

- 生产环境启用 `trust proxy`。
- Nginx 正确转发 `X-Forwarded-Proto`。
- 本任务不做生产部署脚本，但代码配置应预留。

### 风险：session 表初始化方式不清晰

规避：

- 在 README 或后端文档中说明 session 表创建方式。
- 如果使用 `createTableIfMissing`，明确这是基础设施表自动创建。
- 如验收要求 migration 一次完成，则用 Prisma migration SQL 创建表，但不建 Prisma 模型。

### 风险：登录成功后未 regenerate session

规避：

- AuthService / Controller 登录流程中显式 regenerate。
- 测试验证登录前后 cookie 行为可选；至少代码审查确认。

## 最终建议

本项目 MVP 应采用 `express-session + connect-pg-simple + PostgreSQL`。

原因：

- 满足 Session Cookie 登录契约。
- 满足 PostgreSQL 持久化 session 的任务要求。
- 不引入 Redis 等额外服务。
- 与 NestJS + TypeScript + Prisma 技术栈兼容。
- 实现复杂度低于自研 session store。

不推荐：

- 内存 session：不满足持久化要求。
- Redis：当前 MVP 引入额外服务，收益不足。
- JWT：明确 out of scope，且违背项目“前端不手动保存 JWT”的登录契约。
