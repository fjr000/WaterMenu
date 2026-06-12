# 添加数据库索引优化查询性能

## 背景

架构审查发现复杂排序查询缺少支持索引，导致查询性能下降。所有列表查询都使用多字段排序但只有简单的单列索引。

## 问题详情

### 缺失的索引

#### 1. Dish 列表排序索引
**位置：** `dishes.service.ts:61`
```typescript
orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
```
**当前索引：** 只有 `@@index([workspaceId])`
**缺失：** 组合排序索引

#### 2. MealRecord 列表排序索引
**位置：** `meal-records.service.ts:93`
```typescript
orderBy: [{ eatenAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
```
**缺失：** 时间范围 + 排序索引

#### 3. DishVariant 列表排序索引
**位置：** `dish-variants.service.ts:17`
```typescript
orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }]
```
**缺失：** 激活状态 + 排序索引

#### 4. DishImage 排序索引
**位置：** `dish-images.service.ts:40`
```typescript
orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
```
**缺失：** sortOrder 优先索引

#### 5. Feedback 评分过滤索引
**位置：** `meal-records.service.ts:62-69`
```typescript
where.feedbacks = {
  some: {
    workspaceId,
    rating: query.rating,
  },
};
```
**缺失：** 评分过滤索引

#### 6. MealRecord 日期范围索引
**位置：** `meal-records.service.ts:72-80`
```typescript
const eatenAt: Prisma.DateTimeFilter = {};
if (query.from) eatenAt.gte = new Date(query.from);
if (query.to) eatenAt.lte = new Date(query.to);
```
**缺失：** 日期范围查询索引

## 解决方案

### Schema 更新

```prisma
model Dish {
  // 现有字段...
  
  @@index([workspaceId]) // 已存在
  @@index([workspaceId, updatedAt(sort: Desc), createdAt(sort: Desc), id(sort: Desc)]) // 新增
  @@map("dishes")
}

model MealRecord {
  // 现有字段...
  
  @@index([workspaceId]) // 已存在
  @@index([dishId]) // 已存在
  @@index([variantId]) // 已存在
  @@index([workspaceId, eatenAt(sort: Desc), createdAt(sort: Desc), id(sort: Desc)]) // 新增：排序
  @@index([workspaceId, eatenAt]) // 新增：日期范围
  @@map("meal_records")
}

model DishVariant {
  // 现有字段...
  
  @@index([workspaceId]) // 已存在
  @@index([dishId]) // 已存在
  @@index([dishId, isActive(sort: Desc), createdAt, id]) // 新增
  @@map("dish_variants")
}

model DishImage {
  // 现有字段...
  
  @@index([workspaceId]) // 已存在
  @@index([dishId]) // 已存在
  @@index([dishId, sortOrder, createdAt]) // 新增
  @@map("dish_images")
}

model Feedback {
  // 现有字段...
  
  @@index([workspaceId]) // 已存在
  @@index([userId]) // 已存在
  @@index([mealRecordId, rating]) // 新增：评分过滤
  @@index([workspaceId, rating]) // 新增：workspace范围评分
  @@map("feedbacks")
}
```

## 实施步骤

1. 更新 `backend/prisma/schema.prisma` 添加所有新索引
2. 生成迁移：`pnpm backend:prisma:migrate dev --name add-query-indexes`
3. 验证迁移文件内容
4. 应用迁移：`pnpm backend:prisma:migrate deploy`
5. 验证索引创建成功（查询 `pg_indexes` 表）

## 验收标准

- [ ] schema.prisma 包含所有9个新索引
- [ ] Prisma 迁移文件生成成功
- [ ] 迁移应用无错误
- [ ] 数据库中索引创建成功
- [ ] 后端测试全部通过
- [ ] 列表查询性能提升验证

## 预期影响

- **查询性能**：2-10x 提升（取决于数据量）
- **数据库负载**：减少全表扫描
- **用户体验**：列表加载更快
- **索引空间**：增加约 5-10% 磁盘占用（值得的权衡）

## 注意事项

- 索引会略微增加写操作开销（INSERT/UPDATE），但读操作收益远大于此
- 在生产环境应用迁移时建议在低流量时段
- PostgreSQL 会自动使用最优索引，无需修改查询代码
