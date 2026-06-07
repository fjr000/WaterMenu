# 推荐与盲盒后端 API

## Goal

实现 WaterMenu MVP 的“今天吃什么”核心后端能力：基于当前 workspace 的菜品、用餐记录和反馈，提供规则推荐接口与带约束随机的盲盒接口，让现有登录、菜品、用餐记录、反馈 API 形成可验证闭环。

## What I Already Know

- 项目 MVP 明确包含登录、菜品管理、食谱/做法、用餐记录、反馈、规则推荐和盲盒。
- 当前后端已实现 Session Cookie 登录、菜品 API、用餐记录 API、反馈 API。
- 当前 Prisma 已有 `Workspace`、`User`、`Dish`、`MealRecord`、`Feedback`、`MealType`、`FeedbackRating`。
- 当前还没有 `Recipe`、`Recommendation` 模型，也没有推荐或盲盒 controller/service/module。
- 项目文档要求默认排除最近 3 天吃过的菜，候选不足时自动放宽近期限制。
- 推荐模式偏理性：按分数排序并展示推荐理由。
- 盲盒模式不是完全随机，而是先得到合理候选池，再按权重随机抽取。
- 候选池来自当前 workspace 的菜品；指定餐次时只选适配该餐次的菜品；未指定餐次时从全部菜品选择。
- 当前后端资源模式是 `module + controller + service + dto`，controller 使用 `AuthGuard` 并从 session 读取 `userId`，service 内查询 `workspaceId` 做数据隔离。

## Assumptions To Validate

- MVP 阶段不持久化推荐历史，不新增 `Recommendation` 表。
- MVP 阶段推荐和盲盒只返回菜品，不把未关联菜品的文本用餐记录纳入推荐权重。
- MVP 阶段仅返回可直接用于前端展示的推荐理由，不实现复杂解释系统。

## Requirements

- 新增受登录保护的推荐接口 `POST /api/recommendations`。
- 新增受登录保护的盲盒接口 `POST /api/blind-box`。
- 两个接口都支持可选 `mealType` 筛选。
- 候选池只包含当前用户 workspace 内 `isActive = true` 的菜品。
- 指定 `mealType` 时，候选池只包含 `mealTypes` 包含该餐次的菜品。
- 默认排除最近 3 天内有关联菜品的用餐记录对应菜品。
- 如果排除最近 3 天后没有候选，应自动放宽近期限制并从原始候选池继续推荐。
- 好吃反馈提高权重，一般反馈保持中性，不好吃反馈降低权重但不完全排除。
- 评分规则采用简单加权公式：基础分 `100`；每条 `GOOD` 反馈 `+20`；每条 `OK` 反馈 `+0`；每条 `BAD` 反馈 `-15`；最低权重不低于 `10`。
- 推荐接口按分数降序返回前 5 个候选，并包含推荐理由。
- 盲盒接口基于同一评分/权重规则随机返回一个候选，并包含推荐理由。
- 所有查询必须限制在当前 workspace 内。
- 未登录访问返回现有认证错误行为。

## Open Questions


## Acceptance Criteria

- [ ] 未登录调用推荐或盲盒接口会被 `AuthGuard` 拦截。
- [ ] 推荐接口只返回当前 workspace 的启用菜品。
- [ ] 指定餐次时，推荐和盲盒只考虑适配该餐次的菜品。
- [ ] 最近 3 天吃过的关联菜品默认不出现在候选中。
- [ ] 候选不足时会放宽最近 3 天限制，而不是直接失败。
- [ ] 好吃反馈让菜品排序/抽中权重上升。
- [ ] 不好吃反馈降低权重但不会完全排除菜品。
- [ ] 推荐结果最多返回 5 个候选，并包含可解释的 reasons。
- [ ] 盲盒结果返回单个 dish 与 reasons。
- [ ] 补充后端 e2e 测试覆盖推荐规则和反馈权重。

## Definition of Done

- 后端实现新增模块、DTO、controller、service，并接入 `AppModule`。
- 后端 e2e 测试新增或更新。
- `pnpm --dir backend lint` 通过。
- `pnpm --dir backend typecheck` 通过。
- `pnpm --dir backend test` 通过。
- 如产生新的后端约定，更新 `.trellis/spec/backend/`。

## Technical Approach

- 采用独立 `recommendations` 模块，内部提供推荐与盲盒两个 controller route。
- 不新增数据库表，直接基于 `Dish`、`MealRecord`、`Feedback` 即时计算。
- 使用 DTO 校验请求体中的可选 `mealType`。
- 复用当前 service 内 `getWorkspaceId(userId)` 模式做 workspace 隔离。
- 用确定性评分服务生成候选列表，盲盒在候选分数/权重上做随机抽取。
- 推荐理由只展示命中的事实，例如适配餐次、最近 3 天没吃过、之前反馈好吃、之前反馈不好吃较少推荐。

## Decision (ADR-lite)

**Context**: MVP 需要尽快验证“今天吃什么”闭环，但项目文档允许 Recommendation 是否持久化按需决定。  
**Decision**: 第一版不持久化推荐历史，不新增 `Recommendation` 表；用现有数据即时计算推荐结果。  
**Consequences**: 实现更小、迁移更少、测试更直接；后续如果需要展示推荐历史或分析点击转化，再补 `Recommendation` 模型和持久化。

## Out of Scope

- 不实现食谱/做法 API。
- 不实现图片上传或图片推荐展示。
- 不实现 AI 或机器学习推荐。
- 不新增 Python 服务。
- 不持久化推荐历史。
- 不实现前端页面。
- 不实现 Docker/Nginx 部署配置。

## Technical Notes

- 项目定义：`docs/project-definition.md`
- Prisma schema：`backend/prisma/schema.prisma`
- 现有菜品模式：`backend/src/dishes/`
- 现有用餐记录模式：`backend/src/meal-records/`
- 现有反馈模式：`backend/src/feedback/`
- 现有测试：`backend/test/auth.e2e-spec.ts`、`backend/test/dishes.e2e-spec.ts`、`backend/test/meal-records-feedback.e2e-spec.ts`
- 后端命令见 `backend/package.json`：`lint`、`typecheck`、`test`
