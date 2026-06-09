# Frontend Hook Guidelines

> TanStack Query, API hook, auth, and mutation patterns.

## API Fetch Wrapper

All API calls should use `apiFetch<T>` from `frontend/src/api/client.ts`.

Current behavior:

- Prepends `/api` to the path.
- Sends `credentials: "same-origin"` for session-cookie auth.
- Adds `Content-Type: application/json` only when the body is a string and no content type is already set.
- Throws `ApiError(status, message)` for non-2xx responses.
- Parses successful responses with `response.json()`.

This lets JSON requests and `FormData` uploads share one client. Do not manually set `Content-Type` for `FormData`; the browser must add the multipart boundary.

## Query Keys

Use small array query keys with stable domain prefixes:

- `authMeKey = ["auth", "me"] as const` in `use-auth.tsx`.
- `dishesKey(mealType) = ["dishes", mealType ?? null]` in `use-dishes.ts`.
- `dishImagesKey(dishId) = ["dish-images", dishId]` in `use-dish-images.ts`.
- `useMembers` uses `["members"]`.
- `useInvites` uses `["invites"]`.
- `useInvitePreview` uses `["invite-preview", token]`.

When adding a query, choose a prefix that can be invalidated by domain.

## Query Defaults and Unauthorized Handling

`frontend/src/main.tsx` creates one `QueryClient` with:

- global query and mutation `onError` handlers that clear auth state on 401.
- `queries.retry = false`.
- `queries.refetchOnWindowFocus = false`.

Use `isUnauthorized(error)` from `use-auth.tsx` for auth-specific error checks. On 401, `handleUnauthorizedError` sets `authMeKey` to `null` and removes all non-auth queries.

Do not add per-query retry behavior unless a task explicitly needs it.

## Hook Shape

Keep domain server-state hooks in `frontend/src/hooks/` and expose simple functions:

- `useDishes(mealType?)`, `useCreateDish()`, `useUpdateDish()`.
- `useDishImages(dishId, enabled?)`, `useUploadDishImage(dishId)`, `useSetDishImageCover(dishId)`, `useDeleteDishImage(dishId)`.
- `useMembers()`.
- `useInvites(enabled)`, `useCreateInvite()`, `useRevokeInvite()`, `useInvitePreview(token)`, `useAcceptInvite(token)`.

Hooks should hide URL construction, HTTP methods, request serialization, and cache invalidation from components.

## Mutations and Invalidation

Invalidate every query family affected by a mutation:

- Creating/updating a dish invalidates `queryKey: ["dishes"]`.
- Uploading, setting cover, or deleting a dish image invalidates both `dishImagesKey(dishId)` and `queryKey: ["dishes"]` because dish cover fields can change.
- Creating/revoking invites invalidates `queryKey: ["invites"]`.
- Logout sets auth to `null` and removes all non-auth queries.

Use `void queryClient.invalidateQueries(...)` when the promise is intentionally not awaited, matching existing hooks.

For mutations that need component-specific behavior, pass `onSuccess` callbacks from the component:

- `CreateDishForm` closes after create succeeds.
- `EditDishForm` closes after update succeeds.
- `MembersPanel` stores the newly returned one-time invite link.
- `InvitePage` sets auth data and redirects after accept.

## Enabled Queries

Use `enabled` for conditional server calls:

- `useInvites(isAdmin)` avoids invite-list requests for non-admin users.
- `useDishImages(dish.id, Boolean(dish.coverImage))` in `DishCard` avoids extra image-list requests when no cover exists.
- `useRecipes(dish.id, recipesOpen)` loads recipes only when the section is expanded.

## URL Parameters

Build query strings with `URLSearchParams`, as in `useDishes`. Add params only when values are present. This avoids manual string bugs and empty filters.

## Uploads

For file uploads:

- Build `FormData` inside the mutation function.
- Use `formData.set("file", file)` to match the backend's `FileInterceptor('file')`.
- Do not JSON-stringify file uploads.
- Invalidate both image and dish queries after success.

Reference: `frontend/src/hooks/use-dish-images.ts` and `frontend/src/components/dish-image-panel.tsx`.

## Avoid

- Do not call `fetch` directly outside `api/client.ts`.
- Do not duplicate mutation invalidation in many components; put shared invalidation in the hook.
- Do not forget to invalidate parent list/card queries when a detail mutation changes card-visible fields.
- Do not put UI-only state in query cache.
- Do not make admin-only requests when `auth.user.role !== "ADMIN"`; use `enabled`.
