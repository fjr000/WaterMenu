# Backend Package Frontend-Impact Guidelines

> Guidance for backend tasks that affect frontend behavior or API contracts.

The `backend/` package does not contain React UI code. Frontend implementation lives in `frontend/` and is documented under `.trellis/spec/frontend/frontend/`. This layer exists so backend-focused tasks still check the browser-visible impact of API, auth, session, validation, and response-shape changes.

## Pre-Development Checklist

When a backend change affects frontend-visible behavior, read:

1. [Directory Structure](./directory-structure.md) — where frontend-impacting code lives and where not to put UI code.
2. [Component Guidelines](./component-guidelines.md) — how backend states surface in existing UI components.
3. [Hook Guidelines](./hook-guidelines.md) — how frontend hooks call backend routes and invalidate data.
4. [State Management](./state-management.md) — auth/session/cache implications of backend changes.
5. [Type Safety](./type-safety.md) — updating `frontend/src/api/types.ts` with backend contract changes.
6. [Quality Guidelines](./quality-guidelines.md) — cross-layer verification rules.
7. The concrete frontend specs in `.trellis/spec/frontend/frontend/` if you will edit `frontend/` files.
8. Shared cross-layer guide: `.trellis/spec/guides/cross-layer-thinking-guide.md`.

## Backend Changes That Require Frontend Review

Review frontend impact when changing:

- API routes, methods, status codes, or response bodies.
- DTO validation rules or enum values.
- Auth/session behavior and 401 handling.
- Workspace/member/invite permissions.
- Dish, meal record, feedback, image, recipe, or recommendation fields consumed by cards/panels.
- Upload limits, accepted image types, or error conditions displayed in UI copy.

Reference contract files:
- Backend controllers/services under `backend/src/**`.
- Frontend types in `frontend/src/api/types.ts`.
- Frontend hooks in `frontend/src/hooks/`.
- Frontend UI consumers in `frontend/src/pages/` and `frontend/src/components/`.

## Verification

For cross-layer backend changes, run backend checks and frontend type/build checks when frontend contracts changed:

```bash
pnpm backend:typecheck
pnpm backend:test
pnpm frontend:typecheck
pnpm frontend:build
```
