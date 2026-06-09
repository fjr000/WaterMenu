# Backend Development Guidelines

> Project-specific rules for the WaterMenu NestJS backend in `backend/`.

WaterMenu backend is a small NestJS API using Prisma, PostgreSQL, session cookies, and e2e-style Jest/Supertest tests. These specs describe the patterns that exist in the codebase today.

## Pre-Development Checklist

Before editing backend code, read:

1. [Directory Structure](./directory-structure.md) — Nest module layout and where code belongs.
2. [Database Guidelines](./database-guidelines.md) — Prisma schema, workspace scoping, transactions, and migrations.
3. [Error Handling](./error-handling.md) — HTTP exceptions, validation, auth failures, and Prisma errors.
4. [Quality Guidelines](./quality-guidelines.md) — TypeScript, test style, commands, and review checks.
5. [Logging Guidelines](./logging-guidelines.md) — current logging policy and cleanup comments.
6. Shared guides in `.trellis/spec/guides/index.md` when a change crosses layers or repeats a pattern.

## Runtime Shape

- API prefix is `/api`; Swagger is mounted at `/api/docs` in `backend/src/app.setup.ts`.
- Session setup lives in `backend/src/session/session.config.ts` and uses PostgreSQL through `connect-pg-simple`.
- Business persistence uses Prisma models in `backend/prisma/schema.prisma`; the session table is infrastructure and is not a Prisma model.
- Tests normally build the real `AppModule`, override `PrismaService`, add an Express session middleware, call `setupApp(app)`, and exercise `/api/...` routes with Supertest.

## Verification Commands

Use root scripts unless you are already in `backend/`:

```bash
pnpm backend:typecheck
pnpm backend:lint
pnpm backend:test
```

If Prisma schema or migrations changed, also run:

```bash
pnpm backend:prisma:generate
```
