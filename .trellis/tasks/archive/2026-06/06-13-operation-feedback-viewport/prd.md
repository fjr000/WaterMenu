# Fix Operation-Feedback Viewport UX

## Goal

解决应用中操作触发点与结果反馈区域不在同一视口的严重 UX 问题。当用户执行操作（点击盲盒、管理图库、管理版本/做法等）时，用户无法立即看到操作结果，必须手动滚动页面才能看到反馈，这导致糟糕的用户体验。

## What I already know

### 当前实现分析（home-page.tsx）

**布局结构**：
- 所有 panel（MealRecordForm、RecipePanel、DishImagePanel、DishVariantsPanel）都渲染在操作按钮的**下方**
- 在推荐面板中：盲盒结果显示在底部（line 119-141），但操作按钮在顶部（line 48-84）
- 在菜品管理中：图库/版本/做法管理面板都在触发按钮下方，用户必须向下滚动才能看到

**问题场景**：

1. **盲盒场景**（home-page.tsx line 203-223）：
   - 用户点击"盲盒"按钮（在 RecommendationPanel 顶部）
   - 盲盒结果渲染在 RecommendationPanel 最底部（line 119-141）
   - 如果页面有推荐结果，盲盒结果会被推到更下方，完全看不见

2. **图库管理场景**（line 247-255）：
   - 用户在 DishCard 中点击"图库"按钮（line 785-793）
   - DishImagePanel 渲染在 DishCard 下方（line 247-255）
   - 上传操作区域在 Panel 顶部（dish-image-panel.tsx line 60-91）
   - 用户需要向上滚动才能看到上传区

3. **版本/做法管理场景**（类似图库）：
   - 点击"版本"或"做法"按钮后，对应 Panel 渲染在下方
   - 操作区域在 Panel 内部，用户必须滚动

### 技术约束

- React 单页应用
- 使用 Tailwind CSS
- 组件结构：HomePage > RecommendationPanel / DishCard > 各种 Panel
- 当前使用条件渲染显示/隐藏 Panel

## Open Questions

### ✅ Q1: 盲盒结果展示方式（已确认）

**决策：使用 Modal/Dialog 弹窗**
- 盲盒结果以模态框形式在视口中央弹出
- 符合"开盲盒"的惊喜感和仪式感
- 用户立即看到结果，无需滚动
- 避免页面布局抖动

### ✅ Q2: Panel 操作区域定位方式（已确认）

**决策：改为 Modal/Drawer**
- 图库、版本、做法管理都改为 Modal 或 Drawer（侧边抽屉）形式
- 不改变页面滚动位置，关闭后用户仍在原位置
- 操作区域始终可见，无需滚动
- 适合"偶尔管理一个菜品，然后继续浏览列表"的场景

### ✅ Q3: Modal/Drawer 的具体形式（已确认）

**决策：居中 Modal**
- 所有操作（盲盒结果、图库、版本、做法、记录已吃）都使用居中 Modal
- 在视口中央弹出，适合桌面端和移动端
- 保持一致的交互风格

## Requirements

### 1. 盲盒结果 Modal
- 点击"盲盒"按钮后，盲盒结果以居中 Modal 形式弹出
- Modal 内容：菜品名、封面图、简介、餐次标签、推荐理由、操作按钮（查看做法、记录已吃）
- 用户可以通过关闭按钮、ESC 键、点击遮罩层关闭 Modal
- Modal 关闭后，原页面滚动位置不变

### 2. 图库管理 Modal
- 点击"图库"按钮后，图库管理界面以居中 Modal 形式弹出
- Modal 内容：上传区域（文件选择、上传按钮）、图片网格（缩略图、设为封面、删除按钮）
- 上传操作区域始终可见（在 Modal 内滚动时固定在顶部或始终在视口内）
- Modal 关闭后，原页面滚动位置不变

### 3. 版本管理 Modal
- 点击"版本"按钮后，版本管理界面以居中 Modal 形式弹出
- Modal 内容：新增版本按钮、版本列表
- 操作区域始终可见
- Modal 关闭后，原页面滚动位置不变

### 4. 做法管理 Modal
- 点击"做法"按钮后，做法管理界面以居中 Modal 形式弹出
- Modal 内容：新增做法按钮、做法列表
- 操作区域始终可见
- Modal 关闭后，原页面滚动位置不变

### 5. 记录已吃 Modal
- 点击"记录已吃"按钮后，记录表单以居中 Modal 形式弹出
- Modal 内容：餐次选择、日期选择、评分、备注、提交按钮
- Modal 关闭后，原页面滚动位置不变

### 6. Modal 通用要求
- 打开 Modal 时，背景页面添加遮罩层（半透明黑色）
- 打开 Modal 时，禁止背景页面滚动（防止穿透）
- Modal 支持键盘操作：ESC 关闭、Tab 焦点切换
- Modal 内容超出视口时，Modal 内部可以滚动
- Modal 打开/关闭时有平滑的动画过渡
- 移动端：Modal 宽度适配小屏幕（max-width 或固定宽度 + padding）
- 桌面端：Modal 固定宽度（如 600px），最大高度（如 90vh）

## Acceptance Criteria

- [ ] 点击盲盒后，Modal 在视口中央弹出，用户无需滚动即可看到完整结果
- [ ] 点击图库/版本/做法/记录已吃后，对应 Modal 在视口中央弹出，操作区域始终可见
- [ ] 所有 Modal 都支持 ESC 键关闭、点击遮罩层关闭、点击关闭按钮关闭
- [ ] Modal 打开时，背景页面滚动被禁止（body 添加 overflow: hidden）
- [ ] Modal 关闭后，原页面滚动位置保持不变
- [ ] Modal 内容超出视口时，Modal 内部可以平滑滚动
- [ ] Modal 打开/关闭有平滑的淡入淡出动画
- [ ] 移动端和桌面端都有良好的显示效果（响应式宽度和高度）
- [ ] 键盘焦点管理：Modal 打开时焦点移入 Modal，关闭时焦点返回触发按钮
- [ ] 无障碍支持：Modal 有正确的 ARIA 属性（role="dialog", aria-modal="true"）

## Definition of Done

- Tests added/updated (unit/integration where appropriate)
- Lint / typecheck / CI green
- Docs/notes updated if behavior changes
- Rollout/rollback considered if risky

## Out of Scope (explicit)

### 不在本次改动范围内

- **菜品卡片的编辑表单**：当前在卡片展开区域内 inline 显示，保持不变（因为编辑表单内容较少，不存在视口问题）
- **推荐结果列表**：智能推荐返回的多个菜品卡片，保持当前 inline 展示方式
- **查看做法功能**：当前在卡片展开区域内 inline 显示做法列表，暂时保持不变（可以在后续迭代中改为 Modal）
- **响应式布局的其他优化**：仅解决操作反馈视口问题，不涉及其他 UI 改进
- **Modal 动画的高级效果**：使用简单的淡入淡出即可，不需要复杂的弹簧动画或手势交互
- **历史记录和成员管理 Tab**：这两个 Tab 没有类似的视口问题，不在本次改动范围内

## Technical Notes

### 相关文件

- `frontend/src/pages/home-page.tsx` - 主页面，包含所有 Panel 的渲染逻辑
- `frontend/src/components/recommendation-panel.tsx` - 推荐面板，包含盲盒结果展示
- `frontend/src/components/dish-image-panel.tsx` - 图库管理面板
- `frontend/src/components/dish-variants-panel.tsx` - 版本管理面板
- `frontend/src/components/recipe-panel.tsx` - 做法管理面板

### 技术方案草稿

#### 1. Modal 基础组件

**选项 A：使用现有 UI 库（推荐）**
- 研究项目是否已经使用了 Radix UI、Headless UI 或其他组件库
- 如果有，直接使用库提供的 Dialog 组件
- 优点：功能完善（焦点管理、滚动锁定、无障碍支持）、代码量少

**选项 B：自行实现**
- 创建 `Modal.tsx` 基础组件
- 使用 React Portal 渲染到 body
- 手动处理焦点管理、滚动锁定、ESC 键监听
- 优点：完全可控，无依赖
- 缺点：需要处理很多边界情况

**待确认**：项目没有使用 UI 组件库（检查了 package.json），需要自行实现 Modal 基础组件。

#### 决策：自行实现 Modal 组件

使用 React Portal + 自定义 hooks 实现：
- `Modal.tsx`：基础 Modal 组件（遮罩层、内容区、关闭逻辑）
- `useModal.ts`：自定义 hook 处理滚动锁定、ESC 键监听、焦点管理
- `useScrollLock.ts`：专门处理 body 滚动锁定的 hook
- 优点：零依赖、完全可控、代码量不大（约 100-150 行）

需要修改的组件：
- `frontend/src/components/recommendation-panel.tsx` - 将盲盒结果改为 Modal
- `frontend/src/components/dish-image-panel.tsx` - 改为 Modal 形式
- `frontend/src/components/dish-variants-panel.tsx` - 改为 Modal 形式
- `frontend/src/components/recipe-panel.tsx` - 改为 Modal 形式
- `frontend/src/components/meal-record-form.tsx` - 改为 Modal 形式
- `frontend/src/pages/home-page.tsx` - 调整 Panel 的渲染逻辑和状态管理

新增文件：
- `frontend/src/components/modal.tsx` - Modal 基础组件（如果自行实现）
- `frontend/src/components/blind-box-result-modal.tsx` - 盲盒结果 Modal

#### 3. 状态管理变化

当前实现（home-page.tsx）：
```typescript
const [recordDish, setRecordDish] = useState<Dish | null>(null);
const [recipeDish, setRecipeDish] = useState<Dish | null>(null);
const [imageDish, setImageDish] = useState<Dish | null>(null);
const [variantDish, setVariantDish] = useState<Dish | null>(null);
```

这些状态不需要改变，仍然用于控制 Modal 的打开/关闭。

#### 4. 滚动锁定实现

打开 Modal 时：
```typescript
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => {
    document.body.style.overflow = '';
  };
}, [isOpen]);
```

#### 5. 动画实现

使用 Tailwind CSS 动画类或 CSS transitions：
- 遮罩层：fade in/out
- Modal 内容：fade + scale in/out

#### 6. 测试策略

- **单元测试**：Modal 组件的打开/关闭、ESC 键监听、点击遮罩层关闭
- **集成测试**：各个功能 Modal（盲盒、图库等）的数据传递和交互
- **手动测试**：在真实浏览器（桌面端、移动端）中测试滚动行为、焦点管理、动画效果

## Technical Approach

### 实现策略

采用**渐进式改造**的方式，避免一次性修改所有组件导致风险过大：

1. **Phase 1：基础设施（优先）**
   - 实现 Modal 基础组件（`Modal.tsx`）
   - 实现 `useScrollLock` hook
   - 添加单元测试确保 Modal 功能正常

2. **Phase 2：盲盒 Modal（优先级最高）**
   - 创建 `BlindBoxResultModal` 组件
   - 修改 `recommendation-panel.tsx` 使用 Modal
   - 这是最明显的 UX 问题，优先解决

3. **Phase 3：图库/版本/做法 Modal**
   - 将 `DishImagePanel`、`DishVariantsPanel`、`RecipePanel` 改为 Modal 形式
   - 保持原有功能不变，只改变展示方式

4. **Phase 4：记录已吃 Modal**
   - 将 `MealRecordForm` 改为 Modal 形式

### 技术细节

**Modal 组件 API**：
```typescript
<Modal isOpen={isOpen} onClose={onClose} title="标题">
  {children}
</Modal>
```

**关键特性**：
- 使用 `createPortal` 渲染到 `document.body`
- 自动管理焦点（打开时焦点移入，关闭时返回触发元素）
- 自动锁定背景滚动（`useScrollLock` hook）
- 支持 ESC 键关闭
- 支持点击遮罩层关闭
- 动画：淡入淡出 + 轻微缩放效果（使用 Tailwind CSS）

## Decision (ADR-lite)

**Context**: 
应用中存在多处操作触发点与结果反馈区域不在同一视口的问题，导致用户体验不佳。用户点击操作后需要手动滚动才能看到结果。

**Decision**: 
将所有需要展示结果/操作界面的交互改为居中 Modal 形式：
1. 盲盒结果使用 Modal 展示（最高优先级）
2. 图库/版本/做法管理改为 Modal
3. 记录已吃表单改为 Modal
4. 所有 Modal 保持一致的交互风格（居中弹出、遮罩层、ESC 关闭）

**Consequences**: 
- ✅ 解决视口问题，用户操作后立即看到反馈
- ✅ 不改变页面滚动位置，用户可以无缝继续操作
- ✅ 统一的交互模式，学习成本低
- ⚠️ 需要自行实现 Modal 组件（约 150 行代码，可控）
- ⚠️ Modal 打断上下文，用户无法同时看到菜品列表和操作界面（这是合理的权衡）
- ⚠️ 移动端小屏幕上 Modal 需要特别处理响应式设计

## Implementation Plan

### PR1: Modal 基础组件（基础设施）
- 创建 `frontend/src/components/modal.tsx`
- 创建 `frontend/src/hooks/use-scroll-lock.ts`
- 添加单元测试 `frontend/src/components/modal.test.tsx`
- 验证：Modal 可以打开/关闭、ESC 键、点击遮罩层、滚动锁定

### PR2: 盲盒结果 Modal（最高优先级）
- 创建 `frontend/src/components/blind-box-result-modal.tsx`
- 修改 `frontend/src/components/recommendation-panel.tsx`
- 修改 `frontend/src/pages/home-page.tsx` 中盲盒状态管理
- 验证：点击盲盒后 Modal 弹出，显示完整结果，可以记录已吃、查看做法

### PR3: 图库/版本/做法 Modal
- 修改 `frontend/src/components/dish-image-panel.tsx` 使用 Modal
- 修改 `frontend/src/components/dish-variants-panel.tsx` 使用 Modal
- 修改 `frontend/src/components/recipe-panel.tsx` 使用 Modal
- 修改 `frontend/src/pages/home-page.tsx` 中相关渲染逻辑
- 验证：所有操作界面都在视口中央弹出，操作区域始终可见

### PR4: 记录已吃 Modal
- 修改 `frontend/src/components/meal-record-form.tsx` 使用 Modal
- 修改 `frontend/src/pages/home-page.tsx` 中相关渲染逻辑
- 验证：记录表单在视口中央弹出，提交后 Modal 关闭

