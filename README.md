# WaterMenu

家庭 / 团体菜谱与用餐记录管理系统。支持菜品管理、菜谱维护、用餐记录、反馈评分、成员协作等功能。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | NestJS + Prisma + PostgreSQL |
| 前端 | React 19 + Vite 7 + Tailwind CSS 4 |
| 状态管理 | React Query + React Hook Form + Zod |
| 包管理 | pnpm monorepo |
| 部署 | Docker Compose（PostgreSQL + 后端 + Nginx） |

## 本地启动

本地 PostgreSQL 由 `docker-compose.yml` 提供；前后端通过 pnpm 在本机运行。

```bash
pnpm install
cp backend/.env.example backend/.env
pnpm dev
```

`pnpm dev` 会自动启动 PostgreSQL、同步数据库迁移、写入 seed 数据，并同时拉起后端和前端。
`pnpm dev:stop` 会停止前后端进程并关闭 PostgreSQL。
`pnpm dev:reset` 会清空本地数据库后重新启动整套开发环境。

- 后端 API：`http://localhost:3000/api`
- 前端页面：`http://localhost:5173`
- API 文档：`http://localhost:3000/api/docs`（Swagger UI）

## 数据库命令

```bash
pnpm db:up      # 启动 PostgreSQL
pnpm db:down    # 停止并移除容器（保留数据卷）
pnpm db:reset   # 停止容器、删除数据卷、重新启动空数据库
```

`pnpm db:reset` 后需要重新执行：

```bash
pnpm backend:prisma:migrate
pnpm backend:prisma:seed
```

## 初始用户

seed 脚本读取 `backend/.env` 中以下变量创建初始用户：

- `SEED_WORKSPACE_NAME` — 工作空间名称
- `SEED_USER_EMAIL` — 登录邮箱
- `SEED_USER_PASSWORD` — 登录密码（argon2 哈希存储）
- `SEED_USER_NAME` — 用户显示名

## 开发命令

```bash
pnpm backend:dev          # 启动后端开发服务器
pnpm backend:build        # 构建后端
pnpm backend:lint         # 后端 lint
pnpm backend:typecheck    # 后端类型检查
pnpm backend:test         # 后端 e2e 测试

pnpm frontend:dev         # 启动前端开发服务器
pnpm frontend:build       # 构建前端
pnpm frontend:typecheck   # 前端类型检查
pnpm frontend:test        # 前端 Vitest 测试
```

## Docker 部署

生产环境使用 `docker-compose.prod.yml`，包含 PostgreSQL、后端、Nginx 三个服务：

```bash
# 配置环境变量
mkdir -p deploy/env
cp deploy/env/prod.env.example deploy/env/prod.env
# 编辑 deploy/env/prod.env 填写生产环境配置

# 启动
docker compose -f docker-compose.prod.yml up -d --build
```

- Nginx 监听 80/443 端口
- 后端 API 通过 Nginx 反向代理至 `/api`
- 前端静态文件由 Nginx 直接提供
- SSL 证书放置在 `deploy/certs/` 目录

## 项目结构

```
.
├── backend/                # NestJS 后端
│   ├── src/                # 源码（按 feature module 组织）
│   ├── test/               # e2e 测试
│   └── prisma/             # 数据库 schema 与迁移
├── frontend/               # React 前端
│   └── src/
│       ├── api/            # API 客户端与类型定义
│       ├── components/     # 业务组件与通用 UI
│       ├── hooks/          # React Query hooks
│       └── pages/          # 页面组件
├── docker-compose.yml      # 本地开发数据库
├── docker-compose.prod.yml # 生产环境部署
└── package.json            # monorepo 根配置
```

## License

Private
