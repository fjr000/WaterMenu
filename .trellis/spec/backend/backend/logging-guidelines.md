# Backend Logging Guidelines

> Current logging and diagnostic conventions for WaterMenu backend.

## Current State

WaterMenu backend does not have an application logging abstraction yet. There is no project logger service, no structured log format, and no request logging middleware in `backend/src/`.

Nest's default startup/error behavior is used. Unknown exceptions are allowed to propagate through Nest's standard exception layer rather than being caught and logged manually.

Reference files:
- `backend/src/main.ts`
- `backend/src/app.setup.ts`
- `backend/src/session/session.config.ts`

## What To Do Today

- Prefer clear exceptions and tests over ad-hoc logging.
- Let known domain failures become Nest HTTP exceptions (`BadRequestException`, `ConflictException`, `NotFoundException`, etc.).
- Let unknown failures propagate so they remain visible during tests and runtime diagnostics.
- Keep operational startup validation as explicit thrown `Error`s when the app cannot safely start, as in `setupSession`.

## Comments Instead of Logs

The only current non-obvious diagnostic-style comment is in cleanup code:

- `backend/src/dish-images/dish-images.service.ts` catches `fs.unlink` failure in `deleteFileQuietly` and comments that a missing file should not block the database result.

This is appropriate for intentionally ignored cleanup failures. If you ignore an error, add a short comment explaining why it is safe.

## Avoid

- Do not add `console.log`/`console.error` for normal request flow.
- Do not add one-off logging libraries or logger wrappers until the project adopts a logging strategy.
- Do not catch errors only to print and rethrow them.
- Do not log secrets or sensitive values: passwords, password hashes, session secrets, session IDs, raw invite tokens, invite token hashes, or cookies.

## If Logging Is Introduced Later

If a future task adds structured logging, update this file with the chosen logger, fields, redaction rules, and test expectations. Until then, keep backend code consistent with the current no-custom-logging style.
