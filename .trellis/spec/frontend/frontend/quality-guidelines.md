# Frontend Quality Guidelines

> Checks, consistency rules, and review expectations for WaterMenu frontend changes.

## Required Commands

Run frontend checks after changing frontend code:

```bash
pnpm frontend:typecheck
pnpm frontend:build
```

There is no frontend test runner configured in `frontend/package.json` today. For behavior-heavy changes, also do a manual browser check with:

```bash
pnpm frontend:dev
```

and the backend dev server if API behavior is involved.

## Keep Backend and Frontend Contracts in Sync

The frontend manually mirrors backend API contracts in `frontend/src/api/types.ts`. Before changing any API response, request body, route, or status-driven behavior, search both sides.

Examples:
- Dish card fields come from backend services and are consumed through `Dish` in `api/types.ts`, `HomePage`, and recommendation components.
- Invite preview reasons are returned by `InvitesService` and mirrored as `InvitePreviewReason` plus `reasonText` in `InvitePage`.
- Member email visibility depends on backend `MembersService` and frontend `Member.email?: string`.
- Image upload constraints are enforced in `DishImagesService` and described in `DishImagePanel` UI copy.

Run the cross-layer thinking guide when changing a shared API shape: `.trellis/spec/guides/cross-layer-thinking-guide.md`.

## Import and Formatting Style

- Use double quotes in frontend TS/TSX.
- Keep local import paths with `.ts`/`.tsx` extensions.
- Use `type` imports for types from React and API modules.
- Keep components and hooks small enough to scan; extract feature components when page code becomes hard to follow.
- Prefer early helper functions for repeated UI formatting such as `formatDate`, but keep them local if only one component uses them.

## Query and Mutation Quality

For each new server interaction, verify:

- It uses `apiFetch<T>`.
- It has a stable query key if it is a query.
- Mutations invalidate every affected query family.
- Admin/conditional queries use `enabled` instead of firing and relying on backend rejection.
- 401 behavior flows through the global QueryClient error handlers.
- User-facing errors are mapped to Chinese copy instead of raw technical text.

## UI State Quality

For each query-driven UI, include:

- Loading state.
- Error state with retry when possible.
- Empty state when applicable.
- Success rendering.
- Disabled/pending state for mutating buttons.

Existing examples to copy:
- `MembersPanel` for list/admin conditional UI.
- `DishImagePanel` for upload plus image grid.
- `HomePage` dishes tab for query loading/error/empty/list.
- `InvitePage` for branching on auth, preview loading/error/invalid/valid states.

## Accessibility and Mobile Checks

The UI is mobile-first and relies on bottom navigation on small screens.

Before finishing UI changes, check:

- Buttons inside forms have correct `type`.
- Icon-like buttons have accessible labels.
- Inputs are associated with labels.
- Active tab/collapsible state uses ARIA where existing patterns do.
- Layout works at mobile widths (`min-width: 320px` is set globally).
- New motion does not bypass the global `prefers-reduced-motion` rules.

## Browser API Safety

Browser APIs appear in a few places:

- `navigator.clipboard.writeText` in `MembersPanel` is wrapped in `try/catch` with fallback copy text.
- `window.location.pathname`, `popstate`, and `window.location.assign` are used in `main.tsx`/`InvitePage` because this is a browser-only Vite app.
- File input APIs are localized to `DishImagePanel`.

When adding browser APIs, handle failure paths and keep them inside components/hooks that only run in the browser.

## Avoid

- Do not add a new state management, routing, styling, or request library without explicit task scope.
- Do not bypass the shared UI primitives for common controls.
- Do not show stale cache after mutations; invalidate or reset as needed.
- Do not introduce English-only user-facing copy into the Chinese UI unless it is a brand/technical term already used.
- Do not rely only on backend validation for form UX when the form already uses Zod locally.
