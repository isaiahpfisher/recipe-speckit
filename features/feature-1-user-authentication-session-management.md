# Feature: User Authentication and Session Management

**Feature ID:** 1
**Branch pattern:** `feature/1-user-authentication-session-management`
**Status:** Draft
**Created:** 2026-09-16
**Input:** This feature will allow users to create an account and login to their account
**Related:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

---

## User Stories

### US-1.1: Create account
**As a** new user
**I want to** create an account with first name, last name, email, and password
**So that** I can sign in and manage my own recipes

**Priority:** P1
**Independent test:** Submit valid registration from Create Account, land on `/recipes` with `user` in `localStorage`
**Acceptance scenarios:** see ### US-1.1 under Acceptance Criteria

### US-1.2: Sign in
**As a** registered user
**I want to** sign in with my email and password
**So that** I can access my recipes

**Priority:** P1
**Independent test:** Log in with known email/password, receive session token, redirect to recipes
**Acceptance scenarios:** see ### US-1.2 under Acceptance Criteria

### US-1.3: Stay signed in across page loads
**As a** signed-in user
**I want** my session to persist in the browser
**So that** I do not have to log in again when I refresh the recipes page

**Priority:** P1
**Independent test:** Log in, refresh `/recipes` with valid `localStorage` session — still treated as signed in
**Acceptance scenarios:** see ### US-1.3 under Acceptance Criteria

### US-1.4: Sign out
**As a** signed-in user
**I want to** log out
**So that** no one else can use my account on a shared device

**Priority:** P2
**Independent test:** Logout clears the server session and `localStorage`; user lands on login
**Acceptance scenarios:** see ### US-1.4 under Acceptance Criteria

### US-1.5: Protect authenticated APIs and signed-in UI
**As the** application
**I want to** require a valid session for user-owned API calls and signed-in chrome
**So that** guests can still view published recipes, but cannot change another user’s data

**Priority:** P1
**Independent test:** Open `/recipes` with no session (published list); call `GET /recipeapi/recipes/user/:userId` without a token → `401`
**Acceptance scenarios:** see ### US-1.5 under Acceptance Criteria

## Requirements

### Functional Requirements

- **FR-001**: Users MUST authenticate with **email** + **password**.
- **FR-002**: Registration MUST collect first name, last name, email, and password.
- **FR-003**: Passwords MUST be stored as a **scrypt** hash with a per-user **salt**; hashes and salts MUST never be returned by the API.
- **FR-004**: Sessions MUST be rows in the `sessions` table. The client token is the **encrypted session id** (not a JWT stored in the table). The client sends `Authorization: Bearer <token>` on later requests.
- **FR-005**: Session lifetime MUST be **24 hours** from creation.
- **FR-006**: Login and registration MUST **create a new session** (they do not reuse an existing row).
- **FR-007**: Login MUST send credentials as HTTP **Basic** (`email:password`) to `POST /recipeapi/login`.
- **FR-008**: Every authenticated request MUST resolve to exactly one user via `req.user.id` from the session token (`authenticateRoute`).
- **FR-009**: Guests MUST be able to view **published recipes** without a session. Creating or listing a user’s own recipes MUST require a valid token.

## Assumptions

- This is the Recipe app (Vue + Express under `/recipeapi`), not the Todo sample.
- Single browser `localStorage` key `user` per device.
- Opening the login page clears `localStorage` `user` (current `Login.vue` `onMounted`).
- Ingredient CRUD and PDF export belong to other team features.

## Edge Cases

- Duplicate email on register → `400` with `{ "message": "This email is already in use." }`
- Unknown email on login → `401` with `{ "message": "User not found!" }`
- Wrong password → `401` with `{ "message": "Invalid password!" }`
- Missing or expired Bearer token on a protected API → `401`
- Missing first name, last name, email, or password on register → `400`

## Success Criteria

- **SC-001**: Every Gherkin scenario in this feature has at least one automated test before merge.
- **SC-002**: A new user can register, log in, reach `/recipes`, and log out in one manual pass.
- **SC-003**: `npm test` passes with backend auth and frontend login/register coverage.

## Data Ownership & Isolation

Feature 1 is the identity boundary. A session belongs to exactly one user. Signed-in recipe reads use that user’s id.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /recipeapi/recipes/` (published) is public. `GET /recipeapi/recipes/user/:userId` requires a Bearer token. |
| **Write scope** | Logout deletes only the session decoded from the caller’s Bearer token. |
| **Create scope** | Register/login create a `users` and/or `sessions` row for that user only. |
| **Cross-user access** | Another user’s resource → `404` (not `403`) when a later feature enforces ownership on a single row. Feature 1 MUST NOT return password or salt. |
| **UI scope** | Menu **Ingredients** and the user avatar menu show only when `localStorage` `user` is set. Guests can still open `/recipes` and **View Published Recipes**. |
| **Implementation** | `authenticateRoute` in `backend/app/authentication/authentication.js` sets `req.user.id`. |

## Key Entities

- **User**: account with first name, last name, email, and stored password hash + salt; can own recipes.
- **Session**: server-side row for one user (email, expiration, `userId`). The browser stores an encrypted session id as `token`.

## API Requirements

Mount prefix: `/recipeapi`. Flat JSON. Errors: `{ "message": "..." }`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/recipeapi/users` | No | Register; create user + session; return identity + token (`200`) |
| `POST` | `/recipeapi/login` | HTTP Basic `email:password` | Log in; create a 24-hour session (`200`) |
| `POST` | `/recipeapi/logout` | Bearer token | Delete the session row |
| `GET` | `/recipeapi/recipes/user/:userId` | Bearer token | Probe for a valid session / user-scoped recipes (`200` / `401`) |
| `GET` | `/recipeapi/recipes` | No | Published recipes (guest-visible) |

**Register request body** (`POST /recipeapi/users`):

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "password1"
}
```

**Register or login success** (`200`):

```json
{
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "id": 1,
  "token": "<encrypted-session-id>"
}
```

**Quoted errors**

| Status | Body |
|--------|------|
| `400` | `{ "message": "This email is already in use." }` |
| `401` | `{ "message": "User not found!" }` |
| `401` | `{ "message": "Invalid password!" }` |
| `401` | `{ "message": "Unauthorized! No Auth Header" }` |
| `401` | `{ "message": "Unauthorized! Expired Token, Logout and Login again" }` |
| `401` | `{ "message": "Session has expired." }` |
| `401` | `{ "message": "Invalid session" }` |

Password hash and salt are omitted from all responses.

## Screen Requirements

Existing views only. Labels match `Login.vue` and `MenuBar.vue`. API errors show in a snackbar (`<v-snackbar>`), not `<v-alert>`.

### [View: Login] — route name `login` (`/`)

File: `frontend/src/views/Login.vue`. Public.

*   Heading: **Login**
*   Fields: **Email**, **Password**
*   Primary action: **Login**
*   Secondary action: **Create Account** (opens dialog)
*   Also: **View Published Recipes** → `/recipes` without signing in
*   On mount: `localStorage` key `user` is **removed**
*   Success: snackbar **"Login successful!"**, store `user`, navigate to `recipes`
*   Failure: snackbar with the API `message`

**Create Account dialog**

*   Title: **Create Account**
*   Fields: **First Name**, **Last Name**, **Email**, **Password**
*   Actions: **Close**, **Create Account**
*   Success: snackbar **"Account created successfully!"**, store `user`, navigate to `recipes`
*   Duplicate email: snackbar **"This email is already in use."**

### [View: Recipe list] — route name `recipes` (`/recipes`)

File: `frontend/src/views/RecipeList.vue`.

*   No session: load published recipes (`GET /recipeapi/recipes`)
*   Session present: load that user’s recipes (`GET /recipeapi/recipes/user/:id`)
*   After login/register, this is the landing page

### App chrome — `MenuBar.vue`

*   Title **Recipes**
*   No session: **Login**
*   Session present: **Ingredients**, avatar menu with name/email and **Logout**
*   **Logout** calls `POST /recipeapi/logout`, removes `localStorage` `user`, navigates to `login`

Axios (`frontend/src/services/services.js`) attaches `Authorization: Bearer <token>` from `localStorage` `user` when present.

## Data Model Requirements

### `users` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `firstName` | STRING | Required |
| `lastName` | STRING | Required |
| `email` | STRING | Required |
| `password` | BLOB | Required; scrypt hash only |
| `salt` | BLOB | Required; per-user salt |
| `createdAt` / `updatedAt` | DATETIME | Sequelize timestamps |

### `sessions` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment; encrypted to produce the client `token` |
| `email` | STRING | Required |
| `expirationDate` | DATE | Required; creation time + 24 hours |
| `userId` | INTEGER FK | Required, references `users.id` |
| `createdAt` / `updatedAt` | DATETIME | Sequelize timestamps |

**Associations:** `User` hasMany `Session`; `Session` belongsTo `User`.

No `username`, `role`, or `sessions.token` column.

---

## Acceptance Criteria (Gherkin)

### US-1.1 — Create account

#### Scenario: User registers with valid information
*   **Given** I am on the login page
*   **When** I open **Create Account**
*   **And** I enter valid first name, last name, email, and password
*   **And** I click **Create Account**
*   **Then** the API returns `200` with `email`, `firstName`, `lastName`, `id`, and `token`
*   **And** my password is stored as a scrypt hash with a salt
*   **And** I am sent to the recipes list
*   **And** my session is stored in `localStorage` under the key `user`

#### Scenario: User registers with a duplicate email
*   **Given** a user with email `jane@example.com` already exists
*   **When** I submit **Create Account** with email `jane@example.com`
*   **Then** the API returns `400` with `{ "message": "This email is already in use." }`
*   **And** the error is shown in a snackbar

---

### US-1.2 — Sign in

#### Scenario: User logs in with valid credentials
*   **Given** I am on the login page
*   **And** a registered user exists with email `jane@example.com` and a known password
*   **When** I enter that email and the correct password
*   **And** I click **Login**
*   **Then** the API returns `200` with `email`, `firstName`, `lastName`, `id`, and `token`
*   **And** a new session row is created in the database
*   **And** I am sent to the recipes list
*   **And** my session is stored in `localStorage` under the key `user`

#### Scenario: User logs in with an unknown email
*   **Given** I am on the login page
*   **When** I enter an email that is not registered and any password
*   **And** I click **Login**
*   **Then** the API returns `401` with `{ "message": "User not found!" }`
*   **And** I remain on the login page
*   **And** the error is shown in a snackbar

#### Scenario: User logs in with an invalid password
*   **Given** I am on the login page
*   **And** a registered user exists with email `jane@example.com`
*   **When** I enter that email and an incorrect password
*   **And** I click **Login**
*   **Then** the API returns `401` with `{ "message": "Invalid password!" }`
*   **And** I remain on the login page
*   **And** the error is shown in a snackbar

---

### US-1.3 — Stay signed in across page loads

#### Scenario: Signed-in user refreshes the recipes page
*   **Given** I have a valid session in `localStorage`
*   **And** I am on the recipes list
*   **When** I refresh the page
*   **Then** I remain signed in
*   **And** my recipes are loaded with the stored token

#### Scenario: API request includes session token
*   **Given** I am signed in
*   **When** the frontend makes an authenticated API request
*   **Then** the request includes header `Authorization: Bearer <token>`

#### Scenario: Protected API request succeeds with a valid session
*   **Given** I am signed in as user A
*   **And** user B also exists
*   **When** I send an authenticated `GET /recipeapi/recipes/user/{userA.id}` request
*   **Then** the API returns `200`
*   **And** only recipes owned by user A are returned

#### Scenario: Visiting the login page clears the stored session
*   **Given** I have a valid session in `localStorage`
*   **When** I navigate to the login page
*   **Then** `localStorage` key `user` is removed

#### Scenario: Expired or invalid session token
*   **Given** I am signed in with an expired or revoked token
*   **When** the frontend makes an authenticated API request
*   **Then** the API returns `401` with an unauthorized message

---

### US-1.4 — Sign out

#### Scenario: User logs out
*   **Given** I am signed in on the recipes list
*   **When** I click **Logout**
*   **Then** the API invalidates my session on the server
*   **And** `localStorage` key `user` is removed
*   **And** I am sent to the login page

---

### US-1.5 — Protect authenticated APIs and signed-in UI

#### Scenario: Unauthenticated user views published recipes
*   **Given** I have no session in `localStorage`
*   **When** I open the recipes list or click **View Published Recipes**
*   **Then** I see published recipes
*   **And** I am not redirected to login

#### Scenario: Protected API is called without a token
*   **Given** I have no session token
*   **When** I send `GET /recipeapi/recipes/user/1` without `Authorization`
*   **Then** the API returns `401`

---

## Test Coverage Map

Each scenario above must map to at least one automated test. `it("…")` titles match the Gherkin scenario names exactly.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-1.1 | User registers with valid information | `backend/tests/auth.test.js` | `User registers with valid information` |
| US-1.1 | User registers with valid information | `frontend/tests/Login.test.js` | `User registers with valid information` |
| US-1.1 | User registers with a duplicate email | `backend/tests/auth.test.js` | `User registers with a duplicate email` |
| US-1.1 | User registers with a duplicate email | `frontend/tests/Login.test.js` | `User registers with a duplicate email` |
| US-1.2 | User logs in with valid credentials | `backend/tests/auth.test.js` | `User logs in with valid credentials` |
| US-1.2 | User logs in with valid credentials | `frontend/tests/Login.test.js` | `User logs in with valid credentials` |
| US-1.2 | User logs in with an unknown email | `backend/tests/auth.test.js` | `User logs in with an unknown email` |
| US-1.2 | User logs in with an unknown email | `frontend/tests/Login.test.js` | `User logs in with an unknown email` |
| US-1.2 | User logs in with an invalid password | `backend/tests/auth.test.js` | `User logs in with an invalid password` |
| US-1.2 | User logs in with an invalid password | `frontend/tests/Login.test.js` | `User logs in with an invalid password` |
| US-1.3 | Signed-in user refreshes the recipes page | `frontend/tests/Login.test.js` | `Signed-in user refreshes the recipes page` |
| US-1.3 | API request includes session token | `frontend/tests/Login.test.js` | `API request includes session token` |
| US-1.3 | Protected API request succeeds with a valid session | `backend/tests/auth.test.js` | `Protected API request succeeds with a valid session` |
| US-1.3 | Visiting the login page clears the stored session | `frontend/tests/Login.test.js` | `Visiting the login page clears the stored session` |
| US-1.3 | Expired or invalid session token | `backend/tests/auth.test.js` | `Expired or invalid session token` |
| US-1.4 | User logs out | `backend/tests/auth.test.js` | `User logs out` |
| US-1.4 | User logs out | `frontend/tests/Login.test.js` | `User logs out` |
| US-1.5 | Unauthenticated user views published recipes | `frontend/tests/Login.test.js` | `Unauthenticated user views published recipes` |
| US-1.5 | Protected API is called without a token | `backend/tests/auth.test.js` | `Protected API is called without a token` |

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 1 from @features/feature-1-user-authentication-session-management.md on branch `feature/1-user-authentication-session-management`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
Do not add `/todo` routes, username, role, bcrypt, or JWT session-token columns. Align with the existing Recipe `/recipeapi` auth.
```

**Reference updates for this feature:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

## Definition of Done

*   [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-009** satisfied)
*   [ ] **Success Criteria (SC-001**–**SC-003)** met
*   [ ] All mapped tests pass (`npm test`)
*   [ ] Test Coverage Map complete
*   [ ] `features/reference/data-model.md` updated (if schema changed)
*   [ ] `features/reference/api.md` updated (if API changed)
*   [ ] `features/reference/behavior.md` updated (if product rules changed)
*   [ ] Feature catalog row added in [README.md §2.3](../README.md#23-feature-catalog)
*   [ ] PR targets `dev` (not `main`)

## Out of Scope

*   Password reset, email verification, OAuth / social login
*   Username, user roles, bcrypt, or JWT stored in `sessions.token`
*   Inline email-format / confirm-password validation (not in the running Login UI)
*   Ingredient catalog (team `feature/2-ingredient-management`)
*   PDF reports (team `feature/5-pdf-reports`)
*   Recipe/step/ingredient CRUD rules beyond using them as a session probe
*   Todo lists (`/todo/lists`)

## Delivered to later recipe features

*   `req.user.id` from the session token is the ownership key for later features.
*   After login, users land on the existing recipes list (`/recipes`).
