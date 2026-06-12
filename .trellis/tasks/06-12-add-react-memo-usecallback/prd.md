# 添加 React.memo 和 useCallback 优化

## 背景

性能审查发现列表组件存在严重的不必要重渲染问题，导致每次交互延迟100-350ms。关键问题是缺少 `React.memo` 和 `useCallback`。

## 问题详情

### 问题 1：列表项不必要的重渲染

**位置：**
- `/frontend/src/pages/home-page.tsx` - DishCard 组件（320行，未 memo）
- `/frontend/src/components/recommendation-panel.tsx` - CandidateCard 组件

**当前行为：**
```typescript
function DishCard({ dish, expanded, onToggle, ... }: DishCardProps) {
  // 320行复杂组件
  // 父组件任何状态变化都会重渲染所有卡片
}
```

**影响：**
- 父组件状态变化（如打开一个面板）
- 所有 10-50+ 个 DishCard 全部重渲染
- 每个卡片 5-10ms × 数量 = 50-500ms 浪费

### 问题 2：事件处理器破坏 memo

**位置：** `home-page.tsx` (lines 132-186)

**当前代码：**
```typescript
// 8个事件处理器，每次渲染都创建新函数
const handleRecordDish = (dish: Dish) => {
  setRecipeDish(null);
  setImageDish(null);
  setVariantDish(null);
  setEditingDish(null);
  setExpandedDishId(dish.id);
  setRecordDish(dish);
};

const handleViewRecipe = (dish: Dish) => { /* 类似 */ };
const handleManageImages = (dish: Dish) => { /* 类似 */ };
// ... 6个更多处理器
```

**问题：**
- 即使包裹 `memo(DishCard)`，prop `onRecordDish` 仍然是新函数
- React 认为 props 变了，仍然重渲染
- memo 优化失效

### 问题 3：低效的列表 key

**位置：** `home-page.tsx` (lines 571-582)

**当前代码：**
```typescript
function getDishListKey(dish: Dish, filters: { q: string; mealType: MealType | ""; status: DishStatusFilter }) {
  return [dish.id, filters.q.trim(), filters.mealType, filters.status, dish.updatedAt].join("-");
}

{dishesQuery.data?.map((dish) => (
  <DishCard key={getDishListKey(dish, { q: dishSearch, mealType: dishMealType, status: dishStatus })} />
))}
```

**问题：**
- Key 包含过滤器状态
- 过滤器变化 → 所有 key 变化 → React 认为是新列表
- 所有组件卸载并重新挂载（失去滚动位置、动画状态）

**影响：** 100-300ms 延迟

## 解决方案

### 修复 1：添加 React.memo

#### DishCard (home-page.tsx)

```typescript
import { memo } from 'react';

// 将 DishCard 提取为独立组件并 memo
const DishCard = memo(function DishCard({
  dish,
  expanded,
  onToggle,
  onRecordDish,
  onViewRecipe,
  onManageImages,
  onManageVariants,
  onEditDish,
  onDishUpdated,
  onDishDeleted,
}: DishCardProps) {
  // 现有 320 行代码...
}, (prevProps, nextProps) => {
  // 可选：自定义比较逻辑
  // 如果 dish 对象引用未变且其他 props 相同，则跳过渲染
  return (
    prevProps.dish.id === nextProps.dish.id &&
    prevProps.dish.updatedAt === nextProps.dish.updatedAt &&
    prevProps.expanded === nextProps.expanded
  );
});
```

#### CandidateCard (recommendation-panel.tsx)

```typescript
const CandidateCard = memo(function CandidateCard({
  candidate,
  onRecordDish,
}: CandidateCardProps) {
  // 现有代码...
});
```

### 修复 2：添加 useCallback

#### HomePage (home-page.tsx)

```typescript
import { useCallback } from 'react';

// 将所有事件处理器包裹 useCallback
const handleRecordDish = useCallback((dish: Dish) => {
  setRecipeDish(null);
  setImageDish(null);
  setVariantDish(null);
  setEditingDish(null);
  setExpandedDishId(dish.id);
  setRecordDish(dish);
}, []); // 依赖项为空，因为只调用 set 函数

const handleViewRecipe = useCallback((dish: Dish) => {
  setRecordDish(null);
  setImageDish(null);
  setVariantDish(null);
  setEditingDish(null);
  setExpandedDishId(dish.id);
  setRecipeDish(dish);
}, []);

const handleManageImages = useCallback((dish: Dish) => {
  setRecordDish(null);
  setRecipeDish(null);
  setVariantDish(null);
  setEditingDish(null);
  setExpandedDishId(dish.id);
  setImageDish(dish);
}, []);

const handleManageVariants = useCallback((dish: Dish) => {
  setRecordDish(null);
  setRecipeDish(null);
  setImageDish(null);
  setEditingDish(null);
  setExpandedDishId(dish.id);
  setVariantDish(dish);
}, []);

const handleEditDish = useCallback((dish: Dish) => {
  setRecordDish(null);
  setRecipeDish(null);
  setImageDish(null);
  setVariantDish(null);
  setExpandedDishId(dish.id);
  setEditingDish(dish);
}, []);

const handleToggleDishExpand = useCallback((dishId: string) => {
  setExpandedDishId((prev) => (prev === dishId ? null : dishId));
}, []);

// 成功/关闭处理器
const handleRecordSuccess = useCallback(() => {
  setRecordDish(null);
  setExpandedDishId(null);
}, []);

const handleCloseRecordForm = useCallback(() => {
  setRecordDish(null);
}, []);

// ... 其他处理器类似
```

### 修复 3：简化列表 key

**移除复杂的 key 计算函数：**

```typescript
// 删除 getDishListKey 函数

// 使用简单稳定的 key
{dishesQuery.data?.map((dish) => (
  <DishCard 
    key={dish.id}  // 只用 dish.id，React 会处理 prop 变化
    dish={dish}
    expanded={expandedDishId === dish.id}
    onToggle={handleToggleDishExpand}
    onRecordDish={handleRecordDish}
    onViewRecipe={handleViewRecipe}
    onManageImages={handleManageImages}
    onManageVariants={handleManageVariants}
    onEditDish={handleEditDish}
    onDishUpdated={handleDishUpdated}
    onDishDeleted={handleDishDeleted}
  />
))}
```

## 实施步骤

### 阶段 1：DishCard 优化（优先）
1. 提取 DishCard 为单独组件（如果还未提取）
2. 用 `memo` 包裹 DishCard
3. 为 DishCard 的所有事件处理器添加 `useCallback`
4. 简化列表 key 为 `dish.id`
5. 测试过滤、展开、交互功能

### 阶段 2：CandidateCard 优化
1. 用 `memo` 包裹 CandidateCard
2. 为推荐面板的事件处理器添加 `useCallback`
3. 测试推荐功能

## 验收标准

- [ ] DishCard 使用 `React.memo` 包裹
- [ ] CandidateCard 使用 `React.memo` 包裹
- [ ] 所有传给 DishCard 的事件处理器使用 `useCallback`
- [ ] 列表 key 简化为 `dish.id`
- [ ] 删除 `getDishListKey` 函数
- [ ] TypeScript 类型检查通过
- [ ] 前端构建成功
- [ ] 功能测试：过滤、展开、编辑、删除都正常

## 性能验证

使用 React DevTools Profiler：

### 测试场景 1：打开记录面板
**Before：** 所有 20 个 DishCard 重渲染（~100-200ms）
**After：** 只有状态变化的组件渲染（~5-10ms）

### 测试场景 2：修改过滤器
**Before：** 所有卡片卸载+重新挂载（~200-300ms）
**After：** 卡片保持挂载，只更新 props（~20-50ms）

### 测试场景 3：展开/折叠卡片
**Before：** 所有卡片重渲染（~100-150ms）
**After：** 只有目标卡片渲染（~5-10ms）

## 预期影响

### 性能提升
- **交互响应**：-150-350ms
- **过滤操作**：-100-250ms
- **列表滚动**：更流畅（减少渲染）

### 用户体验
- 操作更流畅
- 过滤无卡顿
- 动画更自然

## 注意事项

1. **useCallback 依赖项**：确保依赖数组正确，避免闭包陷阱
2. **memo 比较成本**：浅比较很快，不用担心性能
3. **过度优化**：不是所有组件都需要 memo，只优化列表项和重渲染代价高的组件
4. **调试**：React DevTools Profiler 可以验证优化效果
