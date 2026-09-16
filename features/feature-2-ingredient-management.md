# Feature: Ingredient Management

**Feature ID:** 2
**Branch pattern:** `feature/2-ingredient-management`
**Status:** Draft
**Created:** 2026-09-09
**Input:** Signed-in users manage ingredients via dialogs opened from ingredient rows (add, edit)
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

### US-2.2: View ingredients
**As a** user  
**I want to** see all of the ingredients on one screen  
**So that** I can know what ingredients there are

**Priority:** P1  
**Independent test:** Ingredients page loads a single list of ingredients (no sidebar split)  
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
**I want** the ingredients editable and updatable only by signed in users 
**So that** unauthorized parties cannot create or modify ingredients

**Priority:** P1  
**Independent test:** Un-signed-in-user ingredient modification returns `401` with an unauthorized message
**Acceptance scenarios:** see ### US-2.6 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: Create and edit ingredient endpoints MUST require a valid session (`authenticateRoute` middleware).
- **FR-002**: Undefined ingredient names MUST be rejected.
- **FR-003**: Undefined ingredient unit MUST be rejected.
- **FR-004**: Undefined ingredient price per unit MUST be rejected.
- **FR-005**: Ingredients MUST be ordered alphabetically by name in API responses.
- **FR-006**: This feature MUST deliver ingredient create, read, and update and a **single-view** ingredients UI in `IngredientList.vue` (dialog-based add/edit). No sidebar/main split.

---

## Assumptions

- Feature 1 auth and session handling MUST be merged to `dev` before implementing this feature.
- Ingredients use **dialog-based** workflows (no split sidebar / main panel).

## Edge Cases

- Invalid `ingredientId` → `200` and/or error message.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Non-signed-in user can view ingredients on one screen.
- **SC-003**: Signed-in user can create, view, and rename ingredients on one screen.
- **SC-004**: `npm test` passes for ingredient API and ingredients-view behavior.

---

## Data Ownership & Isolation

Ingredients are a **shared catalog** (not per-user private rows). There is no `userId` on `ingredients`.

| Rule | Requirement |
|------|-------------|
| **Read scope** | Any client may list ingredients. `GET /recipeapi/ingredients/` does **not** require auth and returns the shared catalog (ordered by name). |
| **Write scope** | Create and update require a valid session (`authenticateRoute`). |
| **Create scope** | Authenticated users create rows in the shared catalog (no owner field). |
| **Unauthenticated write** | Create or update without a valid Bearer session → `401` with an unauthorized message. |
| **UI scope** | Ingredients page (`/ingredients`) is reachable without sign-in and shows the full list. **Add** is shown only when a user is in `localStorage`. Row edit (pencil) icon remains visible; submitting update without a session fails with `401` (US-2.6). |
| **Implementation** | Auth on write routes only; do not invent per-user `where` filters on ingredients for this feature. |

---

## Key Entities

- **Ingredient**: an item created by any user
- **RecipeIngredient**: an ingredient in a recipe (deferred to Feature 3).

---

## API Requirements

Mount prefix: `/recipeapi` (see `IngredientServices` / `ingredient.routes.js`).

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/recipeapi/ingredients/` | No | List all ingredients, ordered by `name` ASC (**FR-005**, US-2.2) |
| `POST` | `/recipeapi/ingredients/` | Yes (`authenticateRoute`) | Create an ingredient (**FR-001**, US-2.1) |
| `PUT` | `/recipeapi/ingredients/:id` | Yes (`authenticateRoute`) | Update an ingredient (**FR-001**, US-2.5) |

**Create request body:**
```json
{
  "name": "Peanut Butter",
  "unit": "ounce",
  "pricePerUnit": 0.07
}
```

**Create success** (`200`): ingredient object including `id`, `name`, `unit`, and `pricePerUnit` (and timestamps as returned by Sequelize).

**Create validation:** `name`, `unit`, and `pricePerUnit` MUST NOT be `undefined` (**FR-002**–**FR-004**). Errors use `{ "message": "…" }`.

**Update request body** (name, unit, and/or price may change):
```json
{
  "name": "Peanut Butter",
  "unit": "ounce",
  "pricePerUnit": 0.23
}
```

**Update success** (`200`):
```json
{
  "message": "Ingredient was updated successfully."
}
```

**Unauthenticated create/update:** `401` with `{ "message": "…" }` (unauthorized message from auth middleware).

**Error response shape:** `{ "message": "Human-readable explanation." }` (flat JSON; no `{ success, data }` envelope).

---

## Screen Requirements

### [View: Ingredients] — route name `ingredients` (`/ingredients`)

*   **View:** `IngredientList.vue` — single-view table (no sidebar / main split) (**FR-006**).
*   **Heading:** `Ingredients`
*   **Primary action:** **Add** — visible only when `localStorage` has a signed-in `user`; opens the add dialog.
*   **Table columns:** Name, Unit, Price Per Unit, Actions.
*   **Row display:** name; unit; price as `$` + `pricePerUnit` (e.g. `$0.07`); Actions column shows a pencil **edit** icon (`mdi-pencil`) that opens the edit dialog (US-2.3, US-2.4).
*   **Empty list:** table headers still show (Name, Unit, Price Per Unit, Actions); body has no rows (US-2.2).
*   **Add dialog** (title **Add Ingredient**): fields **Name** (text), **Unit** (select), **Price Per Unit** (number). Unit options: `cup`, `gallon`, `gram`, `kilogram`, `liter`, `milliliter`, `ounce`, `pint`, `piece`, `pound`, `quart`, `tablespoon`, `teaspoon`, `unit`. Actions: **Close**, **Add Ingredient**.
*   **Edit dialog** (title **Edit Ingredient**): same fields prefilled from the row. Actions: **Close**, **Update Ingredient**. After a successful update, the row refreshes the changed name, unit, and price (for example `ounce` instead of `gallon`, and `$0.23` instead of `$4.00`).
*   **Loading / error:** failures surface via snackbar using the API `message` when present.

**App chrome**

*   `MenuBar` shows an **Ingredients** nav link only when signed in. Guests may still open `/ingredients` by URL (US-2.6).
*   `MenuBar` is shown app-wide via `App.vue`.

---

## Data Model Requirements

### `ingredients` table
| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING | Required|
| `unit` | STRING | Required |
| `pricePerUnit` | DECIMAL(10, 2) | nullable: true |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)
*   `Ingredient hasMany RecipeIngredient`
*   `RecipeIngredient belongsTo Ingredient`

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
*   **And** I select `ounce` in the dropdown menu
*   **And** I enter `0.07` in the numerical text box
*   **And** I click **Add Ingredient**
*   **Then** the API returns `200` with an ingredient object containing `id`, `name`, `unit`, and `pricePerUnit`
*   **And** `Peanut Butter` appears in the ingredients view
*   **And** the add-ingredient dialog closes

---

### US-2.2 — View ingredients

#### Scenario: Ingredients page loads with existing ingredients
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

#### Scenario: Ingredient rows show correct columns
*   **Given** There exists an ingredient `Peanut Butter` with unit `ounce` and price per unit `0.07`
*   **When** I view the ingredients view
*   **Then** the `Peanut Butter` row shows `ounce` under column Unit and `$0.07` under column Price Per Unit

---

### US-2.5 — Edit ingredients

#### Scenario: User renames an ingredient
*   **Given** I am signed in
*   **And** There is an ingredient named `Peanut Butter`
*   **When** I click the edit icon on the `Peanut Butter` row
*   **And** I change the name to `Jelly` in the edit dialog
*   **And** I click `Update Ingredient`
*   **Then** the API returns `200` with the message: "Ingredient was updated successfully."
*   **And** the ingredients view shows `Jelly` instead of `Peanut Butter`

#### Scenario: User changes ingredient unit
*   **Given** I am signed in
*   **And** There is an ingredient named `Peanut Butter` with unit `gallon`
*   **When** I click the edit icon on the `Peanut Butter` row
*   **And** I change the unit to `ounce` in the edit dialog
*   **And** I click `Update Ingredient`
*   **Then** the API returns `200` with the message: "Ingredient was updated successfully."
*   **And** the ingredients view shows `ounce` as the unit instead of `gallon`

#### Scenario: User changes ingredient price
*   **Given** I am signed in
*   **And** There is an ingredient named `Peanut Butter` with price `4.00`
*   **When** I click the edit icon on the `Peanut Butter` row
*   **And** I change the price to `0.23` in the edit dialog
*   **And** I click `Update Ingredient`
*   **Then** the API returns `200` with the message: "Ingredient was updated successfully."
*   **And** the ingredients view shows `$0.23` as the price instead of `$4.00`

---

### US-2.6 — Private access to create and edit ingredients only

#### Scenario: Unauthenticated user accesses the ingredients page
*   **Given** I have no session in `localStorage`
*   **When** I navigate to the ingredients page
*   **Then** I can view the ingredients list
*   **And** There is no **Add** button

#### Scenario: Unauthenticated API request to update ingredient
*   **Given** I have no session in `localStorage`
*   **When** I navigate to the ingredients page
*   **And** I click on the Edit icon
*   **And** I click the Update Ingredient button
*   **Then** The API returns `401` with an unauthorized message

---

## Test Coverage Map

Each scenario above must map to at least one automated test.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-2.1 | User views add dialog | `frontend/tests/IngredientList.test.js` | `User views add dialog` |
| US-2.1 | User creates a new ingredient | `backend/tests/ingredients.test.js` | `User creates a new ingredient` |
| US-2.1 | User creates a new ingredient | `frontend/tests/IngredientList.test.js` | `User creates a new ingredient` |
| US-2.2 | Ingredients page loads with existing ingredients | `frontend/tests/IngredientList.test.js` | `Ingredients page loads with existing ingredients` |
| US-2.2 | There exist no ingredients | `frontend/tests/IngredientList.test.js` | `There exist no ingredients` |
| US-2.3 | Ingredient rows show edit action | `frontend/tests/IngredientList.test.js` | `Ingredient rows show edit action` |
| US-2.4 | Ingredient rows show correct columns | `frontend/tests/IngredientList.test.js` | `Ingredient rows show correct columns` |
| US-2.5 | User renames an ingredient | `backend/tests/ingredients.test.js` | `User renames an ingredient` |
| US-2.5 | User renames an ingredient | `frontend/tests/IngredientList.test.js` | `User renames an ingredient` |
| US-2.5 | User changes ingredient unit | `backend/tests/ingredients.test.js` | `User changes ingredient unit` |
| US-2.5 | User changes ingredient unit | `frontend/tests/IngredientList.test.js` | `User changes ingredient unit` |
| US-2.5 | User changes ingredient price | `backend/tests/ingredients.test.js` | `User changes ingredient price` |
| US-2.5 | User changes ingredient price | `frontend/tests/IngredientList.test.js` | `User changes ingredient price` |
| US-2.6 | Unauthenticated user accesses the ingredients page | `frontend/tests/IngredientList.test.js` | `Unauthenticated user accesses the ingredients page` |
| US-2.6 | Unauthenticated API request to update ingredient | `backend/tests/ingredients.test.js` | `Unauthenticated API request to update ingredient` |
| US-2.6 | Unauthenticated API request to update ingredient | `frontend/tests/IngredientList.test.js` | `Unauthenticated API request to update ingredient` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 2 from @features/feature-2-ingredient-management.md on branch `feature/2-ingredient-management`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

---

## Definition of Done

*   [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-006** satisfied)
*   [ ] **Success Criteria (SC-001**–**SC-004)** met
*   [ ] All mapped tests pass (`npm test`)
*   [ ] Test Coverage Map complete
*   [ ] `features/reference/data-model.md` updated (if schema changed)
*   [ ] `features/reference/api.md` updated (if API changed)
*   [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

*   Delete ingredient UI and authorizing delete as a Feature 2 story (backend `DELETE /recipeapi/ingredients/:id` and delete-all exist but have no UI access path)
*   `GET /recipeapi/ingredients/:id` as a Feature 2 acceptance path (exists in routes; not covered by this feature’s Gherkin)
*   Recipe ↔ ingredient linking / `RecipeIngredient` workflows (Feature 3)
*   Per-user private ingredient ownership (`userId` scoping)

