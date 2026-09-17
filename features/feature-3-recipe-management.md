# Feature: Todo List Management

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

Each user owns their lists exclusively. Another authenticated user must not be able to view, rename, or delete them.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /recipeapi/recipes` returns only recipes where `userId = req.user.id`. |
| **Write scope** | `PUT` and `DELETE` apply only when the recipe row matches both `id` and `req.user.id`. |
| **Create scope** | New recipes are always owned by the authenticated user. |
| **Cross-user access** | If a list belongs to another user, respond with `404` — never `403` (do not confirm the recipe exists). |
| **UI scope** | The lists view shows only recipes returned by `GET /recipeapi/recipes` for the signed-in user. |
| **Implementation** | Use a shared helper (e.g. `getAccessibleListOrNull(req, recipeId)`) in `app/authorization/` — do not duplicate scope logic in controllers. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/recipeapi/recipes` | Yes | Fetch all recipes for the authenticated user |
| `POST` | `/recipeapi/recipes` | Yes | Create a new recipe |
| `PUT` | `/recipeapi/recipes/:recipeId` | Yes | Rename a recipe |
| `DELETE` | `/recipeapi/recipes/:recipeId` | Yes | Delete a recipe owned by the caller |

All endpoints return **only data owned by the authenticated user**. Cross-user access attempts return `404`.

---

## Key Entities

- **recipe**: named group belonging to one user; will contain recipeIngredients and recipeSteps.
- **recipeIngredient**: an ingredient and a quantity combination tied to a recipe.
- **recipeStep**: A single step in a recipe; will contain a recipeIngredient.
- **ingredient**: stand alone ingredient (from feature 2).
- **User**: owns many lists (from Feature 1).

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
| `recipeStepId` | INTEGER FK | Required;  |
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
*   **Then** I see **"No recipes yet. Create your first recipe."**

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
