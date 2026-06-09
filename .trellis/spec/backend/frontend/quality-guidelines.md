# Backend-to-Frontend Quality Guidelines

> Cross-layer checks for backend changes with frontend impact.

## Required Cross-Layer Checks

For backend-only internal changes, backend checks may be enough. For backend changes that affect routes, DTOs, response bodies, auth/session behavior, upload constraints, or visible errors, also verify the frontend.

Recommended command set:

```bash
pnpm backend:typecheck
pnpm backend:test
pnpm frontend:typecheck
pnpm frontend:build
```

Add `pnpm backend:lint` when TypeScript source style changed broadly.

## Search Before Changing Contracts

Before changing a backend route or field, search frontend consumers:

```bash
grep -R "fieldOrRouteName" frontend/src
```

Important consumer clusters:

- `frontend/src/api/types.ts`
- `frontend/src/hooks/`
- `frontend/src/pages/home-page.tsx`
- `frontend/src/pages/login-page.tsx`
- `frontend/src/pages/invite-page.tsx`
- `frontend/src/components/`

## Tests and Manual Checks

Backend route tests should assert the status/shape that frontend relies on. Existing examples:

- `backend/test/dishes.e2e-spec.ts` covers dish defaults, filters, duplicate conflicts, stats, and workspace isolation.
- `backend/test/dish-images.e2e-spec.ts` covers upload constraints and image file URLs.
- `backend/test/members-invites.e2e-spec.ts` covers email visibility, admin-only invite management, preview reasons, invite accept session behavior, and duplicate/used invites.

For UI-affecting behavior, manually check the matching panel/page if possible.

## Avoid

- Do not change a backend field name and leave frontend types compiling by accident through `any`; frontend should stay strictly typed.
- Do not return a non-JSON success body without updating `apiFetch` or the hook, because it currently calls `response.json()`.
- Do not use 401 for permission errors; it logs the frontend out.
- Do not expose raw backend errors that should be mapped to user-friendly Chinese UI copy.
