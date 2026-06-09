# Backend-to-Frontend Type Safety

> Keeping backend DTOs, Prisma enums, and frontend API types aligned.

## Frontend Type Mirror

`frontend/src/api/types.ts` mirrors backend contracts manually. Update it whenever backend changes:

- Prisma enum values such as `MealType`, `FeedbackRating`, and `UserRole`.
- Request DTO shapes such as create/update dish, meal records, feedback, recipes, recommendations, and invite accept.
- Response shapes such as `MeResponse`, `Dish`, `DishImage`, `MealRecord`, `Member`, invite preview, and recommendations.
- Nullable vs optional semantics.

## Source of Truth

Backend sources to check:

- Prisma schema/enums: `backend/prisma/schema.prisma`.
- DTOs: `backend/src/*/dto/*.dto.ts`.
- Controller routes/statuses: `backend/src/*/*.controller.ts`.
- Service return shapes and derived fields: `backend/src/*/*.service.ts`.

Frontend consumers to check:

- `frontend/src/api/types.ts`.
- `frontend/src/hooks/`.
- `frontend/src/components/` and `frontend/src/pages/`.

## Null vs Undefined

Backend database nullable fields are represented as `null` in responses. Omitted update fields are represented as optional properties in request types.

Examples:
- `Dish.description: string | null` in responses, but `UpdateDishRequest.description?: string` for updates.
- `MealRecord.dishId: string | null` and `note: string | null` in responses.
- `UpdateMealRecordRequest.note?: string | null` because the UI can omit a change or explicitly clear the note.

Do not collapse these distinctions in frontend types.

## Scenario: Backend API Contract Change

### 1. Scope / Trigger

Use this checklist whenever a backend change modifies any frontend-visible API contract: route path, HTTP method, request DTO, query DTO, response field, enum value, status code, auth/session behavior, or JSON-vs-non-JSON response shape.

### 2. Signatures

Backend signatures to inspect and update together:

- Controller route: `@Controller(...)`, `@Get`, `@Post`, `@Patch`, `@Delete`, `@HttpCode`, `@UseGuards` in `backend/src/*/*.controller.ts`.
- DTO class: request body/query params in `backend/src/*/dto/*.dto.ts`.
- Service return object: response body and derived fields in `backend/src/*/*.service.ts`.
- Prisma enum/model fields when persisted values change in `backend/prisma/schema.prisma`.
- Frontend mirror: `frontend/src/api/types.ts`, matching hook in `frontend/src/hooks/`, and consuming page/component.

### 3. Contracts

For every changed endpoint, record and verify:

- Request fields: name, type, optional vs required, nullable vs omitted, enum domain, and validation decorators.
- Response fields: name, type, nullable fields, optional fields, arrays/pages, and derived fields such as `fileUrl`, `coverImage`, `mealRecordCount`, and `feedbackRatingAverage`.
- Auth behavior: public, session-required 401, role-required 403, or workspace-scoped 404.
- Success body: `apiFetch` expects JSON for successful responses; keep `{ ok: true }` for empty-style mutations unless the hook/client is changed.

### 4. Validation & Error Matrix

| Condition | Backend response | Frontend expectation |
|---|---|---|
| Missing/expired session | 401 | `main.tsx` clears auth and non-auth query cache |
| Authenticated but not allowed | 403 | UI stays logged in and shows operation failure |
| Cross-workspace resource | 404 | UI does not learn the resource exists |
| DTO validation failure | 400 | Form/panel shows user-friendly Chinese copy |
| Duplicate/capped business conflict | 409 | UI maps conflict to domain-specific Chinese copy |
| Successful delete/revoke/logout | 200 JSON `{ ok: true }` | Hook calls `apiFetch<{ ok: boolean }>` |

### 5. Good/Base/Bad Cases

- Good: backend adds a new response field, `frontend/src/api/types.ts` is updated, hooks keep typed `apiFetch<T>`, and components handle loading/error/empty/success states.
- Base: backend-only internal query refactor preserves route, DTO, status, and response shape; frontend files do not need changes.
- Bad: backend returns `204 No Content` from an endpoint whose hook still calls `apiFetch<{ ok: boolean }>`; successful response parsing fails because `apiFetch` calls `response.json()`.

### 6. Tests Required

Backend route tests should assert frontend-observed behavior:

- Status codes for 400/401/403/404/409 where relevant.
- Response fields consumed by `frontend/src/api/types.ts` and components.
- Workspace isolation returns 404, not leaked data.
- Session-affecting flows (`login`, `logout`, invite accept) update or clear session as expected.

Frontend verification required when the contract changed:

```bash
pnpm frontend:typecheck
pnpm frontend:build
```

### 7. Wrong vs Correct

#### Wrong

```ts
// Backend changed a mutation to no body, but the frontend hook still parses JSON.
@Delete(':id')
@HttpCode(204)
delete(@Param('id') id: string) {
  return this.service.delete(id);
}
```

#### Correct

```ts
// Keep the local JSON success contract unless apiFetch and hooks are changed too.
@Delete(':id')
@HttpCode(200)
delete(@Param('id') id: string) {
  return this.service.delete(id); // { ok: true }
}
```

## Rule

After backend contract changes, run:

```bash
pnpm backend:typecheck
pnpm frontend:typecheck
```

Run `pnpm frontend:build` when component behavior or route rendering changed.
