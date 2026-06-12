# 后端 Markdown 验证和可配置删除策略

## 背景

代码审查发现两个架构层面的安全和灵活性问题：

1. **XSS 风险**：Markdown 内容只在前端渲染时过滤，后端存储任意字符串
2. **删除策略僵化**：`meal_records` → `dishes` 硬编码 `ON DELETE RESTRICT`，用户无法删除有记录的菜品

## 目标

1. 在后端添加 Markdown 内容验证，防止存储恶意内容
2. 实现可配置的删除策略，支持多种数据生命周期管理方式

## 实施方案

### 1. Markdown 验证

**后端验证层：**

```typescript
// backend/src/common/validators/markdown.validator.ts
import { marked } from 'marked';

export function validateMarkdown(content: string): { 
  isValid: boolean; 
  sanitized: string; 
  errors?: string[] 
} {
  // 1. 解析 Markdown 检测危险模式
  // 2. 移除 script/iframe/object/embed 标签
  // 3. 验证 URL 协议（只允许 http/https）
  // 4. 返回清理后的内容
}
```

**集成点：**
- `CreateDishVariantDto` / `UpdateDishVariantDto` 验证
- 存储 `sanitized_description` 或使用 Prisma 中间件
- 审计日志记录可疑输入

### 2. 可配置删除策略

**选项A：应用层策略（推荐）**

```typescript
// backend/src/common/enums/deletion-policy.enum.ts
export enum DeletionPolicy {
  RESTRICT = 'RESTRICT',   // 默认：禁止删除
  CASCADE = 'CASCADE',     // 级联删除关联记录
  SET_NULL = 'SET_NULL',   // 解除关联
  SOFT_DELETE = 'SOFT_DELETE', // 标记删除
}

// backend/src/dishes/dishes.service.ts
async deleteDish(dishId: string, policy: DeletionPolicy) {
  switch (policy) {
    case CASCADE: // 删除菜品和所有记录
    case SET_NULL: // 保留记录，设 dishId = null
    case SOFT_DELETE: // 标记 deletedAt
    case RESTRICT: // 检查记录数，有记录则拒绝
  }
}
```

**选项B：Workspace 级配置**

在 `workspaces` 表添加 `defaultDeletionPolicy` 字段，管理员可配置偏好。

## 验收标准

### Markdown 验证
- [ ] 创建 `markdown.validator.ts` 工具函数
- [ ] 集成到 `DishVariantDto` 验证
- [ ] 拒绝包含 `<script>`/`<iframe>` 的输入
- [ ] 返回清理后的内容
- [ ] 添加单元测试（恶意输入用例）

### 删除策略
- [ ] 定义 `DeletionPolicy` 枚举
- [ ] `dishes.service.ts` 实现策略分支
- [ ] 添加 `DELETE /api/dishes/:id?policy=CASCADE` 参数
- [ ] （可选）Workspace 级配置表字段
- [ ] 添加 E2E 测试验证各策略

## 安全注意事项

- Markdown 验证不能替代前端渲染过滤（深度防御）
- 审计日志记录被拒绝的恶意输入
- 删除策略需要权限检查（只有管理员可用 CASCADE）

## 预期影响

- 消除存储型 XSS 风险
- 支持多种数据管理工作流
- 提升多平台一致性（移动端、桌面端复用后端验证）
- 降低用户被"无法删除菜品"困扰的风险
