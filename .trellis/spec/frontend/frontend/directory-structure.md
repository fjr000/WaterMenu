# Frontend Directory Structure

> How frontend code is organized in WaterMenu.

## Package Boundary

The frontend package lives in `frontend/` and is a Vite React app. Keep browser-only code here: React pages/components/hooks, API client/types, Tailwind theme, and Vite config.

Reference files:
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/src/main.tsx`
- `frontend/src/index.css`

## Source Layout

```text
frontend/src/
  api/
    client.ts      # fetch wrapper, base path, credentials, ApiError throwing
    types.ts       # API request/response/domain types used by hooks and components
  hooks/           # TanStack Query hooks and auth context hooks
  pages/           # route-level screens chosen by main.tsx
  components/      # reusable UI primitives, forms, panels, and feature cards
  index.css        # Tailwind v4 import, theme tokens, global styles/animations
  main.tsx         # QueryClient, AuthProvider, simple routing, React root
```

## API Layer

- `frontend/src/api/client.ts` is the only place that sets the `/api` base path and `credentials: "same-origin"`.
- `frontend/src/api/types.ts` contains frontend TypeScript representations of backend payloads.
- Hooks import `apiFetch` and API types; components should usually call hooks rather than `apiFetch` directly.

Examples:
- `frontend/src/hooks/use-dishes.ts`
- `frontend/src/hooks/use-invites.ts`
- `frontend/src/hooks/use-dish-images.ts`

Page-level exceptions exist for login/invite flows where the mutation and route outcome are tightly coupled:
- `frontend/src/pages/login-page.tsx`
- `frontend/src/pages/invite-page.tsx`

## Hooks

Put domain-specific server-state hooks in `frontend/src/hooks/use-<domain>.ts` or `.tsx` when React context/JSX is involved.

Examples:
- `use-auth.tsx` owns `AuthProvider`, `useAuth`, `authMeKey`, and unauthorized helper logic.
- `use-dishes.ts` owns dish list/create/update hooks.
- `use-dish-images.ts` owns image query/mutations and shared invalidation helper.
- `use-invites.ts` owns invite list/create/revoke/preview/accept hooks.

## Pages

Pages are top-level route screens selected in `main.tsx`:

- `LoginPage` for unauthenticated users.
- `HomePage` for authenticated app usage.
- `InvitePage` for `/invite/:token`.

The app currently uses lightweight pathname matching, not React Router. If adding routes, update `main.tsx` and keep the route parsing small unless a routing library is explicitly adopted.

## Components

`frontend/src/components/` contains both shared primitives and feature-specific panels:

- `ui.tsx` — shared `Button`, `SecondaryButton`, `Input`, `Select`, `Card`, `PageHeader`, `EmptyState`, `Spinner`, `ErrorBanner`.
- Form/panel components: `create-dish-form.tsx`, `dish-image-panel.tsx`, `meal-record-form.tsx`, `manual-meal-record-form.tsx`, `recipe-panel.tsx`, `members-panel.tsx`, `recommendation-panel.tsx`, `history-records-panel.tsx`, `recent-meal-records.tsx`.
- Small display components: `meal-tag.tsx`, `dish-cover-image.tsx`.

Keep a component near the feature it serves. Only move logic into `ui.tsx` when it is a reusable primitive already needed by multiple screens.

## Styling Files

Global visual tokens and animations live in `frontend/src/index.css` using Tailwind CSS v4 `@theme`. Component-specific layout and visual styling are expressed with Tailwind utility classes in TSX.

Do not add separate CSS modules/files unless a future task establishes that pattern.

## Avoid

- Do not create a new routing system for a small route addition unless needed.
- Do not duplicate API request/response types inside components; add them to `api/types.ts`.
- Do not call `fetch` directly in components or hooks; use `apiFetch` so cookies and errors are consistent.
- Do not create generic `utils/` for one-off helpers; current helpers are colocated with pages/components/hooks.
