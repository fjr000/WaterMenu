# 修复前端退出登录后不跳转

## Goal

修复前端登录后点击“退出”不会立即回到登录页的问题。用户退出后应立刻清除前端登录态并显示登录页；刷新后仍保持未登录状态。

## What I already know

- 用户实测：登录后点击退出没有发生跳转；刷新后会要求重新登录。
- 用户实测：登录后不退出直接刷新，仍保持登录态，这是正常的 session cookie 行为。
- 当前前端认证状态由 `AuthProvider` + TanStack Query `authMeKey` 管理。
- 当前 `logout()` 在 `finally` 中执行 `queryClient.clear(); queryClient.setQueryData(authMeKey, null);`。
- 现象符合 TanStack Query `clear()` 清掉查询缓存/订阅后，当前 `useQuery(authMeKey)` 没有被 `setQueryData` 正确通知的风险。

## Requirements

- 点击“退出”后，应立即回到登录页，无需刷新。
- 退出请求成功或失败，前端都应按未登录处理。
- 不影响“刷新后仍保持登录态”的正常行为。
- 不引入路由库、不新增全局状态库。

## Acceptance Criteria

- [ ] 登录后点击“退出”，页面立即显示登录页。
- [ ] 退出后刷新，仍显示登录页。
- [ ] 登录后不点击退出直接刷新，仍保持登录态。
- [ ] `pnpm --filter @watermenu/frontend typecheck` 通过。
- [ ] `pnpm --filter @watermenu/frontend build` 通过。

## Definition of Done

- 最小代码修复完成。
- 前端 typecheck/build 通过。
- 涉及的前端认证/Hook 规范同步更新。
- 无调试日志、无类型绕过。

## Technical Approach

不要在 logout 中调用 `queryClient.clear()`。改为先把 `authMeKey` 设置为 `null`，再移除非 auth 的业务查询缓存，与全局 401 处理策略保持一致。这样当前 `useAuth()` 的 observer 会收到认证状态变化并触发 `AppRoutes` 回到登录页。

## Decision (ADR-lite)

**Context**: `queryClient.clear()` 会清理 QueryCache，可能导致当前认证查询 observer 不再通过后续 `setQueryData` 得到预期更新，造成 UI 仍停留在已登录页面。

**Decision**: logout 使用“更新 auth 查询 + 清理业务查询”的方式，不使用 `queryClient.clear()`。

**Consequences**: 行为与全局 401 处理统一；认证状态变化可立即反映到 UI；业务缓存仍会被清理，避免退出后残留数据。

## Out of Scope

- 不修改后端 logout API。
- 不引入 React Router 或页面级路由。
- 不改变 session cookie 的刷新保持登录行为。

## Technical Notes

- 影响文件：`frontend/src/hooks/use-auth.tsx`。
- 相关规范：`.trellis/spec/frontend/hook-guidelines.md`、`.trellis/spec/frontend/technical-contracts.md`、`.trellis/spec/frontend/state-management.md`。
