# Backend-to-Frontend Component Guidelines

> How backend states and errors should surface in existing frontend components.

## User-Facing Copy

The frontend UI is Chinese-first. Backend domain errors sometimes include short Chinese messages, but components often map status codes to friendlier copy.

Examples:
- `frontend/src/pages/login-page.tsx` maps 401 to `邮箱或密码错误`.
- `frontend/src/pages/invite-page.tsx` maps invite preview reasons (`EXPIRED`, `USED`, `REVOKED`, `UNAVAILABLE`) to explanatory Chinese messages.
- `frontend/src/components/members-panel.tsx` maps invite creation 409 to a capped/unavailable message.
- `frontend/src/components/dish-image-panel.tsx` describes backend upload rules: JPEG/PNG/WebP, 5MB, max 9 images.

If backend status/reason behavior changes, update these mappings and copy.

## Loading/Error/Empty Assumptions

Frontend components expect stable status semantics:

- 401 means unauthenticated/session expired and triggers global auth cleanup.
- 403 means authenticated but not allowed, such as non-admin invite management.
- 404 for cross-workspace resources avoids leaking existence.
- 409 indicates conflicts such as duplicate names/emails or capped invites.
- 400 indicates validation/domain input failure.

Changing these statuses can break UI branches even when TypeScript still passes.

## Response Fields Used by Components

Preserve or deliberately migrate these fields:

- `Dish.coverImage`, `mealRecordCount`, `feedbackRatingAverage` in dish cards and recommendation cards.
- `DishImage.fileUrl` in image panels and dish cover rendering.
- `Member.email?` hidden for non-admin UI.
- `WorkspaceInvite` list responses without `inviteLink`; create response includes one-time `inviteLink`.
- `InvitePreviewResponse` discriminated by `canAccept`.
- Recommendation candidate `reasons`, `score`, and `weight` for recommendation display.

Search component consumers before changing a field.

## Rule

Backend tasks that change visible behavior should include a quick UI audit: update component copy/branches when needed and run `pnpm frontend:typecheck`.
