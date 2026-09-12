# Feature: Recipe PDF Export

**Feature ID:** 5
**Branch pattern:** `feature/5-pdf-reports`
**Status:** Ready
**Created:** 2026-09-12
**Input:** Signed-in users export their own recipes to a printable PDF from the recipe list
**Depends on:** [Feature 1 — User Authentication](feature-1-user-auth.md), [Feature 2 — Ingredient Management](feature-2-ingredient-management.md), [Feature 3 — Recipe Management](feature-3-recipe-management.md), [Feature 4 — Recipe Publishing](feature-4-recipe-publishing.md)
**Related:** `features/reference/behavior.md` (update in same PR when implementing)

---

## User Stories

### US-5.1: Export Recipe to PDF

**As a** signed-in user  
**I want to** export my recipes to a PDF format  
**So that** I can share or print recipes easily

**Priority:** P1  
**Independent test:** Generate PDF with recipe data; PDF is downloaded  
**Acceptance scenarios:** see ### US-5.1 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All behavior MUST build on Features 1–4
- **FR-002**: PDF export button must be present on all recipes belong to me (on recipe list page, not recipe edit page)
- **FR-003**: The PDF must contain the OC logo in the top left corner
- **FR-004**: The PDF must contain the name of the recipe
- **FR-005**: The PDF must contain the list of ingredients needed, with quantity, unit, and price per unit
- **FR-006**: The PDF must contain the steps for the recipe in a tabular format, with the step number, step instructions, and step ingredients
- **FR-007**: The PDF must contain a footer in the bottom left corner with the recipe name followed by "published as of" and the date the PDF was generated
- **FR-008**: Reference docs MUST be updated in the same PR when implementing (see **Agent implementation request**).

---

## Assumptions

- Features 1–4 MUST be merged to `dev` before implementing this feature

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Users can export their recipes to PDF format

---

## Data Ownership & Isolation

PDF export adds no new data and no new endpoints. It reads the same recipe, recipe ingredient, and recipe step data that Features 3–4 already return. Ownership rules stay the same as in those features.

| Rule                  | Requirement                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read scope**        | The PDF is built only from a recipe already shown on the `recipes` view. A signed-in user sees their own recipes (`GET /recipeapi/recipes/user/:userId`). A guest sees published recipes only. |
| **Write scope**       | None. Export is read-only and changes no rows.                                                                                                                                                 |
| **Create scope**      | None. The PDF is made in the browser and downloaded. Nothing is stored on the server.                                                                                                          |
| **Cross-user access** | Unchanged from Features 3–4. This feature adds no route that takes another user's recipe ID.                                                                                                   |
| **UI scope**          | The export action shows only when a user is signed in (`user` in `localStorage`), so it appears only on the signed-in user's own recipe cards (FR-002). Guests never see it.                   |
| **Implementation**    | The PDF is made on the client in `frontend/src/reports/RecipeReports.js`. The backend does not change.                                                                                         |

---

## API Requirements

No new or changed endpoints. PDF generation uses these existing read routes, mounted at `/recipeapi`:

| Method | Endpoint                                        | Auth | Purpose in this feature                                                                             |
| ------ | ----------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------- |
| `GET`  | `/recipes/user/:userId`                         | Yes  | Loads the signed-in user's recipes on the `recipes` view (Feature 3)                                |
| `GET`  | `/recipes/:recipeId/recipeIngredients`          | No   | Ingredients for FR-005: `quantity`, `ingredient.name`, `ingredient.unit`, `ingredient.pricePerUnit` |
| `GET`  | `/recipes/:recipeId/recipeStepsWithIngredients` | No   | Steps for FR-006: `stepNumber`, `instruction`, `recipeIngredient[].ingredient.name`                 |

Response shapes are unchanged from Features 2–3. The PDF uses only the fields listed above, plus `recipe.name` from the recipe already in the list (FR-004, FR-007).

**Error response:** unchanged, `{ "message": "..." }`.

---

## Screen Requirements

### [Screen: Downloaded PDF] — `recipeReport.pdf` (US letter, portrait)

| Region                  | Content                                                                                                                                                          | FR     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Top left                | OC logo (`/oc-logo-white.png`)                                                                                                                                   | FR-003 |
| Heading                 | Recipe name                                                                                                                                                      | FR-004 |
| **Ingredients** section | One line per recipe ingredient: `<quantity> <unit>[s] of <name> ($<pricePerUnit>/<unit>)`                                                                        | FR-005 |
| **Steps** section       | Table with the columns **Step**, **Instruction**, **Ingredients**. Ingredients is a comma-separated list of the step's ingredient names. Rows use the API order. | FR-006 |
| Bottom left footer      | `<recipe name> published as of <generation date>`, with the date from `toLocaleDateString()`                                                                     | FR-007 |

---

## Key Entities

- **Recipe**: unchanged from previous features
- **Recipe Ingredient**: unchanged from previous features
- **Recipe Step**: unchanged from previous features

---

## Data Model Requirements

Depends exclusively on existing data models from features 1–4

---

## Acceptance Criteria (Gherkin)

### US-5.1 — Export Recipe to PDF

#### Scenario: User exports recipe to PDF

- **Given** I am signed in on the recipes page
- **When** I click the pdf button
- **Then** The Recipe is downloaded as a PDF

#### Scenario: Guest user cannot export recipe to PDF

- **Given** I am not signed in
- **And** I am on the login page
- **When** I click the View Published Recipes button from the login page
- **Then** I am unable to export recipes to PDF

---

## Test Coverage Map

Each scenario above must map to at least one automated test. No backend tests, because the API doesn't change.

| Story  | Scenario                               | Test file                                                                            | Test name                                |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------- |
| US-5.1 | User exports recipe to PDF             | `frontend/tests/RecipeCardComponent.test.js`, `frontend/tests/RecipeReports.test.js` | `User exports recipe to PDF`             |
| US-5.1 | Guest user cannot export recipe to PDF | `frontend/tests/Login.test.js`, `frontend/tests/RecipeCardComponent.test.js`         | `Guest user cannot export recipe to PDF` |

**Test notes**

- `RecipeCardComponent.test.js`: when a user is in `localStorage`, clicking the PDF export icon (`mdi-file-pdf-box`) calls `RecipeReports.generateRecipePDF` with the card's recipe. With no user, the icon is not rendered.
- `RecipeReports.test.js`: mock `jspdf`, `jspdf-autotable`, and the two services. Check `addImage` (logo, FR-003), the recipe name text (FR-004), the ingredient lines (FR-005), the `autoTable` columns and rows (FR-006), the footer text (FR-007), and `save("recipeReport.pdf")`.
- `Login.test.js`: clicking **View Published Recipes** pushes route `recipes`.

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 5 from @features/feature-5-pdf-reports.md on branch `feature/5-pdf-reports`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
This feature has no backend changes; the PDF is generated client-side in frontend/src/reports/RecipeReports.js and triggered from frontend/src/components/RecipeCardComponent.vue.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/behavior.md` (PDF export is visible only to signed-in users on the recipe list, and lists the PDF contents). `api.md` and `data-model.md` don't change.

---

## Definition of Done

- [ ] Frontend implemented per this spec (**FR-001**–**FR-008** satisfied); no backend changes
- [ ] **Success Criteria (SC-001**, **SC-002)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed) — not expected
- [ ] `features/reference/api.md` updated (if API changed) — not expected
- [ ] `features/reference/behavior.md` updated (product rules changed)
- [ ] Feature catalog row in [project README](../README.md#23-feature-catalog)

---

## Out of Scope

- Storing a real publish date on recipes. The footer shows the date the PDF was made (FR-007).
- Showing "Unpublished" in the PDF
- PDF export on the recipe edit page (`editRecipe`) (FR-002)
- PDF export for guests or for other users' published recipes
- Exporting several recipes into one PDF, or batch export
- Server-side PDF generation or storing PDFs
- Custom file names, page layouts, or print preview
- A user-facing error or loading state while PDF data loads
- Changes to recipe publishing ([Feature 4](feature-4-recipe-publishing.md)), recipe editing ([Feature 3](feature-3-recipe-management.md)), or auth ([Feature 1](feature-1-user-auth.md))
