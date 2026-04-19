# Finance Tracker V2 Backend Architecture

## Purpose

This backend stores all finance tracker data, verifies login, enforces user ownership, and exposes the API consumed by the React UI.

## Request Lifecycle

### Login flow

1. Frontend signs in with Google through Firebase client SDK.
2. Frontend sends `firebaseToken` plus a basic `user` object to `POST /api/auth`.
3. `middleware/firebaseAuth.js` verifies the Firebase token through Firebase Admin.
4. `controllers/authController.js` finds or creates the user in MongoDB.
5. Backend returns its own JWT.
6. Frontend stores that JWT in `localStorage` as `jwtToken`.

### Normal protected API flow

1. Frontend sends backend JWT in `Authorization: Bearer <token>`.
2. `middleware/auth.js` verifies JWT and loads the Mongo user.
3. Controller reads `req.user.userId`.
4. Queries and writes are scoped to that user.

## Folder Responsibilities

### `server.js`

- Loads env vars
- Connects MongoDB
- Initializes Firebase Admin
- Registers routes
- Sets CORS and body parsing
- Installs error and 404 handlers

### `routes/`

Thin HTTP mapping layer. Each file mounts controller handlers and auth middleware for one resource area.

### `controllers/`

Contains request validation, ownership checks, query building, aggregation, response shaping, and CRUD logic.

### `models/`

Mongoose schemas for:

- `User`
- `ExpenseCategory`
- `ExpenseType`
- `ExpenseTransaction`
- `SavingTransaction`
- `EarningTransaction`
- `Accomplishment`
- `AccomplishmentTag`

### `middleware/`

- `firebaseAuth.js`: verifies Firebase token during login
- `auth.js`: verifies backend JWT for all other private routes

### `config/`

- `database.js`: opens the MongoDB connection
- `firebase.js`: decodes the base64 service account and initializes Firebase Admin

### `utils/`

- `jwt.js`: token generation and verification for backend sessions

## Domain Model Summary

### Users

- Identified by Firebase UID plus local Mongo `_id`
- Backend JWT payload includes local `userId`, email, and Firebase UID

### Expenses

- Main feature area
- Supports bulk create, list, update, delete
- Supports monthly analytics:
  - daily totals
  - top categories
  - category transaction drilldown
- Important fields:
  - `expense_date`
  - `expenseCategory`
  - `expenseTypeId`
  - `need_or_want`
  - `could_have_saved`

### Categories and Types

- Supporting master data for expenses
- Queried by user
- Used heavily by the expense creation and editing UI

### Savings

- Simple transaction log
- Types: `add`, `withdraw`
- Categories: `fixed`, `topup`
- Backend exists, frontend feature page is still missing

### Earnings

- Simple transaction log
- Types: `salary`, `freelance`, `others`
- Backend exists, frontend feature page is still missing

### Accomplishments

- Time-tracking style feature
- Types: `task`, `meeting`
- Supports tags
- Supports bulk create and weekly retrieval in the UI

## Current Feature Completeness

- Auth: implemented
- Expenses: implemented end-to-end
- Expense analytics: implemented end-to-end
- Categories/types: implemented end-to-end
- Accomplishments/tags: implemented end-to-end
- Savings: backend only
- Earnings: backend only

## Data Ownership Pattern

Nearly every domain document includes `userId`.

When editing or extending the backend:

- include `userId` on create
- filter by `userId` on read
- verify ownership before update/delete

If a new query does not use user scoping, it is likely wrong unless explicitly intended.

## Query And Aggregation Patterns

### Expenses

`controllers/expenseController.js` is the busiest file and handles:

- month/year filters
- date-range filters
- category/type/need-vs-want filters
- paginated list queries
- aggregate stats
- daily chart data
- top category chart data
- category-specific drilldown

### Savings and earnings

These use a lighter pattern:

- paginated list
- optional filter set
- aggregated totals by type

## Important Couplings With Frontend

- Frontend expects backend JWT auth, not Firebase auth, for normal API calls.
- Frontend service methods map closely to current route names.
- Frontend expects response envelopes shaped as `response.data.<payload>`.
- Dashboard depends on expense stats and analytics endpoints.
- Expenses page depends on categories and types being fetched separately.

## Risks And Gotchas

- Category and type schemas use globally unique names, but controllers behave as if names are unique per user. That mismatch can surface in production if two users create the same name.
- `server.js` currently exposes permissive CORS.
- There is minimal automated test coverage at the moment.
- Expenses analytics are inside the expense controller, so edits there can affect dashboard behavior unexpectedly.

## Change Checklist

When changing backend behavior, check these:

1. Does the route still require the right auth middleware?
2. Is `userId` preserved on create/read/update/delete?
3. Did the response shape change?
4. Does the frontend API client need changes?
5. Do docs need updating?
