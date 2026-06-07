# brainstorm: 确定下一步功能与方案设计

## Goal

深入理解 WaterMenu 当前代码与产品状态，判断下一步最值得完成的功能，并在进入实现前明确方案、分歧点、风险与验收标准。

## What I already know

* 用户希望先理解项目，再判断下一步功能，不直接进入编码。
* 需要使用设计拷问方式：先明确约束、成功标准和会影响后续设计树的关键决策。
* 当前无 active task，本任务用于承载调研、PRD 与后续方案设计。
* `docs/project-definition.md` 定位 WaterMenu 为手机优先的菜单推荐与饮食记录 Web 应用，目标问题包括“今天吃什么”“某个菜怎么做”“什么时候吃过，反馈怎么样”。
* MVP 范围已定义：登录、菜品管理、食谱 / 做法、用餐记录、反馈、规则推荐、盲盒。
* 近期归档任务显示核心 MVP 业务闭环已经基本完成：认证、PostgreSQL、菜品 API、推荐 / 盲盒 API、前端 MVP、用餐记录与反馈、食谱做法记录。
* 当前源码已包含 `auth`、`dishes`、`meal-records`、`feedback`、`recommendations`、`recipes` 后端模块。
* 当前前端已包含首页推荐 / 盲盒、菜品管理、记录已吃、最近 5 条用餐反馈、做法查看 / 新增 / 编辑。
* 当前 `docker-compose.yml` 只启动本地 PostgreSQL，尚未把前端、后端、Nginx、生产迁移、备份纳入可部署闭环。
* 项目定义明确公网部署、同域 `/api`、Docker Compose、Nginx、PostgreSQL 持久化、每日备份是后续必须落地的方向。

## Assumptions (temporary)

* 下一步应优先补齐“真实可长期使用”的阻塞项，而不是继续堆叠高级产品功能。
* 如果目标是尽快自己/家庭实际使用，部署可用化的优先级高于图片、统计、开放注册或 AI。
* 最终会收敛为一个 MVP 功能，并列出不做的范围。

## Open Questions

* 已确认：下一步选择“生产部署与备份闭环”。
* 已确认：本任务交付边界为仓库内部署资产与文档，不实际登录服务器部署。
* 已确认：生产 HTTPS / Nginx 入口采用 Compose 内 Nginx 统一入口，暴露 80/443，支持挂载证书文件。
* 已确认：生产镜像在服务器通过仓库内 Dockerfile 构建，服务器只要求 Docker / Docker Compose，不要求 Node / pnpm。
* 已确认：生产数据库启动前自动执行 `prisma migrate deploy`；seed 只通过文档中的一次性命令手动执行。
* 已确认：备份采用宿主机脚本 + cron 示例，优先把 PostgreSQL 数据库备份与恢复做扎实；保留策略采用最近 7 天。
* 已确认：本任务预留 uploads 持久化卷和备份入口，但不实现图片上传业务。
* 已确认：生产 Compose 独立为 `docker-compose.prod.yml`；现有 `docker-compose.yml` 继续只服务本地 PostgreSQL 开发流程。
* 已确认：MVP 部署闭环只覆盖单机 Docker Compose 本地 build，不预留镜像仓库 / CI 发布。

## Requirements

* 新增生产部署闭环，不破坏现有本地开发数据库 Compose。
* 新增生产后端镜像构建配置，容器内运行 NestJS 编译产物。
* 新增生产前端构建配置，由 Nginx 服务静态产物。
* 新增 `docker-compose.prod.yml`，至少编排 `postgres`、`backend`、`nginx`。
* 生产入口由 Compose 内 Nginx 暴露 `80` / `443`，`/` 服务前端，`/api` 反向代理到后端。
* 生产后端启动前自动执行 `prisma migrate deploy`。
* 初始管理员 seed 只在部署文档中作为一次性手动命令提供，不随容器启动自动执行。
* 生产 PostgreSQL 必须持久化；生产 Compose 不需要向公网暴露数据库端口。
* 生产 Compose 预留 `/app/uploads` 持久化挂载和备份入口，但不实现图片上传业务。
* 新增宿主机 PostgreSQL 备份脚本、恢复脚本和 cron 示例，默认保留最近 7 天备份。
* 新增部署文档，覆盖服务器前置条件、环境变量、证书挂载、构建启动、迁移、seed、备份、恢复、升级、回滚和常见故障。
* 本阶段不引入 CI、镜像仓库、GitHub Actions 或外部发布 token。

## Candidate Next Features

### A. 生产部署与备份闭环（推荐）

* 内容：补齐生产 Docker Compose、后端容器、前端静态托管 / Nginx、同域 `/api` 反代、迁移启动流程、环境变量示例、数据库备份脚本和恢复说明。
* 理由：当前业务 MVP 已能闭环，但项目定义要求“公网部署、手机浏览器/PWA 使用、单服务器 + Docker Compose、每日备份”。不落地部署，产品仍停留在本地开发可用。
* 风险：涉及生产环境配置、Cookie secure/sameSite、数据库迁移、备份恢复，需要谨慎设计避免影响本地开发流程。

### B. 历史记录浏览 / 搜索 / 筛选

* 内容：把“最近 5 条”扩展为完整历史页，支持按餐次、菜品、时间范围、反馈筛选。
* 理由：直接回应“什么时候吃过，反馈怎么样”。
* 风险：后端当前 `GET /meal-records` 无分页和筛选，直接全量返回在数据增长后会变差；需要 API 查询契约。

### C. 菜品图片上传与封面展示

* 内容：为菜品加图片上传、封面展示，推荐结果更直观。
* 理由：手机端使用体验提升明显，项目定义已有图片策略。
* 风险：会牵涉 uploads 持久化、文件访问权限、备份、类型/大小校验；如果部署与备份没先做好，图片会放大数据丢失风险。

## Recommended Direction

推荐选择 A：生产部署与备份闭环。它不是最“好看”的功能，但它解决当前最大的产品阻塞：核心业务已经可用，却还不能安全、稳定、可恢复地在手机上长期使用。B 和 C 都依赖一个稳定部署/备份基础，尤其 C 会引入 uploads 持久化，若先做图片反而会把未解决的部署问题放大。

## Decision (ADR-lite)

**Context**：核心业务 MVP 已基本闭环，但当前只具备本地开发运行能力；项目定义要求公网部署、同域 `/api`、Docker Compose、Nginx、PostgreSQL 持久化与每日备份。

**Decision**：下一步功能锁定为“生产部署与备份闭环”。

**Consequences**：本任务优先解决可访问、可启动、可迁移、可备份、可恢复问题；历史浏览、图片上传、统计、开放注册、AI 等产品功能延后。

## Delivery Boundary

* 交付仓库内部署资产与文档。
* 不实际登录服务器部署。
* 不代办域名解析、证书签发、防火墙配置或真实数据迁移。
* 需要文档说明服务器侧必须完成的前置条件。

## Confirmed Design Decisions

* 入口：Compose 内 `nginx` 做统一入口，暴露 `80` / `443`。
* TLS：仓库提供证书挂载路径和 Nginx HTTPS 配置模板；证书签发由服务器侧自行完成。
* 路由：`/` 服务前端静态文件，`/api` 反向代理到后端 NestJS。
* Cookie：生产必须通过 HTTPS 访问，匹配后端 `NODE_ENV=production` 下 `secure=true` 的 Session Cookie。
* 镜像：仓库内提供生产 Dockerfile，服务器通过 `docker compose build` 构建镜像；不要求服务器安装 Node / pnpm。
* 迁移：生产后端容器启动前自动执行 `prisma migrate deploy`，迁移失败则后端不启动，避免代码与 schema 不一致。
* Seed：初始用户 seed 不随容器自动启动；部署文档提供一次性手动 seed 命令，避免重启时反复覆盖初始用户密码。
* 备份：仓库提供宿主机执行的 PostgreSQL 备份 / 恢复脚本和 cron 示例，不在 Compose 内引入定时备份容器。
* 保留：数据库备份默认保留最近 7 天；异地备份作为后续正式长期使用前必须补齐的增强项。
* Uploads：生产 Compose 预留 `/app/uploads` 持久化挂载；备份脚本预留 uploads 备份入口；当前不实现图片上传 API 或前端图片功能。
* Compose：保留现有 `docker-compose.yml` 作为本地开发数据库配置；新增 `docker-compose.prod.yml` 专管生产服务，避免本地和生产端口、证书、网络、volume 约束互相污染。
* 发布：本阶段不引入 CI、镜像仓库、GitHub Actions、GHCR / Docker Hub token；生产服务器通过 `git pull` 后本地 `docker compose build` 构建。
* 前端镜像：`frontend/Dockerfile` 采用 build stage 构建 Vite 静态产物，最终镜像基于 Nginx；Compose 中不新增独立 `frontend` 运行服务，`nginx` 服务即前端静态服务与反代入口。
* 后端镜像：生产启动需要在运行期执行 `prisma migrate deploy`，因此后端镜像内必须保留 Prisma CLI 可用性；不得做成缺少迁移命令的纯 Node runtime。
* Uploads 挂载：优先使用仓库外或部署目录下的宿主机目录 bind mount 到 `/app/uploads`，方便后续纳入文件备份；当前目录可为空。

## Technical Approach

### 文件结构草案

```text
backend/Dockerfile
frontend/Dockerfile
docker-compose.prod.yml
deploy/
  nginx/
    nginx.conf
    conf.d/watermenu.conf
  env/
    prod.env.example
  certs/.gitkeep
  README.md
scripts/
  backup-postgres.sh
  restore-postgres.sh
```

### 生产服务草案

* `postgres`：使用 PostgreSQL Alpine 镜像，内部网络访问，持久化 `postgres_data`。
* `backend`：从仓库构建，连接 `postgres:5432`，启动命令先执行 `pnpm prisma:deploy`，再执行 `pnpm start`。
* `nginx`：由 `frontend/Dockerfile` 构建出的最终 Nginx 镜像承载，作为唯一公网入口，暴露 `80:80` 与 `443:443`，加载证书挂载路径，转发 `/api` 到 `backend:3000`，其余路径回落到前端 `index.html`。
* `uploads`：以宿主机目录 bind mount 到后端 `/app/uploads`，当前为空数据入口，供后续图片上传复用和备份脚本扩展。

### 部署流程草案

1. 服务器安装 Docker 与 Docker Compose。
2. 拉取仓库，复制生产环境变量模板并填写强随机 `SESSION_SECRET`、数据库密码、seed 信息。
3. 准备 HTTPS 证书文件并按文档路径挂载。
4. 执行 `docker compose -f docker-compose.prod.yml build`。
5. 执行 `docker compose -f docker-compose.prod.yml up -d`。
6. 首次部署后手动执行一次 seed 命令创建初始用户。
7. 配置宿主机 cron 每日运行数据库备份脚本。
8. 用浏览器访问 HTTPS 域名，验证登录、推荐、记录和反馈主流程。

### 回滚 / 恢复草案

* 应用回滚：保留上一版 git commit，可 `git checkout <commit>` 后重新 build/up。
* 数据库恢复：停止后端写入，使用 `restore-postgres.sh <backup-file>` 恢复指定 dump；脚本必须提示覆盖风险。
* 备份验证：文档要求首次部署后手动执行一次 backup，再在非生产环境或明确风险下验证 restore。

## Acceptance Criteria

* [x] 能说明当前产品已经具备哪些能力。
* [x] 能说明当前最明显的产品缺口和技术约束。
* [x] 能给出 2–3 个下一步功能候选，并明确推荐项。
* [x] 能围绕推荐项提出可执行 MVP 方案。
* [x] 主要分歧点已被用户确认或明确延后。
* [ ] `docker compose -f docker-compose.prod.yml config --quiet` 通过。
* [ ] 生产后端镜像能构建，并能在容器内运行 `prisma migrate deploy` 后启动应用。
* [ ] 生产前端镜像能构建，Nginx 能服务前端静态文件。
* [ ] Nginx 配置包含 `/api` 反代、SPA fallback、HTTP 到 HTTPS 入口策略和证书挂载说明。
* [ ] 生产 Compose 不要求服务器安装 Node / pnpm。
* [ ] 生产部署文档包含首次部署、升级、seed、备份、恢复、回滚和故障排查。
* [ ] PostgreSQL 备份脚本能生成带时间戳的 dump，并按最近 7 天策略清理旧备份。
* [ ] PostgreSQL 恢复脚本需要显式参数，并在执行前提示覆盖风险。
* [ ] 现有本地 `docker-compose.yml` 开发流程不被破坏。

## Definition of Done (team quality bar)

* Tests added/updated（进入实现时按需补充）。
* Lint / typecheck / CI green（进入实现时执行）。
* Docs/notes updated if behavior changes。
* Rollout/rollback considered if risky。

## Out of Scope (explicit)

* 不实际登录服务器部署。
* 不代办域名解析、证书签发、防火墙配置或真实数据迁移。
* 不实现 CI / 镜像仓库发布。
* 不实现图片上传 API、图片管理 UI 或图片展示。
* 不实现历史记录浏览 / 搜索 / 筛选。
* 不实现开放注册、邀请码、权限管理、AI、统计或营养分析。
* 不修改现有业务 API 语义，除非实现部署时发现必须修正的生产启动缺陷。

## Technical Notes

* 项目定义：`docs/project-definition.md`。
* 后端技术契约：`.trellis/spec/backend/technical-contracts.md`。
* 前端技术契约：`.trellis/spec/frontend/technical-contracts.md`。
* 数据库规范：`.trellis/spec/backend/database-guidelines.md`。
* 当前本地数据库 Compose：`docker-compose.yml`，只有 `postgres` 服务。
* 根脚本：`package.json` 已有 `db:*`、`backend:*`、`frontend:*` 本地命令。
* API Client：`frontend/src/api/client.ts` 固定使用同域 `/api`，适合 Nginx 反代后端。
* Vite dev proxy：`frontend/vite.config.ts` 本地把 `/api` 代理到 `http://localhost:3000`。
* 后端启动脚本：`backend/package.json` 有 `start`、`build`、`prisma:deploy`、`prisma:seed`。
* 当前业务能力路径：`backend/src/auth/`、`backend/src/dishes/`、`backend/src/meal-records/`、`backend/src/feedback/`、`backend/src/recommendations/`、`backend/src/recipes/`。
* 当前前端主入口：`frontend/src/pages/home-page.tsx`，包含推荐、菜品、记录已吃、最近用餐、做法面板。
