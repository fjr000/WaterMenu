# 后端开发规范索引

> 本目录已基于当前后端基础登录闭环落地状态更新。后端源码位于 `backend/`，使用 NestJS + TypeScript、Prisma + PostgreSQL、Session Cookie。

---

## 规范索引

| 规范 | 内容 | 状态 |
|------|------|------|
| [目录结构](./directory-structure.md) | 后端文件放置与新增目录约束 | 已基于认证后端落地更新 |
| [数据库规范](./database-guidelines.md) | 数据库与迁移约束 | 已基于 Prisma 落地更新 |
| [错误处理](./error-handling.md) | 错误处理约束 | 部分已落地，认证边界见技术契约 |
| [日志规范](./logging-guidelines.md) | 日志记录约束 | 仍为基础约束 |
| [质量规范](./quality-guidelines.md) | 后端质量与验证约束 | 已记录真实命令 |
| [技术契约](./technical-contracts.md) | NestJS、Prisma、PostgreSQL、登录、API、部署与推荐契约 | 已记录认证闭环契约 |

---

## 当前限制

- 后端根目录为 `backend/`。
- 当前已落地 NestJS + TypeScript、Prisma + PostgreSQL、REST JSON API + OpenAPI、Session Cookie。
- 当前认证相关源码位于 `backend/src/auth/`、`backend/src/session/`、`backend/src/prisma/`。
- Prisma schema 位于 `backend/prisma/schema.prisma`，seed 位于 `backend/prisma/seed.ts`。
- 后端测试命令与质量命令见 [`quality-guidelines.md`](./quality-guidelines.md)。
- 后续任何后端任务都应先读取 `docs/project-definition.md` 与本目录技术契约，再按真实源码模式更新这些规范。

---

## 通用团队规则

- 使用中文沟通与文档内容。
- 先思考、零假设。
- 最小实现、复用优先。
- 手术式修改，不碰无关代码。
- 简单命名，便于搜索。
- 只清理自己造成的死代码。
