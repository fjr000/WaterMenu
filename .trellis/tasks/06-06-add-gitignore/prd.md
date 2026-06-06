# 添加 gitignore 文件

## Goal

为仓库添加根目录 `.gitignore`，避免依赖、构建产物、日志、环境变量、本地编辑器配置、系统文件、后端缓存和临时文件被误提交。

## What I already know

* 当前任务已存在：`.trellis/tasks/06-06-add-gitignore`，状态为 `planning`。
* 仓库根目录已存在未跟踪的 `.gitignore`。
* 当前仓库包含 `backend/`、`frontend/`、`docs/`，其中 `backend/` 和 `frontend/` 目前仅有 `.gitkeep`。
* 当前未发现真实前后端源码或项目级 `package.json`；只发现 `.pi/npm/package.json`，属于工具目录。
* 当前 `.gitignore` 已覆盖：`node_modules/`、构建产物、日志、环境变量、IDE/编辑器文件、系统文件、Python 缓存、临时目录。

## Assumptions (temporary)

* 本任务目标是接受并完善根目录 `.gitignore`，不涉及初始化前端或后端项目。
* `.env.example` 应允许提交，用于记录环境变量模板。
* 不忽略 `.trellis/`、`.pi/`、`.agents/` 等项目/工具配置目录，避免误屏蔽当前仓库需要追踪的配置。

## Open Questions

* 无。

## Requirements

* 根目录必须存在 `.gitignore`。
* `.gitignore` 必须忽略常见依赖目录、构建产物、日志文件、环境变量、本地编辑器配置、系统文件、后端缓存和临时文件。
* `.env.example` 必须保留可提交。
* 不引入与当前仓库无关的大型模板或过度泛化规则。

## Acceptance Criteria

* [x] 根目录 `.gitignore` 存在。
* [x] `.gitignore` 包含当前仓库合理需要的忽略规则。
* [x] `.env.example` 不被忽略。
* [x] 未误忽略需要纳入版本控制的项目配置目录。
* [x] `git status --porcelain` 不再因为常见本地产物显示无关文件。

## Definition of Done (team quality bar)

* 需求已确认：采用当前 `.gitignore` 内容作为 MVP，仅在明显遗漏时补充最小条目。
* `.gitignore` 规则最小且可解释。
* 无无关代码或配置改动。
* 完成 Trellis 质量检查流程。

## Out of Scope (explicit)

* 不初始化前端或后端项目。
* 不添加依赖、脚本或 CI 配置。
* 不清理或重构现有目录结构。
* 不忽略 Trellis、Pi、Agent 等当前已存在的项目管理配置，除非用户明确要求。

## Technical Approach

采用根目录单一 `.gitignore`，按用途分组写入最小规则。当前已有内容基本满足 MVP；实现阶段只需要核对并在必要时做手术式补充。

## Decision (ADR-lite)

**Context**: 仓库处于早期阶段，前后端真实源码尚未接入，但已有明确的 `backend/`、`frontend/` 方向，需要先防止常见本地产物误提交。

**Decision**: 使用根目录 `.gitignore` 覆盖跨前端、后端和通用开发环境的最小忽略规则；保留 `.env.example` 可提交。

**Consequences**: 规则不会覆盖所有未来技术栈产物，后续接入真实源码时如出现新产物，再按实际需要增补。

## Technical Notes

* 已检查：`.gitignore`、`backend/`、`frontend/`、`docs/`、`.trellis/spec/backend/index.md`、`.trellis/spec/frontend/index.md`。
* 规范索引显示当前前后端源码尚未落地，规范多为临时基础约束。
* 本任务不需要外部研究文件。
* 用户已确认采用当前 `.gitignore` 内容作为 MVP。
* 已完成最终验证；本任务未产生需要写入 `.trellis/spec/` 的新代码契约或规范。
