# 完善测试覆盖与生产部署配置

## Goal

确保 WaterMenu 项目的测试覆盖完整、CI 流水线可靠、生产部署配置可验证。当前后端有 55 个 e2e 测试全部通过，前端有 24 个测试全部通过，CI 已配置。需要补充缺失的测试用例，验证部署配置的完整性。

## What I already know

- 后端：NestJS + Prisma + PostgreSQL，7 个 e2e 测试文件，55 个测试全部通过
- 前端：React 19 + Vite 7 + Tailwind CSS 4，3 个测试文件，24 个测试全部通过
- CI：GitHub Actions 已配置 lint、typecheck、test、build
- 部署：Docker Compose 生产配置存在，包含 Nginx、PostgreSQL、后端
- 数据模型：Workspace、User、Dish、Recipe、MealRecord、Feedback、DishImage、WorkspaceInvite

## Assumptions (temporary)

- 后端 e2e 测试已覆盖主要业务逻辑
- 前端测试需要补充页面级测试和表单验证测试
- 生产部署配置需要验证 Dockerfiles 和 Nginx 配置

## Open Questions

1. 是否需要为后端服务添加单元测试（目前只有 e2e 测试）？
2. 前端测试优先补充哪些页面/组件？
3. 生产部署配置是否需要添加健康检查端点？

## Requirements (evolving)

### 后端测试
- [x] 验证现有 e2e 测试全部通过
- [x] 补充健康检查 e2e 测试
- [x] 后端单元测试暂不补充：当前任务优先使用现有 e2e 风格覆盖部署健康检查

### 前端测试
- [x] 验证现有测试全部通过
- [x] 补充页面级测试（login-page、invite-page、home-page）
- [x] 补充表单验证测试
- [x] 补充错误处理测试

### 生产部署
- [x] 验证 Dockerfiles 构建正确
- [x] 验证 Nginx 配置完整
- [x] 验证备份/恢复脚本可用
- [x] 检查健康检查端点

## Acceptance Criteria (evolving)

- [x] 后端测试全部通过（56 个 e2e 测试通过）
- [x] 前端测试全部通过（34 个 Vitest 测试通过）
- [x] 前端测试覆盖率达到合理水平（已补充页面级测试）
- [x] 生产部署配置可验证（Dockerfiles、Nginx、Compose、备份/恢复脚本）
- [x] CI 流水线本地等价质量门通过

## Definition of Done (team quality bar)

- Tests added/updated (unit/integration where appropriate)
- Lint / typecheck / CI green
- Docs/notes updated if behavior changes
- Rollout/rollback considered if risky

## Out of Scope (explicit)

- 不添加新的业务功能
- 不修改现有业务逻辑
- 不进行性能优化
- 不添加监控/日志系统

## Technical Notes

### 当前测试覆盖
- 后端 e2e 测试：auth、dishes、recipes、meal-records-feedback、members-invites、dish-images、recommendations
- 前端测试：components.test.tsx、hooks.test.tsx、client.test.ts

### 前端需要测试的文件
- pages/login-page.tsx
- pages/invite-page.tsx
- pages/home-page.tsx
- components/create-dish-form.tsx（已有部分测试）
- components/meal-record-form.tsx（已有部分测试）

### 生产部署配置文件
- backend/Dockerfile
- frontend/Dockerfile
- deploy/nginx/nginx.conf
- deploy/nginx/conf.d/watermenu.conf
- scripts/backup-postgres.sh
- scripts/restore-postgres.sh

## Decision (ADR-lite)

**Context**: 需要平衡测试覆盖和开发效率
**Decision**: 优先补充页面级测试和表单验证测试，后端单元测试作为可选项
**Consequences**: 可以快速提高前端测试覆盖，后端已有 e2e 测试保障核心逻辑

## Implementation Plan

### Phase 1: 验证现有测试（已完成）
- 运行后端测试：55 个全部通过
- 运行前端测试：24 个全部通过

### Phase 2: 补充前端测试（已完成）
- 添加页面级测试（login-page、invite-page、home-page）
- 添加表单验证测试
- 添加错误处理测试

### Phase 3: 验证生产部署配置（已完成）
- 检查 Dockerfiles 构建
- 检查 Nginx 配置
- 验证备份/恢复脚本
- 添加并接入 `/api/health` 后端健康检查

### Phase 4: 最终验证（已完成）
- 运行完整测试套件
- 验证 CI 流水线本地等价命令
