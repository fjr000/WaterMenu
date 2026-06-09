# Backend Development Guidelines

> 后端开发规范基于当前 NestJS + Prisma + PostgreSQL 代码库。

## Overview

本目录记录 `@watermenu/backend` 的现有约定，目标是让后续 AI session 按项目真实模式实现代码，而不是使用泛化模板。

当前后端的主线模式是：

- 按 feature module 组织代码
- controller 保持薄层，service 负责业务规则
- 所有业务数据按 workspace 隔离
- 鉴权、唯一冲突、跨 workspace 隔离都通过 Nest 异常表达

Reference files:
- `backend/src/app.module.ts`
- `backend/src/dishes/dishes.service.ts`
- `backend/src/auth/auth.guard.ts`
- `backend/test/dishes.e2e-spec.ts`

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | 模块目录结构与职责划分 | Filled |
| [Database Guidelines](./database-guidelines.md) | Prisma 查询、迁移、workspace 隔离 | Filled |
| [Error Handling](./error-handling.md) | Nest 异常、状态码、错误映射 | Filled |
| [Quality Guidelines](./quality-guidelines.md) | 类型检查、Jest e2e 测试、DTO 校验 | Filled |
| [Logging Guidelines](./logging-guidelines.md) | 当前无统一日志层的现状与后续建议 | Filled |
