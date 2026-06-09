# Frontend Component Guidelines

> Component, form, accessibility, and styling patterns for WaterMenu frontend.

## Component Boundaries

Use pages for top-level orchestration and feature components for panels/forms/cards.

- `frontend/src/pages/home-page.tsx` owns tab selection, selected dish state, and composition of recommendation, dishes, history, and members sections.
- `frontend/src/pages/login-page.tsx` owns the login form and auth cache update.
- `frontend/src/pages/invite-page.tsx` owns invite preview/accept flow and redirect after success.
- Feature components such as `DishImagePanel`, `MembersPanel`, `RecommendationPanel`, `RecipePanel`, and `HistoryRecordsPanel` own the UI for one interaction area.

When a component grows feature-specific state and mutations, keep it in `components/<feature>.tsx` rather than adding more logic to `HomePage`.

## Shared UI Primitives

Use `frontend/src/components/ui.tsx` for repeated primitives:

- `Button` for primary red rounded actions.
- `SecondaryButton` for white/amber secondary actions.
- `Input` and `Select` for form controls.
- `Card` for rounded paper-like containers.
- `PageHeader`, `EmptyState`, `Spinner`, and `ErrorBanner` for recurring page states.

These components accept `className` extensions and native button/input/select props. Prefer composing these primitives before creating a new button/input style.

Examples:
- `LoginPage` uses `Card`, `Input`, and `Button`.
- `MembersPanel` uses `Card`, `Button`, `SecondaryButton`, `EmptyState`, `ErrorBanner`, and `Spinner`.
- `HomePage` uses `PageHeader`, `Card`, `Button`, `SecondaryButton`, and `ErrorBanner`.

## Styling Direction

The visual language is warm, food/journal themed, rounded, tactile, and Chinese-user-facing:

- Warm paper background and tomato/amber/olive accents from `frontend/src/index.css` `@theme` tokens.
- Rounded cards (`rounded-2xl`, `rounded-3xl`), soft borders, translucent white/amber backgrounds, and custom shadows.
- Motion is subtle: small translate-on-hover, `animate-paper-enter`, and `animate-gentle-spin`.
- Global `prefers-reduced-motion` handling in `index.css` disables animations/transitions.

Use Tailwind utility classes inline in TSX. Do not add CSS modules for component styling under the current pattern.

## Forms

Forms use React Hook Form plus Zod when validation is non-trivial.

Examples:
- `frontend/src/pages/login-page.tsx` defines a Zod schema for email/password and maps auth errors to Chinese messages.
- `frontend/src/pages/invite-page.tsx` validates name/email/password/confirmPassword and refines matching passwords.
- `frontend/src/components/create-dish-form.tsx` uses a shared internal `DishForm` for create/edit and keeps meal type selection in local state.

Form conventions:

- Keep schemas near the form component.
- Derive `FormValues` with `z.infer<typeof schema>`.
- Trim values before submitting when the backend expects normalized text.
- Use `Input` and explicit `<label htmlFor=...>` pairs.
- Show field errors next to the field and mutation/server errors in a red rounded banner.
- Disable submit buttons while mutations are pending and use Chinese pending labels such as `登录中…`, `创建中…`, `保存中…`.

## Loading, Empty, and Error States

For queries, render all meaningful states:

- `Spinner` while loading.
- `ErrorBanner` with a retry callback when refetch is possible.
- `EmptyState` when the query succeeds with no items.
- Main content when data is present.

Examples:
- `MembersPanel` handles loading/error/empty/member-list states.
- `DishImagePanel` handles loading/error/empty/image-grid states.
- `HomePage` handles dish query loading/error/empty states.

## Accessibility and Interaction

Follow existing accessible patterns:

- Use `type="button"` on non-submit buttons inside forms or interactive panels.
- Add `aria-label`/`title` for icon-like buttons (`DishToolButton` in `HomePage`).
- Use `aria-current="page"` for active tab buttons in desktop/mobile tab navs.
- Use `aria-expanded` and `aria-controls` for collapsible recipe sections.
- Use `htmlFor`/`id` labels for form fields and switches.
- Use `loading="lazy"` for dish images.

## Component State

Keep purely visual/interaction state local:

- Active tab, selected dish panels, and edit/create toggles in `HomePage`.
- Selected upload file and input ref in `DishImagePanel`.
- Copy message and new invite display in `MembersPanel`.
- Confirmation state for invite revocation in `InviteRow`.

Move state into hooks/context only when it is server state or shared app state.

## Avoid

- Do not introduce a new design language or generic SaaS styling; match the warm WaterMenu theme.
- Do not hardcode new colors outside Tailwind classes/theme tokens unless a one-off effect already exists nearby.
- Do not skip loading/error/empty states for server data.
- Do not expose backend technical messages directly when existing UI maps errors to user-friendly Chinese copy.
- Do not make icon-only controls inaccessible; provide labels/titles.
