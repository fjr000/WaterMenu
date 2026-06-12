# 优化图片预取和添加 useMemo

## 背景

代码审查发现图片预取实现中存在性能优化机会：
1. `uniqueDishIds` 计算在每次渲染时重复执行
2. 预取逻辑直接暴露在组件中，缺乏封装

## 问题详情

### 1. 缺少 useMemo 优化

**位置：** `frontend/src/components/recent-meal-records.tsx` (lines 54-64)

**当前实现：**
```typescript
const uniqueDishIds = [...new Set(records.map((r) => r.dishId))];

useQueries({
  queries: uniqueDishIds.map((dishId) => ({
    queryKey: dishImagesKey(dishId),
    queryFn: () => apiFetch<DishImage[]>(`/dishes/${dishId}/images`),
    staleTime: 60000,
  })),
});
```

**问题：**
- `Set` 构建和数组展开在每次渲染时执行
- `uniqueDishIds.map()` 创建新的 queries 数组每次渲染
- 即使 `records` 未变化，仍浪费计算和对象分配

**性能影响：** 中等（5条记录时：5个对象 + 1个Set + 数组操作）

### 2. 预取逻辑缺乏封装

**问题：**
- 父组件直接导入 `dishImagesKey`、`apiFetch`、`useQueries`
- 必须知道子组件 `useDishImages` 的内部实现
- 紧密耦合：修改 `useDishImages` 会破坏父组件

**风险：**
- 其他使用 `MealRecordCard` 的地方（如 `HistoryRecordsPanel`）容易遗漏预取
- 重复的13行预取代码会在多处出现

## 解决方案

### 方案 A：添加 useMemo（推荐，快速修复）

```typescript
const uniqueDishIds = useMemo(
  () => [...new Set(records.map((r) => r.dishId))],
  [records]
);

useQueries({
  queries: uniqueDishIds.map((dishId) => ({
    queryKey: dishImagesKey(dishId),
    queryFn: () => apiFetch<DishImage[]>(`/dishes/${dishId}/images`),
    staleTime: 60000,
  })),
});
```

**优点：**
- 最小改动
- 消除不必要的重复计算

**缺点：**
- 未解决封装问题

### 方案 B：封装为 hook（完整方案）

**创建：** `frontend/src/hooks/use-dish-images.ts` 中添加

```typescript
export function usePrefetchDishImages(dishIds: string[]) {
  const uniqueIds = useMemo(
    () => [...new Set(dishIds)],
    [dishIds.join(',')] // 优化依赖比较
  );

  useQueries({
    queries: uniqueIds.map((dishId) => ({
      queryKey: dishImagesKey(dishId),
      queryFn: () => apiFetch<DishImage[]>(`/dishes/${dishId}/images`),
      staleTime: 60000,
    })),
  });
}
```

**使用：**
```typescript
// recent-meal-records.tsx
const dishIds = records.map(r => r.dishId);
usePrefetchDishImages(dishIds);
```

**优点：**
- 封装完整的预取逻辑
- 可复用（`HistoryRecordsPanel` 等也能用）
- 测试更容易

**缺点：**
- 需要修改更多文件

## 推荐实施

**阶段1（本任务）：** 方案 A - 添加 useMemo
- 工作量：5分钟
- 立即收益：消除渲染浪费

**阶段2（可选，后续）：** 方案 B - 封装 hook
- 工作量：15分钟
- 长期收益：可复用，降低耦合

## 验收标准

### 必须完成
- [ ] `uniqueDishIds` 使用 `useMemo` 包装
- [ ] TypeScript 类型检查通过
- [ ] 前端构建成功
- [ ] 功能保持不变（图片预取正常工作）

### 可选优化
- [ ] 创建 `usePrefetchDishImages` hook
- [ ] 更新 `recent-meal-records.tsx` 使用新 hook
- [ ] 在其他需要的地方（如 `HistoryRecordsPanel`）添加预取

## 预期影响

- 减少不必要的对象分配和计算
- 提升渲染性能（每次避免重复计算）
- （可选）提供可复用的预取工具
