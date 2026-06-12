# Refactor History Records to Dish Management Integration

## Goal

Refactor the history records feature to integrate with dish management, requiring records to reference existing dishes with fuzzy search support, and consolidate all dish-related operations (images, variants, editing) within dish cards instead of moving controls to the top.

## What I Already Know

From codebase inspection:

**Current Architecture**:
- `ManualMealRecordForm` accepts free-form title input (line 13: `title: z.string().trim().min(1)`)
- `HistoryRecordsPanel` filters by `dishId` from a dropdown (line 176-189)
- Dish images managed via `DishImagePanel` component with upload/delete/set-cover operations
- Dish variants managed via `DishVariantsPanel` component with add/toggle-active operations
- `MealRecordForm` creates records from existing dishes with variant selection
- Records can be dish-linked (`dishId` field) or standalone (free-form title)

**Key Files**:
- Frontend: `manual-meal-record-form.tsx`, `history-records-panel.tsx`, `meal-record-form.tsx`, `dish-image-panel.tsx`, `dish-variants-panel.tsx`, `recent-meal-records.tsx`
- Backend: `dishes.controller.ts`, `meal-records.controller.ts`, DTOs in respective folders
- API Types: `frontend/src/api/types.ts`

**Current Flow**:
1. Manual record creation accepts any title (no dish requirement)
2. Image gallery accessed via separate button → opens `DishImagePanel` in a modal/panel
3. Variants/versions accessed via separate button → opens `DishVariantsPanel`
4. Editing record moves form to the top of the card (line 221-233 in `recent-meal-records.tsx`)

## Requirements

### 1. Replace Title Field with Dish Selection

- Replace `ManualMealRecordForm` free-text title input with dish autocomplete/combobox
- Implement client-side fuzzy search using `fuse.js` or similar (search dish names)
- Show "创建新菜品：{search term}" option when no match found
- On creating new dish: inline meal type selector → create dish → auto-select it
- All meal records MUST reference an existing dish (`dishId` required, `title` field removed from schema)
- Preserve variant selection in manual record form (add variant dropdown like `MealRecordForm`)
- **Breaking change**: Remove `title` field from `MealRecord` model entirely (database migration with data cleanup)

### 2. Remove Image Gallery Button & Inline Display

- Remove separate image gallery button/trigger that opens `DishImagePanel`
- Display dish images inline in card:
  - Horizontal scrollable image thumbnails
  - Last position shows "+ 添加图片" placeholder
  - Click placeholder → file upload
  - Click thumbnail → fullscreen preview with "设为封面" / "删除" buttons
- Show placeholder if dish has no images

### 3. Consolidate Operations Within Card

- All dish operations happen within the card boundary (no moving to top, no separate panels):
  - Edit meal record: form expands within card (not moved to top)
  - Image management: inline horizontal gallery (per requirement 2)
  - Variant management: "管理版本" button expands variant panel inline
- Remove separate `DishImagePanel` and `DishVariantsPanel` triggers in history context

### 4. Unify Variant and Recipe Description

- Add `description` field (text, nullable) to `DishVariant` model (backend schema migration)
- Variant structure:
  - **Name** (plain text): version identifier (e.g., "外卖店A", "家常版")
  - **Description** (Markdown, optional): recipe/做法 for this variant
- Display in card:
  - Show variant name
  - Collapse recipe description by default
  - Click "查看做法" to expand and render Markdown
  - If no description, hide button
- Update `DishVariantsPanel` to include description field (textarea with Markdown support)

## Acceptance Criteria

- [ ] Manual meal record form uses dish autocomplete with fuzzy search (no free-text title)
- [ ] Search supports partial matching and shows "创建新菜品：{term}" when no match
- [ ] Creating new dish shows inline meal type selector, creates dish, auto-selects it
- [ ] Manual record form includes variant selection dropdown (like `MealRecordForm`)
- [ ] All new meal records have `dishId` (required field, `title` removed from schema)
- [ ] Backend: `meal_records.title` column removed, `dishId` is NOT NULL
- [ ] Backend DTOs updated: `CreateMealRecordDto` no longer accepts `title`
- [ ] Dish card displays horizontal scrollable image gallery with "+ 添加图片" placeholder
- [ ] Clicking image thumbnail opens fullscreen preview with "设为封面" / "删除" actions
- [ ] Clicking placeholder triggers image upload
- [ ] Separate image gallery button/panel is removed from history context
- [ ] Edit record form expands within card boundary (not moved to top)
- [ ] "管理版本" button in card expands inline variant management panel
- [ ] Variant management supports add/edit/enable/disable operations inline
- [ ] `DishVariant` model has `description` field (text, nullable) in database
- [ ] Variant edit form includes description textarea with Markdown preview
- [ ] Variant display shows "查看做法" button (collapsed by default, renders Markdown on expand)
- [ ] If variant has no description, "查看做法" button is hidden

## Definition of Done

- Database migration: add `dish_variants.description` column, remove `meal_records.title` column, make `meal_records.dishId` NOT NULL
- Backend DTOs updated (`CreateDishVariantDto`, `UpdateDishVariantDto`, `CreateMealRecordDto`, `UpdateMealRecordDto`)
- Frontend API types updated with `DishVariant.description` and removed `MealRecord.title`
- Component tests updated/added for new components (dish autocomplete, inline gallery, variant description)
- Lint / typecheck / CI green
- Manual testing: create record with new dish, upload images, manage variants inline, view Markdown recipes

## Out of Scope

- Dish management page redesign (only history records context affected)
- Markdown editor toolbar (plain textarea is sufficient)
- Image editing (crop, filter, etc.)
- Variant sorting/reordering
- Recipe templates or structured recipe fields beyond Markdown
- Pinyin search support (can be added later via fuse.js extended search)
- Backward compatibility with standalone meal records (breaking change accepted, test data can be wiped)

## Technical Approach

### Backend Changes

1. **Database Migration**:
   - Add `description TEXT NULL` column to `dish_variants` table
   - **Breaking change**: Remove `title` column from `meal_records` table
   - Make `dishId` NOT NULL in `meal_records` (add foreign key constraint if missing)
   - Clean up test data: delete orphaned records or associate with dishes

2. **DTOs**:
   - Update `CreateDishVariantDto`: add optional `description?: string`
   - Update `UpdateDishVariantDto`: add optional `description?: string | null`
   - Update `CreateMealRecordDto`: remove `title`, make `dishId` required
   - Update `UpdateMealRecordDto`: remove `title`
   - Update entity serialization to include new fields

### Frontend Changes

1. **Dish Autocomplete Component** (new):
   - Use `@headlessui/react` Combobox or similar for autocomplete
   - Integrate `fuse.js` for client-side fuzzy search on dish names
   - Show "创建新菜品：{term}" option when no match
   - On create: prompt meal type selection → call `useCreateDish` → auto-select

2. **Manual Meal Record Form**:
   - Replace title input with dish autocomplete
   - Add variant dropdown (reuse logic from `MealRecordForm`)
   - Update schema: remove `title`, add required `dishId` and optional `variantId`

3. **Inline Image Gallery** (new component):
   - Horizontal scroll container with thumbnails
   - Last slot: "+ 添加图片" button → triggers file input
   - Click thumbnail → open fullscreen modal with image preview + actions
   - Reuse existing hooks: `useDishImages`, `useUploadDishImage`, `useSetDishImageCover`, `useDeleteDishImage`

4. **Inline Variant Management**:
   - Extract variant list + form from `DishVariantsPanel` into reusable components
   - Add description textarea with live Markdown preview (use `react-markdown`)
   - Embed in meal record card with expand/collapse state

5. **Card Layout**:
   - Move edit form inline (remove "moves to top" behavior)
   - Default visible: basic info (dish name, meal type, time, note) + horizontal image gallery + feedback buttons
   - Collapsible sections: "编辑" button expands edit form, "管理版本" button expands variant management panel
   - Each collapsible section is independent (can expand/collapse separately)
   - Images always visible (not collapsible) for quick visual reference

## Technical Notes

- Use `fuse.js` for fuzzy search (already in ecosystem, lightweight)
- Use `react-markdown` for Markdown rendering (common in React apps)
- Backend: Prisma migration for adding `description` field and removing `title` field
- Frontend: Update API client types from backend schema

## Design Specifications

**Design Language**: Warm paper/recipe card aesthetic with tomato red primary, olive green accent, soy brown neutrals.

### 1. Dish Autocomplete
- Dropdown: Card-style (rounded-2xl, backdrop-blur, shadow)
- Option hover: amber-50 background
- "创建新菜品：{term}": amber-100 background + red text for distinction
- Inline meal type selector: slide-up animation, round multi-select buttons, pre-select LUNCH + DINNER

### 2. Horizontal Image Gallery
- Layout: horizontal scroll with snap-scroll, overflow-x-auto + flex + flex-nowrap
- Thumbnails: square (w-24 h-24 or w-28 h-28), rounded-xl, gap-3, hover scale-105
- Placeholder: dashed border (border-slate-300), red + icon/text, same size as thumbnails
- Cover badge: amber-500 bg + white text, rounded-full, text-xs, top-left corner
- Position: below dish name, always visible (not collapsible)

### 3. Fullscreen Image Preview Modal
- Background: rgba(37, 23, 15, 0.85) semi-transparent
- Image: centered, max-w-4xl, maintain aspect ratio
- Action bar: white bg with backdrop-blur, rounded-2xl, shadow-lg
- Buttons: "设为封面" (SecondaryButton) + "删除" (red border)
- Animation: fade-in + scale-in (280ms)

### 4. Collapsible Sections (Edit Form + Variant Management)
- Trigger buttons: SecondaryButton style, icon + text, expanded state → amber-100 bg + "收起"
- Expanded content: slide-up animation, amber-50/55 or white/75 bg, rounded-2xl, p-3/p-4
- Visual separation: subtle border (border-amber-200)
- Edit form: inline expansion (not moved to top), vertical stack with gap-3
- Variant panel: version list as rounded-xl mini-cards, recipe description collapsed by default with underlined text link "查看做法"

### 5. Markdown Recipe Rendering
- Container: slate-100/50 bg, rounded-xl, p-3
- Typography: font-sans, text-sm, leading-relaxed
- Headings: font-semibold, text-red-600
- Lists: custom red dot markers
- Links: text-red-500 + underline

### 6. Card Layout Hierarchy (Top to Bottom)
1. Basic info (dish name, meal type, time, note): font-serif title, text-lg font-semibold
2. Image gallery (always visible): mt-3, show placeholder if empty
3. Feedback buttons (always visible): mt-3, round buttons
4. Collapsible actions (edit + manage variants): mt-3, mutually exclusive expansion
5. Delete confirmation (conditional): mt-3, red warning box

**Design Constraints**:
- Mobile: reduce padding/font sizes, thumbnails w-20 h-20
- Only one collapsible section expanded at a time (edit OR variant management)
- Respect prefers-reduced-motion
- Maintain visual hierarchy with background colors, spacing, border-radius



### Fuzzy Search Implementation
**Decision**: Client-side fuzzy search using `fuse.js` or similar library.
**Rationale**: Dish list is already loaded for filtering, typically <100 items, instant response.

### Inline Dish Creation Flow
**Decision**: Minimal quick creation flow with inline meal type selector.
**How it works**: 
- Show "创建新菜品：{search term}" option in dropdown when no match found
- On selection, expand inline meal type selector below dropdown (multi-select buttons like `CreateDishForm`)
- After user selects meal types, auto-create dish and select it
- User can add details (description, images, variants) later via dish management
**Interaction**: Keep selector inline (not modal) to maintain flow continuity. Pre-select LUNCH and DINNER as defaults.
**Rationale**: Keep recording flow fast and uninterrupted. Users' primary goal is to log meals, not manage dish details. Inline selector avoids modal disruption while still allowing meal type confirmation.

### Inline Image Management Scope
**Decision**: Horizontal scrollable gallery with placeholder for adding new images.
**Layout**:
- Dish card displays horizontal scrolling image list
- Existing images shown as thumbnails (square or fixed aspect ratio)
- Last position always shows "+ 添加图片" placeholder
- Clicking placeholder triggers file upload
**Image Operations**:
- Click thumbnail → opens fullscreen preview with "设为封面" / "删除" buttons
- Keep card UI clean, operations in modal
**Rationale**: Users can view all images and quickly add new ones without leaving the card, while management operations (set cover, delete) are secondary and hidden in preview modal.

### Variant Description Format
**Decision**: Variant name as plain text, recipe description as optional Markdown.
**Schema Change**: Add `description` field (text, nullable) to `DishVariant` model.
**Format**:
- **Variant name**: Plain text (e.g., "外卖店A", "家常版")
- **Recipe description**: Optional Markdown with support for lists, bold/italic, headings, etc.
**Display in Card**:
- Recipe description is collapsed by default
- Click "查看做法" button to expand and render Markdown
- If no description, hide the button
**Rationale**: Variant names are short labels, but recipes may need structured content (ingredients, steps). Markdown provides flexibility without complex UI. Collapsing by default keeps cards compact.

### Variant Management in History Card
**Decision**: Full embedded variant management within dish card.
**How it works**:
- Dish card provides "管理版本" button
- Click to expand variant management panel inline (similar to current `DishVariantsPanel` but embedded)
- Supports: add new variant, edit variant (name + description), enable/disable variant
- All operations happen within the card, no navigation required
**Rationale**: Aligns with requirement "版本都应该在菜品所在卡片内处理". Users can manage variants while reviewing history without leaving context.

## Assumptions (Temporary)

None remaining — all key decisions confirmed.

## Open Questions

None — all decisions finalized.

