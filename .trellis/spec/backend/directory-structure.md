# 后端目录结构规范

> 当前后端源码已落地在 `backend/`。本规范记录已存在路径和新增文件约束。

---

## 当前状态

- 后端包名：`@watermenu/backend`，配置在 `backend/package.json`。
- NestJS 源码入口：`backend/src/main.ts`。
- 应用初始化公共配置：`backend/src/app.setup.ts`。
- 认证模块：`backend/src/auth/`。
- Session 配置：`backend/src/session/`。
- Prisma 模块：`backend/src/prisma/`。
- Prisma schema、migration、seed：`backend/prisma/`。
- 后端 e2e 测试：`backend/test/`。

---

## 基础约束

1. **先思考，零假设**：目录放置不明确时先询问，不自行决定框架式结构。
2. **复用优先**：未来已有目录和模块时，优先沿用现有位置，不另起平行结构。
3. **最小实现**：只创建当前任务必要的最少文件夹和文件。
4. **手术式修改**：只触碰与任务直接相关的后端目录，不顺手搬迁或重排文件。
5. **简单命名**：目录、文件、方法名保持直观、容易搜索。

---

## 已确认的仓库根目录约定

- 后端代码根目录使用 `backend/`。
- 当前 `backend/` 仅用 `.gitkeep` 保留空目录，尚无后端源码。
- `docs/` 用于项目文档，`scripts/` 用于项目级脚本；不要把后端业务代码放入这两个目录。
- 已确认 `backend/` 使用 NestJS；新增后端代码应优先放在对应 NestJS module 目录下。

---

## 新增文件规则

- 若已有同类文件，新增代码应放在相邻位置并匹配命名风格。
- 若没有同类文件，先根据现有 NestJS 模块边界判断；仍不明确时再向用户确认目标目录。
- 不允许为了“看起来完整”创建未被任务使用的 controller、service、module、utils 等目录。
- 空目录需要被 Git 跟踪时，使用 `.gitkeep`，不要放入虚假源码或示例文件。

---

## 源码示例

实际参考路径：

- `backend/src/auth/auth.controller.ts`：认证 API Controller。
- `backend/src/auth/auth.service.ts`：登录校验与当前用户查询。
- `backend/src/auth/auth.guard.ts`：Session 登录态 Guard。
- `backend/src/session/session.config.ts`：`express-session` 与 PostgreSQL session store 配置。
- `backend/prisma/schema.prisma`：业务数据模型。
