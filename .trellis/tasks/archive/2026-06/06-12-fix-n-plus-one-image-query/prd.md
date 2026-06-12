# 修复 N+1 图片查询问题

## 背景

`recent-meal-records.tsx` 中每个 `MealRecordCard` 独立调用 `useDishImages(record.dishId)`，导致渲染5个卡片时触发5个独立的HTTP请求。如果多个记录共享同一菜品，图片会被重复获取。

## 问题影响

- **性能损失**：5个串行请求代替1个批量请求
- **延迟增加**：每个HTTP往返 50-200ms，总计浪费 200-800ms
- **网络负载**：重复获取相同菜品的图片

## 解决方案

### 方案A：父组件预取（推荐）

在 `recent-meal-records.tsx` 父组件中：
1. 提取所有可见记录的 `dishId` 列表
2. 使用 React Query 的 `useQueries` 批量预取所有图片
3. 通过 props 将图片数据传递给卡片组件
4. 或依赖 React Query 缓存，子组件的 `useDishImages` 命中缓存

### 方案B：后端批量接口

1. 创建 `GET /api/dishes/images?dishIds=id1,id2,id3` 批量接口
2. 前端调用批量接口获取所有图片
3. 将结果按 dishId 分组传递给卡片

## 推荐实施

**方案A（利用React Query缓存）**，理由：
- 无需修改后端
- React Query 自动去重和缓存
- 最小侵入性

## 验收标准

- [ ] 父组件使用 `useQueries` 或 `prefetchQuery` 预热缓存
- [ ] Network tab 显示图片请求数 = 唯一 dishId 数量（不是记录数量）
- [ ] 页面加载时间减少 200-800ms
- [ ] 功能保持不变（图片显示正常）
- [ ] TypeScript 类型检查通过

## 预期影响

- 页面加载速度提升 20-40%
- 减少服务器负载
- 改善用户体验
