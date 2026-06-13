# Recipe 字段合并：title + content → instructions（Markdown 支持）

## Goal

将 Recipe 的 `title` 和 `content` 两个独立字段合并为一个统一的 `instructions` 字段，支持 Markdown 格式，提升用户编辑体验和数据表达能力。

**Why**: 当前 `title`（如"家常版"）和 `content`（详细做法）分离，用户需要填两个字段，且 `content` 仅支持纯文本。合并后用户可以用 Markdown 自由组织内容（如 `# 家常版` 作为标题，后续列表/段落作为步骤），降低输入负担，提升可读性。

## What I Already Know

### Current Data Structure

**Prisma Schema** (`backend/prisma/schema.prisma:155-169`):
```prisma
model Recipe {
  id          String    @id @default(cuid())
  workspaceId String
  dishId      String
  title       String    // ← 要合并
  content     String    // ← 要合并
  workspace   Workspace @relation(...)
  dish        Dish      @relation(...)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Backend DTOs**:
- `CreateRecipeDto`: `title` (required), `content` (required)
- `UpdateRecipeDto`: `title` (optional), `content` (optional)
- Service: `RecipesService` 在创建/更新时对两个字段分别 trim 并验证

**Frontend**:
- `frontend/src/api/types.ts`: `Recipe` interface 有 `title: string` 和 `content: string`
- `frontend/src/components/recipe-panel.tsx`: 表单分别输入 `title` 和 `content`，展示时分离显示
- 已设计新 UI 原型（`frontend/recipe-redesign-preview.tsx`）：使用 Markdown，左右分栏编辑/预览

### Existing Patterns

- 项目前端使用 **Tailwind** 样式，组件遵循 Modal 模式（参考 `.trellis/spec/frontend/frontend/component-guidelines.md`）
- 后端使用 **NestJS + Prisma + PostgreSQL**
- 前端使用 **React Query** 管理 server-state

## Assumptions (to Validate)

1. **Migration Strategy**: 需要一次性迁移所有已有数据（格式：`# {title}\n\n{content}`）
2. **Markdown Rendering**: 前端需要真实的 Markdown 渲染库（如 `react-markdown` 或 `marked`），不只是简单解析
3. **Backward Compatibility**: 是否需要支持旧客户端？还是可以一次性前后端同步部署？
4. **Validation**: `instructions` 字段最小长度/最大长度限制？

## Decisions

### ✅ Field Name: `instructions`

使用 `instructions` 作为新字段名，理由：
- 烹饪领域常用术语，语义清晰
- 与食谱上下文契合
- 不与现有字段冲突

### ✅ Migration Strategy: 直接替换（一步到位）

**方案**：
1. 添加 `instructions` 字段（非空）
2. 数据迁移：将所有 Recipe 按 `# {title}\n\n{content}` 格式迁移到 `instructions`
3. 删除 `title` 和 `content` 字段
4. 前后端同步部署

**保障措施**：
- 迁移前备份数据库
- 迁移脚本幂等（可重复执行）
- 测试环境先验证

**理由**：小团队，可控部署窗口，避免双写复杂度

### ✅ Markdown Library: `react-markdown`

使用已安装的 `react-markdown@10.1.0`，理由：
- 零迁移成本（项目已在 `inline-variant-panel.tsx` 中使用）
- 安全性好（AST 渲染，无 XSS 风险）
- 已有 Tailwind 样式集成模式（component overrides）
- 34 KB gzipped 对食谱应用可接受

**参考实现**：`frontend/src/components/inline-variant-panel.tsx`

### ✅ Frontend Layout: 双栏编辑/预览布局

采用设计原型（`frontend/recipe-redesign-preview.tsx`）的双栏布局：
- 左侧：Markdown textarea 编辑器
- 右侧：实时渲染预览
- 提示用户 `# 标题` 语法

**理由**：
- 所见即所得，降低 Markdown 学习成本
- 提升用户体验
- Modal `size="lg"` 提供足够空间
- 响应式处理简单（移动端竖向排列）

**设计参考**：`frontend/recipe-redesign-preview.tsx`（Cookbook Editorial 风格）

### ✅ Validation Rules: 宽松验证

**`instructions` 字段验证规则**：
- **最小长度**：无（只要 trim 后非空即可）
  - 理由：用户可能只想写简短笔记（如"简单炒一下"）
- **最大长度**：10,000 字符
  - 理由：防止超大文本，正常食谱 500-2000 字符已足够，10K 覆盖极详细场景
- **其他**：
  - ✅ Trim 空白字符
  - ✅ 不强制 Markdown 格式
  - ❌ 不限制特殊字符

**验证点**：
- 后端 DTO：`@IsString()`, `@IsNotEmpty()`, `@MaxLength(10000)`
- 前端 Zod：`z.string().trim().min(1, "请输入做法").max(10000, "做法不能超过 10000 字符")`

## Expansion Decisions

基于未来演进和边界情况的思考：

### Future Evolution
- ✅ **做法分享**：支持导入/导出 Recipe（Markdown 格式）
- ✅ **图片支持**：`instructions` 中支持 Markdown 图片语法 `![alt](url)`
- ❌ **多版本做法**：暂不考虑"默认做法"标记（未来再议）

### Related Scenarios
- ✅ **MealRecord.note**：可以支持 Markdown（但本次仅实现 Recipe，MealRecord 留待后续）
- ❌ **DishVariant.description**：保持纯文本（简单描述不需要 Markdown）
- ✅ **数据导出**：保留 Markdown 格式

### Edge Cases
- ✅ **迁移保护**：事务保护，空字符串处理
- ✅ **安全性**：react-markdown 已禁用 script/iframe 等危险标签
- ❌ **并发编辑**：暂不考虑（保持现有行为：最后写入胜出）

## Requirements (Final)

### Functional Requirements

**Backend**:
- [ ] 数据库 Schema 更新：
  - 添加 `Recipe.instructions: String` 字段（非空，最大 10000 字符）
  - 删除 `Recipe.title` 和 `Recipe.content` 字段
- [ ] 数据迁移脚本：
  - 将所有 Recipe 按 `# {title}\n\n{content}` 格式迁移到 `instructions`
  - 处理 title 或 content 为空的边界情况（空字符串 → 占位符）
  - 使用事务保护（全部成功或全部回滚）
  - 幂等性（可重复执行）
- [ ] 后端 API 更新：
  - `CreateRecipeDto`: 改为 `instructions: string`（验证：非空，trim，最大 10000）
  - `UpdateRecipeDto`: 改为 `instructions?: string`（可选，验证同上）
  - `RecipesService`: 更新 create/update 逻辑

**Frontend**:
- [ ] 类型更新：
  - `frontend/src/api/types.ts`: `Recipe.instructions: string`（移除 title/content）
  - `CreateRecipeRequest`/`UpdateRecipeRequest`: 同步调整
- [ ] UI 更新（基于 `recipe-redesign-preview.tsx` 设计原型）：
  - `RecipePanel`: 双栏布局（编辑器 | 预览）
  - `RecipeForm`: 
    - 单一 `instructions` textarea（Markdown 编辑）
    - 实时预览区（右侧，使用 `react-markdown` 渲染）
    - Placeholder 提示 `# 标题` 语法
  - `RecipeCard`: 
    - 使用 `react-markdown` 渲染 `instructions`
    - 解析第一行 `# 标题` 作为卡片标题（参考设计原型）
    - 支持 Markdown 图片渲染
- [ ] Hooks 更新：
  - `useCreateRecipe`/`useUpdateRecipe`: 使用 `instructions` 字段

**Support for Images**:
- [ ] Markdown 图片语法 `![](url)` 自动渲染（react-markdown 原生支持）
- [ ] 暂不实现图片上传 UI（用户需手动输入图片 URL，或复用 DishImage 的 fileUrl）

**Data Export/Import** (本次不实现，仅设计预留):
- 记录到 Out of Scope，未来支持导出单个或批量 Recipe 为 `.md` 文件

### Non-Functional Requirements

- [ ] 迁移脚本事务保护（PostgreSQL transaction）
- [ ] 迁移脚本错误日志（记录失败的 Recipe ID）
- [ ] 前后端同步部署（避免类型不匹配）
- [ ] 安全性：react-markdown 禁用危险标签（已有配置，参考 inline-variant-panel.tsx）

## Acceptance Criteria

- [ ] 数据库迁移成功，所有 Recipe 数据完整迁移到 `instructions`
- [ ] 迁移脚本可重复执行（幂等）
- [ ] 前端可创建新 Recipe，支持 Markdown 输入（双栏编辑/预览）
- [ ] 前端可编辑已有 Recipe，保留 Markdown 格式
- [ ] 前端展示 Recipe 时正确渲染 Markdown（标题、列表、段落、粗体、斜体、图片）
- [ ] 后端类型检查通过（`pnpm backend:typecheck`）
- [ ] 前端类型检查通过（`pnpm frontend:typecheck`）
- [ ] 前端构建成功（`pnpm frontend:build`）
- [ ] 手动测试：创建/编辑/查看 Recipe，包含 Markdown 图片语法

## Out of Scope (Explicit)

- **Rich Text Editor**（Notion-like 块编辑器）：仅 Markdown textarea
- **Markdown 高级特性**（表格、Mermaid 图表、LaTeX）：首版仅支持基础语法
- **Recipe Versioning**：不记录历史版本
- **Recipe 导入/导出功能**：设计考虑兼容性，但本次不实现 UI
- **MealRecord.note Markdown 支持**：留待后续任务
- **图片上传 UI**：用户需手动输入图片 URL（可复用 DishImage 的 fileUrl）
- **并发编辑冲突处理**：保持现有行为（最后写入胜出）
- **多版本做法管理**：不实现"默认做法"标记

## Definition of Done

- Tests added/updated (unit/integration where appropriate)
- Lint / typecheck / CI green
- Docs/notes updated if behavior changes
- Rollout/rollback considered if risky
- Migration script tested in staging environment
- Database backup before production migration

## Technical Notes
   - 最小长度？（如 10 字符）
   - 最大长度？（防止超大文本）
   - 是否强制要求 Markdown 格式标题？

## Requirements (Evolving)

### Functional Requirements

- [ ] 数据库 Schema 更新：将 `Recipe.title` + `Recipe.content` → `Recipe.instructions`
- [ ] 数据迁移：所有已有 Recipe 按 `# {title}\n\n{content}` 格式迁移到 `instructions`
- [ ] 后端 API 更新：
  - `CreateRecipeDto`: 改为 `instructions` 字段
  - `UpdateRecipeDto`: 改为 `instructions` 字段
  - `RecipesService`: 验证 `instructions` 非空、trim
- [ ] 前端类型更新：`Recipe` interface 改为 `instructions: string`
- [ ] 前端 UI 更新：
  - 表单：单一 `instructions` 输入（textarea 或 Markdown 编辑器）
  - 展示：Markdown 渲染（标题/正文分离显示或完整渲染）

### Non-Functional Requirements

- [ ] 迁移脚本需幂等（可重复执行）
- [ ] 前后端同步部署（避免类型不匹配）
- [ ] 保持 API 响应格式向后兼容（或明确 breaking change）

## Acceptance Criteria

- [ ] 数据库迁移成功，所有已有 Recipe 数据无丢失
- [ ] 前端可创建/编辑 Recipe，`instructions` 支持 Markdown 格式
- [ ] 前端展示时能正确解析 Markdown（至少支持标题、列表、段落）
- [ ] 后端类型检查通过（`pnpm backend:typecheck`）
- [ ] 前端类型检查通过（`pnpm frontend:typecheck`）
- [ ] 前端构建成功（`pnpm frontend:build`）
- [ ] 手动测试：创建/编辑/查看 Recipe 功能正常

## Definition of Done

- Tests added/updated (unit/integration where appropriate)
- Lint / typecheck / CI green
- Docs/notes updated if behavior changes
- Rollout/rollback considered if risky

## Out of Scope (Explicit)

- **Rich Text Editor**（如 Notion-like 块编辑器）：本次仅支持 Markdown textarea + 预览
- **Markdown 高级特性**（表格、Mermaid 图表等）：首版仅支持标题、列表、段落、粗体/斜体
- **Recipe Versioning**：不记录 Recipe 历史版本
- **多语言 Markdown**：不针对 i18n 做特殊处理

## Technical Notes

### Files Inspected

- `backend/prisma/schema.prisma` (Recipe model)
- `backend/src/recipes/recipes.service.ts` (create/update logic)
- `backend/src/recipes/dto/*.ts` (DTOs)
- `frontend/src/api/types.ts` (Recipe interface)
- `frontend/src/components/recipe-panel.tsx` (current UI)
- `frontend/src/components/inline-variant-panel.tsx` (react-markdown 使用案例)
- `frontend/recipe-redesign-preview.tsx` (design prototype)

### Constraints

- **Database**: PostgreSQL (Prisma ORM)
- **Backend**: NestJS, class-validator for DTO validation
- **Frontend**: Vite + React + React Query + Tailwind
- **Markdown**: react-markdown@10.1.0 (已安装)
- **No breaking change appetite**: 需要协调前后端部署

### Design References

- 设计原型：`frontend/recipe-redesign-preview.tsx`
  - 双栏布局（编辑器 | 预览）
  - Cookbook Editorial 风格（Playfair Display / Literata 字体，amber/orange 渐变）
- Markdown 集成参考：`frontend/src/components/inline-variant-panel.tsx`
  - react-markdown 配置
  - 安全设置（禁用 script/iframe）
  - Tailwind 样式覆盖

### Implementation Plan

**Phase 1: Backend Schema & Migration**
1. Prisma schema 更新（添加 `instructions`，删除 `title`/`content`）
2. 生成迁移文件
3. 编写数据迁移脚本（Prisma migration 自定义 SQL 或独立脚本）
4. 测试环境验证

**Phase 2: Backend API**
1. 更新 DTOs（CreateRecipeDto, UpdateRecipeDto）
2. 更新 RecipesService 逻辑
3. 类型检查

**Phase 3: Frontend Types**
1. 更新 `api/types.ts`（Recipe, CreateRecipeRequest, UpdateRecipeRequest）
2. 类型检查

**Phase 4: Frontend UI**
1. 重构 `recipe-panel.tsx`（基于设计原型）
2. 双栏布局（grid, 响应式）
3. Markdown 编辑器 + 实时预览
4. react-markdown 集成（复用 inline-variant-panel 配置）
5. 样式调整（Cookbook Editorial 风格）

**Phase 5: Testing & Verification**
1. 手动测试（创建、编辑、查看 Recipe）
2. 测试 Markdown 渲染（标题、列表、图片）
3. 前后端构建验证

**Phase 6: Deployment**
1. 备份生产数据库
2. 前后端同步部署
3. 执行数据迁移
4. 验证生产环境
