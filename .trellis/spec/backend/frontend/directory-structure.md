# Backend-to-Frontend Directory Guidance

> Where frontend-impacting backend contracts live.

## No UI Code in `backend/`

The backend package contains no React code. Do not add browser UI, React hooks, or frontend assets under `backend/`. Frontend code belongs in `frontend/`.

Backend files that commonly affect frontend behavior:

- Controllers: `backend/src/*/*.controller.ts` define routes, methods, guards, params, and status codes.
- Services: `backend/src/*/*.service.ts` define response shapes, authorization behavior, and domain errors.
- DTOs: `backend/src/*/dto/*.dto.ts` define accepted request fields and validation.
- Prisma schema: `backend/prisma/schema.prisma` defines enums and fields mirrored by frontend types.

Frontend mirror files:

- `frontend/src/api/types.ts` for request/response/domain types.
- `frontend/src/hooks/` for route calls and cache invalidation.
- `frontend/src/pages/` and `frontend/src/components/` for UI display of backend state.

## Common Cross-Layer Map

- `backend/src/auth/*` ↔ `frontend/src/hooks/use-auth.tsx`, `frontend/src/pages/login-page.tsx`, `frontend/src/main.tsx`.
- `backend/src/dishes/*` ↔ `frontend/src/hooks/use-dishes.ts`, `frontend/src/components/create-dish-form.tsx`, `frontend/src/pages/home-page.tsx`.
- `backend/src/dish-images/*` ↔ `frontend/src/hooks/use-dish-images.ts`, `frontend/src/components/dish-image-panel.tsx`.
- `backend/src/meal-records/*` and `backend/src/feedback/*` ↔ history/recent meal record components and hooks.
- `backend/src/members/*` and `backend/src/invites/*` ↔ `frontend/src/hooks/use-members.ts`, `use-invites.ts`, `frontend/src/components/members-panel.tsx`, `frontend/src/pages/invite-page.tsx`.
- `backend/src/recommendations/*` ↔ `frontend/src/hooks/use-recommendations.ts`, `frontend/src/components/recommendation-panel.tsx`.

## Rule

When a backend change alters a route or payload, update the frontend mirror in the same task unless the PRD explicitly says the frontend will follow separately.
