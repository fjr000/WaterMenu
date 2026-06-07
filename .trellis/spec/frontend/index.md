# 前端开发规范索引

> 基于 `frontend/` 的真实源码，记录当前前端技术栈、规范和实现细节。

---

## 规范索引

| 规范 | 内容 | 状态 |
|------|------|------|
| [目录结构](./directory-structure.md) | 前端文件放置与目录组织 | ✅ 已更新 |
| [组件规范](./component-guidelines.md) | 组件实现模式、props 约定、样式方案 | ✅ 已更新 |
| [Hook 规范](./hook-guidelines.md) | Hook 实现模式、数据获取、副作用封装 | ✅ 已更新 |
| [状态管理](./state-management.md) | TanStack Query + React 状态管理 | ✅ 已更新 |
| [类型安全](./type-safety.md) | TypeScript 类型、Zod 校验、API 类型 | ✅ 已更新 |
| [质量规范](./quality-guidelines.md) | 验证命令、质量门禁、测试策略 | ✅ 已更新 |
| [技术契约](./technical-contracts.md) | React/Vite/Tailwind/TanStack Query/RHF/Zod/PWA 契约 | ✅ 已更新 |

---

## 技术栈

- React 19 + Vite 7 + TypeScript 5.8
- Tailwind CSS 4（@tailwindcss/vite 插件）
- TanStack Query 5
- React Hook Form 7 + Zod 4
- REST JSON API + Session Cookie
- 基础 PWA

---

## 当前状态

- 前端根目录：`frontend/`
- 入口文件：`frontend/src/main.tsx`
- HTML 入口：`frontend/index.html`
- 类型检查：`pnpm --filter @watermenu/frontend typecheck`
- 构建：`pnpm --filter @watermenu/frontend build`
- 开发：`pnpm --filter @watermenu/frontend dev`

---

## 目录结构

```
frontend/src/
├── api/          # API 层（client.ts, types.ts）
├── components/   # 可复用组件（ui.tsx, create-dish-form.tsx, etc.）
├── hooks/        # 自定义 Hooks（use-auth.tsx, use-dishes.ts, etc.）
└── pages/        # 页面组件（login-page.tsx, home-page.tsx）
```

---

## 通用团队规则

- 使用中文沟通与文档内容。
- 先思考、零假设。
- 最小实现、复用优先。
- 手术式修改，不碰无关代码。
- 简单命名，便于搜索。
- 只清理自己造成的死代码。
