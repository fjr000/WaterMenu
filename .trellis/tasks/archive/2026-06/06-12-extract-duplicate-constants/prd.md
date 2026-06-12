# 提取重复的常量

## 背景

代码审查发现多个文件中重复定义了相同的常量配置，导致维护成本增加和潜在的不一致风险。

## 目标

提取并集中管理重复的领域常量，消除40行重复代码。

## 重复常量清单

### 1. Meal Type Options (3处重复，18行)

**位置：**
- `create-dish-form.tsx`
- `recent-meal-records.tsx`
- `dish-autocomplete.tsx`

**解决方案：**
扩展 `meal-tag.tsx` 导出 `mealTypeOptions` 数组。

### 2. Variant Type Options (2处重复，12行)

**位置：**
- `inline-variant-panel.tsx`
- `dish-variants-panel.tsx`

**解决方案：**
创建 `frontend/src/constants/variant-types.ts` 导出：
- `variantTypeOptions`
- `variantTypeLabels`

### 3. Rating Options (2处重复，10行)

**位置：**
- `history-records-panel.tsx`
- `recent-meal-records.tsx`

**解决方案：**
创建 `frontend/src/constants/feedback-ratings.ts` 导出 `ratingOptions`。

## 验收标准

- [ ] 创建 `frontend/src/constants/variant-types.ts`
- [ ] 创建 `frontend/src/constants/feedback-ratings.ts`
- [ ] 扩展 `meal-tag.tsx` 导出 `mealTypeOptions`
- [ ] 更新所有引用位置使用新的导出
- [ ] 删除重复定义
- [ ] TypeScript 类型检查通过
- [ ] 前端构建成功

## 预期影响

- 减少40行重复代码
- 标签文案修改只需更新1个位置
- 降低维护成本
- 消除不一致风险
