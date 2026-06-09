# Backend Quality Guidelines

> TypeScript, NestJS, tests, and verification standards for backend changes.

## TypeScript and Imports

The backend uses strict TypeScript (`backend/tsconfig.json`) with CommonJS output for Nest. Follow existing import style:

- Use single quotes in backend TypeScript.
- Import runtime values normally and Express/Nest types with `type` when possible.
- Keep relative imports local and explicit, for example `../prisma/prisma.service` and `./dto/create-dish.dto`.
- Use definite assignment (`!`) in DTO classes with class-validator decorators.
- Use `Prisma.*` types for query objects, includes, payloads, and known request errors.

Examples:
- `backend/src/dishes/dishes.service.ts`
- `backend/src/meal-records/meal-records.service.ts`
- `backend/src/dish-images/dish-images.controller.ts`
- `backend/src/dishes/dto/create-dish.dto.ts`

Avoid adding `any`. Existing tests use typed mock shapes rather than broad `any` mocks.

## NestJS Patterns

- Put `@Injectable()` services behind feature modules and inject them into controllers.
- Keep controllers thin and use services for business logic.
- Use `@HttpCode(200)` for POST/DELETE endpoints that intentionally return 200 instead of Nest's default 201.
- Use local `SessionRequest` aliases in controllers that read or mutate `request.session`.
- Register new feature modules in `backend/src/app.module.ts`.

Reference files:
- `backend/src/auth/auth.controller.ts`
- `backend/src/invites/invites.controller.ts`
- `backend/src/dishes/dishes.controller.ts`
- `backend/src/app.module.ts`

## Response Shape Consistency

Preserve response shapes already consumed by the frontend:

- Auth endpoints return `{ user, workspace }`.
- Mutating delete/revoke/logout endpoints commonly return `{ ok: true }`.
- List pages with pagination return `{ items, total, page, pageSize }`.
- Dish responses include `coverImage`, `mealRecordCount`, and `feedbackRatingAverage` when returned from dish/recommendation card flows.
- Dish image responses include `fileUrl`.

Before changing a response shape, search `frontend/src/api/types.ts`, `frontend/src/hooks/`, and `frontend/src/components/` for consumers.

## Testing Style

Backend tests are Jest/Supertest e2e-style tests under `backend/test/*.e2e-spec.ts`.

Common setup pattern:

1. Build `Test.createTestingModule({ imports: [AppModule] })`.
2. Override `PrismaService` with an in-memory Jest mock.
3. Create a Nest app from the module.
4. Install `express-session` with a test secret.
5. Add middleware that reads `x-test-user-id` into `request.session.userId`.
6. Call `setupApp(app)` and `await app.init()`.
7. Use `request(app.getHttpServer())` or helper agents to hit `/api/...` endpoints.

Reference tests:
- `backend/test/dishes.e2e-spec.ts`
- `backend/test/dish-images.e2e-spec.ts`
- `backend/test/members-invites.e2e-spec.ts`
- `backend/test/recommendations.e2e-spec.ts`

Use route tests to cover:

- Auth required vs public endpoints.
- Workspace isolation and cross-workspace 404 behavior.
- DTO validation failures.
- Domain conflicts and Prisma `P2002` mapping.
- Derived response fields used by the frontend.
- Side effects such as file writes/deletes, invite token hashing, session regeneration, and query invalidation-relevant responses.

## Mocking Prisma in Tests

Mock only the Prisma delegates used by the feature. Keep in-memory arrays typed and reset them in `beforeEach`.

Patterns from existing tests:

- `backend/test/dishes.e2e-spec.ts` uses arrays for dishes, throws Prisma `P2002`, and tests filtering/defaults.
- `backend/test/dish-images.e2e-spec.ts` uses temporary directories and validates actual file writes/deletes.
- `backend/test/members-invites.e2e-spec.ts` implements an interactive `$transaction` mock by calling the callback with the mock client.
- `backend/test/meal-records-feedback.e2e-spec.ts` and related tests check workspace-scoped history and feedback behavior.

For `$transaction([promiseA, promiseB])`, mock it differently than interactive transactions; match the service's actual call shape.

## Commands

Run the focused commands for backend work:

```bash
pnpm backend:typecheck
pnpm backend:lint
pnpm backend:test
```

When build output matters:

```bash
pnpm backend:build
```

When Prisma schema changed:

```bash
pnpm backend:prisma:generate
```

## Common Review Checks

Before finishing backend work, verify:

- Every resource query is scoped by `workspaceId` where appropriate.
- New protected routes use `AuthGuard` and session `userId` rather than accepting workspace/user IDs from the client.
- DTO validation covers every request field.
- Cross-workspace access returns 404, not 403 or leaked data.
- New frontend-visible fields are added to `frontend/src/api/types.ts` and hooks/components if needed.
- Tests cover both success and failure paths.

## Avoid

- Do not trust client-provided `workspaceId` or `userId` for authorization.
- Do not return raw invite tokens after creation except inside the one-time `inviteLink` response.
- Do not store plaintext passwords or invite tokens.
- Do not swallow unknown errors in services.
- Do not add DB side effects outside transactions when multiple updates must remain consistent.
