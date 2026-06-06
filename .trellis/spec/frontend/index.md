# 前端开发规范索引

> 本目录已完成临时基础规范填充，但当前仓库尚未接入真实前端源码。所有前端规范仅基于 `AGENTS.md` 的团队规则；未来接入真实前端后，必须基于实际文件路径、技术栈和代码模式刷新。

---

## 规范索引

| 规范 | 内容 | 状态 |
|------|------|------|
| [目录结构](./directory-structure.md) | 前端文件放置与新增目录约束 | 已填充（受源码未接入限制） |
| [组件规范](./component-guidelines.md) | 组件实现的临时约束 | 已填充（受源码未接入限制） |
| [Hook 规范](./hook-guidelines.md) | Hook 与副作用封装的临时约束 | 已填充（受源码未接入限制） |
| [状态管理](./state-management.md) | 状态管理的临时约束 | 已填充（受源码未接入限制） |
| [类型安全](./type-safety.md) | 类型组织与校验的临时约束 | 已填充（受源码未接入限制） |
| [质量规范](./quality-guidelines.md) | 前端质量与验证约束 | 已填充（受源码未接入限制） |
| [技术契约](./technical-contracts.md) | React、Vite、Tailwind、TanStack Query、PWA、表单与 API 契约 | 已确认（待源码落地） |

---

## 当前限制

- 当前无真实前端源码示例，禁止臆造示例。
- 已确认前端根目录为 `frontend/`；当前仅用 `.gitkeep` 保留空目录。
- 已确认前端技术方向：React + Vite + TypeScript、Tailwind CSS、TanStack Query、React Hook Form + Zod、基础 PWA。
- 当前无可确认的真实组件模式、测试命令或内部源码目录结构。
- 后续任何前端任务都应先读取 `docs/project-definition.md` 与本目录技术契约，再按真实源码模式更新这些规范。

---

## 通用团队规则

- 使用中文沟通与文档内容。
- 先思考、零假设。
- 最小实现、复用优先。
- 手术式修改，不碰无关代码。
- 简单命名，便于搜索。
- 只清理自己造成的死代码。
