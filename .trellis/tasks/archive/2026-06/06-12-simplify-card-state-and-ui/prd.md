# 简化卡片状态管理和使用 Headless UI

## 背景

`recent-meal-records.tsx` 中的 `MealRecordCard` 使用4个布尔值手动协调互斥状态（`isEditing`、`showVariantPanel`、`deleteConfirming`、`showNote`），导致：
- 6个地方需要手动同步状态
- 添加新面板需要更新所有切换点
- 容易出现状态不一致

`dish-autocomplete.tsx` 手动管理下拉状态、键盘导航、点击外部检测，代码复杂且难以测试。

## 目标

1. 简化卡片模式状态管理
2. 用 Headless UI 替换手动实现的 UI 模式
3. 减少代码复杂度和维护成本

## 重构内容

### 1. 卡片状态重构

**当前实现（Bad）：**
```tsx
const [isEditing, setIsEditing] = useState(false);
const [showVariantPanel, setShowVariantPanel] = useState(false);
const [deleteConfirming, setDeleteConfirming] = useState(false);
const [showNote, setShowNote] = useState(false);

// 每个切换点都要手动协调
onClick={() => {
  setIsEditing(!isEditing);
  setShowVariantPanel(false);
  setDeleteConfirming(false);
  setShowNote(false);
}}
```

**目标实现（Good）：**
```tsx
type CardMode = 'view' | 'editing' | 'variants' | 'delete-confirm';
const [mode, setMode] = useState<CardMode>('view');

// 单一状态切换，不可能冲突
onClick={() => setMode(mode === 'editing' ? 'view' : 'editing')}
```

### 2. DishAutocomplete 重构

**当前问题：**
- 100+ 行手动状态管理
- 自定义键盘导航（30行 switch-case）
- 手动点击外部检测（15行 useEffect）

**目标：使用 Headless UI Combobox**

```tsx
import { Combobox } from '@headlessui/react'

// Headless UI 自动处理：
// - 键盘导航（Arrow keys, Enter, Escape）
// - 点击外部关闭
// - ARIA 属性
// - 焦点管理
```

### 3. 模态框重构（可选）

`image-preview-modal.tsx` 手动管理 `overflow: hidden`，可用 Headless UI Dialog 替代。

## 验收标准

### 必须完成
- [ ] `MealRecordCard` 使用联合类型状态（6处协调 → 1处）
- [ ] `DishAutocomplete` 迁移到 Headless UI Combobox
- [ ] 功能保持不变（测试全部通过）
- [ ] 减少至少 100 行代码

### 可选优化
- [ ] `ImagePreviewModal` 使用 Headless UI Dialog
- [ ] 提取 `useCombobox` hook 供其他组件复用

## 依赖

需要安装：
```bash
pnpm add @headlessui/react
```

## 预期影响

- 减少 100+ 行框架可替代代码
- 提升可测试性（Headless UI 已测试）
- 改进无障碍支持
- 降低维护成本
