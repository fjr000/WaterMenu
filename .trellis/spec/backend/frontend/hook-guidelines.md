# Backend-to-Frontend Hook Guidelines

> How frontend hooks consume backend routes and what backend changes must preserve.

## API Client Contract

Frontend hooks call backend routes through `apiFetch<T>` in `frontend/src/api/client.ts`:

- Every path is prefixed with `/api`.
- Cookies are sent with `credentials: "same-origin"`.
- JSON string bodies get `Content-Type: application/json` automatically.
- Failed responses throw `ApiError(status, message)`.

Backend routes should remain under the global `/api` prefix configured in `backend/src/app.setup.ts`.

## Hook Consumers by Domain

- Auth: `use-auth.tsx`, `LoginPage`, and `InvitePage` consume `/auth/login`, `/auth/logout`, `/auth/me`, and invite accept session behavior.
- Dishes: `use-dishes.ts` consumes `/dishes` list/create/update and optional `mealType` filter.
- Dish images: `use-dish-images.ts` consumes `/dishes/:dishId/images`, `/dish-images/:id/cover`, `/dish-images/:id` and expects `fileUrl` to load image bytes from `/dish-images/:id/file`.
- Members/invites: `use-members.ts` and `use-invites.ts` consume member list, invite list/create/revoke/preview/accept.
- Recommendations: `use-recommendations.ts` consumes recommendation and blind-box endpoints.

## Invalidation Implications

Backend response changes can require hook invalidation changes:

- If an image mutation changes dish card data, `use-dish-images.ts` invalidates both `dish-images` and `dishes` queries.
- If a dish mutation affects recommendations, `HomePage` resets recommendation mutation state after success.
- Logout and 401 remove all non-auth query data.

When adding a backend mutation, decide which frontend query keys become stale.

## Rule

Do not change backend routes, methods, auth requirements, or returned status codes without checking matching hooks. If the backend starts returning 204/no body, update hooks because `apiFetch` currently always parses JSON on successful responses.
