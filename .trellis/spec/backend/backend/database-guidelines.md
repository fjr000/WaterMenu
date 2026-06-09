# Database Guidelines

> Prisma, PostgreSQL, migrations, and workspace scoping patterns for the backend.

## Prisma Ownership

The Prisma schema lives in `backend/prisma/schema.prisma`. Database access in application code goes through `PrismaService` from `backend/src/prisma/prisma.service.ts`, which extends `PrismaClient` and connects/disconnects on Nest module lifecycle hooks.

Reference files:
- `backend/prisma/schema.prisma`
- `backend/src/prisma/prisma.service.ts`
- `backend/src/prisma/prisma.module.ts`

Use dependency injection in services:

```ts
constructor(private readonly prisma: PrismaService) {}
```

Do not instantiate `PrismaClient` inside feature services.

## Workspace Scoping Is Mandatory

Most business data is scoped by `workspaceId`. Services should derive `workspaceId` from the authenticated `userId`, then include it in every query touching workspace data.

Local pattern:

1. Read the current user with `select: { workspaceId: true }` (and role when needed).
2. Throw `UnauthorizedException` if the session user no longer exists.
3. Use `workspaceId` in `where` clauses for reads, updates, deletes, relation checks, and counts.

Examples:
- `backend/src/dishes/dishes.service.ts` uses `getWorkspaceId(userId)` before list/create/get/update and filters dishes by `{ id, workspaceId }`.
- `backend/src/meal-records/meal-records.service.ts` filters list/search/rating/date queries by `workspaceId` and validates related dishes with `assertDishInWorkspace`.
- `backend/src/dish-images/dish-images.service.ts` ensures both dish and image belong to the workspace before file operations.
- `backend/src/members/members.service.ts` only lists users from the current user's workspace.
- `backend/src/invites/invites.service.ts` scopes pending invite listing, creation, and revocation to the admin's workspace.

Avoid direct update/delete by ID before a scoped existence check. The common pattern is `findFirst({ where: { id, workspaceId }, select: { id: true } })`, then update/delete by ID after ownership is proven.

## Schema Conventions

The schema uses:

- `String @id @default(cuid())` IDs.
- `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt` on business models.
- Explicit table names with `@@map(...)`, usually snake_case plural names such as `meal_records`, `dish_images`, and `workspace_invites`.
- `@@index([workspaceId])` on workspace-owned models and indexes for foreign keys such as `dishId`, `userId`, `createdByUserId`, and `usedByUserId`.
- `onDelete: Restrict` for workspace/user ownership relations; `Cascade` or `SetNull` only where the code expects dependent cleanup or history preservation.

Examples:
- `Dish` has `@@unique([workspaceId, name])` to allow same dish names in different workspaces.
- `Feedback` has `@@unique([mealRecordId, userId])` for one feedback per user per meal record.
- `DishImage` cascades on `dishId` because images belong to a dish.
- `MealRecord.dishId` uses `onDelete: SetNull` to preserve meal history after deleting a dish.

## Migrations and Session Table

Business tables are created through Prisma migrations under `backend/prisma/migrations/`. Add a migration when `schema.prisma` changes and keep migration SQL committed.

The Express session table is intentionally not a Prisma model. `backend/src/session/session.config.ts` uses `connect-pg-simple` with `createTableIfMissing: true`; `backend/README.md` documents that this infrastructure table is created at runtime.

Do not add a `Session` model to `schema.prisma` unless the session strategy changes.

## Transactions

Use `prisma.$transaction` when multiple database changes must succeed together or race conditions need guarding.

Examples:
- `backend/src/meal-records/meal-records.service.ts` uses `$transaction([findMany, count])` for paginated list consistency.
- `backend/src/dish-images/dish-images.service.ts` uses an interactive transaction to count images and create metadata, and another to switch cover images atomically.
- `backend/src/invites/invites.service.ts` creates a user and marks an invite as used in one transaction; it uses `updateMany` with pending conditions and checks `count === 1` to guard concurrent invite acceptance.

When filesystem work is paired with DB writes, clean up external side effects on DB failure. `DishImagesService.upload` writes the file, then deletes it in `catch` if the Prisma transaction fails.

## Query and Response Patterns

- Prefer `select` for authorization lookups and narrow list responses.
- Prefer typed `Prisma.*WhereInput` and `Prisma.*Include` objects for dynamic filters.
- For reusable include shapes, use constants/functions and derive payload types with `Prisma.<Model>GetPayload`.

Examples:
- `backend/src/dishes/dishes.service.ts` defines `dishInclude(workspaceId)` and `DishWithStats` to build dish card fields.
- `backend/src/recommendations/recommendations.service.ts` defines `coverImageInclude`, `DishWithCoverImage`, and candidate types.
- `backend/src/meal-records/meal-records.service.ts` defines `getMealRecordInclude(workspaceId)` for feedback selection.

Derived frontend fields such as `coverImage.fileUrl`, `mealRecordCount`, and `feedbackRatingAverage` are computed in services before returning responses.

## Data Normalization and Secrets

- Lowercase emails before lookup or user creation (`AuthService.validateUser`, `InvitesService.accept`).
- Hash passwords with `argon2` (`AuthService`, `InvitesService`, `backend/prisma/seed.ts`).
- Invite tokens are random base64url values returned only in the invite link; only SHA-256 hashes are stored (`InvitesService.hashToken`).
- Trim names where current service logic requires non-empty display names (`InvitesService.accept`).

## Scenario: Prisma Schema or Migration Change

### 1. Scope / Trigger

Use this checklist whenever `backend/prisma/schema.prisma` or `backend/prisma/migrations/**` changes. Database schema changes are infra/cross-layer contracts because Prisma Client types, backend services, tests, and often `frontend/src/api/types.ts` may all need updates.

### 2. Signatures

Database signatures to inspect and keep aligned:

- Prisma model fields: `name Type`, `?` nullability, list fields, defaults, relations, and `@updatedAt`.
- Prisma enum values such as `MealType`, `FeedbackRating`, and `UserRole`.
- Indexes and constraints: `@@index`, `@@unique`, relation `onDelete` behavior, and `@@map` table names.
- Migration SQL under `backend/prisma/migrations/<timestamp>_<name>/migration.sql`.
- Generated Prisma Client types after `pnpm backend:prisma:generate`.

### 3. Contracts

Verify these contracts after schema changes:

- Persistence: required fields have defaults or are supplied by create services.
- Workspace scope: workspace-owned models include `workspaceId`, relation to `Workspace`, and `@@index([workspaceId])` unless there is a documented reason not to.
- Deletion semantics: `Restrict`, `Cascade`, or `SetNull` match service behavior and history-preservation requirements.
- API response: new/changed model fields are either intentionally hidden with `select` or represented in service return objects and frontend types.
- Seed/local setup: `backend/prisma/seed.ts` and `backend/README.md` stay accurate when required data changes.

### 4. Validation & Error Matrix

| Condition | Expected handling |
|---|---|
| New required DB field without service default/input | Typecheck or tests should fail; add DTO/service value or DB default |
| New unique constraint conflict | Catch Prisma `P2002` where user-facing conflict is expected |
| New workspace-owned model | Services must derive `workspaceId` from session user and filter every query |
| Relation deleted by parent | `onDelete` must match product behavior: preserve history with `SetNull`, delete owned children with `Cascade`, or block with `Restrict` |
| Enum value added/renamed | Update DTO validators, service logic, frontend union types, and UI labels |

### 5. Good/Base/Bad Cases

- Good: adding a workspace-owned model includes `workspaceId`, `@@index([workspaceId])`, a migration, service queries scoped by workspace, tests for cross-workspace 404, and frontend type updates if exposed.
- Base: adding an internal nullable column not returned by any API includes a migration, generated client update, and backend tests/typecheck.
- Bad: adding a required Prisma field without a default and forgetting to update `create` calls; runtime create requests fail even though the route shape looked unchanged.

### 6. Tests Required

For schema changes, add/update backend tests that assert:

- Create/update supplies required fields and maps nullable fields correctly.
- Workspace isolation for new models or relations.
- Unique constraints map to 409 where applicable.
- Delete behavior matches the chosen `onDelete` rule.
- Any frontend-visible field appears in response snapshots/assertions used by route tests.

Run:

```bash
pnpm backend:prisma:generate
pnpm backend:typecheck
pnpm backend:test
```

Run frontend checks too if exposed API types changed:

```bash
pnpm frontend:typecheck
pnpm frontend:build
```

### 7. Wrong vs Correct

#### Wrong

```prisma
model NewThing {
  id   String @id @default(cuid())
  name String
}
```

This omits workspace ownership in a project where business data is workspace-scoped, so services cannot enforce tenant isolation consistently.

#### Correct

```prisma
model NewThing {
  id          String    @id @default(cuid())
  workspaceId String
  name        String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([workspaceId])
  @@map("new_things")
}
```

Then service queries must use `where: { id, workspaceId }` after deriving `workspaceId` from the session user.

## Verification

When database code changes, run:

```bash
pnpm backend:typecheck
pnpm backend:test
```

When `schema.prisma` changes, also run:

```bash
pnpm backend:prisma:generate
pnpm backend:prisma:migrate
```
