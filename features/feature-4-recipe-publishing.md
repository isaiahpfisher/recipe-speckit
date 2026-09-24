# Feature: Recipe Publishing

**Feature ID:** 4
**Branch pattern:** `feature/4-recipe-publishing`
**Status:** Ready
**Created:** 2026-09-18
**Input:** Users who have not logged in can see published recipes from other users.
**Depends on:** [Feature 1 — User Authentication and Session Management](./feature-1-user-authentication-session-management.md)
**Related:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

---

## User Stories

### US-4.1: See Published Recipes
**As a** Non-logged in user
**I want to** view published recipes
**So that** I can see published recipes without logging in

**Priority:** P1
**Independent test:** View Published Recipes Button takes user to page with list of the published recipes
**Acceptance scenarios:** see ### US-4.1 under Acceptance Criteria

### US-4.2: Publish Recipe
**As a** Logged in user
**I want to** Publish my recipes to the published recipe list
**So that** other users can see my recipes

**Priority:** P1
**Independent test:** when recipe is marked published, recipe displays on published recipes list
**Acceptance scenarios:** see ### US-4.2 under Acceptance Criteria

### US-4.3: Unpublish Recipe
**As a** Logged in user
**I want to** Unpublish recipes I have published
**So that** Users don't see recipes I don't want published

**Priority:** P1
**Independent test:** when recipe is not marked published, does not display in list of published recipes
**Acceptance scenarios:** see ### US-4.3 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: Signed in users MUST be able to mark their recipe as published
- **FR-002**: Signed in users MUST be able to unmark their recipe as published
- **FR-003**: Recipes marked as published MUST display in the published recipes list
- **FR-004**: Recipes NOT marked as published MUST NOT display in the published recipes list
- **FR-005**: Button **View Published Recipes** MUST display on the login screen
- **FR-006**: **View Published Recipes** MUST open the page titled **Recipes** containing the published list
- **FR-007**: Each published recipe card MUST show the recipe name, a **Servings** chip (`2 Servings`), a minutes chip (`30 minutes`), and the description
- **FR-008**: Clicking a published recipe card MUST expand it to show headings **Ingredients** and **Recipe Steps** (table columns **Step**, **Instruction**, **Ingredients**)
- **FR-009**: Clicking an expanded published recipe card MUST collapse it so **Ingredients** and **Recipe Steps** are hidden again
- **FR-010**: Create or update that changes `isPublished` MUST require a valid Bearer session. Missing `Authorization` header → `401` with `{ "message": "Unauthorized! No Auth Header" }`
- **FR-011**: Update of another user’s recipe (including publish/unpublish) MUST return `404` with `{ "message": "Cannot find Recipe with id=<id>." }`
- **FR-012**: Create with `isPublished` omitted MUST return `400` with `{ "message": "Is Published cannot be empty for recipe!" }`

---

## Assumptions

- Users can log in (Feature 1)
- Users can make ingredients (Feature 2)
- Users can make recipes

---

## Edge Cases

- No published recipes → guest **Recipes** list is empty; `GET /recipeapi/recipes/` returns `200` with `[]`
- Mix of published and unpublished recipes → guest list shows only `isPublished: true`
- Publish or unpublish with no session → `401` with `{ "message": "Unauthorized! No Auth Header" }`
- Publish or unpublish another user’s recipe → `404` with `{ "message": "Cannot find Recipe with id=<id>." }`
- Create recipe with `isPublished` omitted → `400` with `{ "message": "Is Published cannot be empty for recipe!" }`
- Published recipe has no ingredients or steps → card still expands; **Ingredients** and **Recipe Steps** sections are empty

---

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge
- **SC-002**: User can mark recipe as published
- **SC-003**: User can unmark recipe as published
- **SC-004**: Published recipes display in list
- **SC-005**: Non-published recipes do not display in list
- **SC-006**: **View Published Recipes** displays on the login screen
- **SC-007**: **View Published Recipes** opens the **Recipes** published list
- **SC-008**: Each recipe card shows name, **Servings**, minutes, and description
- **SC-009**: Each recipe card expands on click to **Ingredients** and **Recipe Steps**
- **SC-010**: Each expanded recipe card collapses on click

---

## Data Ownership & Isolation

Each recipe belongs to one user (`userId`). Publish state (`isPublished`) is writable only by that owner. Guests may **read** published recipes only.

| Rule | Requirement |
|------|-------------|
| **Read scope (guest)** | `GET /recipeapi/recipes/` does **not** require auth and returns only rows where `isPublished` is `true` (ordered by name). |
| **Read scope (owner)** | Signed-in users load their own recipes via `GET /recipeapi/recipes/user/:userId` with a Bearer token (Feature 1). That list includes published and unpublished rows they own. |
| **Write scope** | `POST /recipeapi/recipes/` and `PUT /recipeapi/recipes/:id` require `authenticateRoute`. Update succeeds only when `recipes.userId = req.user.id`. |
| **Create scope** | New recipes are owned by the authenticated user’s `userId`. `isPublished` is required on create (FR-012). |
| **Cross-user access** | Another user’s recipe on `PUT` → `404` with `{ "message": "Cannot find Recipe with id=<id>." }` (not `403`) (FR-011). |
| **Unauthenticated write** | Create or update without `Authorization` → `401` with `{ "message": "Unauthorized! No Auth Header" }` (FR-010). |
| **UI scope** | Guests use **View Published Recipes** → **Recipes** (`RecipeList.vue`) with no **Add** button. Recipe cards hide pencil/PDF icons when `localStorage` has no `user`. Owners set **Publish?** on add/edit. |
| **Implementation** | Guest list filter is `where: { isPublished: true }`. Ownership on update is `existing.userId !== req.user.id` → `404`. |

---

## Key Entities

- **User**: signed-in account that can create and publish recipes
- **Recipe**: a recipe belonging to a user that can be published or not
- **Guest**: person with no session; can only view published recipes

---

## API Requirements

Mount prefix: `/recipeapi`. Flat JSON. Errors: `{ "message": "..." }`.

This feature’s contract is publish state and the public list. Create/update already exist; they MUST accept and persist `isPublished`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/recipeapi/recipes/` | No | List published recipes (`isPublished: true`), name ASC (US-4.1, FR-003, FR-004) |
| `POST` | `/recipeapi/recipes/` | Yes (`authenticateRoute`) | Create a recipe including `isPublished` (US-4.2, FR-001, FR-012) |
| `PUT` | `/recipeapi/recipes/:id` | Yes (`authenticateRoute`) | Update a recipe the caller owns, including `isPublished` (US-4.2, US-4.3) |

**Guest list success** (`200`): array of recipe objects (may be empty `[]`). Each item includes `id`, `name`, `description`, `servings`, `time`, `isPublished` (`true`), `userId`.

**Create request body** (`POST /recipeapi/recipes/`):

```json
{
  "name": "Recipe",
  "description": "Food",
  "servings": 2,
  "time": 30,
  "isPublished": true,
  "userId": 1
}
```

**Create success** (`200`): recipe object including `id` and `isPublished`.

**Update request body** (`PUT /recipeapi/recipes/:id`) — publish or unpublish:

```json
{
  "isPublished": true
}
```

or `"isPublished": false` to unpublish.

**Update success** (`200`):

```json
{
  "message": "Recipe was updated successfully."
}
```

**Quoted errors**

| Status | Body |
|--------|------|
| `401` | `{ "message": "Unauthorized! No Auth Header" }` |
| `404` | `{ "message": "Cannot find Recipe with id=1." }` |
| `400` | `{ "message": "Is Published cannot be empty for recipe!" }` |

**Expand reads (existing, no auth):** the recipe card loads `GET /recipeapi/recipes/:recipeId/recipeIngredients/` and `GET /recipeapi/recipes/:recipeId/recipeStepsWithIngredients/` so guests can see **Ingredients** and **Recipe Steps** (FR-008). Creating/editing those rows is out of scope.

---

## Screen Requirements

Existing views. Labels match `Login.vue`, `RecipeList.vue`, `EditRecipe.vue`, and `RecipeCardComponent.vue`. API errors show in a snackbar (`<v-snackbar>`).

### [View: Login] — route name `login` (`/`)

File: `frontend/src/views/Login.vue`. Public.

*   Action: **View Published Recipes** (FR-005) → navigates to `recipes` (`/recipes`) without signing in (FR-006)

### [View: Recipe list] — route name `recipes` (`/recipes`)

File: `frontend/src/views/RecipeList.vue`.

*   Heading: **Recipes**
*   No session: load `GET /recipeapi/recipes/` (published only). No **Add** button.
*   Session present: load that user’s recipes (`GET /recipeapi/recipes/user/:id`). **Add** opens the add dialog.
*   **Empty state:** no recipe cards; no error snackbar when the published list is empty (US-4.1).
*   **Add Recipe** dialog: fields **Name**, **Number of Servings**, **Time to Make (in minutes)**, **Description**, switch **Publish?** (`Yes` / `No`). Actions: **Close**, **Add Recipe**. Default **Publish?** is **No**.

### [View: Edit recipe] — route name `editRecipe` (`/recipe/:id`)

File: `frontend/src/views/EditRecipe.vue`. Signed-in owner.

*   Switch **Publish?** (`Yes` / `No`)
*   Primary save: **Update Recipe** (US-4.2, US-4.3)

### Recipe card — `RecipeCardComponent.vue`

Used on the **Recipes** list.

*   Always visible: recipe name; chip `{{ servings }} Servings`; chip `{{ time }} minutes`; description (FR-007)
*   Click card: expand/collapse
*   Expanded: heading **Ingredients**; heading **Recipe Steps**; table columns **Step**, **Instruction**, **Ingredients** (FR-008)
*   Click again: **Ingredients** and **Recipe Steps** hidden (FR-009)
*   Guests: no pencil, no PDF icon
*   Signed-in: pencil navigates to edit (out of scope beyond **Publish?**)

**App chrome** — `MenuBar.vue`

*   Title **Recipes**; **Recipes** nav to `/recipes`
*   **Add** / owner chrome only when `localStorage` `user` is set

---

## Data Model Requirements

This feature does not add a new table. It uses `isPublished` on existing `recipes` (see `backend/app/models/recipe.model.js`). Guest list = rows where `isPublished` is true.

### `recipes` table (this feature’s fields)

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment (existing) |
| `name` | STRING | Required; shown on the published list (FR-007) |
| `description` | STRING | Required; shown on the published list (FR-007) |
| `servings` | INTEGER | Required; shown as **Servings** (FR-007) |
| `time` | INTEGER | Required; shown as minutes (FR-007) |
| `isPublished` | BOOLEAN | Required; `true` = on guest list, `false` = hidden from guests (FR-001–FR-004) |
| `userId` | INTEGER FK | Required, references `users.id`; only this user may publish/unpublish the row |
| `createdAt` / `updatedAt` | DATETIME | Sequelize timestamps |

**Associations (existing, not changed by this feature):** `User` hasMany `Recipe`; `Recipe` belongsTo `User`.

**Not new tables here:** `recipeSteps`, `recipeIngredients`, and `ingredients` already exist for expand (FR-008). This feature does not add columns to them.

**Do not model:** a `publishedRecipes` table or a Guest user row. Guests have no `users` record; they only read recipes where `isPublished` is true.

---

## Acceptance Criteria

### US-4.1 — See Published Recipes

#### Scenario: Guest views published recipes
*   **Given** I am not logged in
*   **When** I click **View Published Recipes**
*   **Then** I am on the page titled **Recipes**
*   **And** I see the published recipe list
*   **And** `GET /recipeapi/recipes/` returns `200`

#### Scenario: Published recipe card shows name, servings, time, and description
*   **Given** a published recipe named `"Recipe"` with servings `2`, time `30`, and description `"Food"`
*   **When** I open the **Recipes** page as a guest via **View Published Recipes**
*   **Then** the card shows `"Recipe"`
*   **And** the card shows `2 Servings`
*   **And** the card shows `30 minutes`
*   **And** the card shows `"Food"`

#### Scenario: Guest expands a published recipe
*   **Given** I am on the **Recipes** page as a guest
*   **And** a published recipe card is visible
*   **When** I click the recipe card
*   **Then** I see heading **Ingredients**
*   **And** I see heading **Recipe Steps**
*   **And** the steps table shows columns **Step**, **Instruction**, and **Ingredients**

#### Scenario: Guest collapses an expanded published recipe
*   **Given** I am on the **Recipes** page as a guest
*   **And** a published recipe card is expanded (headings **Ingredients** and **Recipe Steps** are visible)
*   **When** I click the recipe card again
*   **Then** **Ingredients** and **Recipe Steps** are hidden

#### Scenario: No published recipes
*   **Given** there are no published recipes
*   **When** I click **View Published Recipes**
*   **Then** the **Recipes** page shows an empty list
*   **And** `GET /recipeapi/recipes/` returns `200` with `[]`
*   **And** no error is shown

#### Scenario: Unpublished recipes stay off the guest list
*   **Given** unpublished recipes exist
*   **When** I view the **Recipes** page as a guest
*   **Then** unpublished recipes are not displayed

---

### US-4.2 — Publish Recipe

#### Scenario: Owner publishes a recipe
*   **Given** I am signed in
*   **And** I own a recipe that is not published (**Publish?** is **No**)
*   **When** I set **Publish?** to **Yes**
*   **And** I save the recipe (**Add Recipe** or **Update Recipe**)
*   **Then** the API returns `200`
*   **And** a guest who clicks **View Published Recipes** sees that recipe on **Recipes**

#### Scenario: Cannot publish without signing in
*   **Given** I do not have a session
*   **When** I send `POST /recipeapi/recipes/` or `PUT /recipeapi/recipes/:id` to set `isPublished` to `true` without `Authorization`
*   **Then** the API returns `401` with `{ "message": "Unauthorized! No Auth Header" }`
*   **And** the recipe is not published

#### Scenario: Cannot publish another user’s recipe
*   **Given** I am signed in as user A
*   **And** user B owns recipe id `1`
*   **When** I send `PUT /recipeapi/recipes/1` with `isPublished` true
*   **Then** the API returns `404` with `{ "message": "Cannot find Recipe with id=1." }`

#### Scenario: Cannot create a recipe with isPublished omitted
*   **Given** I am signed in
*   **When** I send `POST /recipeapi/recipes/` without `isPublished`
*   **Then** the API returns `400` with `{ "message": "Is Published cannot be empty for recipe!" }`

---

### US-4.3 — Unpublish Recipe

#### Scenario: Owner unpublishes a recipe
*   **Given** I am signed in
*   **And** I own a recipe with **Publish?** set to **Yes**
*   **When** I set **Publish?** to **No**
*   **And** I save with **Update Recipe**
*   **Then** the API returns `200` with `{ "message": "Recipe was updated successfully." }`
*   **And** a guest who clicks **View Published Recipes** does not see that recipe on **Recipes**

#### Scenario: Cannot unpublish without signing in
*   **Given** I do not have a session
*   **When** I send `PUT /recipeapi/recipes/:id` with `isPublished` false without `Authorization`
*   **Then** the API returns `401` with `{ "message": "Unauthorized! No Auth Header" }`
*   **And** the recipe stays published

#### Scenario: Cannot unpublish another user’s recipe
*   **Given** I am signed in as user A
*   **And** user B owns a published recipe with id `1`
*   **When** I send `PUT /recipeapi/recipes/1` with `isPublished` false
*   **Then** the API returns `404` with `{ "message": "Cannot find Recipe with id=1." }`

---

## Test Coverage Map

Each scenario above must map to at least one automated test. `it("…")` titles match the Gherkin scenario names exactly.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-4.1 | Guest views published recipes | `frontend/tests/Login.test.js` | `Guest views published recipes` |
| US-4.1 | Guest views published recipes | `frontend/tests/RecipeList.test.js` | `Guest views published recipes` |
| US-4.1 | Guest views published recipes | `backend/tests/recipes.test.js` | `Guest views published recipes` |
| US-4.1 | Published recipe card shows name, servings, time, and description | `frontend/tests/RecipeList.test.js` | `Published recipe card shows name, servings, time, and description` |
| US-4.1 | Guest expands a published recipe | `frontend/tests/RecipeList.test.js` | `Guest expands a published recipe` |
| US-4.1 | Guest collapses an expanded published recipe | `frontend/tests/RecipeList.test.js` | `Guest collapses an expanded published recipe` |
| US-4.1 | No published recipes | `frontend/tests/RecipeList.test.js` | `No published recipes` |
| US-4.1 | No published recipes | `backend/tests/recipes.test.js` | `No published recipes` |
| US-4.1 | Unpublished recipes stay off the guest list | `frontend/tests/RecipeList.test.js` | `Unpublished recipes stay off the guest list` |
| US-4.1 | Unpublished recipes stay off the guest list | `backend/tests/recipes.test.js` | `Unpublished recipes stay off the guest list` |
| US-4.2 | Owner publishes a recipe | `backend/tests/recipes.test.js` | `Owner publishes a recipe` |
| US-4.2 | Owner publishes a recipe | `frontend/tests/RecipeList.test.js` | `Owner publishes a recipe` |
| US-4.2 | Cannot publish without signing in | `backend/tests/recipes.test.js` | `Cannot publish without signing in` |
| US-4.2 | Cannot publish another user’s recipe | `backend/tests/recipes.test.js` | `Cannot publish another user’s recipe` |
| US-4.2 | Cannot create a recipe with isPublished omitted | `backend/tests/recipes.test.js` | `Cannot create a recipe with isPublished omitted` |
| US-4.3 | Owner unpublishes a recipe | `backend/tests/recipes.test.js` | `Owner unpublishes a recipe` |
| US-4.3 | Owner unpublishes a recipe | `frontend/tests/EditRecipe.test.js` | `Owner unpublishes a recipe` |
| US-4.3 | Cannot unpublish without signing in | `backend/tests/recipes.test.js` | `Cannot unpublish without signing in` |
| US-4.3 | Cannot unpublish another user’s recipe | `backend/tests/recipes.test.js` | `Cannot unpublish another user’s recipe` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 4 from @features/feature-4-recipe-publishing.md on branch `feature/4-recipe-publishing`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
Do not add PDF export, ingredient catalog CRUD, or recipe-step authoring beyond what guests need to see on expand.
Align with existing Recipe `/recipeapi` routes and `isPublished` on `recipes`.
```

**Reference updates for this feature:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

---

## Definition of Done

*   [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-012** satisfied)
*   [ ] **Success Criteria (SC-001**–**SC-010)** met
*   [ ] All mapped tests pass (`npm test`)
*   [ ] Test Coverage Map complete
*   [ ] `features/reference/data-model.md` updated (if schema changed)
*   [ ] `features/reference/api.md` updated (if API changed)
*   [ ] `features/reference/behavior.md` updated (if product rules changed)
*   [ ] Feature catalog row added in [README.md §2.3](../README.md#23-feature-catalog)
*   [ ] PR targets `dev` (not `main`)

---

## Out of Scope

*   Login, register, session lifetime (Feature 1)
*   Shared ingredient catalog CRUD ([Feature 2](./feature-2-ingredient-management.md))
*   Creating/editing recipe steps and recipe-ingredient rows (Feature 3)
*   Full recipe field CRUD except `isPublished` (name, servings, time, description are displayed, not specified as this feature’s create/edit stories)
*   Delete recipe
*   PDF export (`feature/5-pdf-reports`)
*   Per-user private ingredient ownership

## Delivered to later recipe features

*   Guest **Recipes** list is `GET /recipeapi/recipes/` filtered by `isPublished: true`.
*   Owners toggle **Publish?** on add/edit; unpublished rows stay off the guest list.
