# 后端技术契约

> 决策来源：`docs/project-definition.md`。当前尚无后端源码，本文件记录已确认的实现契约；后续接入源码后，必须用真实文件路径和代码示例刷新。

---

## 场景：NestJS 主后端与数据契约

### 1. 范围 / 触发

- 触发：项目已确定后端技术栈、数据库、登录、图片、部署和 API 风格。
- 范围：`backend/` 下的主后端实现。
- 当前不实现 Python AI 服务，只预留未来扩展。

### 2. 签名

后端主技术栈：

```text
NestJS + TypeScript
Prisma + PostgreSQL
REST JSON API + OpenAPI
账号密码 + Session Cookie
```

推荐 API 入口统一使用 `/api` 前缀。

示例接口方向：

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

OpenAPI 文档建议路径：

```text
/api/docs
```

### 3. 契约

核心数据归属：

```text
Workspace -> Users
Workspace -> Dishes
Workspace -> Recipes
Workspace -> MealRecords
Workspace -> Images
Feedback 由具体 User 提交
```

MVP 注册策略：

```text
不开放注册
管理员创建初始用户
后续支持邀请码加入 workspace
```

登录契约：

```text
账号密码登录
Session Cookie 维持登录态
前端不手动保存 JWT
密码必须哈希存储
```

数据库契约：

```text
PostgreSQL 存业务数据
Prisma 管理模型、迁移和常规查询
复杂推荐或统计允许局部使用 Prisma raw SQL
```

图片契约：

```text
图片本体不直接存 PostgreSQL
MVP 图片本体存后端本地 uploads
PostgreSQL 只存图片路径、storage_key、URL、元数据和关联关系
未来迁移对象存储
```

部署契约：

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
| 用户访问其他 workspace 数据 | 返回无权限或不存在，不泄露数据存在性 |
| 请求字段非法 | 由 NestJS DTO + class-validator 拒绝 |
| 餐次字段非法 | 拒绝请求 |
| 反馈不是好吃 / 一般 / 不好吃 | 拒绝请求 |
| 上传图片超出限制或类型非法 | 拒绝请求 |
| 推荐候选为空 | 放宽近期限制；仍为空时返回可解释的空结果 |

### 5. Good / Base / Bad Cases

- Good：所有查询都带 workspace 约束，用户只能读写自己 workspace 的数据。
- Base：单用户默认拥有一个 workspace，也走同一套 workspace 数据模型。
- Bad：用 userId 直接过滤所有业务数据，后续再补 workspace；这会导致共享空间迁移困难。
- Bad：前端直接访问 Python AI 服务；未来 AI 必须通过后端统一鉴权和数据访问。
- Bad：把大量图片二进制直接存入 PostgreSQL。

### 6. 测试要求

MVP 后端优先测试：

- workspace 数据隔离。
- 登录态访问控制。
- 推荐规则：最近 3 天排除、候选不足放宽、反馈权重。
- 盲盒规则：按餐次过滤后按权重随机。
- 用餐记录：关联菜品和未关联菜品两种情况。

### 7. Wrong vs Correct

#### Wrong

```text
前端 -> Python AI 服务 -> 数据库
```

问题：绕过主后端鉴权、workspace 隔离和 API 契约。

#### Correct

```text
前端 -> NestJS 后端 -> Python AI 服务
```

原因：登录、权限、数据访问和 API 契约统一由主后端控制。

---

## 推荐规则契约

MVP 推荐规则：

```text
默认排除最近 3 天吃过的菜
好吃提高权重
一般保持中性
不好吃降低权重但不完全排除
候选不足时自动放宽近期限制
推荐模式按分数排序
盲盒模式按权重随机
```

餐次筛选：

```text
早餐
午餐
晚餐
加餐/夜宵
```

“不限 / 全部”只是推荐入口筛选条件，不是菜品属性。

---

## 备份契约

单服务器部署必须配置备份：

```text
每日备份 PostgreSQL
每日备份 uploads
至少保留最近 7 天
正式长期使用前增加异地对象存储备份
```

必须保护：

```text
数据库
uploads 图片目录
.env 配置
docker-compose.yml
```

---

## 源码示例

当前无后端源码示例，禁止臆造示例。接入 NestJS 源码后，补充真实 Controller、DTO、Service、Prisma schema 和测试路径。
