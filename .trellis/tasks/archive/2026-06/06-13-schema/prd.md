# 数据库 Schema 设计改进

## Goal

修复当前 Prisma schema 中存在的设计缺陷，主要解决：
1. MealRecord → Dish 的删除限制导致菜品无法清理
2. User 邮箱全局唯一与多 workspace 需求的冲突
3. 数据一致性风险（variant-dish 关联）

## What I Already Know

基于对 `backend/prisma/schema.prisma` 的分析：

### 核心架构
- 多租户系统，以 Workspace 为隔离单元
- 所有业务数据都冗余存储 `workspaceId` 以优化查询性能
- 包含 8 个模型：Workspace, User, WorkspaceInvite, Dish, DishImage, DishVariant, Recipe, MealRecord, Feedback

### 已识别的主要问题

**问题 1：MealRecord → Dish 的删除策略 (高优先级)**
```prisma
dish Dish @relation(..., onDelete: Restrict)
```
- 如果菜品有历史用餐记录，就永远无法删除
- 会导致菜品库越来越臃肿，无法清理过时菜品

**问题 2：User 与 Workspace 的关系设计矛盾 (高优先级)**
```prisma
User.workspaceId -> Workspace (单一绑定)
email String @unique (全局唯一)
```
- 当前强制"一个邮箱 = 一个账号 = 一个 workspace"
- 用户无法用同一邮箱加入多个 workspace

**问题 3：MealRecord 的数据一致性风险 (中优先级)**
- 没有约束确保 `variant.dishId == mealRecord.dishId`
- 理论上可能记录错误的关联（variant 不属于对应的 dish）

**问题 4：Recipe 表的业务逻辑不明确 (中优先级)**
- 一个 Dish 可以有多个 Recipe，但没有唯一性约束
- 不清楚是"一菜一食谱"还是"支持多版本"

### 设计优点
- 索引设计优秀，考虑了排序方向和查询模式
- 级联删除策略合理（DishImage, DishVariant, Feedback）
- 约束设计到位（unique constraints, foreign keys）
- 审计字段完整（createdAt, updatedAt）

## Decisions

### 1. User-Workspace 关系 ✅
**决定**：多 workspace 模式（选项 B）

**变更**：
- 新增 `WorkspaceMember` 表（多对多关系）
- User 表移除 `workspaceId` 字段
- 邮箱保持全局唯一
- 角色（role）从 User 移到 WorkspaceMember（用户在不同 workspace 可有不同角色）

### 2. 菜品删除行为 ✅
**决定**：软删除（选项 A）

**变更**：
- Dish 表添加 `deletedAt` 字段（可选时间戳）
- MealRecord → Dish 删除策略改为 `onDelete: Restrict`（保持不变）
- 查询菜品列表时过滤 `deletedAt IS NULL`
- 历史用餐记录仍可访问已删除的菜品信息

### 3. Recipe 业务逻辑 ✅
**决定**：支持多个食谱版本（选项 B）

**变更**：
- Recipe 表添加 `version` 字段（整数，从 1 开始）
- Recipe 表添加 `isActive` 字段（布尔值，标记当前使用的版本）
- 添加唯一约束 `@@unique([dishId, version])`
- 同一菜品可以有多个版本，但通常只激活一个

### 4. Variant-Dish 一致性保证 ✅
**决定**：应用层验证（选项 A）

**变更**：
- 在 MealRecord service 层添加验证逻辑
- 创建/更新 MealRecord 时检查 `variant.dishId == mealRecord.dishId`
- 如果不匹配则抛出错误
- 编写单元测试覆盖此验证

## Open Questions

### 产品需求相关

（已全部确认）

### 技术实现相关

（已全部确认）

## Assumptions (Temporary)

- 这是一个正在运行的生产环境，需要考虑数据迁移
- 改动需要向后兼容，或提供平滑的迁移路径
- PostgreSQL 版本支持所需的特性（数组类型、部分索引等）

## Requirements

### 1. 重构 User-Workspace 关系为多对多
- 创建 `WorkspaceMember` 表（userId, workspaceId, role）
- User 表移除 `workspaceId` 字段
- 移除 User 表的 `role` 字段（移到 WorkspaceMember）
- WorkspaceInvite 相关的外键关系需要调整
- Feedback 表的 `userId` 关系保持不变

### 2. 为 Dish 添加软删除支持
- Dish 表添加 `deletedAt DateTime?` 字段
- 保持 `onDelete: Restrict` 策略不变
- 需要更新查询逻辑过滤已删除菜品

### 3. 为 Recipe 添加版本支持
- Recipe 表添加 `version Int @default(1)` 字段
- Recipe 表添加 `isActive Boolean @default(true)` 字段
- 添加 `@@unique([dishId, version])` 约束

### 4. MealRecord 数据一致性验证
- 在 service 层添加验证：创建/更新 MealRecord 时检查 variant 是否属于 dish
- 添加对应的单元测试

## Acceptance Criteria

- [ ] Schema 改动在 Prisma 中验证通过（`npx prisma validate`）
- [ ] 生成的 migration SQL 可以在测试数据库上成功执行
- [ ] WorkspaceMember 表正确创建，包含所有必要的索引和约束
- [ ] 现有 User 数据可以正确迁移到新的 WorkspaceMember 结构
- [ ] Dish 软删除功能可以正常工作（deletedAt 字段）
- [ ] Recipe 版本功能正确实现（version + isActive）
- [ ] MealRecord service 添加了 variant-dish 一致性验证
- [ ] 验证逻辑有对应的单元测试
- [ ] 所有现有测试通过
- [ ] 类型生成正确（`npx prisma generate`）

## Definition of Done

- Migration 文件已生成并测试
- 相关的 service 层代码已更新（如需要）
- 数据验证逻辑已添加（如需要）
- Schema 文档已更新（添加注释说明业务规则）
- 通过 lint / typecheck / CI
- 如需要，提供回滚方案

## Out of Scope (Explicit)

- 性能优化（除非与结构改动直接相关）
- 新增业务功能
- 大规模数据重构
- workspaceId 冗余设计的改动（这是多租户架构的最佳实践，保持不变）
- DishVariant 软删除（当前不需要）
- 前端代码改动（仅限后端 schema 和 service 层）
- API 接口变更（保持向后兼容）

## Technical Approach

### 多 Workspace 模式的 Session 处理策略

**问题**：用户可以属于多个 workspace，但 session 只能有一个当前 workspace

**解决方案**：
1. **登录流程**：
   - 用户登录后，查询其所有 workspace（通过 WorkspaceMember）
   - 如果只有一个 workspace，自动选中并设置到 session
   - 如果有多个 workspace，返回列表让用户选择（或默认选第一个）
   
2. **Session 存储**：
   - `session.userId` - 用户 ID
   - `session.workspaceId` - 当前选中的 workspace ID
   
3. **切换 Workspace**：
   - 提供 API 端点允许用户切换当前 workspace
   - 验证用户确实是该 workspace 的成员
   
4. **获取用户角色**：
   - 从 WorkspaceMember 表查询当前 workspace 下的角色
   - 不再从 User 表读取 role

### Phase 1: Schema 改动
1. **WorkspaceMember 表**
   - 创建新表，包含 userId, workspaceId, role, createdAt, updatedAt
   - 添加复合主键 `@@id([userId, workspaceId])`
   - 添加索引和外键约束

2. **User 表重构**
   - 移除 `workspaceId` 字段
   - 移除 `role` 字段
   - 移除 `@@index([workspaceId])`
   - 更新关联关系

3. **Workspace 关联更新**
   - 将 `users User[]` 改为通过 WorkspaceMember 关联

4. **WorkspaceInvite 调整**
   - 保持现有字段，但需要调整外键关系逻辑
   - 邀请机制改为：邀请用户加入 workspace（创建 WorkspaceMember）

5. **Dish 软删除**
   - 添加 `deletedAt DateTime?` 字段

6. **Recipe 版本化**
   - 添加 `version Int @default(1)`
   - 添加 `isActive Boolean @default(true)`
   - 添加 `@@unique([dishId, version])`

### Phase 2: 数据迁移
1. 编写 migration 将现有 User 记录迁移到 WorkspaceMember
2. 为所有现有 Recipe 设置 version = 1, isActive = true

### Phase 3: Service 层改动
1. 更新 MealRecord service 添加 variant-dish 验证
2. 更新 User/Workspace 相关的 service 逻辑
3. 添加单元测试

### Phase 4: 验证
1. 运行 `npx prisma validate`
2. 在测试数据库执行 migration
3. 运行所有测试

## Implementation Progress

### ✅ 已完成（100%）

**1. Schema 改动**（100%）
   - ✅ 创建 WorkspaceMember 表（多对多关系）
   - ✅ 移除 User 表的 workspaceId 和 role 字段
   - ✅ 为 Dish 添加 deletedAt 字段（软删除）
   - ✅ 为 Recipe 添加 version 和 isActive 字段
   - ✅ 编写完整的数据迁移 SQL

**2. 代码更新**（100%）
   - ✅ auth（service + guard + controller）- 支持多 workspace，通过 WorkspaceMember 查询
   - ✅ invites（service + controller）- 使用 WorkspaceMember 进行权限检查
   - ✅ dishes（controller + service）
   - ✅ meal-records（controller + service + variant-dish 验证）
   - ✅ recipes（controller + service）
   - ✅ dish-images（controller + service）
   - ✅ dish-variants（controller + service）
   - ✅ feedback（controller + service）
   - ✅ recommendations（controller + service）
   - ✅ members（controller + service）- 完全重写以使用 WorkspaceMember

**3. 其他文件**（100%）
   - ✅ prisma/seed.ts - 更新为使用 WorkspaceMember
   - ✅ Prisma Client 已生成
   - ✅ TypeScript 类型检查通过

**4. 核心验证逻辑**（100%）
   - ✅ MealRecord 的 `assertVariantInWorkspace` 已验证 variant.dishId == mealRecord.dishId

### 📝 待办事项

**迁移执行**：
- 启动数据库
- 运行迁移：`npx prisma migrate dev`
- 运行 seed：`npx prisma db seed`
- 手动测试登录/注册流程

**测试验证**：
- 运行现有测试套件
- 手动测试各个 API 端点
- 验证多 workspace 逻辑

## Technical Notes

- 主要文件：`backend/prisma/schema.prisma`
- Migration 目录：`backend/prisma/migrations/`
- 最新 migration：`20260613010000_recipe_merge_to_instructions`
- 使用 PostgreSQL 数据库
