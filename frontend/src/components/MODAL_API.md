# Modal Component API Reference

## Overview

Modal 是一个通用的模态对话框组件，提供完整的无障碍支持、焦点管理和滚动锁定功能。

## Import

```typescript
import { Modal } from "@/components/modal";
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | ✅ | - | 控制 Modal 的显示/隐藏 |
| `onClose` | `() => void` | ✅ | - | 关闭 Modal 的回调函数 |
| `title` | `string` | ❌ | - | Modal 标题（可选） |
| `children` | `ReactNode` | ✅ | - | Modal 内容 |
| `size` | `'sm' \| 'md' \| 'lg'` | ❌ | `'md'` | Modal 尺寸 |

## Size Options

- `sm`: 最大宽度 448px (max-w-md) - 适合确认对话框
- `md`: 最大宽度 672px (max-w-2xl) - 默认尺寸，适合表单
- `lg`: 最大宽度 896px (max-w-4xl) - 适合大量内容

## Features

### ✅ 无障碍支持 (Accessibility)

- `role="dialog"` 和 `aria-modal="true"` 属性
- `aria-labelledby` 关联标题
- 焦点自动管理（打开时移入，关闭时返回）
- 支持键盘操作（ESC 关闭、Tab 切换焦点）

### ✅ 用户体验 (UX)

- 打开时自动锁定背景滚动（防止滚动穿透）
- 支持三种关闭方式：ESC 键、点击遮罩层、点击关闭按钮
- 平滑的淡入淡出 + 缩放动画
- 内容超出视口时，Modal 内部可滚动（max-h-90vh）
- 关闭后恢复原页面滚动位置

### ✅ 响应式设计

- 移动端：左右 padding 16px (mx-4)
- 桌面端：固定宽度（根据 size）
- 所有尺寸：最大高度 90vh，防止超出视口

## Usage Examples

### 基础用法

```typescript
function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>打开 Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="标题"
      >
        <p>Modal 内容</p>
      </Modal>
    </>
  );
}
```

### 表单场景

```typescript
function FormModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 处理提交
    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="填写表单"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        {/* 表单内容 */}
        <Button type="submit">提交</Button>
      </form>
    </Modal>
  );
}
```

### 确认对话框

```typescript
function ConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    // 执行操作
    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="确认操作"
      size="sm"
    >
      <p>确定要执行此操作吗？</p>
      <div className="mt-4 flex justify-end gap-3">
        <SecondaryButton onClick={() => setIsOpen(false)}>
          取消
        </SecondaryButton>
        <Button onClick={handleConfirm}>确定</Button>
      </div>
    </Modal>
  );
}
```

## Hook: useScrollLock

Modal 内部使用 `useScrollLock` hook 来锁定背景滚动。如果需要在其他场景使用：

```typescript
import { useScrollLock } from "@/hooks/use-scroll-lock";

function MyComponent() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // 当 isPanelOpen 为 true 时，锁定 body 滚动
  useScrollLock(isPanelOpen);
  
  return (
    // ...
  );
}
```

## Implementation Details

### Portal Rendering

Modal 使用 `createPortal` 将内容渲染到 `document.body`，确保：
- Modal 不受父组件样式影响
- Modal 始终在最上层（z-index: 50）
- 遮罩层覆盖整个视口

### Focus Management

- 打开时：保存当前焦点，将焦点移入 Modal
- 关闭时：恢复焦点到之前的元素（通常是触发按钮）

### Scroll Lock

- 打开时：`document.body.style.overflow = 'hidden'`
- 关闭时：恢复原来的 overflow 值
- 支持嵌套 Modal（多个 Modal 同时打开）

## Styling

Modal 遵循项目设计系统：
- 色调：amber/slate/red
- 圆角：rounded-2xl
- 阴影：shadow-[0_20px_50px_rgba(111,82,56,0.25)]
- 背景：白色半透明 + 背景模糊 (bg-white/95 backdrop-blur-sm)
- 动画：animate-scale-in (定义在 index.css)

## Testing

完整的单元测试位于 `modal.test.tsx`，覆盖：
- 打开/关闭行为
- ESC 键、点击遮罩层、关闭按钮
- 滚动锁定
- 焦点管理
- ARIA 属性
- 响应式尺寸

运行测试：
```bash
pnpm frontend:test modal.test.tsx
```
