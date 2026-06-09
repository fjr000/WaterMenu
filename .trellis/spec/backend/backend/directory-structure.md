# Backend Directory Structure

> How backend code is organized in WaterMenu.

## Package Boundary

The backend package lives in `backend/` and is a NestJS application. Keep backend-only code here: controllers, services, DTOs, Prisma schema/migrations, session setup, and backend tests.

Reference files:
- `backend/package.json`
- `backend/src/app.module.ts`
- `backend/src/main.ts`
- `backend/prisma/schema.prisma`

## Module Layout

Feature code is grouped by domain under `backend/src/<feature>/`:

- `auth/` — login, logout, session user lookup, and `AuthGuard`.
- `dishes/`, `dish-images/`, `meal-records/`, `feedback/`, `recipes/`, `recommendations/`, `members/`, `invites/` — business feature modules.
- `prisma/` — shared Prisma client provider.
- `session/` — Express session configuration and session typing.

Each feature follows the local Nest convention:

```text
backend/src/<feature>/
  <feature>.module.ts
  <feature>.controller.ts
  <feature>.service.ts
  dto/*.dto.ts          # when the feature accepts request bodies or query params
```

Examples:
- `backend/src/dishes/dishes.module.ts`, `dishes.controller.ts`, `dishes.service.ts`, `dto/create-dish.dto.ts`
- `backend/src/meal-records/meal-records.controller.ts`, `meal-records.service.ts`, `dto/list-meal-records-query.dto.ts`
- `backend/src/invites/invites.controller.ts`, `invites.service.ts`, `dto/accept-invite.dto.ts`

## App Setup Boundary

Keep bootstrapping concerns separated:

- `backend/src/main.ts` creates the Nest app, applies production trust proxy, calls `setupSession(app)` then `setupApp(app)`, and listens on `PORT`.
- `backend/src/app.setup.ts` owns global API prefix, validation pipe, and Swagger setup. Tests call this directly after installing their test session middleware.
- `backend/src/app.module.ts` imports feature modules and global `ConfigModule`/`PrismaModule` only.

Do not add feature-specific behavior to `main.ts` or `app.setup.ts`; add it to the feature module/service/controller instead.

## Controller vs Service Responsibilities

Controllers should stay thin:

- Apply route decorators, guards, `@HttpCode`, params, body, query, and request/session extraction.
- Delegate business logic to the service.
- Return service results directly unless response headers or session regeneration/destruction are required.

Examples:
- `backend/src/dishes/dishes.controller.ts` extracts `request.session.userId`, `@Query()`, `@Body()`, and delegates to `DishesService`.
- `backend/src/invites/invites.controller.ts` handles session regeneration after accepting an invite, while invite validity and user creation stay in `InvitesService`.
- `backend/src/dish-images/dish-images.controller.ts` sets file response headers and returns `StreamableFile`; upload/storage rules stay in `DishImagesService`.

Services own:

- Workspace/user lookup and authorization checks.
- Prisma queries and transactions.
- DTO-to-database mapping, defaults, derived response fields, and domain-specific validation.
- Private helpers for repeated local rules, such as `getWorkspaceId`, `ensureDish`, `findImage`, `toResponse`, and `handlePrismaError`.

## DTO Placement

Put request DTOs under `backend/src/<feature>/dto/`. Use class-validator decorators and definite-assignment properties (`!`) to satisfy strict TypeScript.

Examples:
- `backend/src/dishes/dto/create-dish.dto.ts`
- `backend/src/meal-records/dto/list-meal-records-query.dto.ts`
- `backend/src/invites/dto/accept-invite.dto.ts`

Do not inline validation classes in controllers when a feature already has a `dto/` directory.

## Tests

Backend tests live in `backend/test/*.e2e-spec.ts`. They are route-level tests using a mocked `PrismaService`, not unit tests for individual services.

Reference files:
- `backend/test/auth.e2e-spec.ts`
- `backend/test/dishes.e2e-spec.ts`
- `backend/test/dish-images.e2e-spec.ts`
- `backend/test/members-invites.e2e-spec.ts`

## Avoid

- Do not create broad `utils/` or `common/` directories for one-off helpers; keep helpers private to the service until multiple real features need them.
- Do not put request/session type aliases in shared files unless reuse is proven. Current controllers define local `SessionRequest` aliases.
- Do not bypass `AppModule` in route tests; existing tests build `AppModule` and override providers to keep module wiring covered.
