# Backend-to-Frontend State Management

> Session, auth, cache, and route-state implications of backend work.

## Session and Auth Contract

The frontend treats `/auth/me` as the source of truth for authenticated state. Backend session behavior must support:

- Login regenerates the session and sets `session.userId` before returning `{ user, workspace }`.
- Logout destroys the session, clears the session cookie, and returns `{ ok: true }`.
- Invite accept regenerates the session, sets `session.userId`, and returns `{ user, workspace }`.
- Missing/expired sessions on protected routes return 401.

Reference backend files:
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.guard.ts`
- `backend/src/invites/invites.controller.ts`
- `backend/src/session/session.config.ts`

Reference frontend files:
- `frontend/src/hooks/use-auth.tsx`
- `frontend/src/main.tsx`
- `frontend/src/pages/login-page.tsx`
- `frontend/src/pages/invite-page.tsx`

## Cache Clearing Contract

Frontend global QueryClient error handlers clear auth and all non-auth cached data on 401. Backend should use 401 only for unauthenticated/session-invalid cases, not for ordinary permission failures.

Use:

- 401 for no valid session user.
- 403 for authenticated user lacking role permissions.
- 404 for cross-workspace resources.

This keeps frontend state transitions predictable.

## Invite Route State

The frontend uses `/invite/:token` path parsing in `main.tsx`. Backend invite links are created in `InvitesService.create` as `${origin}/invite/${token}`. Keep this route shape unless both backend invite link creation and frontend `getInviteToken` are changed together.

## Rule

Any backend change to session cookie name/options, auth endpoints, or invite-link route shape is cross-layer work and must include frontend state/routing verification.
