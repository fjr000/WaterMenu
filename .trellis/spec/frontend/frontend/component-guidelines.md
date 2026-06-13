# Component Guidelines

> 前端组件以表单、业务面板和 UI 原子组件分层，样式统一使用 Tailwind。

## Overview

当前组件分成三类：

- `ui.tsx`：通用基础组件
- 业务组件：表单、面板、成员管理等
- 页面组件：首页、登录页、邀请页

Reference files:
- `frontend/src/components/ui.tsx`
- `frontend/src/components/create-dish-form.tsx`
- `frontend/src/pages/home-page.tsx`

## Component Structure

当前稳定结构是：

- 页面组件做状态编排和条件渲染
- 业务组件做局部交互
- 通用 UI 组件做最小视觉单元

如果一个组件同时负责 API 调用、复杂表单状态、页面布局，说明它承担过多。

Reference files:
- `frontend/src/pages/home-page.tsx`
- `frontend/src/components/history-records-panel.tsx`

## Props Conventions

当前 props 多采用回调函数，例如：

- `onSuccess`
- `onCancel`
- `onRecordDish`
- `onRetry`

表单组件通常接收默认值、错误状态、pending 状态和提交回调，不自己持有路由状态。

Reference files:
- `frontend/src/components/create-dish-form.tsx`
- `frontend/src/components/history-records-panel.tsx`

## Styling Patterns

样式统一用 Tailwind：

- 通过 `className` 组合
- 不使用 CSS modules
- 自定义色板定义在 `frontend/src/index.css`
- UI 文案保持中文

Reference files:
- `frontend/src/index.css`
- `frontend/vite.config.ts`
- `frontend/src/components/ui.tsx`

## Accessibility

当前已有的 a11y 做法包括：

- `label` + `htmlFor`
- `aria-label`
- `aria-current`
- 全局 `prefers-reduced-motion` 处理

Reference files:
- `frontend/src/index.css`
- `frontend/src/pages/home-page.tsx`
- `frontend/src/components/create-dish-form.tsx`

### Pattern: Form Label Association

**Problem**: 表单输入框需要明确的标签关联，以支持屏幕阅读器和自动化测试。

**Solution**: 始终使用`<label>`元素配合`htmlFor`属性，而非仅依赖`placeholder`或`aria-label`。

**Example**:
```tsx
// Good - 明确的label关联
<div>
  <label htmlFor="dish-search" className="mb-1.5 block text-sm font-medium text-slate-700">
    关键词
  </label>
  <Input
    id="dish-search"
    placeholder="搜索菜名或简介"
    {...props}
  />
</div>

// Bad - 只有placeholder
<Input
  id="dish-search"
  placeholder="关键词"
  aria-label="搜索菜品"
  {...props}
/>
```

**Why**: 
- 测试库的`getByLabelText`依赖真实的`<label>`元素
- 屏幕阅读器更好地识别label与输入框的关系
- 点击label可以聚焦输入框，提升移动端体验

**Tests Required**:
```tsx
// 使用label文本查找输入框
await userEvent.type(screen.getByLabelText("关键词"), "番茄");
```

### Pattern: Accordion State Management

**Problem**: 实现单一展开的accordion交互，同时避免组件间状态耦合。

**Solution**: 在父组件维护`expandedId`状态，通过`onToggle`回调控制展开/收起。

**Example**:
```tsx
// 父组件
const [expandedDishId, setExpandedDishId] = useState<string | null>(null);

const handleToggleDish = (dishId: string) => {
  setExpandedDishId((current) => (current === dishId ? null : dishId));
};

// 子组件
<DishCard
  dish={dish}
  expanded={expandedDishId === dish.id}
  onToggle={() => handleToggleDish(dish.id)}
/>
```

**Why**:
- 父组件控制全局展开状态，实现accordion行为
- 子组件保持纯净，只响应props变化
- 易于扩展（如支持多选展开）

**Event Handling**:
```tsx
// 卡片整体点击展开
<button onClick={onToggle}>
  {/* 卡片内容 */}
</button>

// 操作按钮阻止冒泡
<button onClick={(e) => {
  e.stopPropagation();
  handleAction();
}}>
  操作
</button>
```

## Modal Pattern

### Convention: Use Modal Base Component

**What**: 所有弹窗交互统一使用 `Modal` 基础组件，而不是自己实现 Portal 和遮罩层。

**Why**: 
- 统一的 UX（ESC 键、遮罩层点击、关闭按钮）
- 自动处理滚动锁定、焦点管理、无障碍支持
- 避免重复实现 Portal、滚动锁定、键盘监听等复杂逻辑

**Example**:
```tsx
import { Modal } from "./components/modal";

function MyFeatureModal({ isOpen, onClose, data }) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="功能标题"
      size="md"  // sm | md | lg
    >
      {/* 你的内容 */}
    </Modal>
  );
}
```

**Modal Sizes**:
- `sm` (448px): 小型确认对话框、简短提示
- `md` (672px): 表单和列表（默认尺寸）
- `lg` (896px): 需要更多空间的内容（如图片网格）

**Features Automatically Provided**:
- ✅ Portal rendering to `document.body`
- ✅ Background overlay with scroll lock (`useScrollLock`)
- ✅ ESC key to close
- ✅ Click backdrop to close
- ✅ Close button in header
- ✅ Focus management (focus trap + restore)
- ✅ ARIA attributes (`role="dialog"`, `aria-modal="true"`)
- ✅ Smooth fade-in/scale animation
- ✅ Responsive sizing (mobile/desktop)
- ✅ Internal scrolling when content exceeds viewport

**Reference files**:
- `frontend/src/components/modal.tsx` - Modal 基础组件
- `frontend/src/hooks/use-scroll-lock.ts` - 滚动锁定 hook
- `frontend/src/components/blind-box-result-modal.tsx` - 使用示例

### Pattern: Modal for Operation Feedback

**Problem**: 操作触发点与结果反馈区域不在同一视口，用户看不到操作结果。

**Solution**: 当操作结果需要用户关注时（如抽奖、表单、管理界面），使用 Modal 而不是 inline 展开。

**When to Use Modal**:
- ✅ 操作结果需要用户立即看到（如盲盒结果、提交反馈）
- ✅ 管理界面有操作区域（如图库上传、版本管理）
- ✅ 表单提交（如记录已吃、创建内容）
- ✅ 确认对话框（删除、重要操作）

**When NOT to Use Modal**:
- ❌ 简单的状态切换（如启用/停用开关）
- ❌ 纯展示内容且无操作（如查看详情，可考虑 inline 展开）
- ❌ 频繁切换的内容（如 Tab 切换）

**Example**:
```tsx
// Good - 操作结果用 Modal
const [blindBoxOpen, setBlindBoxOpen] = useState(false);

useEffect(() => {
  if (blindBoxMutation.isSuccess && blindBoxMutation.data?.item) {
    setBlindBoxOpen(true);  // 自动打开 Modal
  }
}, [blindBoxMutation.isSuccess]);

<Modal isOpen={blindBoxOpen} onClose={() => setBlindBoxOpen(false)}>
  {/* 盲盒结果立即在视口中央显示 */}
</Modal>

// Bad - inline 展开在页面底部
{blindBoxResult && (
  <div className="mt-4">
    {/* 用户需要滚动才能看到 */}
  </div>
)}
```

**Why**: 
- 用户操作后立即看到反馈，无需滚动
- Modal 关闭后原页面位置不变，用户可继续操作
- 统一的交互模式，降低学习成本

**Reference files**:
- `frontend/src/components/blind-box-result-modal.tsx` - 盲盒结果 Modal
- `frontend/src/components/dish-image-panel.tsx` - 图库管理 Modal
- `frontend/src/components/meal-record-form.tsx` - 记录表单 Modal

### Don't: Implement Portal and Overlay Manually

**Problem**:
```tsx
// Don't do this
function MyModal({ isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return createPortal(
    <div className="fixed inset-0 bg-black/50" onClick={onClose}>
      <div className="fixed inset-0 flex items-center justify-center">
        {/* 内容 */}
      </div>
    </div>,
    document.body
  );
}
```

**Why it's bad**: 
- 重复实现 Portal、滚动锁定、ESC 键监听
- 容易遗漏焦点管理、ARIA 属性等无障碍支持
- 多个 Modal 同时打开时滚动锁定可能冲突

**Instead**:
```tsx
// Do this - 使用 Modal 基础组件
import { Modal } from "./components/modal";

function MyModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="标题">
      {/* 内容 */}
    </Modal>
  );
}
```

## Common Mistakes

### Don't: 在组件里直接写请求逻辑

请求应放 hook，组件只调用 hook。

### Don't: 忽略 pending / error

当前 UI 大量使用 `Spinner`、`ErrorBanner`、disabled 按钮，新功能也应保持一致。

## Verification

```bash
pnpm frontend:typecheck
pnpm frontend:build
```
