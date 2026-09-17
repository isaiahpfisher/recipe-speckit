# Feature: Recipe Management

**Feature ID:** 3
**Branch pattern:** `feature/3-recipe-management`
**Status:** Ready
**Created:** 2026-09-16
**Input:** Signed-in users manage recipes on one dashboard view; new recipes are added via a dialog
**Depends on:** [Feature 1 — User Authentication](feature-1-user-auth.md) , [Feature 2 - Ingredient Management](feature-2-ingredient-management.md)

---

## User Stories

### US-3.1: Create recipe
**As a** signed-in user  
**I want to** create named Recipes 
**So that** I can remember and follow the recipe later

**Priority:** P1  
**Independent test:** Open add-recipe dialog, create a recipe; it appears in the recipe view  
**Acceptance scenarios:** see ### US-3.1 under Acceptance Criteria

### US-3.2: View my recipes
**As a** signed-in user  
**I want to** see all of my recipes
**So that** I can see what recipes I have created

**Priority:** P1  
**Independent test:** Dashboard loads a single list of owned recipes  
**Acceptance scenarios:** see ### US-3.2 under Acceptance Criteria

### US-3.3: Edit and delete a recipe
**As a** signed-in user  
**I want** each list row to show **edit** and **delete** actions  
**So that** I can manage recipes without leaving the recipes view 

**Priority:** P1  
**Independent test:** Each list row exposes edit and delete icon actions  
**Acceptance scenarios:** see ### US-3.3 under Acceptance Criteria

### US-3.4: Private recipe only
**As a** signed-in user  
**I want** my recipes are visible only to me  
**So that** other users cannot read or modify my recipe (publishing recipes is implemented in feature 4)

**Priority:** P1  
**Independent test:** Cross-user recipe access returns `404`; `GET /recipeapi/recipe` never returns another user's rows  
**Acceptance scenarios:** see ### US-3.4 under Acceptance Criteria

### US-3.5: Add Ingredients to a recipe
**As a** signed-in user  
**I want to** add ingredients to a recipe with a quantity.  
**So that** I can keep track of which ingredients and how much of them are needed for the recipe.

**Priority:** P1  
**Independent test:** Add an ingredient to a recipe 
**Acceptance scenarios:** see ### US-3.5 under Acceptance Criteria

### US-3.6: Edit and Delete Ingredients from a recipe
**As a** signed-in user  
**I want to** edit and delete ingredients from a recipe  
**So that** I can modify what ingredients and their quantities are in a recipe

**Priority:** P2  
**Independent test:** Edit delete an ingredient from a recipe 
**Acceptance scenarios:** see ### US-3.6 under Acceptance Criteria

### US-3.7: Add Steps to a recipe
**As a** signed-in user  
**I want to** add steps to a recipe.  
**So that** I can keep track what steps to take with the ingredients and in which order.

**Priority:** P1 
**Independent test:** Add a step to a recipe 
**Acceptance scenarios:** see ### US-3.7 under Acceptance Criteria

### US-3.8: Edit and Delete Steps from a recipe
**As a** signed-in user  
**I want to** Edit and delete steps on a recipe.  
**So that** I can modify what steps to take with the ingredients and in which order.

**Priority:** P2 
**Independent test:** Add and delete a step from a recipe 
**Acceptance scenarios:** see ### US-3.8 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All recipe endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: A recipe MUST belong to exactly one user for its entire lifetime; ownership MUST never change.
- **FR-003**: Every database read, update, and delete MUST include `userId: req.user.id` in the `where` clause.
- **FR-004**: On create, `userId` MUST be set from `req.user.id` only — ignore or strip any `userId` in the request body.
- **FR-005**: Recipe names MUST be trimmed before save; empty strings MUST be rejected.
- **FR-006**: Recipes MUST be ordered alphabetically by name in API responses.
- **FR-007**: This feature MUST deliver recipe Create and read in a **single-view** recipes UI in `Dashboard.vue` (dialog-based add/delete). No sidebar/main split.
- **FR-008**: This feature MUST deliver a seperate recipe edit page in a **single-view** with dialog based CRUD for adding ingredients and steps to a recipe.

---

## Assumptions

- Feature 1 auth and session handling MUST be merged to `dev` before implementing this feature.
- Feature 2 ingredient management has already been implemented and merged into `dev`
- Recipes use **dialog-based** workflows (no split sidebar / main panel).

## Edge Cases

- Empty or whitespace-only Recipe name → client block and/or `400`.
- Recipe name longer than 255 characters → `400`.
- Invalid `recipeId` → `400`; unowned recipe → `404`.
- Unauthenticated dashboard or `GET /recipe/id` → redirect or `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in user can create, view, rename, and delete Recipes on one screen without seeing another user's data.
- **SC-003**: `npm test` passes for recipe API and dashboard recipe-view behavior.

---

## Data Ownership & Isolation

Each user owns their recipes exclusively. Another authenticated user must not be able to view, rename, delete, or change ingredients or steps on them. Recipe ingredients and recipe steps inherit the parent recipe’s owner; they have no independent owner.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /recipeapi/recipes` returns only recipes where `userId = req.user.id`. `GET /recipeapi/recipes/:recipeId` and nested ingredient/step reads succeed only when the parent recipe’s `userId = req.user.id`. |
| **Write scope** | `PUT` and `DELETE` on a recipe apply only when the row matches both `id` and `req.user.id`. Nested ingredient/step writes apply only when the parent recipe is owned by `req.user.id`. |
| **Create scope** | New recipes are always owned by the authenticated user (`userId` from `req.user.id` only). Nested ingredient/step creates are allowed only on a recipe owned by the caller. |
| **Cross-user access** | If a recipe belongs to another user, respond with `404` — never `403` (do not confirm the recipe exists). Same `404` for nested ingredient/step access under an unowned recipe. |
| **UI scope** | The recipes view shows only recipes returned by `GET /recipeapi/recipes` for the signed-in user. The edit page shows only that user’s recipe, ingredients, and steps. |
| **Implementation** | Use a shared helper (e.g. `getAccessibleRecipeOrNull(req, recipeId)`) in `app/authorization/` — do not duplicate scope logic in controllers. Nested controllers must resolve the parent recipe through that helper before reading or writing `recipeIngredient` or `recipeStep` rows. |

---

## Key Entities

- **recipe**: named group belonging to one user; will contain recipeIngredients and recipeSteps.
- **recipeIngredient**: an ingredient and a quantity combination tied to a recipe.
- **recipeStep**: A single step in a recipe; will contain a recipeIngredient.
- **ingredient**: stand alone ingredient (from feature 2).
- **User**: owns many lists (from Feature 1).

---

## API Requirements

Mount prefix: `/recipeapi`. All endpoints below require a valid session (`Authorization: Bearer <token>`). Unauthenticated requests return `401` with an unauthorized message. Cross-user or missing recipe access returns `404` with `{ "message": "recipe with id=<id> not found." }` (do not use `403`). Errors use `{ "message": "…" }`. Responses are flat JSON (no `{ success, data }` envelope).

Ingredient catalog reads used by the edit page (`GET /recipeapi/ingredients`) belong to Feature 2; this feature only attaches those ingredients to a recipe.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/recipeapi/recipes` | Yes | Fetch all recipes for the authenticated user, ordered by `name` ascending |
| `POST` | `/recipeapi/recipes` | Yes | Create a new recipe owned by the caller |
| `GET` | `/recipeapi/recipes/:recipeId` | Yes | Fetch one owned recipe |
| `PUT` | `/recipeapi/recipes/:recipeId` | Yes | Update an owned recipe (including rename) |
| `DELETE` | `/recipeapi/recipes/:recipeId` | Yes | Delete a recipe owned by the caller |
| `GET` | `/recipeapi/recipes/:recipeId/recipeIngredients` | Yes | List ingredients on an owned recipe |
| `POST` | `/recipeapi/recipes/:recipeId/recipeIngredients` | Yes | Add an ingredient with quantity to an owned recipe |
| `PUT` | `/recipeapi/recipes/:recipeId/recipeIngredients/:id` | Yes | Update a recipe ingredient (quantity and/or step association) on an owned recipe |
| `DELETE` | `/recipeapi/recipes/:recipeId/recipeIngredients/:id` | Yes | Remove a recipe ingredient from an owned recipe |
| `GET` | `/recipeapi/recipes/:recipeId/recipeSteps` | Yes | List steps for an owned recipe, ordered by `stepNumber` ascending |
| `GET` | `/recipeapi/recipes/:recipeId/recipeStepsWithIngredients` | Yes | List steps for an owned recipe, including associated recipe ingredients |
| `POST` | `/recipeapi/recipes/:recipeId/recipeSteps` | Yes | Add a step to an owned recipe |
| `PUT` | `/recipeapi/recipes/:recipeId/recipeSteps/:id` | Yes | Update a step on an owned recipe |
| `DELETE` | `/recipeapi/recipes/:recipeId/recipeSteps/:id` | Yes | Delete a step from an owned recipe |

### Recipes

**Create request body** (`POST /recipeapi/recipes`):

```json
{ "name": "Pie" }
```

`name` is required (trimmed; empty/whitespace rejected). The client may also send fields already on the recipe row: `description`, `servings`, `time`. Ignore or strip `userId` in the body (**FR-004**). Do not use a body `userId` to assign ownership.

**Create success** (`201`):

```json
{
  "id": 1,
  "name": "Pie",
  "description": "",
  "servings": 2,
  "time": 30,
  "userId": 42
}
```

`userId` in the response is the authenticated user, not a value from the request body.

**List success** (`200`): array of recipe objects owned by the caller, sorted alphabetically by `name`.

**Get one success** (`200`): one recipe object owned by the caller.

**Update request body** (`PUT /recipeapi/recipes/:recipeId`):

```json
{ "name": "New Pie" }
```

The edit page may also send `description`, `servings`, and `time`. Ownership (`userId`) MUST NOT change.

**Update / delete success** (`200`): recipe updated or removed. Delete removes the recipe so it no longer appears in `GET /recipeapi/recipes`.

**Validation:** empty/whitespace `name` → `400`. `name` longer than 255 characters → `400`. Invalid `recipeId` → `400`. Unowned or missing recipe → `404` as quoted above.

### Recipe ingredients

**Create request body** (`POST /recipeapi/recipes/:recipeId/recipeIngredients`):

```json
{
  "quantity": 1,
  "recipeId": 1,
  "ingredientId": 5
}
```

`quantity` and `ingredientId` are required. `recipeStepId` may be omitted or `null` when the ingredient is attached to the recipe only (US-3.5). The path `:recipeId` must match an owned recipe; do not trust a body `recipeId` for a different recipe.

**Create success** (`200`): the created `recipeIngredient` object (id, quantity, recipeId, recipeStepId, ingredientId).

**List success** (`200`): array of recipe ingredients for that recipe, each including the related `ingredient` (name and unit from Feature 2).

**Update request body** (`PUT /recipeapi/recipes/:recipeId/recipeIngredients/:id`):

```json
{
  "quantity": 1,
  "recipeId": 1,
  "ingredientId": 5,
  "recipeStepId": 3
}
```

Used to change quantity (US-3.6) and to associate an existing recipe ingredient with a step (US-3.7).

**Delete success** (`200`): the recipe ingredient is no longer on the recipe.

### Recipe steps

**Create request body** (`POST /recipeapi/recipes/:recipeId/recipeSteps`):

```json
{
  "stepNumber": 1,
  "instruction": "mix",
  "recipeId": 1
}
```

`stepNumber` and `instruction` are required. After create, the edit page may `PUT` recipe ingredients to set `recipeStepId` so the step lists those ingredients (US-3.7: step `mix` with ingredient `sugar`).

**Create success** (`200`): the created `recipeStep` object (id, stepNumber, instruction, recipeId).

**List with ingredients success** (`200`): steps for the recipe ordered by `stepNumber`, each including `recipeIngredient` rows and nested `ingredient`.

**Update request body** (`PUT /recipeapi/recipes/:recipeId/recipeSteps/:id`):

```json
{
  "stepNumber": 1,
  "instruction": "mix in a bowl",
  "recipeId": 1
}
```

**Delete success** (`200`): the step is no longer on the recipe.

---

## Screen Requirements

Follow [ui-style-system.mdc](../.cursor/rules/ui-style-system.mdc): `oc-cta` on primary labeled CTAs; icon-only actions need `aria-label`s. No sidebar/main split (**FR-007**, **FR-008**).

App chrome (`MenuBar`) already includes **Recipes** (this view) and, when signed in, **Ingredients** (Feature 2). This feature does not add new chrome.

### View: Recipes dashboard — route name `recipes`

*   Path `/recipes`. Single-view recipes UI (existing `RecipeList.vue`; **FR-007** names this dashboard). Heading: **Recipes**.
*   Primary action: **+ New Recipe** (`oc-cta`). Opens the add-recipe dialog.
*   Body: a single list of the signed-in user’s recipes from `GET /recipeapi/recipes`. Each recipe shows its name plus **edit** and **delete** icon actions (`aria-label`: **Edit recipe**, **Delete recipe**).
*   **Edit recipe** navigates to the edit page (`editRecipe`, `/recipe/:id`) (**FR-008**). After a rename on that page, returning to this view shows the new name in place of the old one.
*   **Delete recipe** is a dialog-based action on this view (**FR-007**). After delete, the recipe disappears from the list.
*   **Empty state:** **"No recipes yet. Create your first recipe."**
*   **Loading:** progress/skeleton while `GET /recipeapi/recipes` is in flight.
*   **Error:** `<v-alert type="error">` for failed loads or failed create/delete.
*   **Unauthenticated:** no session in `localStorage` → redirect to the login page (route `login`).

**Add Recipe dialog** (persistent)

*   Title: **Add Recipe**
*   Required field: **Name**. Client validation: empty or whitespace-only name blocks submit, shows **"recipe name is required."**, and sends no API request.
*   Existing recipe fields also on this dialog (data model / current UI): **Number of Servings**, **Time to Make (in minutes)**, **Description**.
*   Actions: **Close** (dismiss, no create); confirm **Add Recipe** (calls `POST /recipeapi/recipes`).
*   On `201`, `Pie` (or the entered name) appears in the recipes view and the dialog closes.

### View: Edit Recipe — route name `editRecipe`

*   Path `/recipe/:id` (`EditRecipe.vue`). Single-view editor (**FR-008**). Heading: **Edit Recipe**.
*   Loads the owned recipe (`GET /recipeapi/recipes/:recipeId`), its recipe ingredients, and its steps with ingredients. Unowned/missing recipe follows API `404`; unauthenticated follows **FR-001** / login redirect.
*   Recipe fields: **Name** (required; same trim/empty rules as create), **Number of Servings**, **Time to Make (in minutes)**, **Description**.
*   Primary save: **Update Recipe** (`oc-cta`) → `PUT /recipeapi/recipes/:recipeId`.
*   **Error:** `<v-alert type="error">` for failed load or save.

**Ingredients** (on this page)

*   Section heading: **Ingredients**. Primary action: **Add** opens the ingredient dialog.
*   Each recipe ingredient shows quantity and ingredient name, with icon actions **Edit** and **Delete** (`aria-label`: **Edit ingredient**, **Delete ingredient**).
*   Delete removes that ingredient from the recipe immediately (US-3.6).

**Add / Edit Ingredient dialog** (persistent)

*   Title: **Add Ingredient** or **Edit Ingredient**.
*   Fields: **Quantity** (number, required); **Ingredients** select from Feature 2 catalog (required).
*   Actions: **Close**; confirm **Add Ingredient** or **Update Ingredient**.
*   Add calls `POST /recipeapi/recipes/:recipeId/recipeIngredients` with quantity and selected `ingredientId`. Edit saves quantity (US-3.6).

**Steps** (on this page)

*   Section heading: **Steps**. Primary action: **Add** opens the step dialog.
*   Each step shows `stepNumber`, instruction, associated ingredient names, and icon actions **Edit** and **Delete** (`aria-label`: **Edit step**, **Delete step**).
*   Delete removes that step from the recipe (US-3.8).

**Add / Edit Step dialog** (persistent)

*   Title: **Add Step** or **Edit Step**.
*   Fields: **Number** (`stepNumber`, required); **Instruction** (required; Gherkin “step named `mix`” / “description” maps to this field); **Ingredients** multi-select of this recipe’s recipe ingredients (so a step can include `sugar`).
*   Actions: **Close**; confirm **Add Step** or **Update Step**.
*   Add calls `POST /recipeapi/recipes/:recipeId/recipeSteps`, then associates selected recipe ingredients with the new step. Edit updates `instruction` (US-3.8: `mix in a bowl`).

---

## Data Model Requirements

### `recipes` table
| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING | Required; max 255 chars |
| `description` | STRING | ; max 255 chars |
| `servings` | INT | |
| `time` | INT | |
| `isPublished` | TINYINT | |
| `userId` | INTEGER FK | Required; references `users.id`; set from `req.user.id` on create |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### `recipeingredients` table
| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `quantity` | FLOAT | Required;|
| `recipeStepId` | INTEGER FK |   |
| `recipeId` | INTEGER FK | Required;  |
| `ingredientId` | INTEGER FK | Required;  |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### `recipesteps` table
| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `stepNumber` | INT | Required;|
| `instruction` | STRING  | Required;  max 5000 chars|
| `recipeId` | INTEGER FK | Required;  |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)
*   `User hasMany Recipe`
*   `Recipe belongsTo User`
*   `Recipe hasMany RecipeStep`
*   `RecipeStep belongsTo Recipe`
*   `RecipeStep hasMany RecipeIngredient`
*   `Recipe hasMany recipeIngredient`
*   `Ingredient hasMany recipeIngredient`
*   `RecipeIngredient belongsTo recipeStep`
*   `RecipeIngredient belongsTo recipe`
*   `RecipeIngredient belongsTo ingredient`

---

## Acceptance Criteria (Gherkin)

### US-3.1 — Create Recipe

#### Scenario: User creates a new recipe
*   **Given** I am signed in on the dashboard
*   **When** I click **+ New Recipe**
*   **And** I enter recipe name `Pie`
*   **And** I confirm the dialog
*   **Then** the API returns `201` with a recipe object
*   **And** `Pie` appears in the recipes view
*   **And** the add-recipe dialog closes

#### Scenario: User creates a recipe with an empty name
*   **Given** I am signed in on the dashboard
*   **When** I open the new recipe dialog
*   **And** I leave the name field empty or whitespace only
*   **And** I attempt to confirm
*   **Then** inline validation blocks the request
*   **And** I see the message **"recipe name is required."**
*   **And** no API request is sent

---

### US-3.2 — View my Recipes

#### Scenario: Dashboard loads with existing recipes
*   **Given** I am signed in
*   **And** I own recipes `Pie` and `Cake`
*   **When** I navigate to the dashboard
*   **Then** both recipes appear in the recipes view
*   **And** each row shows the list name with edit and delete icon actions

#### Scenario: User has no recipes
*   **Given** I am signed in
*   **And** I have no recipes
*   **When** I navigate to the dashboard
*   **Then** I see an empty list with the add recipe button visible

#### Scenario: User cannot see another user's Recipe
*   **Given** user B owns list `Secret Recipe`
*   **And** I am signed in as user A
*   **When** I request `GET /recipeapi/recipes`
*   **Then** the response contains only recipes owned by user A
*   **And** `Secret Recipe` is not in the response
*   **And** the Recipe view does not show `Secret Recipe`

---

### US-3.3 — Edit and Delete Recipes

#### Scenario: Edit a recipe
*   **Given** I am signed in
*   **And** I own Recipe `Pie`
*   **When** I click to edit `Pie`
*   **And** change the name to `New Pie`
*   **Then** the `New Pie` recipe replaces the `Pie` recipe in the list.

#### Scenario: Delete a recipe
*   **Given** I am signed in
*   **And** I own Recipe `Pie`
*   **When** I click to delete `Pie`
*   **Then** the `Pie` recipe disapears from the list.

---

### US-3.4 — Private recipe only

#### Scenario: User attempts to rename another user's recipe
*   **Given** I am signed in as user A
*   **And** a recipe exists that belongs to user B
*   **When** I send `PUT /recipeapi/recipes/:recipeId` with user B's recipe ID and body `{ "name": "Hijacked" }`
*   **Then** the API returns `404` with `{ "message": "recipe with id=<id> not found." }`
*   **And** user B's recipe name is unchanged in the database

#### Scenario: User attempts to delete another user's recipe
*   **Given** I am signed in as user A
*   **And** a recipe exists that belongs to user B
*   **When** I send `DELETE /recipeapi/recipes/:recipeId` with user B's recipe ID
*   **Then** the API returns `404` with `{ "message": "recipe with id=<id> not found." }`
*   **And** user B's recipe still exists

#### Scenario: Client cannot assign a recipe to another user on create
*   **Given** I am signed in as user A
*   **When** I send `POST /recipeapi/recipes` with body `{ "name": "Bad", "userId": 999 }` where user `999` is a different user
*   **Then** the API returns `201` with a recipe owned by user A
*   **And** the saved `userId` is user A's ID, not `999`

#### Scenario: Unauthenticated user accesses the dashboard
*   **Given** I have no session in `localStorage`
*   **When** I navigate to the dashboard
*   **Then** I am redirected to the login page

#### Scenario: Unauthenticated API request to recipes
*   **Given** I have no valid session token
*   **When** I request `GET /recipeapi/recipes`
*   **Then** the API returns `401` with an unauthorized message

---

### US-3.5: Add Ingredients to a recipe

#### Scenario: Add Ingredients to a recipe
*   **Given** I am signed in
*   **And** I own Recipe `Pie`
*   **And** an ingredient named `sugar` exists
*   **When** I click to edit `Pie`
*   **And** add the ingredient `sugar` with a quantity of 1
*   **Then** the ingredient is added onto the recipe.

---

### US-3.6: Edit and Delete Ingredients from a recipe

#### Scenario: Edit Ingredients to a recipe
*   **Given** I am signed in
*   **And** I own Recipe `Pie`
*   **And** an ingredient named `sugar` is connected to the recipe with a quantity of 1.
*   **When** I click to edit `sugar`
*   **And** add change the quantity to 1 and save.
*   **Then** the ingredient quantity is changed to 1 on the recipe.

#### Scenario: Delete Ingredients to a recipe
*   **Given** I am signed in
*   **And** I own Recipe `Pie`
*   **And** an ingredient named `sugar` is connected to the recipe with a quantity of 1.
*   **When** I click to delete `sugar`
*   **Then** the ingredient `sugar` is no longer on the recipe.

---

### US-3.7: Add Steps to a recipe

#### Scenario: Add Steps to a recipe
*   **Given** I am signed in
*   **And** I own Recipe `Pie`
*   **And** an ingredient named `sugar` exists on `Pie`
*   **When** I click to edit `Pie`
*   **And** add a step named `mix` with an ingredient of `sugar`
*   **Then** the step is added onto the recipe.

---

### US-3.8: Edit and Delete Steps from a recipe

#### Scenario: Edit Step on a recipe
*   **Given** I am signed in
*   **And** I own Recipe `Pie`
*   **And** an ingredient named `sugar` is connected to the recipe with a quantity of 1.
*   **And** a step named `mix` is on the recipe.
*   **When** I click to edit `mix`
*   **And** add change the description to `mix in a bowl`
*   **Then** the step description is changed to `mix in a bowl` on the recipe.

#### Scenario: Delete Step from a recipe
*   **Given** I am signed in
*   **And** I own Recipe `Pie`
*   **And** an ingredient named `sugar` is connected to the recipe with a quantity of 1.
*   **And** a step named `mix` is on the recipe.
*   **When** I click to delete `mix`
*   **Then** the step `mix` is no longer on the recipe.

---

## Test Coverage Map

Each scenario above must map to at least one automated test.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-3.1 | User creates a new recipe | `backend/tests/recipes.test.js`; `frontend/tests/RecipeList.test.js` | `it("User creates a new recipe")` |
| US-3.1 | User creates a recipe with an empty name | `frontend/tests/RecipeList.test.js` | `it("User creates a recipe with an empty name")` |
| US-3.2 | Dashboard loads with existing recipes | `frontend/tests/RecipeList.test.js` | `it("Dashboard loads with existing recipes")` |
| US-3.2 | User has no recipes | `frontend/tests/RecipeList.test.js` | `it("User has no recipes")` |
| US-3.2 | User cannot see another user's Recipe | `backend/tests/recipes.test.js`; `frontend/tests/RecipeList.test.js` | `it("User cannot see another user's Recipe")` |
| US-3.3 | Edit a recipe | `frontend/tests/EditRecipe.test.js`; `frontend/tests/RecipeList.test.js` | `it("Edit a recipe")` |
| US-3.3 | Delete a recipe | `frontend/tests/RecipeList.test.js` | `it("Delete a recipe")` |
| US-3.4 | User attempts to rename another user's recipe | `backend/tests/recipes.test.js` | `it("User attempts to rename another user's recipe")` |
| US-3.4 | User attempts to delete another user's recipe | `backend/tests/recipes.test.js` | `it("User attempts to delete another user's recipe")` |
| US-3.4 | Client cannot assign a recipe to another user on create | `backend/tests/recipes.test.js` | `it("Client cannot assign a recipe to another user on create")` |
| US-3.4 | Unauthenticated user accesses the dashboard | `frontend/tests/RecipeList.test.js` | `it("Unauthenticated user accesses the dashboard")` |
| US-3.4 | Unauthenticated API request to recipes | `backend/tests/recipes.test.js` | `it("Unauthenticated API request to recipes")` |
| US-3.5 | Add Ingredients to a recipe | `backend/tests/recipeIngredients.test.js`; `frontend/tests/EditRecipe.test.js` | `it("Add Ingredients to a recipe")` |
| US-3.6 | Edit Ingredients to a recipe | `backend/tests/recipeIngredients.test.js`; `frontend/tests/EditRecipe.test.js` | `it("Edit Ingredients to a recipe")` |
| US-3.6 | Delete Ingredients to a recipe | `backend/tests/recipeIngredients.test.js`; `frontend/tests/EditRecipe.test.js` | `it("Delete Ingredients to a recipe")` |
| US-3.7 | Add Steps to a recipe | `backend/tests/recipeSteps.test.js`; `frontend/tests/EditRecipe.test.js` | `it("Add Steps to a recipe")` |
| US-3.8 | Edit Step on a recipe | `backend/tests/recipeSteps.test.js`; `frontend/tests/EditRecipe.test.js` | `it("Edit Step on a recipe")` |
| US-3.8 | Delete Step from a recipe | `backend/tests/recipeSteps.test.js`; `frontend/tests/EditRecipe.test.js` | `it("Delete Step from a recipe")` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 3 from @features/feature-3-recipe-management.md on branch `feature/3-recipe-management`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

---

## Definition of Done

*   [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-008** satisfied)
*   [ ] **Success Criteria (SC-001**–**SC-003)** met
*   [ ] All mapped tests pass (`npm test`)
*   [ ] Test Coverage Map complete
*   [ ] `features/reference/data-model.md` updated (if schema changed)
*   [ ] `features/reference/api.md` updated (if API changed)
*   [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

*   User authentication, registration, session, and login UI ([Feature 1](./feature-1-user-auth.md))
*   Ingredient catalog CRUD ([Feature 2](./feature-2-ingredient-management.md))
*   Publishing recipes and a public/published recipe catalog (Feature 4 — called out in US-3.4)
*   PDF / print export of a recipe (present on recipe cards in the current UI; not in this feature’s FRs or Gherkin)
*   Bulk delete endpoints (`DELETE /recipeapi/recipes`, `DELETE /recipeapi/recipeSteps`, `DELETE /recipeapi/recipeIngredients`)
*   Sharing, comments, ratings, or changing recipe ownership after create
