# PRD: Optimize UI Spacing and Add Create Dish Functionality

## Overview

优化前端页面的六个体验问题：
1. 启用/停用开关不应该放在展开区域内，且不应该占用太多空间 ✅
2. 历史记录页面应该有创建菜品的功能 ✅
3. 四个标签页应该优化设计，提高观感，减少空间占用 ✅
4. "记录已吃"按钮太大且颜色格格不入
5. PageHeader (WaterMenu + 退出) 只在成员标签页显示，其他页面不需要
6. 保持前端审美风格（UI、UX）一致性

## Requirements

### 1. 启用/停用开关位置优化

**Current State:**
- 开关位于 `DishCard` 展开区域 (`expanded && ...`) 内
- 需要先展开卡片才能切换启用/停用状态
- 占用一个完整的 Card 区域 (line 863-885)

**Target State:**
- 开关移到卡片未展开时也可见的位置
- 减少空间占用，不使用完整的 Card 包裹
- 保持可访问性（label + htmlFor）

**Design Constraints:**
- 不能影响现有的卡片展开/收起交互
- 开关点击不应触发卡片展开
- 保持视觉层次清晰

### 2. 历史记录页面新增创建菜品功能

**Current State:**
- `HistoryRecordsPanel` 只有"手动记录"按钮（创建 meal record）
- 没有直接创建菜品的入口

**Target State:**
- 添加"新增菜品"按钮
- 点击后展示 `CreateDishForm` 组件
- 成功创建后收起表单并刷新相关数据

**Implementation Notes:**
- 复用现有的 `CreateDishForm` 组件
- 按钮位置应与"手动记录"按钮保持一致的设计
- 成功创建后调用 `onRecordChange?.()` 刷新推荐状态

### 3. 四个标签页优化 ✅

**Current State:**
- `DesktopTabNav`: 4个大卡片，每个带图标、eyebrow、label，占用较多垂直空间
- `MobileTabBar`: 底部固定导航栏，相对紧凑

**Target State:**
- 桌面端标签页减少垂直空间占用
- 提升视觉观感，保持设计系统一致性
- 移动端保持当前设计（已优化）

**Design Options:**
- 减少 padding/gap
- 简化图标尺寸
- 考虑将 eyebrow 和 label 合并或减小字号
- 保持选中态的视觉突出

### 4. "记录已吃"按钮优化

**Current State:**
- 按钮占用整行，尺寸很大 (py-3.5)
- 使用绿色渐变 (emerald-500 to emerald-600)
- 与整体色调（amber/orange/red）不协调
- 视觉权重过高，抢夺注意力

**Target State:**
- 缩小按钮尺寸，与其他操作按钮保持一致
- 调整配色，融入整体 amber/orange 色系
- 保持主要操作的可识别性，但不过分突出
- 按钮样式与页面其他元素协调

**Design Constraints:**
- 仍然是主要操作，需要一定的视觉突出
- 保持无障碍性（对比度、可点击区域）
- 与二级操作按钮区分清晰

### 5. PageHeader 显示逻辑优化

**Current State:**
- `PageHeader` 在所有标签页都显示
- 包含 workspace 名称和退出按钮
- 占用垂直空间且在大多数页面无实际作用

**Target State:**
- 只在 "members" 标签页显示 PageHeader
- 其他标签页不显示，节省空间
- 用户可以通过成员页面退出登录

**Implementation Notes:**
- 在 HomePage 组件中条件渲染 PageHeader
- `{activeTab === "members" && <PageHeader ... />}`

### 6. 整体审美风格一致性

**Design System:**
- **主色调**: amber/orange/red 暖色系
- **圆角**: rounded-xl / rounded-2xl (中等圆角)
- **阴影**: 柔和的 shadow-sm / shadow-md
- **间距**: 紧凑但不拥挤 (gap-2 / gap-3)
- **字体**: font-serif 用于标题，sans-serif 用于正文
- **边框**: border-amber-200/80 等半透明边框

**Consistency Checks:**
- 所有按钮使用统一的尺寸规范
- 色彩与整体色调协调
- 圆角、阴影保持一致
- 间距遵循统一的尺度

## UI Components Affected

- `frontend/src/pages/home-page.tsx`
  - `DishCard` 组件 (启用/停用开关位置)
  - `DesktopTabNav` 组件 (标签页优化)
- `frontend/src/components/history-records-panel.tsx`
  - 添加新增菜品按钮和表单状态管理

## Non-Goals

- 不改变移动端底部导航栏设计
- 不改变 DishCard 的其他交互逻辑
- 不改变 CreateDishForm 组件本身

## Success Criteria

1. 启用/停用开关在卡片未展开时可见且操作便捷
2. 历史记录页面可以直接创建菜品
3. 桌面端标签页垂直高度明显减少，视觉层次清晰
4. 所有交互保持无障碍支持（label、aria-*）
5. 类型检查和构建通过

## Testing

```bash
pnpm frontend:typecheck
pnpm frontend:build
```

手动测试：
- [ ] 未展开卡片时可以切换启用/停用
- [ ] 展开卡片后开关位置合理
- [ ] 历史记录页面可以创建菜品
- [ ] 桌面端标签页高度减少
- [ ] 移动端底部导航栏不受影响
