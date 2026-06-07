# 前端目录结构规范

> 基于 `frontend/` 的真实源码，记录当前目录组织方式和新增文件约束。

---

## 当前状态

- 前端根目录：`frontend/`
- 技术栈：React + Vite + TypeScript + Tailwind CSS v4
- 入口文件：`frontend/src/main.tsx`
- HTML 入口：`frontend/index.html`

---

## 目录结构

```
frontend/
├── index.html                    # HTML 入口
├── package.json                  # 依赖和脚本
├── tsconfig.app.json             # TypeScript 配置
├── public/                       # 静态资源
│   ├── manifest.json             # PWA manifest
│   └── icons/                    # PWA 图标
│       ├── icon-192.svg
│       └── icon-512.svg
└── src/
    ├── main.tsx                  # React 入口
    ├── index.css                 # Tailwind CSS 配置（v4 @theme）
    ├── api/                      # API 层
    │   ├── client.ts             # apiFetch 封装
    │   └── types.ts              # TypeScript 类型定义
    ├── components/               # 可复用组件
    │   ├── ui.tsx                # 基础 UI 组件（Button, Input, Card, etc.）
    │   ├── create-dish-form.tsx  # 新增菜品表单
    │   ├── meal-record-form.tsx  # 用餐记录确认表单
    │   ├── meal-tag.tsx          # 餐次标签
    │   ├── recent-meal-records.tsx # 最近用餐记录与反馈
    │   └── recommendation-panel.tsx  # 推荐/盲盒面板
    ├── hooks/                    # 自定义 Hooks
    │   ├── use-auth.tsx          # 认证 Hook + AuthProvider
    │   ├── use-dishes.ts         # 菜品数据 Hook
    │   ├── use-meal-records.ts   # 用餐记录与反馈数据 Hook
    │   └── use-recommendations.ts # 推荐/盲盒 Hook
    └── pages/                    # 页面组件
        ├── login-page.tsx        # 登录页
        └── home-page.tsx         # 主页（推荐 + 菜品管理）
```

---

## 目录职责

### `src/api/` - API 层

- `client.ts`：封装 `apiFetch` 函数，自动添加 `/api` 前缀和 `credentials: "same-origin"`
- `types.ts`：定义所有 TypeScript 接口（User, Workspace, Dish, MealRecord, Feedback, Recommendation, etc.）

### `src/components/` - 可复用组件

- `ui.tsx`：基础 UI 组件（Button, SecondaryButton, Input, Select, Card, PageHeader, EmptyState, Spinner, ErrorBanner）
- 功能组件：每个文件一个组件，命名使用 kebab-case

### `src/hooks/` - 自定义 Hooks

- `use-auth.tsx`：认证状态管理，包含 `AuthProvider` 和 `useAuth` Hook
- `use-dishes.ts`：菜品 CRUD 操作
- `use-meal-records.ts`：用餐记录查询、创建与反馈 upsert 操作
- `use-recommendations.ts`：推荐和盲盒操作

### `src/pages/` - 页面组件

- 每个页面一个文件，命名使用 kebab-case
- 页面组件负责组合 hooks 和 components

---

## 新增文件规则

1. **API 类型**：添加到 `src/api/types.ts`
2. **基础 UI 组件**：添加到 `src/components/ui.tsx`
3. **功能组件**：在 `src/components/` 创建新文件，使用 kebab-case
4. **自定义 Hooks**：在 `src/hooks/` 创建新文件，使用 kebab-case
5. **页面**：在 `src/pages/` 创建新文件，使用 kebab-case

---

## 命名约定

- 文件名：kebab-case（如 `create-dish-form.tsx`）
- 组件名：PascalCase（如 `CreateDishForm`）
- Hook 名：camelCase，以 `use` 开头（如 `useDishes`）
- 类型名：PascalCase（如 `Dish`, `MealType`）
