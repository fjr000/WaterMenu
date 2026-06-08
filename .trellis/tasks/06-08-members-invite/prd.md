# 成员邀请与 workspace 加入第一版

## Goal

让 WaterMenu 从“单个 seed 用户自用”扩展到“家庭 / 小组可邀请成员共用同一个 workspace”。第一版不开放公开注册，只允许已登录成员生成邀请，新成员通过邀请加入当前 workspace。

## What I already know

* 项目当前已有 `Workspace` 与 `User` 模型，`User.workspaceId` 表示用户归属。
* 当前登录体系使用账号密码 + Session Cookie，前端不保存 JWT。
* 当前 MVP 不开放注册，项目定义中写明“后续支持邀请码加入 workspace”。
* 菜品、图片、做法、用餐记录、反馈、推荐等业务数据已经按 `workspaceId` 隔离。
* `Feedback` 已经关联 `userId`，历史记录筛选也已经支持“我的反馈 / workspace 成员反馈”，多成员会放大现有设计价值。
* 当前 seed 创建初始用户；没有成员列表、邀请、加入 workspace、角色或成员管理入口。

## Constraints

* 不能破坏现有 seed 初始用户与登录流程。
* 不做开放注册；新用户必须通过有效邀请加入。
* 密码继续使用 argon2 哈希。
* Session Cookie 登录方式保持不变。
* 所有新接口必须保持 workspace 隔离。
* 第一版优先简单、可测试、可回滚，不引入邮件服务。
* 前端继续使用 React + TanStack Query + React Hook Form + Zod。
* 后端继续使用 NestJS + Prisma + DTO class-validator。

## Success Criteria

* 已登录用户可以看到当前 workspace 成员列表。
* 已登录用户可以创建邀请，并获得可复制的完整邀请链接。
* 未登录用户可以通过邀请入口填写姓名、邮箱、密码并加入对应 workspace。
* 加入后新用户可以登录，并看到同一个 workspace 的菜品、记录、推荐数据。
* 无效、过期、已使用的邀请码不能加入。
* 重复邮箱不能加入。
* 后端 e2e 覆盖邀请创建、接受、失效、workspace 归属和登录闭环。

## Decisions Locked

* 新增 `UserRole = ADMIN | MEMBER`。
* 现有 seed / 已存在用户迁移为 `ADMIN`。
* 第一版只有 `ADMIN` 可以创建邀请。
* `MEMBER` 可以正常使用菜品、图片、做法、用餐记录、反馈、推荐，但不能创建邀请。
* 邀请采用一次性使用规则，默认 7 天过期。
* `ADMIN` 可以撤销未使用的邀请。
* 邀请对外形态采用完整链接 `/invite/<token>`。
* 后端只持久化 token 哈希，不保存可直接使用的明文 token。
* 前端第一版只提供“复制邀请链接”，不做手动输入短邀请码入口。
* 接受邀请成功后自动写入 Session，并直接进入主应用。
* 如果浏览器当前已登录其他账号打开邀请链接，第一版应阻止接受并提示先退出登录。
* 主应用新增第 4 个 Tab：`成员`。
* 所有成员都能查看当前 workspace 成员列表。
* 只有 `ADMIN` 能在成员页创建邀请、查看未使用邀请、撤销邀请。
* `/invite/<token>` 是独立接受邀请页，不属于主应用 Tab。
* 第一版不做成员移除、修改角色、重置密码。
* 创建邀请时不允许选择被邀请人的角色；接受邀请的新用户固定为 `MEMBER`。
* 邀请不绑定具体邮箱；接受邀请时新用户自己填写邮箱。
* 邀请链接只在创建成功响应中显示一次；之后邀请列表不再展示完整链接。
* 打开 `/invite/<token>` 时先调用未登录可访问的邀请校验接口。
* 有效邀请页展示 workspace 名称和过期时间，再展示接受邀请表单。
* 无效邀请页直接展示失效原因，不让用户填写表单。
* 邀请失效原因对用户细分展示：已过期、已使用、已撤销、邀请不可用。
* 不存在的 token 统一展示为“邀请不可用”。
* 成员页第一版只展示待处理邀请：未使用、未过期、未撤销。
* 成员页不展示已使用、已过期、已撤销的历史邀请。
* 成员列表对所有成员展示姓名、角色、加入时间。
* 成员列表只对 `ADMIN` 额外展示邮箱。
* 接受邀请表单要求输入密码和确认密码；前端校验两次输入一致。
* 后端接受邀请接口只接收最终密码，不接收确认密码字段。
* 每个 workspace 最多允许 10 个待处理邀请。
* 待处理邀请定义为：未使用、未撤销、未过期。
* 创建邀请成功后展示完整链接和“复制链接”按钮。
* 如果浏览器剪贴板 API 失败，前端保留链接文本并提示用户手动复制。
* API 路径采用 `members` 与 `invites` 分离：成员是已加入用户，邀请是临时加入凭证。
* 本轮不做过期邀请的主动清理；查询和校验时把过期邀请视为无效。
* 接受邀请创建账号时，后端要求密码至少 8 个字符；前端同步提示和校验。
* 密码不强制大小写、数字、特殊字符组合。

## Decisions To Make

* 暂无，主要产品决策已收敛。

## Requirements (evolving)

* 新增 workspace 成员邀请能力。
* 邀请加入不等同公开注册；必须校验邀请码有效。
* 第一版不接入邮件服务，只提供复制邀请信息。
* 新用户加入后归属邀请对应的 workspace。
* 新用户加入后使用现有登录接口登录。
* 新增用户角色：`ADMIN` 与 `MEMBER`。
* seed 创建的初始用户必须是 `ADMIN`。
* 只有 `ADMIN` 能创建 workspace 邀请。
* `MEMBER` 不能创建邀请，但能使用现有业务功能。
* 邀请一次性使用，成功接受后标记为已使用。
* 邀请默认 7 天过期。
* `ADMIN` 可以撤销未使用邀请；已使用邀请不能撤销也不能再次使用。
* 邀请链接路径为 `/invite/<token>`。
* 邀请 token 明文只在创建邀请响应中返回；数据库只保存 token 哈希。
* 第一版不提供短邀请码输入入口。
* 接受邀请成功后自动登录新用户，并进入主应用。
* 已登录用户打开邀请链接时不能直接接受；第一版提示先退出当前账号。
* 主应用新增 `成员` Tab。
* 成员 Tab 对所有成员展示当前 workspace 成员列表。
* 成员 Tab 对 `ADMIN` 额外展示创建邀请、未使用邀请列表、撤销邀请入口。
* 接受邀请页使用 `/invite/<token>`，未登录可访问，不进入主应用 Tab。
* 第一版不支持移除成员、修改成员角色、重置成员密码。
* 创建邀请时不选择角色；通过邀请加入的新用户固定为 `MEMBER`。
* 创建邀请时不要求输入被邀请人的邮箱。
* 接受邀请时填写的邮箱只需满足全局唯一，并不需要匹配邀请上的预设邮箱。
* 完整邀请链接只在创建成功时返回一次；后续邀请列表只展示创建时间、过期时间、状态和撤销按钮。
* 如果邀请链接丢失，`ADMIN` 应撤销旧邀请或新建邀请。
* `GET /api/invites/:token/preview` 未登录可访问，用于预校验邀请。
* 有效邀请预校验返回 workspace 名称和过期时间。
* 已使用、过期、已撤销、不存在的邀请预校验返回不可接受状态，前端不展示注册表单。
* 已匹配邀请记录但状态失效时，前端可细分展示“已过期 / 已使用 / 已撤销”。
* 未匹配邀请记录时，前端统一展示“邀请不可用”。
* `ADMIN` 在成员页只能看到仍可接受的待处理邀请。
* 已使用、已过期、已撤销的邀请不在成员页历史展示；本轮不做邀请审计。
* 成员列表接口需要根据当前用户角色控制响应字段：普通成员不返回邮箱，`ADMIN` 返回邮箱。
* 接受邀请页表单包含姓名、邮箱、密码、确认密码。
* 确认密码只用于前端校验；后端 DTO 不接收确认密码。
* 创建邀请前统计当前 workspace 的待处理邀请数量；达到 10 个时拒绝创建。
* 已使用、已撤销、已过期的邀请不计入数量限制。
* 前端复制链接使用 `navigator.clipboard`；失败时不重新创建邀请，只提示手动复制当前显示的链接。
* `GET /api/members` 返回当前 workspace 成员列表。
* `GET /api/invites` 返回当前 workspace 待处理邀请列表，仅 `ADMIN` 可访问。
* `POST /api/invites` 创建邀请，仅 `ADMIN` 可访问。
* `DELETE /api/invites/:id` 撤销待处理邀请，仅 `ADMIN` 可访问。
* `GET /api/invites/:token/preview` 未登录可访问，用于预校验邀请。
* `POST /api/invites/:token/accept` 未登录可访问，用于接受邀请并自动登录。
* 不引入后台任务或定时清理；过期邀请可留在数据库中，但不能被接受，也不出现在待处理邀请列表。
* 接受邀请接口校验密码长度至少 8 个字符。
* 前端接受邀请表单同步校验密码长度至少 8 个字符，以及两次密码一致。

## Acceptance Criteria (evolving)

* [ ] `ADMIN` 可创建邀请，并返回可复制的完整邀请链接。
* [ ] `MEMBER` 创建邀请会被拒绝。
* [ ] 既有 seed 用户和迁移前用户拥有 `ADMIN` 角色。
* [ ] 邀请记录持久化，并和当前 workspace 绑定。
* [ ] 数据库不保存可直接使用的明文 token。
* [ ] 接受邀请时创建新用户，密码被哈希保存。
* [ ] 接受邀请后新用户属于邀请对应 workspace。
* [ ] 接受邀请成功后新用户自动登录并进入主应用。
* [ ] 已登录用户打开邀请链接时被提示先退出，不能把邀请绑定到当前账号。
* [ ] 已使用、过期、不存在、已撤销的邀请码被拒绝。
* [ ] `ADMIN` 可以撤销未使用邀请，撤销后该邀请不能再接受。
* [ ] 重复邮箱被拒绝。
* [ ] 成员列表只显示当前 workspace 用户。
* [ ] 主应用包含 `成员` Tab。
* [ ] `MEMBER` 在成员页只能查看成员列表，不能创建或撤销邀请。
* [ ] `/invite/<token>` 未登录可访问，并展示接受邀请表单。
* [ ] 第一版界面不提供成员移除、改角色、重置密码入口。
* [ ] 创建邀请时不出现角色选择；接受邀请创建的新用户角色为 `MEMBER`。
* [ ] 创建邀请时不需要输入被邀请人的邮箱。
* [ ] 接受邀请时任意未注册邮箱均可加入邀请对应 workspace。
* [ ] 创建邀请成功时显示完整邀请链接。
* [ ] 刷新或重新打开成员页后，未使用邀请不再显示完整链接。
* [ ] 打开 `/invite/<token>` 时先校验邀请有效性。
* [ ] 有效邀请展示 workspace 名称、过期时间和接受邀请表单。
* [ ] 无效邀请不展示表单，并提示邀请不可用。
* [ ] 已过期、已使用、已撤销的邀请展示对应失效原因。
* [ ] 不存在的 token 不暴露内部细节，统一展示“邀请不可用”。
* [ ] 成员页只展示未使用、未过期、未撤销的待处理邀请。
* [ ] 成员页不展示历史邀请记录。
* [ ] 普通成员在成员列表看到姓名、角色、加入时间。
* [ ] `ADMIN` 在成员列表额外看到邮箱。
* [ ] 接受邀请表单要求重复输入密码，且前端校验两次密码一致。
* [ ] 后端接受邀请接口只接收姓名、邮箱、密码。
* [ ] 每个 workspace 待处理邀请达到 10 个时，继续创建邀请会被拒绝。
* [ ] 已使用、已撤销、已过期的邀请不计入 10 个限制。
* [ ] 创建邀请成功后展示完整邀请链接和复制按钮。
* [ ] 复制失败时仍保留链接文本，并提示用户手动复制。
* [ ] 成员接口使用 `/api/members`。
* [ ] 邀请列表、创建、撤销接口使用 `/api/invites`。
* [ ] 邀请预览与接受接口使用 `/api/invites/:token/preview` 和 `/api/invites/:token/accept`。
* [ ] 过期邀请不会出现在成员页待处理邀请列表。
* [ ] 过期邀请不能被预览为有效，也不能被接受。
* [ ] 接受邀请时密码少于 8 个字符会被前后端拒绝。
* [ ] 后端 lint、typecheck、e2e 通过。
* [ ] 前端 typecheck 通过。

## Definition of Done

* 后端 Prisma migration 完成。
* 后端 DTO、service、controller、e2e 测试完成。
* 前端成员 / 邀请 / 接受邀请入口完成。
* 错误状态有明确用户提示。
* 不破坏现有登录、菜品、记录、推荐流程。
* 相关 Trellis context 配置完成后再进入实现。

## Technical Approach

### Backend

* Prisma 新增 `UserRole` enum，并在 `User` 上新增 `role` 字段，默认 `MEMBER`；迁移把既有用户设为 `ADMIN`。
* `seed.ts` 创建或更新初始用户时写入 `role = ADMIN`。
* Prisma 新增 `WorkspaceInvite` 模型，建议字段：
  * `id`
  * `workspaceId`
  * `tokenHash`
  * `createdByUserId`
  * `expiresAt`
  * `usedAt`
  * `usedByUserId`
  * `revokedAt`
  * `createdAt`
  * `updatedAt`
* 创建邀请时生成高熵随机 token，只把 token 哈希写入数据库；明文 token 只在响应中返回一次。
* 邀请校验通过哈希匹配 token，再判断 used / revoked / expired 状态。
* 接受邀请使用事务：校验邀请有效、创建 `MEMBER` 用户、标记邀请 used、写入 Session。
* 成员列表根据当前用户角色控制响应字段：普通成员不返回邮箱，`ADMIN` 返回邮箱。
* 邀请创建、列表、撤销必须校验当前用户是 `ADMIN`。
* 不引入后台任务；过期通过查询过滤和校验逻辑处理。

### API

* `GET /api/members`：当前 workspace 成员列表。
* `GET /api/invites`：待处理邀请列表，`ADMIN` only。
* `POST /api/invites`：创建邀请，`ADMIN` only。
* `DELETE /api/invites/:id`：撤销待处理邀请，`ADMIN` only。
* `GET /api/invites/:token/preview`：未登录可访问，预校验邀请。
* `POST /api/invites/:token/accept`：未登录可访问，接受邀请并自动登录。

### Frontend

* 扩展登录态类型，包含当前用户 `role`。
* `HomePage` 新增第 4 个 Tab：`成员`。
* 新增成员页组件：成员列表、待处理邀请列表、创建邀请、复制邀请链接、撤销邀请。
* `MEMBER` 在成员页只看成员列表；`ADMIN` 才看到邀请管理区。
* `main.tsx` 或顶层入口根据 `window.location.pathname` 识别 `/invite/<token>`，渲染独立接受邀请页，不引入路由库。
* 接受邀请页先调用 preview；有效才显示姓名、邮箱、密码、确认密码表单。
* 接受成功后刷新登录态并进入主应用。
* 复制链接失败时保留链接文本并提示手动复制。

## Decision (ADR-lite)

**Context**: 项目已完成单用户 MVP，并且数据模型已围绕 workspace 隔离；下一步需要支持家庭 / 小组成员加入，但不能引入开放注册、邮件服务或复杂权限系统。

**Decision**: 第一版采用 `ADMIN` 创建一次性邀请链接，新成员通过 `/invite/<token>` 加入当前 workspace，默认成为 `MEMBER`。邀请只存 token 哈希，链接只显示一次；成员管理暂不包含移除、改角色、重置密码。

**Consequences**:

* 优点：安全边界清晰，适合当前家庭/小组场景；实现复杂度可控；不破坏现有登录和业务数据隔离。
* 代价：邀请链接丢失后不能再次查看，只能撤销或新建；暂时无法新增第二个管理员；成员生命周期管理留到后续任务。
* 后续扩展：可以在独立任务中加入角色修改、禁用成员、邮箱绑定邀请、邮件发送、邀请审计、多 workspace 切换。

## Implementation Plan

### Step 1: 后端数据模型与权限基础

* 新增 Prisma enum / fields / migration。
* 更新 seed。
* 更新 auth/me 返回 role。
* 添加成员列表接口和测试。

### Step 2: 后端邀请闭环

* 新增 invites service / controller / DTO。
* 实现创建、列表、撤销、preview、accept。
* 覆盖 ADMIN/MEMBER 权限、token 哈希、过期、已使用、已撤销、重复邮箱、自动登录等 e2e。

### Step 3: 前端成员页

* 更新 API types 和 hooks。
* HomePage 新增成员 Tab。
* 实现成员列表、创建邀请、待处理邀请、撤销、复制链接降级。

### Step 4: 前端接受邀请页

* 顶层识别 `/invite/<token>`。
* 实现 preview 状态、失效原因、接受邀请表单、密码确认、成功后进入主应用。

### Step 5: 验证

* `pnpm backend:lint`
* `pnpm backend:typecheck`
* `pnpm backend:test`
* `pnpm frontend:typecheck`
* 手动检查登录用户、ADMIN、MEMBER、未登录邀请页四类路径。

## Out of Scope (explicit)

* 开放注册。
* 邮件发送。
* 忘记密码 / 重置密码。
* 成员移除。
* 成员角色修改。
* 多 workspace 切换。
* 复杂权限系统。
* 公开菜谱分享。
* 成员行为审计。
* AI / 推荐算法升级。

## Technical Notes

* 现有模型：`backend/prisma/schema.prisma` 包含 `Workspace`、`User`、业务模型与 `Feedback.userId`。
* 现有认证：`backend/src/auth/*`、`backend/src/session/session.config.ts`。
* 现有 workspace 隔离模式：各业务 service 先由 `userId` 查 `workspaceId`，再按 `workspaceId` 查询。
* 现有前端登录态：`frontend/src/hooks/use-auth.tsx`。
* 现有前端 API 封装：`frontend/src/api/client.ts`，固定 `/api` 前缀，`credentials: "same-origin"`。
* 建议后端新增 `WorkspaceInvite` 模型；邀请 token 只存哈希，避免数据库泄漏后可直接使用邀请。
