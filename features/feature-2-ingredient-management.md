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
**As a** user  
**I want to** see all of the ingredients on one screen  
**So that** I can know what ingredients there are

**Priority:** P1  
**Independent test:** Dashboard loads a single list of ingredients (no sidebar split)  
**Acceptance scenarios:** see ### US-2.2 under Acceptance Criteria

### US-2.3: Manage ingredient row actions
**As a** user  
**I want** each ingredient row to show the **edit** action
**So that** I can manage ingredients without leaving the ingredients view

**Priority:** P1  
**Independent test:** Each ingredient row exposes the edit icon action  
**Acceptance scenarios:** see ### US-2.3 under Acceptance Criteria

### US-2.4: Manage ingredient row display
**As a** user  
**I want** each ingredient row to be displayed showing the Name, Unit, and Price Per Unit attributes
**So that** I can view ingredient information without leaving the ingredients view

**Priority:** P3 
**Independent test:** Each ingredient row exposes the Name, Unit, and Price Per Unit information 
**Acceptance scenarios:** see ### US-2.4 under Acceptance Criteria

### US-2.5: Edit ingredients
**As a** signed-in user  
**I want to** rename or change an ingredient  
**So that** I can have the ingredients reflect the most recent information

**Priority:** P2  
**Independent test:** Change an ingredient from row actions; list of ingredients view updates  
**Acceptance scenarios:** see ### US-2.5 under Acceptance Criteria

### US-2.6: Private access to create and edit ingredients only
**As a** signed-in user  
**I want** my lists editable and updatable only by signed in users 
**So that** unauthorized parties cannot create or modify ingredients

**Priority:** P1  
**Independent test:** Cross-user ingredient modification returns `401` with an unauthorized message
**Acceptance scenarios:** see ### US-2.6 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All ingredient endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: Every database read and update MUST include `userId: req.user.id` in the `where` clause.
- **FR-003**: On create, `userId` MUST be set from `req.user.id` only — ignore or strip any `userId` in the request body.
- **FR-004**: Ingredient names MUST be trimmed before save; empty strings MUST be rejected.
- **FR-005**: Ingredient unit MUST be selected before save; empty unit MUST be rejected.
- **FR-006**: Ingredient prices MUST be trimmed before save; empty strings MUST be rejected.
- **FR-007**: Ingredients MUST be ordered alphabetically by name in API responses.
- **FR-008**: This feature MUST deliver ingredient create, read, and update and a **single-view** ingredients UI in `IngredientList.vue` (dialog-based add/edit). No sidebar/main split.

---

## Assumptions

- Feature 1 auth and session handling MUST be merged to `dev` before implementing this feature.
- Ingredients use **dialog-based** workflows (no split sidebar / main panel).

## Edge Cases

- Invalid `ingredientId` → `400`.
- Unauthenticated dashboard or `GET /todo/ingredients` → redirect or `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Non-signed-in user can view ingredients on one screen.
- **SC-002**: Signed-in user can create, view, and rename ingredients on one screen.
- **SC-003**: `npm test` passes for ingredient API and dashboard ingredients-view behavior.

---

## Data Ownership & Isolation

---

## API Requirements

---

## Screen Requirements

---

## Key Entities

- **Ingredient**: an item created by any user
- **User**: has access to many ingredients (from Feature 1).
- **RecipeIngredient**: an ingredient in a recipe (deferred to Feature 3).

---

## Data Model Requirements

### `ingredients` table
| Field | Type | Rules |
|-------|------|-------|
| `name` | STRING | Required|
| `unit` | STRING | Required |
| `pricePerUnit` | DECIMAL | 2 decimal places |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)
*   `Ingredient` hasMany `RecipeIngredient`

---

## Acceptance Criteria (Gherkin)

### US-2.1 — Create ingredients

#### Scenario: User views add dialog
*   **Given** I am signed in and on the ingredients page
*   **When** I click **Add**
*   **Then** A dialog appears
*   **And** There is a text box for `Name`
*   **And** There is a dropdown with the following units: `cup`, `gallon`, `gram`, `kilogram`, `liter`, `milliliter`, `ounce`, `pint`, `piece`, `pound`, `quart`, `tablespoon`, `teaspoon`, `unit`
*   **And** There is a text box for `Price Per Unit`

#### Scenario: User creates a new ingredient
*   **Given** I am signed in and on the ingredients page
*   **When** I click **Add**
*   **And** I enter ingredient name `Peanut Butter`
*   **And** I select `Ounce` in the dropdown menu
*   **And** I enter `0.07` in the numerical text box
*   **And** I confirm the dialog
*   **Then** the API returns `201` with an ingredient object containing `id`, `name`, `unit`, and `pricePerUnit`
*   **And** the returned `userId` matches my authenticated user ID
*   **And** `Peanut Butter` appears in the lists view
*   **And** the add-ingredient dialog closes

---

### US-2.2 — View my ingredients

#### Scenario: Dashboard loads with existing ingredients
*   **Given** There exist ingredients `Peanut Butter` and `Jelly`
*   **When** I navigate to the ingredients list
*   **Then** both ingredients appear in the ingredients view
*   **And** each row shows the ingredient name, unit, and price per unit, with edit icon action

#### Scenario: There exist no ingredients
*   **Given** There exist no ingredients
*   **When** I navigate to the ingredients page
*   **Then** I see the table header with Name, Unit, Price Per Unit, and Actions labels

---

### US-2.3 — Manage ingredient row actions

#### Scenario: Ingredient rows show edit action
*   **Given** There exists an ingredient `Peanut Butter`
*   **When** I view the ingredients view
*   **Then** the `Peanut Butter` row shows an **Edit** icon action

---

### US-2.4 — Manage ingredient row display

#### Scenario: Ingredient rows show edit action
*   **Given** There exists an ingredient `Peanut Butter` with unit `Ounce` and price per unit `0.07`
*   **When** I view the ingredients view
*   **Then** the `Peanut Butter` row shows `Ounce` under column Unit and `0.07` under column Price Per Unit

---

### US-2.5 — Edit ingredients

#### Scenario: User renames an ingredient
*   **Given** I am signed in
*   **And** There is an ingredient named `Peanut Butter`
*   **When** I click the edit icon on the `Peanut Butter` row
*   **And** I change the name to `Jelly` in the edit dialog
*   **And** I confirm
*   **Then** the API returns `200` with the updated ingredient object
*   **And** the ingredients view shows `Jelly` instead of `Peanut Butter`

---

### US-2.6 — Private access to create and edit ingredients only

#### Scenario: Unauthenticated user accesses the dashboard
*   **Given** I have no session in `localStorage`
*   **When** I navigate to the dashboard
*   **Then** I can view the ingredients list
*   **And** There is no **Add** button

#### Scenario: Unauthenticated API request to update ingredient
*   **Given** I have no session in `localStorage`
*   **When** I navigate to the dashboard
*   **And** I click on the Edit icon
*   **And** I click the Update Ingredient button
*   **Then** The the API returns `401` with an unauthorized message

---

## Test Coverage Map

---

## Agent implementation request

---

## Definition of Done

---

## Out of Scope

---

