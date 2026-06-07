# 前端 MVP 垂直切片

## Goal

实现 WaterMenu 第一版可用前端，让用户可以在手机浏览器中完成核心闭环：登录、查看与新增菜品、请求推荐、抽盲盒，并能基于现有后端 API 实际使用产品。

## What I already know

* 用户明确目标是“先让产品能被人用起来”。
* 项目定位是手机优先的菜单推荐与饮食记录 Web 应用。
* 前端已确认使用 React + Vite + TypeScript、Tailwind CSS、TanStack Query、React Hook Form + Zod、基础 PWA。
* MVP 不使用 Next.js、Redux、Zustand，也不承诺复杂离线能力。
* `frontend/` 当前只有 `.gitkeep`，尚无真实前端源码。
* 后端已实现 Session Cookie 登录、菜品 API、用餐记录 API、反馈 API、推荐 API、盲盒 API。
* 现有后端 API 入口使用 `/api` 前缀，登录态通过 Session Cookie 维持。
* 根 `pnpm-workspace.yaml` 已包含 `frontend` workspace。
* 根 `package.json` 当前只有后端脚本，还没有前端脚本。

## Assumptions (temporary)

* 本任务优先交付可用前端壳与核心推荐体验，不一次性实现全部 MVP 页面。
* 本任务优先接入现有后端 API，不新增后端接口。
* 本任务允许为 `frontend/` 初始化 Vite React 项目所需的最少配置文件。
* 本任务中 PWA 只做基础 manifest 与图标/主题色配置，不做复杂离线同步。

## Open Questions

* 无。

## Requirements (evolving)

* 初始化 `frontend/` 为 React + Vite + TypeScript 应用。
* 接入 Tailwind CSS。
* 接入 TanStack Query 管理服务端数据。
* 使用 React Hook Form + Zod 处理登录与新增菜品表单校验。
* 登录态通过 Cookie 维持，前端不保存 JWT。
* 未登录时显示登录页。
* 登录后显示手机优先的主页面。
* 第一版前端范围确认只做“登录 + 菜品 + 推荐/盲盒”。
* 第一版暂不做用餐记录、反馈、食谱、图片上传等页面。
* 主页面至少包含推荐 / 盲盒入口。
* 主页面可以查看菜品列表。
* 主页面可以新增菜品。
* API 返回 401 时回到登录状态或提示重新登录。
* 推荐候选为空时显示可解释空状态。
* 网络请求加载中和失败时有明确 UI 状态。

## Acceptance Criteria (evolving)

* [ ] `frontend/` 可以通过 pnpm 安装和启动开发服务器。
* [ ] 前端 typecheck 通过。
* [ ] 用户可以在登录页提交账号密码并进入主页面。
* [ ] 用户可以退出登录。
* [ ] 登录后可以看到当前用户基础信息。
* [ ] 登录后可以查看当前 workspace 的菜品列表。
* [ ] 登录后可以新增菜品，新增成功后列表刷新。
* [ ] 登录后可以按餐次请求推荐，并看到推荐理由。
* [ ] 登录后可以抽盲盒，并看到抽中的菜和理由。
* [ ] 未登录或 session 过期时不会停留在破损页面。
* [ ] 手机宽度下核心操作不需要横向滚动。

## Definition of Done

* 前端源码、配置和脚本已落地到 `frontend/`。
* 根脚本按需补充前端 dev/build/typecheck 命令。
* `pnpm --filter @watermenu/frontend typecheck` 通过。
* `pnpm --filter @watermenu/frontend build` 通过。
* 如产生新的前端约定，更新 `.trellis/spec/frontend/`。

## Out of Scope (explicit)

* 不实现开放注册、邀请码或用户管理。
* 不新增后端接口。
* 不实现图片上传。
* 不实现复杂离线新增、离线编辑或离线同步。
* 不引入 Redux / Zustand。
* 不实现复杂桌面管理后台。
* 不实现 E2E 自动化测试。
* 不实现 Recipe / 食谱页面，除非用户明确要求纳入第一版。
* 不实现用餐记录页面。
* 不实现反馈页面。

## Decision (ADR-lite)

**Context**: 用户目标是“先让产品能被人用起来”，现有后端已经具备登录、菜品、推荐与盲盒 API，前端目录仍为空。完整 MVP 还包含用餐记录、反馈和食谱，但一次性做完会推迟首个可用版本。

**Decision**: 第一版前端只实现登录、菜品列表 / 新增、推荐和盲盒；暂缓用餐记录、反馈、食谱和图片上传页面。

**Consequences**: 能最快验证核心推荐体验和移动端使用闭环；推荐权重仍依赖后端已有数据或后续补录，真实用餐反馈入口将在下一轮补齐。

## Technical Notes

* 项目定义：`docs/project-definition.md`。
* 前端技术契约：`.trellis/spec/frontend/technical-contracts.md`。
* 前端目录规范：`.trellis/spec/frontend/directory-structure.md`。
* 前端质量规范：`.trellis/spec/frontend/quality-guidelines.md`。
* 后端 API 模块：`backend/src/auth/`、`backend/src/dishes/`、`backend/src/recommendations/`。
* 后端已覆盖测试：`backend/test/auth.e2e-spec.ts`、`backend/test/dishes.e2e-spec.ts`、`backend/test/recommendations.e2e-spec.ts`。
