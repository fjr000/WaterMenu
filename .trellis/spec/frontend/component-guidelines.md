# 前端组件规范

> 基于 `frontend/src/components/` 的真实源码，记录当前组件实现模式、props 约定和样式方案。

---

## 当前状态

- 技术栈：React + Vite + TypeScript
- 样式方案：Tailwind CSS v4（使用 `@import "tailwindcss"` 和 `@theme`）
- 组件库：自定义轻量组件，不引入大型桌面组件库
- 手机优先设计

---

## 组件分层

### 基础 UI 组件（`src/components/ui.tsx`）

基础组件放在同一个文件中，便于查找和维护：

- `Button`：主要按钮，深色背景
- `SecondaryButton`：次要按钮，白色背景 + 边框
- `Input`：输入框
- `Select`：下拉选择框
- `Card`：卡片容器
- `PageHeader`：页面标题栏
- `EmptyState`：空状态展示
- `Spinner`：加载动画
- `ErrorBanner`：错误提示横幅

### 功能组件

每个功能组件单独一个文件，使用 kebab-case 命名：

- `create-dish-form.tsx`：新增菜品表单
- `meal-record-form.tsx`：用餐记录确认表单
- `meal-tag.tsx`：餐次标签
- `recent-meal-records.tsx`：最近用餐记录与反馈区域
- `recommendation-panel.tsx`：推荐/盲盒面板

---

## Props 约定

### 基础组件 Props

```typescript
// 基础组件使用 HTML 原生属性扩展
export function Button({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode })

// 复合组件使用自定义 Props
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
})
```

### 功能组件 Props

```typescript
// 功能组件使用接口定义
interface Props {
  mealType: MealType | "";
  onMealTypeChange: (mt: MealType | "") => void;
  onRecommend: () => void;
  onBlindBox: () => void;
  // ... 其他 props
}

export function RecommendationPanel({ mealType, onMealTypeChange, ... }: Props)
```

---

## 样式约定

### Tailwind CSS v4

使用 Tailwind CSS v4 语法：

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --color-slate-50: #f8fafc;
  /* ... 其他颜色定义 */
}
```

### 样式类名模式

```tsx
// 按钮样式
<button className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">

// 卡片样式
<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

// 输入框样式
<input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900">
```

---

## 可访问性

- 使用语义化 HTML 标签（`<form>`, `<label>`, `<button>`）
- 为表单元素提供 `id` 和 `htmlFor` 关联
- 使用 `placeholder` 提供输入提示
- 按钮使用 `disabled` 状态防止重复提交

---

## Good / Base / Bad Cases

- Good：基础 UI 组件放在 `ui.tsx`，功能组件单独文件
- Good：使用 HTML 原生属性扩展，保持灵活性
- Good：Tailwind CSS 类名直接在 JSX 中，便于查找
- Base：复杂组件可以拆分到子组件，但保持在同一文件
- Bad：为了形式抽象创建不必要的组件层级
- Bad：把 Tailwind 类名抽成常量或工具函数
- Bad：引入大型组件库（如 Material UI, Ant Design）
