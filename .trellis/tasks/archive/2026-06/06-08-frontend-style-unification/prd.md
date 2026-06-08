# 统一前端风格美化

## Goal

对 WaterMenu 前端进行统一风格美化，让登录页、首页、推荐、菜品管理、历史记录等界面形成一致、可辨识的视觉语言，同时保持现有功能与交互流程不变。

## What I already know

- 用户希望进行“前端风格美化，统一”。
- 当前前端位于 `frontend/`，技术栈为 React 19 + Vite 7 + TypeScript + Tailwind CSS 4。
- 当前 UI 主要使用 `slate` 色系、白底卡片、圆角、轻阴影，整体偏基础后台/表单风格。
- 通用 UI 组件集中在 `frontend/src/components/ui.tsx`，适合作为统一风格的主要入口。
- 页面入口包括：
  - `frontend/src/pages/login-page.tsx`
  - `frontend/src/pages/home-page.tsx`
- 样式入口为 `frontend/src/index.css`，当前设置了 `--font-sans: "Inter"`，这与 frontend-design 技能中“避免泛化字体”的要求冲突，应改成更有辨识度的字体方案。
- 现有依赖没有动画库或字体包；用户已选择不新增外部字体/资源，推荐使用 CSS/Tailwind 完成风格统一。

## Assumptions (temporary)

- 本任务优先做视觉统一，不改变后端 API、数据结构或核心业务逻辑。
- 优先保持移动端小屏体验，因为当前布局以 `max-w-lg` 单列移动端为主。
- 不引入大型 UI 组件库，复用现有组件和 Tailwind。
- 不引入在线字体或字体包，保证 PWA/弱网稳定性。

## Constraints

- 必须遵守现有 React + Tailwind CSS 4 结构。
- 必须复用现有组件，避免大规模重写。
- 必须保持功能路径：登录、推荐、盲盒、记录已吃、查看做法、图库、菜品编辑/启停用、历史筛选。
- 必须兼顾可访问性：对比度、按钮可点击区域、禁用态、焦点态不能变差。
- 需要避免通用 AI 风格：不能只做紫色渐变、玻璃白卡、模板化 hero。

## Open Questions

- 等待用户确认最终范围后进入实现。

## Requirements (evolving)

- 统一前端主视觉，包括背景、卡片、按钮、表单、标签、状态提示和页面层级。
- 登录页与主应用页应共享同一视觉系统。
- 采用“温暖厨房手账风”：米白/奶油底色、番茄红/橄榄绿/酱油棕点缀、纸张卡片、轻微纹理，整体像家庭菜谱本。
- 不新增在线字体、字体包或外部视觉资源；使用本地 CSS、Tailwind 和系统字体栈完成。
- 加入轻量 CSS 装饰与微动效，例如纸张纹理背景、卡片轻微浮起、按钮按压、登录页贴纸感、结果卡片轻微出现动画。
- 动效必须尊重 `prefers-reduced-motion`，不能影响可访问性或操作效率。
- 优先通过 `ui.tsx` 和 `index.css` 建立统一基础样式。
- 保持现有业务功能与数据流不变。

## Acceptance Criteria (evolving)

- [ ] 登录页和首页看起来属于同一个产品，而不是两套样式。
- [ ] 主要 UI 元素（按钮、次按钮、输入框、选择框、卡片、错误提示、空状态）有统一设计语言。
- [ ] 推荐、菜品管理、历史记录三个 tab 的视觉层级一致。
- [ ] 轻量装饰与动效增强手账感，但在 `prefers-reduced-motion` 下可降级。
- [ ] 移动端宽度下无明显溢出、遮挡或点击困难。
- [ ] `pnpm --filter @watermenu/frontend typecheck` 通过。
- [ ] `pnpm --filter @watermenu/frontend build` 通过。

## Definition of Done

- 前端类型检查通过。
- 前端构建通过。
- 如修改了跨组件样式约定，必要时更新相关 Trellis 前端规范。
- 不提交无关格式化或重构。

## Technical Approach (draft)

- 已确定视觉方向：温暖厨房手账风。
- 不新增外部字体/资源，使用本地 CSS 变量、系统字体栈与 Tailwind 原子类。
- 在 `frontend/src/index.css` 定义统一色彩、字体、背景、纹理、焦点态与基础动效。
- 在 `frontend/src/components/ui.tsx` 统一 Button、SecondaryButton、Input、Select、Card、PageHeader、EmptyState、Spinner、ErrorBanner 的风格。
- 对 `login-page.tsx`、`home-page.tsx` 和关键业务组件做少量类名调整，让页面结构配合统一视觉。

## Out of Scope (draft)

- 不改后端。
- 不改推荐算法、历史筛选逻辑或菜品管理业务逻辑。
- 不做完整设计系统文档站。
- 不引入大型 UI 库。
- 不做复杂插画、重型动画或改变信息架构。

## Research References

- [`research/frontend-design-analysis.md`](research/frontend-design-analysis.md) — 基于真实浏览器调试记录当前页面问题、设计方向、组件策略与风险。

## Technical Notes

- 已查看：
  - `frontend/package.json`
  - `frontend/index.html`
  - `frontend/src/index.css`
  - `frontend/src/components/ui.tsx`
  - `frontend/src/pages/login-page.tsx`
  - `frontend/src/pages/home-page.tsx`
  - `frontend/src/components/recommendation-panel.tsx`
  - `frontend/src/components/history-records-panel.tsx`
- 当前视觉问题：基础可用，但缺少 WaterMenu 自己的产品记忆点；大量 `slate` + 白卡 + Inter 组合偏通用。
- 用户已选择视觉方向 1：温暖厨房手账风。
- 用户已选择字体/资源方案 2：不新增外部资源，仅使用本地 CSS + 系统字体栈。
- 用户已选择动效/装饰方案 2：加入轻量 CSS 装饰与微动效。
- 用户已选择真实网页调试方案 2：启动后端 + 数据库，用 seed 账号登录后调试全流程；当前环境在 WSL 中，如 MCP 无法打开真实网页，可使用 Windows 下浏览器辅助验证。
- 已完成真实网页调试准备并登录 seed 账号：前端 `localhost:5173`、后端 `localhost:3000`、Postgres `watermenu-postgres`。
- 已在 375px 移动端视口观察登录、推荐、菜品管理、历史记录页面，并将分析写入 `research/frontend-design-analysis.md`。
