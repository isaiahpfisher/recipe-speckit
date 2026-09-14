# Feature: Ingredient Management

**Feature ID:** 2
**Branch pattern:** `feature/2-ingredient-management`
**Status:** Draft
**Created:** 2026-09-09
**Input:** Signed-in users manage ingredients via dialogs opened from ingredient rows (items, add, edit, delete)
**Depends on:** Feature 1 - User Auth


---

## User Stories

### US-2.1: Create ingredients
**As a** signed-in user  
**I want to** create an ingredient 
**So that** I can have a record of ingredients I need

**Priority:** P1  
**Independent test:** Open add-ingredient dialog, create an ingredient; it appears in the ingredients view  
**Acceptance scenarios:** see ### US-2.1 under Acceptance Criteria

### US-2.2: View my ingredients
**As a** signed-in user  
**I want to** see all of my ingredients on one screen  
**So that** I can know what ingredients I have created

**Priority:** P1  
**Independent test:** Dashboard loads a single list of owned ingredients (no sidebar split)  
**Acceptance scenarios:** see ### US-2.2 under Acceptance Criteria

### US-2.3: Manage ingredient rows
**As a** signed-in user  
**I want** each ingredient row to show the **edit** action
**So that** I can manage ingredients without leaving the ingredients view

**Priority:** P1  
**Independent test:** Each ingredient row exposes the edit icon action  
**Acceptance scenarios:** see ### US-2.3 under Acceptance Criteria

### US-2.4: Manage ingredient row display
**As a** signed-in user  
**I want** each ingredient row to be displayed showing the Name, Unit, and Price Per Unit attributes
**So that** I can view ingredient information without leaving the ingredients view

**Priority:** P3 
**Independent test:** Each ingredient row exposes the Name, Unit, and Price Per Unit information 
**Acceptance scenarios:** see ### US-2.4 under Acceptance Criteria

### US-2.5: Rename and change ingredient information
**As a** signed-in user  
**I want to** rename or change an ingredient  
**So that** I can have my ingredients reflect the most recent information

**Priority:** P2  
**Independent test:** Change an ingredient from row actions; list of ingredients view updates  
**Acceptance scenarios:** see ### US-2.5 under Acceptance Criteria

### US-2.6: Private ingredients only
**As a** signed-in user  
**I want** my ingredients visible only to me  
**So that** other users cannot read or modify my ingredients

**Priority:** P1  
**Independent test:** Cross-user ingredient access returns `404`; `GET /ingredients` never returns another user's rows  
**Acceptance scenarios:** see ### US-2.6 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All ingredient endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: An ingredient MUST belong to exactly one user for its entire lifetime; ownership MUST never change.
- **FR-003**: Every database read and update MUST include `userId: req.user.id` in the `where` clause.
- **FR-004**: On create, `userId` MUST be set from `req.user.id` only — ignore or strip any `userId` in the request body.
- **FR-005**: Ingredient names MUST be trimmed before save; empty strings MUST be rejected.
- **FR-006**: Ingredient prices MUST be trimmed before save; empty strings MUST be rejected.
- **FR-007**: Ingredients MUST be ordered alphabetically by name in API responses.
- **FR-008**: This feature MUST deliver ingredient CRUD and a **single-view** ingredients UI in `IngredientList.vue` (dialog-based add/edit). No sidebar/main split.

---

## Assumptions