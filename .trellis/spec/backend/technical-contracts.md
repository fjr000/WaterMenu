# 后端技术契约

> 决策来源:`docs/project-definition.md` 与当前 `backend/` 实现。本文件记录已确认的后端实现契约;新增业务 API、数据库 schema 或跨层请求/响应契约时必须同步更新。

---

## 场景:NestJS 主后端与数据契约

### 1. 范围 / 触发

- 触发:项目已确定后端技术栈、数据库、登录、图片、部署和 API 风格。
- 范围:`backend/` 下的主后端实现。
- 当前不实现 Python AI 服务,只预留未来扩展。

### 2. 签名

后端主技术栈:

```text
NestJS + TypeScript
Prisma + PostgreSQL
REST JSON API + OpenAPI
账号密码 + Session Cookie
```

推荐 API 入口统一使用 `/api` 前缀。

示例接口方向:

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/dishes
POST   /api/dishes
GET    /api/dishes/:id
PATCH  /api/dishes/:id

POST   /api/meal-records
POST   /api/feedback

POST   /api/recommendations
POST   /api/blind-box
```

OpenAPI 文档建议路径:

```text
/api/docs
```

### 3. 契约

核心数据归属:

```text
Workspace -> Users
Workspace -> Dishes
Workspace -> Recipes
Workspace -> MealRecords
Workspace -> Images
Feedback 由具体 User 提交
```

MVP 注册策略:

```text
不开放注册
管理员创建初始用户
后续支持邀请码加入 workspace
```

登录契约:

```text
账号密码登录
Session Cookie 维持登录态
前端不手动保存 JWT
密码必须哈希存储
```

数据库契约:

```text
PostgreSQL 存业务数据
Prisma 管理模型、迁移和常规查询
复杂推荐或统计允许局部使用 Prisma raw SQL
```

图片契约:

```text
图片本体不直接存 PostgreSQL
MVP 图片本体存后端本地 uploads
PostgreSQL 只存图片路径、storage_key、URL、元数据和关联关系
未来迁移对象存储
```

部署契约:

```text
单服务器 + Docker Compose
Nginx 做入口
前后端尽量同域部署
/api 转发后端
PostgreSQL 和 uploads 必须持久化
```

### 4. 校验与错误矩阵

| 条件 | 处理 |
|------|------|
| 未登录访问受保护 API | 返回未认证错误 |
| 用户访问其他 workspace 数据 | 返回无权限或不存在,不泄露数据存在性 |
| 请求字段非法 | 由 NestJS DTO + class-validator 拒绝 |
| 餐次字段非法 | 拒绝请求 |
| 反馈不是好吃 / 一般 / 不好吃 | 拒绝请求 |
| 上传图片超出限制或类型非法 | 拒绝请求 |
| 推荐候选为空 | 放宽近期限制;仍为空时返回可解释的空结果 |

### 5. Good / Base / Bad Cases

- Good:所有查询都带 workspace 约束,用户只能读写自己 workspace 的数据。
- Base:单用户默认拥有一个 workspace,也走同一套 workspace 数据模型。
- Bad:用 userId 直接过滤所有业务数据,后续再补 workspace;这会导致共享空间迁移困难。
- Bad:前端直接访问 Python AI 服务;未来 AI 必须通过后端统一鉴权和数据访问。
- Bad:把大量图片二进制直接存入 PostgreSQL。

### 6. 测试要求

MVP 后端优先测试:

- workspace 数据隔离。
- 登录态访问控制。
- 推荐规则:最近 3 天排除、候选不足放宽、反馈权重。
- 盲盒规则:按餐次过滤后按权重随机。
- 用餐记录:关联菜品和未关联菜品两种情况。

### 7. Wrong vs Correct

#### Wrong

```text
前端 -> Python AI 服务 -> 数据库
```

问题:绕过主后端鉴权、workspace 隔离和 API 契约。

#### Correct

```text
前端 -> NestJS 后端 -> Python AI 服务
```

原因:登录、权限、数据访问和 API 契约统一由主后端控制。

---

## 场景:后端基础登录闭环

### 1. Scope / Trigger

- 触发:实现账号密码 + Session Cookie 登录,作为后续 workspace 数据隔离基础。
- 范围:`backend/` 下 NestJS 后端、Prisma 业务模型、PostgreSQL Session Store、认证 e2e 测试。
- 不包含:开放注册、邀请码、角色权限、前端页面、JWT、Redis。

### 2. Signatures

API 统一使用 `/api` 前缀:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Prisma 业务模型:

```text
Workspace(id, name, createdAt, updatedAt)
User(id, workspaceId, email, name, passwordHash, createdAt, updatedAt)
```

后端命令:

```bash
pnpm --filter @watermenu/backend start:dev
pnpm --filter @watermenu/backend prisma:generate
pnpm --filter @watermenu/backend prisma:migrate
pnpm --filter @watermenu/backend prisma:seed
```

### 3. Contracts

登录请求:

```json
{
  "email": "admin@example.com",
  "password": "change-me"
}
```

登录成功与 `GET /api/auth/me` 返回:

```json
{
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "name": "Admin"
  },
  "workspace": {
    "id": "...",
    "name": "WaterMenu"
  }
}
```

约束:

- `User.email` 全局唯一。
- `User.workspaceId` 必填。
- 密码只存 `passwordHash`,API 不返回 `password` / `passwordHash`。
- Session 中只保存 `userId`。
- Session Store 使用 PostgreSQL;`connect-pg-simple` 的 session 表是基础设施表,不在 Prisma schema 中建业务模型。

必要环境变量:

```text
DATABASE_URL
SESSION_SECRET
SESSION_COOKIE_NAME
SESSION_MAX_AGE_MS
SEED_WORKSPACE_NAME
SEED_USER_EMAIL
SEED_USER_PASSWORD
SEED_USER_NAME
```

### 4. Validation & Error Matrix

| 条件 | 处理 |
|------|------|
| `email` 格式非法或密码为空 | DTO + class-validator 拒绝 |
| 用户不存在 | 返回 401,不泄露账号是否存在 |
| 密码错误 | 返回 401,不泄露差异化原因 |
| 未登录访问 `/api/auth/me` | 返回 401 |
| session 中 userId 对应用户不存在 | 返回 401 |
| `SESSION_SECRET` 缺失或长度不足 | 应用启动失败 |
| `DATABASE_URL` 缺失 | 应用启动失败 |
| logout | 销毁 session 并清除 cookie,返回 `{ ok: true }` |

### 5. Good / Base / Bad Cases

- Good:登录成功后 regenerate session,再写入 `session.userId`。
- Good:`/api/auth/me` 每次按 `session.userId` 查询 user + workspace,不信任 session 中缓存的用户资料。
- Base:logout 幂等返回成功,并清理 cookie。
- Bad:把完整 user、workspace、passwordHash 或权限快照写入 session。
- Bad:登录失败时区分"账号不存在"和"密码错误"。
- Bad:前端保存 JWT 或后端同时引入 JWT 登录。

### 6. Tests Required

认证测试应覆盖:

- 未登录访问 `GET /api/auth/me` 返回 401。
- 正确 email/password 登录成功并设置 `Set-Cookie`。
- 登录后携带 cookie 访问 `GET /api/auth/me` 返回 user/workspace。
- 响应体不包含 `password` / `passwordHash`。
- 错误密码返回 401。
- 不存在用户返回 401。
- `POST /api/auth/logout` 后原 cookie 访问 `/api/auth/me` 返回 401。

### 7. Wrong vs Correct

#### Wrong

```text
POST /api/auth/login -> 返回 JWT -> 前端 localStorage 保存 token
```

问题:违背项目 Session Cookie 契约,且前端需要手动管理 token。

#### Correct

```text
POST /api/auth/login -> Set-Cookie -> session.userId -> GET /api/auth/me 查询 user/workspace
```

原因:登录态由 httpOnly Cookie 和后端 Session Store 管理,后续业务 API 可以统一依赖 session userId 和 workspace 归属。

---

## 场景:菜品基础管理 API

### 1. Scope / Trigger

- 触发:新增第一个 workspace 级业务资源 `Dish`,为后续食谱、用餐记录、反馈、推荐和盲盒提供候选池。
- 范围:`backend/src/dishes/` NestJS 模块、`backend/prisma/schema.prisma` 的 `Dish` / `MealType`、Prisma migration、后端 e2e 测试。
- 不包含:前端页面、图片上传、Recipe、MealRecord、Feedback、Recommendation、BlindBox、删除接口。

### 2. Signatures

Prisma enum 与模型:

```text
MealType = BREAKFAST | LUNCH | DINNER | SNACK
Dish(id, workspaceId, name, description?, mealTypes[], isActive, createdAt, updatedAt)
```

数据库约束:

```text
Dish.workspaceId -> Workspace.id
Dish.mealTypes 默认 [LUNCH, DINNER]
Dish.isActive 默认 true
Dish 同 workspace 内 name 唯一:@@unique([workspaceId, name])
```

API:

```text
GET   /api/dishes?mealType=<MealType>&isActive=<true|false>
POST  /api/dishes
GET   /api/dishes/:id
PATCH /api/dishes/:id
```

### 3. Contracts

创建请求:

```json
{
  "name": "番茄炒蛋",
  "description": "少油版",
  "mealTypes": ["LUNCH", "DINNER"],
  "isActive": true
}
```

字段约束:

- `name` 必填,非空字符串。
- `description` 可选字符串,只承载轻量说明,不承载 Recipe / 做法步骤。
- `mealTypes` 可选,必须是非空 `MealType[]`;未传时默认 `LUNCH`、`DINNER`。
- `isActive` 可选布尔值;未传时默认 `true`。
- 列表 query 的 `mealType` 必须是 `MealType`,`isActive` 只接受可转换为布尔的值。

响应直接返回 Dish 业务数据,不包含用户密码字段;后续如需要前端专用响应 DTO,再单独收敛契约。

### 4. Validation & Error Matrix

| 条件 | 处理 |
|------|------|
| 未登录访问任一菜品 API | 返回 401 |
| `name` 缺失或为空 | DTO 校验拒绝 |
| `mealTypes` 为空数组或包含非法餐次 | DTO 校验拒绝 |
| `mealType` query 非法 | DTO 校验拒绝 |
| 同 workspace 创建 / 更新为重名菜品 | 返回冲突错误 |
| 读取或更新其他 workspace 的菜品 id | 返回不存在,不泄露数据存在性 |
| session 中 userId 对应用户不存在 | 返回 401 |

### 5. Good / Base / Bad Cases

- Good:所有 dishes 查询先解析当前 `session.userId` 的 `workspaceId`,再带 `workspaceId` 过滤。
- Good:详情和更新使用 `id + workspaceId` 查找;找不到统一返回不存在。
- Good:推荐 / 盲盒后续只把 `isActive=true` 的菜品纳入候选池。
- Base:管理列表默认返回当前 workspace 全部菜品,可按 `mealType` 和 `isActive` 筛选。
- Bad:只用 `id` 查菜品再判断 workspace,这容易产生存在性泄露或遗漏校验。
- Bad:把"全部 / 不限"存进 `mealTypes`;它只是推荐入口筛选条件,不是菜品属性。
- Bad:在菜品基础任务里顺手加入图片、Recipe、用餐记录或推荐逻辑。

### 6. Tests Required

菜品 e2e 至少覆盖:

- 未登录访问 dishes API 返回 401。
- 登录后创建菜品归属当前用户 workspace。
- 未传 `mealTypes` 时默认 `LUNCH`、`DINNER`;未传 `isActive` 时默认 `true`。
- 同 workspace 重名返回冲突;不同 workspace 可同名。
- 列表只返回当前 workspace 的菜品。
- 列表按 `mealType` 和 `isActive` 筛选。
- 详情和更新不能跨 workspace 访问。
- 创建和更新时非法餐次被 DTO 拒绝。

### 7. Wrong vs Correct

#### Wrong

```text
GET /api/dishes/:id -> prisma.dish.findUnique({ where: { id } }) -> 再返回或再判断 workspace
```

问题:容易泄露其他 workspace 是否存在该 id,也容易在后续改动中遗漏隔离判断。

#### Correct

```text
GET /api/dishes/:id -> 先从 session.userId 解析 workspaceId -> prisma.dish.findFirst({ where: { id, workspaceId } })
```

原因:查询边界天然限制在当前 workspace,找不到时统一按不存在处理。

---

## 场景:食谱做法记录 API

### 1. Scope / Trigger

- 触发:补齐 MVP 的「某个菜怎么做」能力,新增 workspace 级 `Recipe` 数据模型和 recipes API。
- 范围:`backend/src/recipes/` NestJS 模块、`backend/prisma/schema.prisma` 的 `Recipe`、Prisma migration、后端 e2e 测试。
- 不包含:Recipe 删除、默认做法、图片、AI 自动生成、结构化 ingredients / steps、推荐权重调整、独立权限系统。

### 2. Signatures

Prisma 模型:

```text
Recipe(id, workspaceId, dishId, title, content, createdAt, updatedAt)
```

数据库约束:

```text
Recipe.workspaceId -> Workspace.id, onDelete Restrict
Recipe.dishId -> Dish.id, onDelete Cascade
Recipe @@index([workspaceId])
Recipe @@index([dishId])
Recipe @@map("recipes")
Workspace.recipes Recipe[]
Dish.recipes Recipe[]
```

API:

```text
GET   /api/dishes/:dishId/recipes
POST  /api/dishes/:dishId/recipes
PATCH /api/recipes/:id
```

### 3. Contracts

创建请求:

```json
{
  "title": "家常版",
  "content": "1. 备菜\n2. 下锅翻炒\n3. 调味出锅"
}
```

更新请求:

```json
{
  "title": "少油版",
  "content": "全程少油，小火慢炒。"
}
```

响应直接返回 Recipe 业务数据或 Recipe 数组:

```json
{
  "id": "...",
  "workspaceId": "...",
  "dishId": "...",
  "title": "家常版",
  "content": "...",
  "createdAt": "2026-06-07T00:00:00.000Z",
  "updatedAt": "2026-06-07T00:00:00.000Z"
}
```

字段约束:

- `title` 创建必填,更新可选;提供时必须是 trim 后包含非空白字符的字符串。
- `content` 创建必填,更新可选;提供时必须是 trim 后包含非空白字符的字符串。
- 后端写入前应 trim `title` / `content`,避免保存首尾无意义空白。
- `dishId` 来自嵌套路由,不允许通过 PATCH 修改。
- `workspaceId` 由当前登录用户解析,不接受前端传入。
- Recipe 第一版不包含 `isDefault`;不要引入默认做法唯一性、切换或排序语义。
- `GET /api/dishes/:dishId/recipes` 按 `createdAt asc` 返回稳定列表。

### 4. Validation & Error Matrix

| 条件 | 处理 |
|------|------|
| 未登录访问任一 recipes API | `AuthGuard` 返回 401 |
| `dishId` 不属于当前 workspace | 返回 404,不泄露资源存在性 |
| `recipeId` 不属于当前 workspace | 返回 404,不泄露资源存在性 |
| 创建时 `title` / `content` 缺失、空字符串或纯空白 | 返回 400 |
| 更新时提供的 `title` / `content` 为空字符串或纯空白 | 返回 400 |
| 更新时未提供任何可更新字段 | 允许保持原值或按 DTO/Service 当前实现处理,但不得修改 `dishId` / `workspaceId` |
| Dish 被删除 | 关联 Recipe 按数据库外键 Cascade 删除 |
| session 中 userId 对应用户不存在 | 返回 401 |

### 5. Good / Base / Bad Cases

- Good:list/create 先从 `session.userId` 解析 `workspaceId`,再用 `dishId + workspaceId` 校验菜品归属。
- Good:update 先用 `id + workspaceId` 查询 recipe,找不到统一返回 404。
- Good:Recipe 只承载「怎么做」,不参与推荐 / 盲盒评分权重。
- Base:一个 Dish 可以有 0 到多条 Recipe;没有做法时由前端显示空状态。
- Base:列表按创建时间正序展示,编辑不会改变列表顺序。
- Bad:只用 `recipeId` 全局查找后再判断 workspace,容易泄露存在性或遗漏隔离。
- Bad:为了未来预留 `isDefault` 但不实现唯一默认规则,会留下未定义语义。
- Bad:允许 PATCH 修改 `dishId` 把做法移动到其他菜,这会扩大 workspace 校验和 UI 复杂度。
- Bad:只依赖前端 trim,后端允许纯空白 title/content 写入数据库。

### 6. Tests Required

recipes e2e 至少覆盖:

- 未登录访问 list/create/update 返回 401。
- 登录后能给当前 workspace 的 dish 创建 recipe,返回 workspaceId/dishId/title/content。
- 创建和更新时 title/content 会 trim。
- list 只返回当前 workspace 且当前 dish 的 recipes,并按 `createdAt asc`。
- 不能给其他 workspace 的 dish 创建 recipe,返回 404。
- 不能编辑其他 workspace 的 recipe,返回 404。
- 编辑当前 workspace 的 recipe 后返回更新后的 title/content。
- 空字符串和纯空白 title/content 被拒绝,返回 400。

### 7. Wrong vs Correct

#### Wrong

```text
PATCH /api/recipes/:id -> prisma.recipe.update({ where: { id }, data: body })
```

问题:只按全局 id 更新会绕过 workspace 隔离,也可能允许前端修改 `dishId` / `workspaceId`。

#### Correct

```text
PATCH /api/recipes/:id -> 先解析 workspaceId -> findFirst({ id, workspaceId }) -> update title/content
```

原因:查询边界限制在当前 workspace,找不到统一返回 404;只更新纯文本内容字段,避免扩大功能语义。

---

## 场景:用餐记录与反馈基础 API

### 1. Scope / Trigger

- 触发:新增推荐闭环所需的用餐历史与用户反馈数据来源。
- 范围:`backend/src/meal-records/`、`backend/src/feedback/`、`backend/prisma/schema.prisma` 的 `MealRecord` / `Feedback` / `FeedbackRating`、Prisma migration、后端 e2e 测试。
- 不包含:前端页面、Recipe、Recommendation、BlindBox、统计报表、搜索、分页、删除接口。

### 2. Signatures

Prisma enum 与模型:

```text
FeedbackRating = GOOD | OK | BAD
MealRecord(id, workspaceId, dishId?, title, mealType, eatenAt, note?, createdAt, updatedAt)
Feedback(id, workspaceId, mealRecordId, userId, rating, note?, createdAt, updatedAt)
```

数据库约束:

```text
MealRecord.workspaceId -> Workspace.id
MealRecord.dishId? -> Dish.id,Dish 删除时 SetNull
Feedback.workspaceId -> Workspace.id
Feedback.mealRecordId -> MealRecord.id,MealRecord 删除时 Cascade
Feedback.userId -> User.id
Feedback 同一用户同一用餐记录唯一:@@unique([mealRecordId, userId])
```

API:

```text
GET   /api/meal-records
POST  /api/meal-records
GET   /api/meal-records/:id
PATCH /api/meal-records/:id
POST  /api/feedback
```

### 3. Contracts

创建用餐记录请求:

```json
{
  "dishId": "optional-dish-id",
  "title": "番茄炒蛋",
  "mealType": "LUNCH",
  "eatenAt": "2026-06-07T12:00:00.000Z",
  "note": "少油"
}
```

更新用餐记录请求:

```json
{
  "title": "番茄炒蛋",
  "mealType": "DINNER",
  "eatenAt": "2026-06-07T18:00:00.000Z",
  "note": "改成晚餐记录",
  "dishId": null
}
```

约束:

- `title` 必填创建字段,提供 `dishId` 时后端也不自动用菜品名称填充标题。
- `dishId` 创建 / 更新时如为字符串,必须属于当前用户 workspace。
- `PATCH /api/meal-records/:id` 中 `dishId: null` 表示解除菜品关联;不传 `dishId` 表示保持原关联。
- `mealType` 复用 `MealType`,只能是 `BREAKFAST`、`LUNCH`、`DINNER`、`SNACK`。
- 用餐记录列表和详情必须包含当前 workspace 内该记录的反馈基础信息:`id`、`userId`、`rating`、`note`、`createdAt`、`updatedAt`。

提交 / 修改反馈请求:

```json
{
  "mealRecordId": "meal-record-id",
  "rating": "GOOD",
  "note": "好吃"
}
```

约束:

- `POST /api/feedback` 是按当前登录用户与 `mealRecordId` 的 upsert:没有则创建,已有则更新。
- `rating` 只能是 `GOOD`、`OK`、`BAD`。
- 反馈归属 `Workspace`、`MealRecord` 与提交反馈的 `User`。
- 同一用户对同一条用餐记录最多一条反馈。

### 4. Validation & Error Matrix

| 条件 | 处理 |
|------|------|
| 未登录访问任一用餐记录或反馈 API | 返回 401 |
| 创建 / 更新用餐记录时 `title` 缺失或为空 | DTO 校验拒绝 |
| `mealType` 非法 | DTO 校验拒绝 |
| `rating` 非法 | DTO 校验拒绝 |
| 创建 / 更新用餐记录传入其他 workspace 的 `dishId` | 返回不存在,不泄露菜品存在性 |
| 读取 / 更新其他 workspace 的用餐记录 id | 返回不存在,不泄露记录存在性 |
| 为其他 workspace 的用餐记录提交反馈 | 返回不存在,不泄露记录存在性 |
| 重复提交同一用户同一用餐记录反馈 | 更新原反馈,不创建重复记录 |
| session 中 userId 对应用户不存在 | 返回 401 |

### 5. Good / Base / Bad Cases

- Good:所有用餐记录查询都先解析当前 `session.userId` 的 `workspaceId`,再用 `id + workspaceId` 或 `workspaceId` 过滤。
- Good:用餐记录返回的 `feedbacks` include 也显式带 `workspaceId` 过滤,避免依赖关系数据天然一致。
- Good:反馈 upsert 前先确认 `mealRecordId` 属于当前 workspace,再用 `mealRecordId + userId` 唯一键写入。
- Base:只写文本的用餐记录 `dishId=null`,仍可保存历史和反馈,但暂不参与菜品推荐权重。
- Base:关联菜品的用餐记录可被后续推荐逻辑用来计算近期吃过和反馈权重。
- Bad:只用 `dishId`、`mealRecordId` 或 `feedbackId` 全局查询后再判断 workspace,容易泄露存在性或漏掉隔离。
- Bad:把反馈直接挂在 `Dish` 上;这会丢失具体吃饭事件和多用户反馈语义。
- Bad:重复 `POST /api/feedback` 创建多条反馈;应更新当前用户原反馈。

### 6. Tests Required

用餐记录与反馈 e2e 至少覆盖:

- 未登录访问 meal-records / feedback API 返回 401。
- 登录后创建不关联菜品的用餐记录。
- 登录后创建关联当前 workspace 菜品的用餐记录。
- 不能用其他 workspace 的 `dishId` 创建 / 更新用餐记录。
- 列表和详情只返回当前 workspace 的用餐记录,并包含反馈基础信息。
- 更新用餐记录只能影响当前 workspace,且覆盖 `dishId` 新值、`null`、省略三种语义。
- `POST /api/feedback` 可创建反馈,也可更新当前用户已有反馈,且不会产生重复记录。
- 不能为其他 workspace 的用餐记录提交反馈。
- 非法 `mealType` 与非法 `rating` 被 DTO 校验拒绝。

### 7. Wrong vs Correct

#### Wrong

```text
POST /api/feedback -> prisma.feedback.create({ mealRecordId, userId, rating })
```

问题:重复提交会产生多条同一用户对同一用餐记录的反馈,破坏偏好数据。

#### Correct

```text
POST /api/feedback -> 先用 mealRecordId + workspaceId 校验记录 -> 按 mealRecordId_userId upsert
```

原因:先隔离 workspace,避免存在性泄露;再用唯一键保证同一用户同一记录只有一条反馈,同时支持修改。

---

## 场景：推荐与盲盒后端 API

### 1. Scope / Trigger

- 触发：实现 MVP “今天吃什么”闭环，基于当前 workspace 的菜品、用餐记录和反馈生成推荐与盲盒结果。
- 范围：`backend/src/recommendations/`、`POST /api/recommendations`、`POST /api/blind-box`、推荐 e2e 测试。
- 不包含：推荐历史持久化、`Recommendation` 表、食谱 API、前端页面、AI / 机器学习推荐。

### 2. Signatures

API：

```text
POST /api/recommendations
POST /api/blind-box
```

请求体：

```json
{
  "mealType": "LUNCH"
}
```

字段约束：

- `mealType` 可选。
- `mealType` 必须是 `MealType`：`BREAKFAST`、`LUNCH`、`DINNER`、`SNACK`。
- 不传 `mealType` 表示不限餐次，不是可存储的菜品属性。

### 3. Contracts

候选池：

```text
当前用户 workspace 内的 Dish
Dish.isActive = true
指定 mealType 时 Dish.mealTypes has mealType
```

近期排除：

```text
默认排除最近 3 天内有关联 dishId 的 MealRecord 对应菜品
如果排除后候选为空，则放宽近期限制，回到原始候选池
未关联 dishId 的文本用餐记录不参与推荐权重和近期排除
```

评分规则：

```text
基础分 100
每条 GOOD 反馈 +20
每条 OK 反馈 +0
每条 BAD 反馈 -15
最低权重不低于 10
```

推荐响应：

```text
POST /api/recommendations -> 返回最多 5 个候选
每个候选包含 dish、score、weight、reasons
按 score 降序排列
```

盲盒响应：

```text
POST /api/blind-box -> 返回单个候选
候选来自同一评分池，并按 weight 随机抽取
结果包含 dish、score、weight、reasons
```

推荐理由只展示命中的事实，例如适配餐次、最近 3 天没吃过、之前反馈好吃、之前反馈不好吃较少推荐。

### 4. Validation & Error Matrix

| 条件 | 处理 |
|------|------|
| 未登录访问推荐或盲盒 API | `AuthGuard` 返回未认证错误 |
| `mealType` 非法 | DTO + class-validator 拒绝 |
| 用户 session 中 `userId` 不存在 | 返回未认证错误 |
| 当前 workspace 没有启用菜品 | 返回可解释的空结果 |
| 指定餐次后没有启用候选 | 返回可解释的空结果 |
| 最近 3 天排除后候选为空 | 自动放宽近期限制，不直接失败 |
| BAD 反馈很多导致分数很低 | 权重下限保持 `10`，不完全排除 |

### 5. Good / Base / Bad Cases

- Good：所有 Dish、MealRecord、Feedback 查询都带当前用户 `workspaceId` 边界。
- Good：推荐和盲盒共用同一候选池与评分规则，避免两个入口行为漂移。
- Good：盲盒只随机抽取已过滤、已评分的合理候选，而不是全量随机菜品。
- Base：无 `mealType` 时从当前 workspace 全部启用菜品推荐。
- Base：有 `mealType` 时只从适配该餐次的启用菜品推荐。
- Bad：把“不限 / 全部”写入 `Dish.mealTypes`。
- Bad：用未关联菜品的文本用餐记录影响菜品评分。
- Bad：因为 BAD 反馈把菜品完全排除，破坏“降低权重但不完全排除”的契约。

### 6. Tests Required

推荐与盲盒 e2e 至少覆盖：

- 未登录访问 `POST /api/recommendations` 和 `POST /api/blind-box` 返回 401。
- 推荐只返回当前 workspace 内 `isActive=true` 的菜品。
- 指定 `mealType` 时只返回适配餐次的菜品。
- 最近 3 天吃过的关联菜品默认不出现在推荐候选中。
- 排除近期后无候选时自动放宽，并返回原始候选池中的菜品。
- GOOD 反馈让菜品排序或抽中权重上升。
- BAD 反馈降低权重但不会完全排除菜品。
- 推荐结果最多返回 5 个候选，并包含 `reasons`。
- 盲盒返回单个候选，并按权重随机。
- 空候选返回可解释的空结果。

### 7. Wrong vs Correct

#### Wrong

```text
POST /api/blind-box -> 从当前 workspace 全部 Dish 中 Math.random 抽一个
```

问题：绕过启用状态、餐次筛选、近期排除和反馈权重，盲盒会变成完全随机。

#### Correct

```text
POST /api/blind-box -> 生成与推荐接口相同的候选评分池 -> 按 weight 随机抽取
```

原因：盲盒仍然是“带约束随机”，只是在合理候选池中引入随机性。

---

## 场景:生产部署与备份闭环

### 1. Scope / Trigger

- 触发:核心业务 MVP 已可用,需要把本地开发应用交付为单服务器 Docker Compose 生产部署。
- 范围:根目录生产 Compose、后端生产镜像、前端 Nginx 静态镜像、Nginx `/api` 反代、PostgreSQL 持久化、uploads 预留挂载、数据库备份/恢复脚本与部署文档。
- 不包含:实际登录服务器部署、域名解析、证书签发、防火墙配置、CI/镜像仓库、图片上传业务。

### 2. Signatures

生产文件与命令:

```text
docker-compose.prod.yml
backend/Dockerfile
frontend/Dockerfile
deploy/env/prod.env.example
deploy/nginx/nginx.conf
deploy/nginx/conf.d/watermenu.conf
scripts/backup-postgres.sh
scripts/restore-postgres.sh
```

生产启动命令:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

生产后端启动命令必须等价于:

```bash
pnpm prisma:deploy && pnpm start
```

### 3. Contracts

生产 Compose 服务契约:

```text
postgres: PostgreSQL Alpine,不向公网暴露 5432,数据持久化到生产专用 volume
backend: 从 backend/Dockerfile 构建,连接 postgres:5432,启动前自动 migrate deploy
nginx: 从 frontend/Dockerfile 构建最终 Nginx 镜像,暴露 80/443,服务前端静态文件并反代 /api
```

生产必要环境变量:

```text
NODE_ENV=production
PORT=3000
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
DATABASE_URL=postgresql://<user>:<password>@postgres:5432/<db>?schema=public
SESSION_SECRET
SESSION_COOKIE_NAME
SESSION_MAX_AGE_MS
SEED_WORKSPACE_NAME
SEED_USER_EMAIL
SEED_USER_PASSWORD
SEED_USER_NAME
```

Nginx 入口契约:

```text
HTTP 80 -> HTTPS 443
/ -> /usr/share/nginx/html 静态前端,SPA fallback 到 /index.html
/api -> http://backend:3000,保留 /api 前缀
证书默认挂载到 /etc/nginx/certs/fullchain.pem 与 /etc/nginx/certs/privkey.pem
必须传递 X-Forwarded-Proto,配合后端 production trust proxy 与 secure Session Cookie
```

Seed 契约:

```text
容器启动不自动 seed
首次部署后由文档命令手动执行 pnpm prisma:seed
```

备份契约:

```text
宿主机执行 scripts/backup-postgres.sh
默认输出 deploy/backups/postgres/watermenu-postgres-<UTC>.dump
默认保留最近 7 天
恢复必须显式传入 dump 文件并输入 RESTORE 确认
```

### 4. Validation & Error Matrix

| 条件 | 处理 |
|------|------|
| `docker compose -f docker-compose.prod.yml config --quiet` 失败 | 不进入部署,先修正 Compose 语法/环境文件兼容性 |
| HTTPS 证书文件缺失 | Nginx 不应静默降级为生产 HTTP;文档要求补齐证书后启动 |
| 生产 HTTP 访问登录失败 | 这是预期风险;`NODE_ENV=production` 下 Cookie `secure=true`,必须使用 HTTPS |
| `DATABASE_URL` 与 `POSTGRES_*` 不一致 | PostgreSQL 可能健康但后端迁移失败;先修正环境变量一致性 |
| `prisma migrate deploy` 失败 | 后端不继续启动,避免代码与 schema 不一致 |
| seed 被放进启动命令 | 禁止;会在重启时反复覆盖初始用户密码 |
| 备份脚本找不到 postgres 服务 | 非 0 退出,不能声称备份成功 |
| 恢复脚本无参数或文件不存在 | 非 0 退出,不能进入恢复 |
| 恢复前未确认覆盖风险 | 必须要求显式输入确认词,避免误恢复生产库 |

### 5. Good / Base / Bad Cases

- Good:生产使用独立 `docker-compose.prod.yml`,本地 `docker-compose.yml` 继续只提供开发 PostgreSQL。
- Good:后端镜像运行期保留 Prisma CLI、schema 与 migrations,保证 `prisma migrate deploy` 可执行。
- Good:前端最终镜像基于 Nginx,同一个 `nginx` 服务同时负责静态文件和 `/api` 反代。
- Good:生产 PostgreSQL 不映射公网端口,只允许 Compose 内部网络访问。
- Good:uploads 仅预留宿主机目录挂载到 `/app/uploads`,不顺手实现图片上传业务。
- Base:服务器通过 `git pull` 后本地 `docker compose build` 构建镜像,不要求 Node/pnpm。
- Bad:把 seed 放入后端容器启动命令。
- Bad:让生产服务器安装 Node/pnpm 后直接跑 `pnpm start`,绕过 Docker 部署契约。
- Bad:生产 Compose 复用本地 `postgres_data` 或向公网暴露数据库端口。
- Bad:把证书、`prod.env`、uploads 或 backup dump 带进 Docker build context。

### 6. Tests Required

生产部署资产至少验证:

```bash
docker compose -f docker-compose.prod.yml config --quiet
pnpm --filter @watermenu/backend typecheck
pnpm --filter @watermenu/backend lint
pnpm --filter @watermenu/backend test
pnpm --filter @watermenu/backend build
pnpm --filter @watermenu/frontend typecheck
pnpm --filter @watermenu/frontend build
docker build -f backend/Dockerfile -t watermenu-backend-check .
docker build -f frontend/Dockerfile -t watermenu-frontend-check .
bash -n scripts/backup-postgres.sh scripts/restore-postgres.sh
```

环境允许时还应验证:

```bash
docker run --rm watermenu-backend-check sh -c 'test -f dist/src/main.js && pnpm prisma migrate deploy --help >/dev/null'
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml run --rm backend pnpm prisma:deploy
./scripts/backup-postgres.sh
```

Nginx 配置应在有测试证书时用 `nginx -t` 或启动容器验证 `/` 与 `/api/docs`。

### 7. Wrong vs Correct

#### Wrong

```text
backend CMD: pnpm prisma:deploy && pnpm prisma:seed && node dist/main.js
```

问题:seed 会在每次重启时覆盖初始用户密码;且当前 Nest 构建入口是 `dist/src/main.js`,不是 `dist/main.js`。

#### Correct

```text
backend CMD: pnpm prisma:deploy && pnpm start
backend package start: node dist/src/main.js
seed: 部署文档中的一次性手动命令
```

原因:迁移应随部署自动执行,但 seed 是初始化动作;启动入口必须匹配真实 Nest build 产物。

## 备份契约

单服务器部署必须配置备份:

```text
每日备份 PostgreSQL
每日备份 uploads
至少保留最近 7 天
正式长期使用前增加异地对象存储备份
```

必须保护:

```text
数据库
uploads 图片目录
.env 配置
docker-compose.yml
```

---

## 源码示例

当前无后端源码示例,禁止臆造示例。接入 NestJS 源码后,补充真实 Controller、DTO、Service、Prisma schema 和测试路径。
