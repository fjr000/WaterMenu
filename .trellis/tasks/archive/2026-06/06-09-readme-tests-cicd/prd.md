# 补 README + 前端测试 + CI/CD 流水线

## Goal

补齐项目基础设施缺失的三块：根目录 README、前端测试覆盖、GitHub Actions CI/CD 流水线。提升项目可维护性、协作友好度和代码质量保障。

## What I already know

### README
- 根目录无 README.md
- 后端有 `backend/README.md`（本地启动、数据库命令、session 表、seed 用户说明）
- 前端无 README
- 项目使用 pnpm monorepo、NestJS、Prisma、React、Vite、Tailwind

### 前端测试
- 前端零测试文件，无 test script
- 前端使用 React 19 + Vite 7 + Tailwind CSS 4 + React Query + React Hook Form + Zod
- 后端使用 Jest + supertest 做 e2e 测试（7 个测试文件），模式成熟
- 前端依赖中无任何测试库

### CI/CD
- 无 `.github` 目录，无任何 CI 配置
- 有 `docker-compose.yml`（dev: 只有 postgres）和 `docker-compose.prod.yml`（prod: postgres + backend + nginx）
- 后端有 lint、typecheck、test 脚本
- 前端只有 typecheck 脚本，无 lint、无 test

## Assumptions

- 使用 GitHub Actions（项目在 GitHub）
- 前端测试用 Vitest（Vite 生态标准，与 Jest API 兼容）
- CI 流水线做 lint + typecheck + test + build

## Decision (ADR-lite)

**Context**: 前端测试范围需要确定
**Decision**: 选择方案 C — 全量覆盖（hooks + 组件 + 集成测试）
**Consequences**: 工作量较大，但覆盖最完整；使用 Vitest + React Testing Library + jsdom

## Requirements (evolving)

- 根目录 README.md：项目介绍、技术栈、本地启动、部署说明
- 前端测试框架搭建（Vitest + React Testing Library + jsdom）
  - 8 个 hooks 单元测试（renderHook）
  - 12 个组件测试（React Testing Library）
  - API client 测试
  - 集成测试
- GitHub Actions CI 流水线（lint + typecheck + test + build）

## Acceptance Criteria (evolving)

- [ ] 根目录有 README.md（项目介绍、技术栈、本地启动、部署说明）
- [ ] 前端有 vitest.config + test script
- [ ] 前端有可运行的 hooks 单元测试
- [ ] 前端有可运行的组件测试
- [ ] CI 流水线在 PR/push 时自动运行
- [ ] CI 流水线运行 lint + typecheck + test + build

## Definition of Done

- Lint / typecheck / CI green
- 测试可本地运行

## Out of Scope

- 前端 e2e 测试（Playwright/Cypress）
- CD 自动部署
- 文档站点

## Technical Notes

- 后端 e2e 测试模式参考：`backend/test/dishes.e2e-spec.ts`
- 后端 README 参考：`backend/README.md`
- Docker 部署架构：`docker-compose.prod.yml`（postgres + backend + nginx）
