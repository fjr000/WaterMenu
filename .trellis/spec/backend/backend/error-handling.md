# Backend Error Handling

> How WaterMenu backend represents validation, auth, domain, database, and file errors.

## Global Validation

`backend/src/app.setup.ts` installs a global `ValidationPipe` with:

```ts
whitelist: true,
forbidNonWhitelisted: true,
transform: true,
```

Implications for new DTOs:

- Use class-validator decorators on every accepted field.
- Query DTOs can rely on `transform: true` when they define explicit transforms/types.
- Unknown request fields should be rejected rather than silently accepted.
- Keep validation at the DTO boundary; services can assume DTO shape but still enforce domain invariants.

Reference DTOs:
- `backend/src/dishes/dto/create-dish.dto.ts`
- `backend/src/dishes/dto/list-dishes-query.dto.ts`
- `backend/src/meal-records/dto/list-meal-records-query.dto.ts`
- `backend/src/invites/dto/accept-invite.dto.ts`

## Authentication and Authorization

Use Nest HTTP exceptions from `@nestjs/common`:

- `UnauthorizedException` when a request has no valid session user or the session user no longer exists.
- `ForbiddenException` when the user exists but lacks a required role.
- `NotFoundException` for resources outside the current workspace as well as missing resources. This avoids leaking cross-workspace existence.

Examples:
- `backend/src/auth/auth.guard.ts` throws `UnauthorizedException` if `request.session?.userId` is absent.
- `backend/src/auth/auth.service.ts` throws `UnauthorizedException` for missing user or bad password.
- `backend/src/invites/invites.service.ts` throws `ForbiddenException` for non-admin invite creation/revocation.
- `backend/src/dishes/dishes.service.ts`, `meal-records.service.ts`, and `dish-images.service.ts` return 404 for cross-workspace resource access.

For protected controllers, apply `@UseGuards(AuthGuard)` at the controller level when all routes are protected (`DishesController`, `DishImagesController`) or at route level when public preview/accept endpoints coexist with protected endpoints (`InvitesController`).

## Domain Errors

Use status-specific exceptions:

- `BadRequestException` for malformed domain input that DTOs cannot fully express, invalid invite states during accept, image parsing failures, missing upload file, or illegal file paths.
- `ConflictException` for unique conflicts, logged-in user accepting invite, duplicate emails, or business caps such as max pending invites.
- `NotFoundException` for missing workspace-scoped resources.

Examples:
- `backend/src/dish-images/dish-images.service.ts` rejects missing files, unsupported MIME types, MIME/content mismatch, unreadable image dimensions, too many images, and unsafe storage paths.
- `backend/src/invites/invites.service.ts` returns conflict for max pending invites, existing logged-in user accepting an invite, and duplicate email.
- `backend/src/dishes/dishes.service.ts` maps duplicate dish names to 409.

Chinese user-facing messages already exist in several domain errors. Match nearby code: short Chinese messages are acceptable for frontend display, while generic exceptions without messages are used when frontend does not need detail.

## Prisma Errors

Catch Prisma errors only where the service can translate a known condition into an HTTP response.

Local pattern:

```ts
if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
  throw new ConflictException();
}
throw error;
```

Examples:
- `backend/src/dishes/dishes.service.ts` maps `P2002` duplicate dish names to `ConflictException`.
- `backend/src/invites/invites.service.ts` maps `P2002` duplicate email to `ConflictException('邮箱已被使用')`.
- Tests construct `new Prisma.PrismaClientKnownRequestError(..., { code: 'P2002' })` to verify this mapping in `backend/test/dishes.e2e-spec.ts` and `backend/test/members-invites.e2e-spec.ts`.

Do not catch broad Prisma errors just to hide them; unknown errors should propagate so tests/logs reveal them.

## Sessions

Session setup validates critical environment variables at startup:

- Missing/short `SESSION_SECRET` throws `Error('SESSION_SECRET 必须至少 32 个字符')`.
- Missing `DATABASE_URL` throws `Error('缺少 DATABASE_URL，无法初始化 PostgreSQL Session Store')`.

Reference: `backend/src/session/session.config.ts`.

When regenerating or destroying sessions, wrap callback APIs in promises and reject on callback errors:

- `AuthController.login` regenerates before setting `session.userId`.
- `AuthController.logout` destroys and clears the session cookie.
- `InvitesController.accept` regenerates after successful invite acceptance and then sets `session.userId`.

## File Handling Errors

For upload and file-serving code:

- Validate declared MIME type before expensive work.
- Validate actual image dimensions/content with `image-size`.
- Build storage keys with `path.posix.join` and resolve them under `UPLOADS_DIR`.
- Guard resolved paths with a prefix check before reading/deleting.
- If a DB transaction fails after a file write, delete the written file quietly.
- If a DB record exists but the local file is missing, return 404.

Reference: `backend/src/dish-images/dish-images.service.ts` and `backend/test/dish-images.e2e-spec.ts`.

## Test Expectations

Route tests should assert status codes for error behavior:

- Unauthorized protected endpoints return 401.
- Cross-workspace resource access returns 404.
- Non-admin invite management returns 403.
- Duplicate or capped operations return 409.
- Invalid DTO/domain input returns 400.

Existing examples:
- `backend/test/dishes.e2e-spec.ts`
- `backend/test/meal-records-feedback.e2e-spec.ts`
- `backend/test/dish-images.e2e-spec.ts`
- `backend/test/members-invites.e2e-spec.ts`
