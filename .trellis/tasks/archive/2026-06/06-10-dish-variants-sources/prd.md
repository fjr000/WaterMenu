# 菜品版本来源管理

## Goal

让 WaterMenu 能表达“同一个菜品的不同来源、门店或做法版本”，例如“番茄炒蛋 / 外卖店1 / 外卖店2 / 做法1 / 做法2 / 到店”，并让用餐记录、反馈可以细分到具体版本，同时保留推荐只推荐主菜品、历史按主菜品聚合查看的能力。

## What I already know

* 当前 `Dish` 在同一 workspace 下按 `name` 唯一，不能创建同名菜品。
* 当前 `Recipe` 挂在 `Dish` 下，已经支持一个菜品有多条做法记录。
* 当前 `MealRecord` 只可选关联 `dishId`，记录标题直接使用菜品名，无法结构化记录“外卖店1 / 到店 / 做法2”。
* 当前推荐逻辑按 `Dish` 聚合历史和反馈，无法区分同一菜品下不同版本的好坏；用户明确推荐结果仍只推荐主菜品，不直接推荐具体版本。
* 用户希望支持类似“番茄炒蛋 外卖店1 / 外卖店2 / 做法1 / 做法2 / 到店”的表达。

## Assumptions (temporary)

* 不直接放开同名 `Dish`，而是在 `Dish` 下新增“版本/来源”层，避免菜品列表重复膨胀。
* “做法1 / 做法2”和“外卖店1 / 外卖店2 / 到店”统一作为同一种 `DishVariant` 处理，通过类型字段区分。
* MVP 先做 workspace 级共享版本，不做个人私有版本。
* 用餐记录可选关联具体版本；没有选择版本时仍兼容现有 `dishId` 记录。

## Decisions

* 统一新增 `DishVariant` 作为菜品版本/来源模型，不直接放开同名 `Dish`。
* `DishVariant` 使用类型字段区分 `HOME_RECIPE`、`TAKEOUT`、`DINE_IN`、`OTHER` 等来源。
* 创建用餐记录时版本可选；允许只记录主菜品，老数据不需要补版本。
* 推荐和盲盒只返回主菜品候选，不直接返回具体版本；用户在记录已吃时再选择具体版本。
* MVP 不重写推荐候选粒度；版本记录仍保存 `dishId`，版本反馈会通过现有主菜品评分逻辑自然参与推荐。
* 菜品版本/来源维护入口放在菜品列表中，每个菜品卡片新增“版本”按钮，打开“版本 / 来源”面板。
* MVP 菜品列表只新增“版本”入口，不在卡片上展示版本摘要；打开面板后按需加载该菜品版本。
* 本期 `DishVariant` 不绑定现有 `Recipe`；`HOME_RECIPE` 版本只作为可记录、可推荐、可反馈的版本标签，`Recipe` 继续负责正文做法。
* MVP 版本只支持启用/停用，不提供删除；停用版本保留历史展示，但不进入新增记录选择和推荐候选。
* 同一 `Dish` 下版本名唯一，不把类型纳入唯一性；不同菜品可以使用相同版本名。
* MVP 版本继承主菜品 `mealTypes`，不单独配置餐次。
* 版本改名后历史记录展示当前版本名，不做版本名快照。
* 创建具体版本用餐记录时同时保存 `dishId` 与 `variantId`，后端校验版本属于该菜品和当前 workspace。
* 版本列表和创建使用 `GET/POST /api/dishes/:dishId/variants`，版本更新使用 `PATCH /api/dish-variants/:id`。

## Open Questions

* 暂无阻塞问题。

## Requirements (evolving)

* 用户可以在一个菜品下维护多个版本/来源。
* 用户可以启用或停用版本；MVP 不提供删除版本能力。
* 用户可以从菜品卡片进入该菜品的“版本 / 来源”管理面板。
* 版本详情在打开管理面板时按菜品加载，菜品列表不强制展示版本数量或摘要。
* 版本 API 挂在菜品下按需加载；不提供全 workspace 版本列表。
* 版本至少包含名称，例如“外卖店1”“做法1”“到店-某餐馆”。
* 同一菜品下不能创建两个同名版本。
* 版本应可分类，例如自家做法、外卖、到店、其他。
* 版本不单独设置餐次，新增记录和推荐筛选沿用主菜品餐次。
* 做法版本和外卖/到店来源统一走同一个版本模型。
* `HOME_RECIPE` 类型版本不要求关联 `Recipe`；用户可自行用相同标题维护版本标签和菜谱正文。
* 记录已吃时可以选择具体版本/来源。
* 记录具体版本时请求需包含匹配的 `dishId` 与 `variantId`；只记录主菜品时 `variantId` 为空；手动记录时二者都为空。
* 历史记录应展示主菜品名和版本名。
* 历史记录的版本名来自当前 `DishVariant.name`，不是记录创建时的快照。
* 反馈应仍挂在用餐记录上，因此可以自然反映具体版本的评价。
* 推荐结果和盲盒结果只展示主菜品，例如“番茄炒蛋”；具体版本在记录已吃时选择。
* MVP 阶段版本级反馈会通过 `dishId` 自然参与主菜品推荐评分；后续如需避免单个坏版本影响主菜品，可再独立设计推荐聚合策略。
* 停用版本不再出现在新增用餐记录选择中，但历史记录仍能显示它的名称；推荐候选仍由主菜品是否启用决定。
* 新增用餐记录不能选择不属于当前菜品、跨 workspace 或已停用的版本。
* 保持现有未选择版本的记录兼容。

## Acceptance Criteria (evolving)

* [ ] 同一 workspace 内，一个 `Dish` 可以拥有多个版本/来源。
* [ ] 版本可以停用，停用后不影响已有历史记录展示。
* [ ] 同一菜品下重复版本名应返回冲突错误。
* [ ] 菜品列表中可以打开某个菜品的版本/来源管理面板。
* [ ] 创建用餐记录时，可以选择该菜品下的某个版本/来源。
* [ ] 历史记录能显示“番茄炒蛋 · 外卖店1”这类信息。
* [ ] 推荐和盲盒只返回主菜品，不直接返回具体版本。
* [ ] 不同 workspace 的版本数据互相隔离。
* [ ] 老数据无需迁移选择版本，现有 `dishId` 记录继续可用。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 不做公开餐馆数据库。
* 不做地图、地址、营业时间等门店详情。
* 不做外卖平台集成。
* 不做 AI 自动识别菜品版本。
* 不做个人私有偏好系统，先沿用 workspace 共享数据。
* 不做 `DishVariant` 与 `Recipe` 的强绑定或同步联动。

## Technical Notes

* `backend/prisma/schema.prisma`：`Dish` 当前有 `@@unique([workspaceId, name])`；`Recipe` 与 `MealRecord` 都直接挂 `Dish`。
* `backend/src/dishes/dishes.service.ts`：创建/更新菜品遇到唯一冲突会返回 `409 Conflict`。
* `backend/src/meal-records/meal-records.service.ts`：创建记录前只校验 `dishId` 属于 workspace。
* `backend/src/recipes/recipes.service.ts`：做法列表按 `dishId` 查询，说明一菜多做法已经存在。
* `frontend/src/components/meal-record-form.tsx`：记录已吃时只提交 `dishId` 和 `title: dish.name`。
* `frontend/src/components/recipe-panel.tsx`：做法是 `Dish` 下的多条记录，标题可表达“家常版”等。
* `frontend/src/api/types.ts`：前端类型暂无 `DishVariant` 或 `variantId`。
