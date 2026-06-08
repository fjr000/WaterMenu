# 菜品图片上传与封面展示

## Goal

在现有 WaterMenu MVP 闭环之上，为菜品增加图片上传与封面展示能力，让手机端推荐、盲盒和菜品管理更直观；同时控制文件存储、权限、备份和未来对象存储迁移风险。

## What I already know

* 用户在下一步候选中选择了 **3：菜品图片上传与封面展示**。
* 项目定位是手机优先的菜单推荐与饮食记录 Web 应用。
* 当前已具备登录、workspace 隔离、菜品管理、食谱 / 做法、用餐记录、反馈、推荐和盲盒。
* 当前生产部署资产已经存在：`docker-compose.prod.yml`、`backend/Dockerfile`、`frontend/Dockerfile`、`deploy/README.md`、Nginx 配置、生产 env 模板、PostgreSQL 备份 / 恢复脚本。
* 项目定义已确认图片策略：PostgreSQL 不存图片本体，MVP 图片文件存后端本地 `uploads/`，数据库存路径、元数据和关联关系。
* 项目定义建议图片关系为 `Dish 1:N DishImage`，字段包括 `workspaceId`、`dishId`、`storageKey/path`、`mimeType`、`size`、`width`、`height`、`sortOrder`、`isCover`、`createdAt`。
* 当前 Prisma schema 只有 `Dish`，还没有 `DishImage`。
* 当前后端 `dishes` API 返回 `Dish` 本体，没有图片字段。
* 当前前端 `Dish` 类型、推荐候选、菜品卡片、推荐卡片均没有图片展示。
* 当前生产 Compose 已预留 `./deploy/uploads -> /app/uploads`，但尚未实现图片上传 API 或静态文件访问。

## Constraints

* 使用中文沟通与文档内容。
* 最小实现、复用优先，不做无关重构。
* 必须保持 workspace 隔离：用户不能上传、读取、替换或删除其他 workspace 的菜品图片。
* 图片文件不能直接存 PostgreSQL。
* 上传能力必须限制文件类型和大小，不能接受任意文件。
* MVP 继续使用后端本地 `uploads/`，不引入 S3 / R2 / OSS / MinIO。
* 如果进入实现，需要先读取后端、前端、共享思考指南中的相关具体规范，再按 Trellis Phase 1.3 配置 `implement.jsonl` / `check.jsonl`。

## Requirements

### 数据模型

* 新增 `DishImage` 模型，维持 `Dish 1:N DishImage` 关系。
* `DishImage` 至少包含：`id`、`workspaceId`、`dishId`、`storageKey` 或 `path`、`mimeType`、`size`、`width`、`height`、`sortOrder`、`isCover`、`createdAt`、`updatedAt`。
* `DishImage.workspaceId` 必须关联 `Workspace`，`DishImage.dishId` 必须关联 `Dish`。
* 一个菜品最多允许 9 张图片。
* 同一道菜最多只能有一张封面图；封面唯一性可由 service 事务逻辑保证。
* 不做手动排序；固定顺序展示。可保留 `sortOrder` 字段给未来使用。

### 后端 API

* 新增单文件上传接口：`POST /api/dishes/:dishId/images`，`multipart/form-data` 字段名为 `file`。
* 新增图库列表接口：`GET /api/dishes/:dishId/images`。
* 新增设置封面接口：`PATCH /api/dish-images/:id/cover`。
* 新增删除图片接口：`DELETE /api/dish-images/:id`。
* 新增受保护文件读取接口：`GET /api/dish-images/:id/file`。
* 所有图片 API 必须要求登录态，并按当前用户 workspace 过滤。
* 读取图片文件前必须校验图片记录属于当前 workspace；不能公开整个 uploads 目录。
* 上传只允许 JPEG / PNG / WebP，单文件最大 5MB。
* 允许新增轻量依赖读取图片 `width` / `height`，并保存到数据库。
* 读取尺寸失败或实际图片格式不符合限制时，应拒绝请求并清理已落盘文件。
* 删除图片时必须同时删除数据库记录与本地文件。
* 删除封面后，如果该菜品还有剩余图片，自动把最早的一张剩余图片设为封面。
* `GET /api/dishes`、`GET /api/dishes/:id`、推荐结果、盲盒结果中的 Dish 数据需要包含 `coverImage`，供前端展示封面。

### 前端

* `frontend/src/api/types.ts` 增加 `DishImage` 与 `Dish.coverImage` 类型。
* 新增图片相关 hooks，API 调用集中在 hook 中，组件不直接调用 `apiFetch`。
* 菜品管理中的每个菜品提供图库管理入口。
* 图库管理第一版支持：查看图片列表、上传单张图片、设置封面、删除图片。
* 推荐 / 盲盒只展示封面图，不提供图库管理入口。
* 没有封面时保留现有纯文本卡片体验或展示轻量占位，不阻断现有操作。

### 文档 / 契约

* 更新部署或技术契约，记录 uploads 图片生命周期和备份注意事项。
* 明确图片本体不进入 PostgreSQL，数据库只保存路径与元数据。

## Success Criteria

* 用户能在菜品管理中给菜品上传多张图片。
* 用户能在菜品管理中查看图片列表、设置封面、删除图片。
* 菜品列表、推荐结果、盲盒结果能展示菜品封面。
* 图片文件存储在后端 uploads 目录，数据库只保存元数据和访问路径。
* 上传接口有登录态、workspace、文件类型、大小限制。
* 后端返回的 Dish 数据包含可供前端展示的 `coverImage`。
* 图片读取接口不能跨 workspace 访问。
* 删除图片会删除本地文件；删除封面后自动补选新封面。
* 不破坏现有菜品、推荐、盲盒、用餐记录、食谱功能。
* 部署文档或技术契约记录 uploads 数据生命周期和备份注意事项。

## Current Assessment

### 已具备基础

* 后端已有 `dishes` 模块与 workspace 隔离模式，可复用当前 `session.userId -> workspaceId -> id + workspaceId` 查询模式。
* 前端已有统一 `DishCard`、`CandidateCard` / 推荐面板入口，可在少数卡片中加封面展示。
* 生产 Compose 已挂载 uploads 目录，为本地文件存储提供部署基础。
* 项目定义已给出图片不入库、本地 uploads、未来对象存储的方向。

### 主要风险

* 文件权限风险：必须避免通过 URL 读取其他 workspace 的图片。
* 文件生命周期风险：替换 / 删除封面时，旧文件是否删除需要明确，否则容易堆积孤儿文件。
* 备份风险：图片一旦进入真实使用，uploads 必须和数据库一起备份；只备份数据库会造成图片丢失。
* 实现范围风险：如果一开始做多图图库、排序、裁剪、压缩，会迅速超过 MVP。
* 静态访问风险：如果直接把整个 uploads 目录公开为静态资源，workspace 隔离会弱化；需要设计可接受的访问边界。

## Candidate Scope Options

### A. 单张封面图 MVP（推荐）

* 后端增加 `DishImage` 模型，但第一版 UI 只支持每个菜品一张封面图。
* API 支持上传 / 替换封面，并在 Dish 响应中返回 `coverImage`。
* 替换封面时删除旧封面记录与旧文件，减少孤儿文件。
* 前端只在菜品管理、推荐结果、盲盒结果展示封面。
* 不做多图列表、排序、拖拽、裁剪、批量上传。

优点：满足最强体验痛点，复杂度可控，并保留未来多图扩展模型。  
缺点：用户暂时不能给一道菜保存多张图片。

### B. 多图图库第一版

* 后端完整支持一个 Dish 多张图片、封面切换、排序、删除。
* 前端提供图片列表和管理入口。

优点：贴合 `Dish 1:N DishImage` 完整模型。  
缺点：UI、API、排序、文件删除和边界状态显著增加，不适合最小下一步。

### C. 只在 Dish 上存 `imagePath`

* 不建 `DishImage` 表，只给 `Dish` 加 `imagePath` / `imageUrl`。

优点：实现最短。  
缺点：违背已定义的 `Dish 1:N DishImage` 扩展方向，未来迁移多图时要重构数据模型。

## Selected Direction

用户已选择 **B. 多图图库第一版**。

这意味着本轮不只做单张封面，而是需要让一个菜品拥有多张图片，并提供基础图库管理能力。为避免范围失控，多图图库仍应定义为“第一版”：只做上传、列表展示、设置封面、删除和必要排序语义；不做裁剪、滤镜、批量编辑、AI 识别或对象存储。

## Decision (ADR-lite)

**Context**：图片能力会显著改善手机端菜品识别和推荐体验；项目定义已明确 `Dish 1:N DishImage`，且生产 Compose 已预留 uploads 持久化目录。

**Decision**：本任务采用完整 `DishImage` 多图模型，并在 UI 暴露多图图库第一版，而不是只做单张封面或 `Dish.imagePath`。

**Consequences**：需要额外处理图片列表、封面唯一性、删除语义、排序或展示顺序、文件生命周期和权限访问；实现复杂度明显高于单张封面 MVP，但能避免后续从单图迁移到多图的二次重构。

## Open Questions

* 已确认：多图图库第一版不做手动排序；按固定顺序展示，允许设置封面和删除。
* 已确认：图片访问采用受保护后端接口读取，例如 `GET /api/dish-images/:id/file`，读取时校验登录态和 workspace。
* 已确认：删除图片时同步删除数据库记录和本地文件；如果删除的是封面，自动把最早的一张剩余图片设为封面。
* 已确认：每道菜最多允许 9 张图片。
* 已确认：上传只允许 JPEG / PNG / WebP，单文件最大 5MB。
* 已确认：菜品管理提供图库管理；推荐 / 盲盒只展示封面图，不提供图库管理入口。
* 已确认：上传 API 只做单文件上传，例如 `POST /api/dishes/:dishId/images`，表单字段 `file`。
* 已确认：允许新增轻量依赖，在上传时读取图片 `width` / `height` 并保存到数据库。

## Acceptance Criteria

* [x] 完成项目现状梳理。
* [x] 用户选择下一步做菜品图片上传与封面展示。
* [x] 用户确认图片范围：选择多图图库第一版。
* [x] 明确排序语义：不做手动排序，固定顺序展示。
* [x] 明确图片访问方式：受保护后端接口读取图片文件。
* [x] 明确删除语义：删除记录和本地文件；删除封面后自动选择下一张封面。
* [x] 明确每道菜最多 9 张图片。
* [x] 明确上传文件类型和大小限制：JPEG / PNG / WebP，单文件最大 5MB。
* [x] 明确前端展示范围：菜品管理管理图库，推荐 / 盲盒只展示封面。
* [x] 明确上传 API：单文件上传。
* [x] 明确图片宽高元数据：允许新增轻量依赖读取并保存 `width` / `height`。
* [x] 用户最终确认完整需求。
* [x] 已配置 `implement.jsonl` / `check.jsonl`。
* [ ] 已运行 `task.py start` 进入实现阶段。

## Out of Scope

* 不引入对象存储。
* 不做 AI 识别菜品。
* 不做图片裁剪、滤镜、压缩编辑器。
* 不做手动排序、上移 / 下移或拖拽排序。
* 不做批量上传、批量编辑或 AI 识别。
* 不做公开菜谱分享。
* 不做历史记录浏览 / 搜索 / 筛选。
* 不做多人邀请 / 注册。

## Technical Notes

* 项目定义：`docs/project-definition.md`。
* 后端技术契约：`.trellis/spec/backend/technical-contracts.md`。
* 前端技术契约：`.trellis/spec/frontend/technical-contracts.md`。
* 当前 Prisma schema：`backend/prisma/schema.prisma`。
* 当前菜品后端：`backend/src/dishes/`。
* 当前前端 Dish 类型：`frontend/src/api/types.ts`。
* 当前菜品 Hook：`frontend/src/hooks/use-dishes.ts`。
* 当前首页卡片入口：`frontend/src/pages/home-page.tsx`。
* 当前生产 uploads 挂载：`docker-compose.prod.yml` 中 `./deploy/uploads:/app/uploads`。
* 图片尺寸依赖调研：`.trellis/tasks/06-08-next-step-assessment/research/image-dimensions.md`。
