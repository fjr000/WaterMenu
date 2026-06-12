# 提取重复的日期工具函数

## 背景

代码审查发现日期格式化函数在多个组件中重复定义，导致维护成本增加。

## 重复函数清单

### 1. toLocalInputValue (完全相同，3处)

**位置：**
- `frontend/src/components/recent-meal-records.tsx` (lines 504-507)
- `frontend/src/components/meal-record-form.tsx` (lines 32-35)
- `frontend/src/components/manual-meal-record-form.tsx` (lines 234-237)

**当前实现：**
```typescript
function toLocalInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
```

**用途：** 将 Date 对象转换为 `<input type="datetime-local">` 的值格式

### 2. formatDate (有变体，3处)

**位置：**
- `frontend/src/components/recent-meal-records.tsx` (lines 495-502) - "M/D HH:mm"
- `frontend/src/components/members-panel.tsx` (lines 213-220) - "MM/DD HH:mm"
- `frontend/src/pages/invite-page.tsx` (lines 175-183) - "YYYY/MM/DD HH:mm"

**用途：** 将 ISO 字符串格式化为中文本地化显示

## 解决方案

### 创建共享工具文件

`frontend/src/utils/date-formatting.ts`:

```typescript
/**
 * 将 Date 对象转换为 datetime-local input 的值格式
 * @param date Date 对象
 * @returns 格式: "2026-06-12T14:30"
 */
export function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/**
 * 格式化日期为简短格式（用于列表展示）
 * @param value ISO 字符串
 * @returns 格式: "6/12 14:30"
 */
export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * 格式化日期为完整格式（用于详情页）
 * @param value ISO 字符串
 * @returns 格式: "2026/06/12 14:30"
 */
export function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
```

### 实施步骤

1. 创建 `frontend/src/utils/date-formatting.ts`
2. 实现 `toLocalInputValue`、`formatShortDate`、`formatFullDate`
3. 更新所有引用位置：
   - `toLocalInputValue`: 3个文件
   - `formatDate`: 3个文件（根据场景选择 short/full）
4. 删除本地定义

## 验收标准

- [ ] 创建 `utils/date-formatting.ts` 包含3个函数
- [ ] 所有6个引用位置更新为导入共享函数
- [ ] 删除所有本地重复定义
- [ ] TypeScript 类型检查通过
- [ ] 前端构建成功
- [ ] 日期显示功能保持不变

## 预期影响

- 减少约30行重复代码
- 日期格式修改只需更新1个文件
- 提升代码可测试性（工具函数可独立测试）
- 为未来的国际化（i18n）提供集中管理点
