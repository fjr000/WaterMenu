# Frontend State Management

> How WaterMenu separates server state, auth state, local UI state, and route state.

## Server State

Server state belongs in TanStack Query. Domain hooks in `frontend/src/hooks/` should own queries/mutations and cache invalidation.

Examples:
- Dishes: `frontend/src/hooks/use-dishes.ts`
- Dish images: `frontend/src/hooks/use-dish-images.ts`
- Members/invites: `frontend/src/hooks/use-members.ts`, `frontend/src/hooks/use-invites.ts`
- Auth me query: `frontend/src/hooks/use-auth.tsx`

Do not copy query results into local state unless the user is editing a draft or selecting an item.

## Auth State

Auth is represented by the `authMeKey` query plus `AuthContext` in `frontend/src/hooks/use-auth.tsx`.

`AuthProvider` exposes:

- `user`
- `workspace`
- `isLoading`
- `logout()`

`useAuth()` must be called under `AuthProvider` and throws if used outside it. `main.tsx` wraps the app in `QueryClientProvider` then `AuthProvider`.

Login and invite acceptance update `authMeKey` directly:

- `LoginPage` sets the query data to the `MeResponse` returned by `/auth/login`.
- `InvitePage` sets the query data to the `MeResponse` returned by invite accept, then redirects to `/`.

Logout posts to `/auth/logout`, ignores logout request failures, then clears auth and removes non-auth queries.

## Unauthorized State

`main.tsx` handles 401 globally through QueryCache and MutationCache `onError` callbacks. On 401:

1. Set `authMeKey` to `null`.
2. Remove all queries whose first key segment is not `"auth"`.

This prevents stale workspace data from remaining visible after session expiry.

If a page needs custom auth error copy, use `isUnauthorized(error)` but do not bypass the global cleanup behavior.

## Local UI State

Use `useState` for transient UI state that is not server truth:

- `HomePage`: active tab, current meal filter, visible create form, selected dish for record/recipe/image/edit panels.
- `DishCard`: active switch IDs, recipe collapse state, local mutation pending/error rendering.
- `DishImagePanel`: selected file and file input ref.
- `MembersPanel`: newly created one-time invite link and copy feedback.
- `InviteRow`: revoke confirmation state.
- `LoginPage`: server error display text.

Keep this state close to the component that renders it. Do not promote it to context unless multiple distant component trees need it.

## Routing State

The app currently uses lightweight pathname state instead of React Router:

- `usePathname()` in `frontend/src/main.tsx` listens to `popstate` and stores `window.location.pathname`.
- `getInviteToken(pathname)` matches `/invite/:token`.
- `AppRoutes` chooses `InvitePage`, `LoginPage`, or `HomePage` based on invite token and auth state.

For small route additions, extend this logic. If a future task introduces a routing library, update this spec and migrate intentionally.

## Derived UI State

Prefer deriving display state from current props/query data instead of storing duplicates:

- `DishCard` derives `images` from `imagesQuery.data` or `dish.coverImage` fallback.
- `DishCard` derives `ratingText` from `dish.feedbackRatingAverage?.toFixed(1)`.
- `MembersPanel` derives admin vs member view from `auth.user.role` passed as `isAdmin`.
- Recommendation panel state is reset by calling mutation `reset()` methods, not by shadow-copying results.

## Query Cache Hygiene

When a mutation can affect recommendation results or card fields, reset/invalidate related data:

- Dish create/update invalidates dishes.
- Dish image mutations invalidate dish images and dishes.
- Meal record changes trigger callbacks that reset recommendation mutations in `HomePage`.
- Logout removes all non-auth cached state.

Before adding a mutation, identify every visible panel that may now show stale data.

## Avoid

- Do not introduce Redux/Zustand/context for server state; TanStack Query already owns it.
- Do not persist UI state to localStorage unless a task explicitly requires persistence.
- Do not keep auth user/workspace in separate React state outside `authMeKey`.
- Do not leave non-auth query data cached after logout or 401.
- Do not duplicate route state in multiple places.
