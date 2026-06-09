# Frontend Development Guidelines

> Project-specific rules for the WaterMenu React/Vite frontend in `frontend/`.

WaterMenu frontend is a React 19 single-page app using Vite, Tailwind CSS v4, TanStack Query, React Hook Form, and Zod. It talks to the backend through cookie-authenticated `/api` requests.

## Pre-Development Checklist

Before editing frontend code, read:

1. [Directory Structure](./directory-structure.md) — package layout and file ownership.
2. [Component Guidelines](./component-guidelines.md) — page/component boundaries, shared UI, and styling patterns.
3. [Hook Guidelines](./hook-guidelines.md) — API hooks, query keys, mutations, and invalidation.
4. [State Management](./state-management.md) — local UI state, auth context, server state, and routing state.
5. [Type Safety](./type-safety.md) — API types, Zod forms, strict TS, and import style.
6. [Quality Guidelines](./quality-guidelines.md) — checks and review rules.
7. Shared guides in `.trellis/spec/guides/index.md` when a change crosses layers or repeats a pattern.

## Runtime Shape

- `frontend/src/main.tsx` creates the React root, QueryClient, auth provider, and simple route selection.
- `frontend/src/api/client.ts` owns `fetch` defaults and `ApiError` propagation.
- `frontend/src/api/types.ts` is the frontend mirror of backend response/request shapes.
- `frontend/src/hooks/` owns TanStack Query hooks per domain.
- `frontend/src/pages/` owns top-level screens.
- `frontend/src/components/` owns reusable panels, forms, cards, and UI primitives.
- `frontend/src/index.css` defines Tailwind theme tokens and global visual behavior.

## Verification Commands

Use root scripts unless already in `frontend/`:

```bash
pnpm frontend:typecheck
pnpm frontend:build
```

There is no frontend test suite configured yet; rely on TypeScript/build plus manual browser checks for UI changes.
