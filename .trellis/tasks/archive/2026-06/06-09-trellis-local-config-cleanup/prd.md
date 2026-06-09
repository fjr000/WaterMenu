# 收尾 Trellis 本地配置变更

## Goal

把当前工作区中未提交的 Trellis 本地配置/运行时变更收口成一个可信基线，避免后续业务开发建立在不明确的 Trellis 状态上。

## What I already know

- 当前没有业务活跃任务，本任务已创建在 `.trellis/tasks/06-09-trellis-local-config-cleanup/`。
- `git status` 显示 24 个未提交变更，全部集中在 `.trellis/`。
- `.trellis/config.yaml` 新增了自动识别的 monorepo packages：`backend`、`frontend`。
- 创建任务时出现警告：`default_package '@watermenu/backend' not found in config, skipping`。
- Trellis 当前包键名是 `backend` / `frontend`，但 `.trellis/config.yaml` 的 `default_package` 写成了 `@watermenu/backend`。
- 多个 `.trellis/scripts/**/*.py` 文件只有权限位变化：`100644 => 100755`。
- `.trellis/scripts/hooks/linear_sync.py` 主要是文档示例从 `python` 改为 `python3`。
- `.trellis/.template-hashes.json` 是 Trellis update 管理状态文件，不应手写业务规则；需要判断当前变化是否来自 Trellis update，是否应保留。
- `.trellis/workspace/index.md` 被修改，但当前开发者 journal 在 `.trellis/workspace/Jarod.F/journal-1.md`，需要判断 index 是否应更新或还原。

## Requirements

- 修正 Trellis package 默认配置，使 `task.py create` 不再提示 default_package 找不到。
- 审查 `.trellis/scripts/**/*.py` 的权限位变化，仅保留确实需要 executable 的文件。
- 审查 `.trellis/.template-hashes.json`，避免无意义重排或过期模板哈希污染提交。
- 审查 `.trellis/workspace/index.md`，确保工作区索引与当前开发者状态一致。
- 不修改业务代码。
- 不引入 Trellis 上游源码或全局 npm 安装目录改动。

## Acceptance Criteria

- [x] `python3 ./.trellis/scripts/task.py create` 或等价上下文命令不再出现 `default_package` 警告。
- [x] `git diff --summary` 不再包含明显意外的 Python 脚本权限位批量变化，除非有明确理由保留。
- [x] `.trellis/config.yaml` 的 packages/default package 与 `get_context.py --mode packages` 输出一致。
- [x] `.trellis/.template-hashes.json` 的变化有明确保留/还原决策。
- [x] `.trellis/workspace/index.md` 的变化有明确保留/还原决策。
- [x] 验证命令通过：`python3 ./.trellis/scripts/get_context.py`、`python3 ./.trellis/scripts/get_context.py --mode packages`。

## Definition of Done

- Trellis 当前任务状态可正常流转。
- 工作区只剩下有意保留的 Trellis 变更。
- 记录本任务收尾结论，提醒用户提交。

## Out of Scope

- 不改 WaterMenu 后端/前端业务功能。
- 不升级 Trellis npm 包。
- 不修改 Trellis 上游模板生成逻辑。
- 不重新设计 workflow 阶段或 task 生命周期。
- 不处理部署、PWA、备份等产品上线事项；这些应在 Trellis 基线干净后单独建任务。

## Technical Notes

- 本任务使用 `trellis-meta` 规则处理本地 `.trellis/` 文件。
- `trellis-meta` 明确：默认修改项目内 `.trellis/` 和平台目录，不修改全局 npm 安装目录。
- `.trellis/.template-hashes.json` 是 Trellis update 判断模板是否被用户修改的管理状态，默认不手写业务含义。
- 决策：还原 `.trellis/.template-hashes.json`，不把 Trellis 管理状态噪音纳入本任务提交。
- 决策：还原 `.trellis/scripts/**/*.py` 批量权限位变化，避免无意义 executable bit 污染。
- 决策：保留 `.trellis/workspace/index.md` 中 `python` → `python3` 的文档示例修正。
