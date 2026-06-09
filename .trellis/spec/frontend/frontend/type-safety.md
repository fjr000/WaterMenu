# Frontend Type Safety

> TypeScript, API typing, Zod, and strictness patterns for WaterMenu frontend.

## Compiler Strictness

The frontend uses strict TypeScript in `frontend/tsconfig.app.json`:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedSideEffectImports: true`
- `erasableSyntaxOnly: true`
- `verbatimModuleSyntax: true`
- `allowImportingTsExtensions: true`

Imports include `.ts`/`.tsx` extensions for local modules, matching existing code:

```ts
import { apiFetch } from "../api/client.ts";
import { useAuth } from "../hooks/use-auth.tsx";
```

Use double quotes in frontend TypeScript/TSX, matching the current frontend style.

## API Types

`frontend/src/api/types.ts` is the central type file for backend-facing data:

- Enum-like unions: `MealType`, `FeedbackRating`, `UserRole`, `InvitePreviewReason`.
- Response interfaces: `MeResponse`, `Dish`, `DishImage`, `MealRecord`, `Recipe`, `RecommendationResponse`, `WorkspaceInvite`, etc.
- Request interfaces: `LoginRequest`, `CreateDishRequest`, `UpdateDishRequest`, `CreateMealRecordRequest`, `AcceptInviteRequest`, etc.
- `ApiError` class used by `apiFetch` and UI error mapping.

When backend response shapes change, update this file first, then hooks/components. Do not define duplicate ad-hoc API interfaces inside components.

## Typed API Calls

Always pass the expected response type to `apiFetch<T>`:

```ts
apiFetch<Dish[]>("/dishes")
apiFetch<MeResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) })
apiFetch<{ ok: boolean }>(`/dish-images/${id}`, { method: "DELETE" })
```

For mutations, type the mutation input through API request interfaces from `api/types.ts`.

Examples:
- `useCreateDish` accepts `CreateDishRequest`.
- `useUpdateDish` accepts `{ id: string; body: UpdateDishRequest }`.
- `useAcceptInvite` accepts `AcceptInviteRequest`.

## Nullable and Optional Fields

Mirror backend semantics precisely:

- Use `null` for database nullable response fields such as `description`, `note`, `dishId`, `coverImage`, and `feedbackRatingAverage`.
- Use optional properties for fields that may be omitted in request bodies, such as `description?`, `mealTypes?`, `isActive?`, and `note?`.
- `Member.email` is optional because backend hides emails from non-admin users.
- Invite preview is a discriminated union on `canAccept`.

Components should check these fields before rendering. Examples:
- `DishCard` renders description only if present.
- `InvitePage` narrows `previewQuery.data` with `canAccept` before reading `workspaceName` or `reason`.
- `MemberRow` renders email only for admin view and when `member.email` exists.

## Forms and Zod

Use Zod with React Hook Form for form validation:

- Define schema near the form.
- Use `zodResolver(schema)`.
- Derive `type FormValues = z.infer<typeof schema>`.
- Refine multi-field constraints in Zod, as `InvitePage` does for matching passwords.
- Trim strings before submit when the backend expects normalized values.

Examples:
- `frontend/src/pages/login-page.tsx`
- `frontend/src/pages/invite-page.tsx`
- `frontend/src/components/create-dish-form.tsx`

## React Types

Use React types explicitly where needed:

- Import `type ReactNode` for component children.
- Use native prop types such as `ButtonHTMLAttributes<HTMLInputElement>` and `InputHTMLAttributes<HTMLInputElement>` in `ui.tsx`.
- Use local prop interfaces/types for feature components.

Examples:
- `frontend/src/components/ui.tsx`
- `frontend/src/components/dish-image-panel.tsx`
- `frontend/src/pages/home-page.tsx`

## Error Typing

Mutation/query errors are `unknown`. Narrow them before status-specific handling:

- `isUnauthorized(error)` checks `error instanceof ApiError && error.status === 401`.
- `MembersPanel.getCreateInviteError` checks `ApiError` status 409.
- `InvitePage.getAcceptError` checks `ApiError` status 409 and 400.

Do not assume `error` has a `status` property without `instanceof ApiError`.

## Avoid

- Do not use `any` for API data or form values.
- Do not use string enums when local code uses union literal types.
- Do not widen `MealType`, `UserRole`, or `FeedbackRating` to plain `string` unless the value is untrusted input being validated.
- Do not ignore `undefined` vs `null`; the backend distinguishes omitted update fields from explicit nullable values.
- Do not add unused props, imports, or helpers; the compiler rejects them.
