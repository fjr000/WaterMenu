# 前端组件规范

> 基于 `frontend/src/components/` 的真实源码，记录当前组件实现模式、props 约定和样式方案。

---

## 当前状态

- 技术栈：React + Vite + TypeScript
- 样式方案：Tailwind CSS v4（使用 `@import "tailwindcss"` 和 `@theme`）
- 组件库：自定义轻量组件，不引入大型桌面组件库
- 手机优先设计
- 当前视觉主题：温暖厨房手账风，使用奶油米白、番茄红、橄榄绿、酱油棕和纸张卡片质感

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

### 视觉主题约定

```text
主题方向：温暖厨房手账风。
背景：奶油米白 + CSS 纸张纹理 / 柔和色斑。
主行动：番茄红，用于 Button、tab 激活态和关键反馈高亮。
辅助状态：橄榄绿，用于正向标签、餐次标签和已关联状态。
中性色：酱油棕 / 墨棕，用于正文、边框和阴影。
字体：不新增在线字体或字体包；正文使用系统 sans 栈，标题 / 品牌可使用系统 serif 栈。
动效：只使用轻量 CSS 动效，并必须通过 `prefers-reduced-motion: reduce` 降级。
```

### 样式类名模式

```tsx
// 主按钮：番茄红、圆角胶囊、轻微按压反馈
<button className="inline-flex items-center justify-center rounded-full border border-red-600 bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_rgba(111,82,56,0.18)] transition hover:-translate-y-0.5 hover:bg-red-600 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50">

// 纸张卡片：白纸半透明、暖色边框、轻阴影和轻微入场
<div className="animate-paper-enter rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-[0_10px_24px_rgba(111,82,56,0.10)] ring-1 ring-white/70 transition hover:-translate-y-0.5">

// 输入框：暖色边框、白纸底、番茄红焦点态
<input className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-inner placeholder-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20">
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
- Good：跨页面视觉统一优先改 `index.css` 和 `ui.tsx`，业务组件只做必要 className 协调
- Good：动画和 transition 必须在 `prefers-reduced-motion: reduce` 下可降级
- Base：复杂组件可以拆分到子组件，但保持在同一文件
- Bad：为了形式抽象创建不必要的组件层级
- Bad：把 Tailwind 类名抽成常量或工具函数
- Bad：引入大型组件库（如 Material UI, Ant Design）
- Bad：为了风格化引入在线字体、外部纹理图片或动画库
