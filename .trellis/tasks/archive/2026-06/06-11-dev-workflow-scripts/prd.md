# 本地开发脚本与启动文档

## Goal

把本地开发环境启动流程收敛成一组根级快捷脚本，降低新会话和日常开发的启动成本。目标是让开发者通过 `pnpm dev` 一次性启动 PostgreSQL、执行 Prisma 准备步骤，并同时拉起前后端；同时提供配套的停止与重置命令，并把 README 的本地启动说明同步到新流程。

## What I already know

- 当前已有未提交改动：`package.json`、`scripts/dev.sh`、`scripts/dev-stop.sh`、`scripts/dev-reset.sh`、`README.md`。
- `package.json` 已新增根脚本：`dev`、`dev:stop`、`dev:reset`。
- `scripts/dev.sh` 当前会：检查 `backend/.env`、启动 PostgreSQL、等待数据库 ready、执行 Prisma generate / migrate / seed，并发启动前后端，并在退出时清理子进程。
- `scripts/dev-stop.sh` 当前会：读取 PID 文件、尝试按进程组结束前后端、按命令名和端口兜底清理，并执行 `docker compose down`。
- `scripts/dev-reset.sh` 当前会串联 stop → `pnpm db:reset` → dev。
- `README.md` 当前已把本地启动说明改成以 `pnpm dev` 为主，并新增 `dev:stop` / `dev:reset` 说明。
- `.gitignore` 目前忽略了 `tmp/` 和 `temp/`，但没有忽略 `.tmp/`；当前工作区里有 `.tmp/` 运行日志与 PID 文件。

## Assumptions (temporary)

- 这次任务的 MVP 以“统一本地开发脚本 + 文档同步”为主，不扩展到生产部署或 CI。
- `scripts/dev*.sh` 的目标用户是本仓库开发者，因此可以依赖本地已有 `docker compose`、`pnpm`、`bash`。
- `.tmp/` 下的日志和 PID 文件属于运行时产物，不应进入最终提交；本次任务会把 `.tmp/` 加入 `.gitignore` 一并收口。

## Open Questions

- 暂无阻塞问题。

## Requirements (evolving)

- 提供根命令 `pnpm dev`，自动完成本地数据库准备并同时启动前后端。
- 提供根命令 `pnpm dev:stop`，能停止前后端并关闭本地 PostgreSQL。
- 提供根命令 `pnpm dev:reset`，能重置本地数据库并重新拉起整套开发环境。
- README 的“本地启动”说明与新命令保持一致。
- 不把 `.tmp/` 运行日志误纳入功能提交。
- 把 `.tmp/` 加入 `.gitignore`，避免后续开发会话反复产生无关脏文件。

## Acceptance Criteria (evolving)

- [ ] `pnpm dev` 的入口定义在根 `package.json`，并指向可执行脚本。
- [ ] `scripts/dev.sh` 能在缺少 `backend/.env` 时明确报错，在数据库未启动时自动拉起，并完成 Prisma 准备步骤。
- [ ] `scripts/dev-stop.sh` 能停止由 `pnpm dev` 拉起的前后端进程，并关闭 PostgreSQL。
- [ ] `scripts/dev-reset.sh` 能串联 stop / db reset / dev。
- [ ] `README.md` 的本地启动章节描述的是 `pnpm dev` 新流程，而不是旧的多终端手动步骤。
- [ ] 临时日志/PID 文件不会被纳入本次功能提交。
- [ ] `.gitignore` 已覆盖 `.tmp/` 运行产物。

## Definition of Done (team quality bar)

- 脚本与文档改动可自洽
- 必要的验证命令已运行并记录结果
- 不混入无关运行产物
- 如本次形成稳定约定，补充相应 spec

## Out of Scope (explicit)

- 改造生产部署脚本
- 变更后端或前端业务功能
- 引入新的进程管理器（如 concurrently、pm2、foreman）

## Technical Notes

- 当前受影响文件：`package.json`、`scripts/dev.sh`、`scripts/dev-stop.sh`、`scripts/dev-reset.sh`、`README.md`
- 当前运行产物位于 `.tmp/`
- 用户已确认把 `.tmp/` 忽略规则一并纳入本任务
