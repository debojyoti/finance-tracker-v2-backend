# Backend Agent Guide

This repo is the source of truth for domain rules, persistence, and API contracts.

## Project Context

This project is a personal finance tracker built for day-to-day money tracking and lightweight personal productivity tracking.

The backend exists to:

- authenticate the user
- store all personal finance and accomplishment data
- enforce per-user ownership
- provide aggregated data for the dashboard and reports

## Product Features In This Repo

- Google/Firebase login exchange to backend JWT
- Expense transaction storage
- Expense analytics for dashboard views
- Expense category management
- Expense type management
- Savings transaction tracking
- Earnings transaction tracking
- Accomplishment tracking with tags and bulk entry support

## What This Repo Does Not Own

- screen rendering and interaction details
- frontend routing and page state
- client-side Firebase login UX

Those live in the UI repo.

## Read First

1. `docs/backend-architecture.md`
2. `docs/backend-api-map.md`
3. `server.js`

## Stack

- Node.js
- Express 5
- MongoDB via Mongoose
- Firebase Admin SDK for Firebase token verification
- JWT for app-session auth after login

## Architecture

- Entry point: `server.js`
- Route layer: `routes/*.js`
- Business logic: `controllers/*.js`
- Persistence schemas: `models/*.js`
- Auth middleware:
  - `middleware/firebaseAuth.js` for Firebase token exchange on login
  - `middleware/auth.js` for app JWT protection on normal API calls
- Infra config:
  - `config/database.js`
  - `config/firebase.js`
- JWT helpers:
  - `utils/jwt.js`

## Core Invariants

1. User isolation matters. Queries and mutations should remain scoped to `req.user.userId`.
2. Auth flow is two-step:
   - Frontend gets Firebase token
   - Backend verifies it and returns its own JWT
3. API responses generally use:
   - `success`
   - `message`
   - `data`
4. Expenses, categories, types, tags, accomplishments, savings, and earnings are all user-owned data.
5. Frontend currently depends on existing field names like `expenseCategory`, `expenseTypeId`, `need_or_want`, `could_have_saved`, and `expense_date`.

## Where To Edit

- Add or change expense analytics: `controllers/expenseController.js`
- Add or change expense CRUD: `routes/expenses.js`, `controllers/expenseController.js`, `models/ExpenseTransaction.js`
- Change auth: `routes/auth.js`, `controllers/authController.js`, `middleware/auth.js`, `middleware/firebaseAuth.js`, `config/firebase.js`, `utils/jwt.js`
- Change categories/types: matching route, controller, and model files
- Change accomplishments/tags: matching route, controller, and model files
- Change savings/earnings: matching route, controller, and model files

## Known Implementation Notes

- `ExpenseCategory` and `ExpenseType` schemas mark the name field as globally `unique: true`, while controllers enforce per-user uniqueness. If uniqueness behavior changes, align schema and controller behavior together.
- Savings and earnings only expose create/list flows today.
- Expense analytics currently live inside the expense controller rather than a separate analytics module.
- CORS is currently open with `origin: '*'` in `server.js`.

## Documentation Rule

Update docs in the same change when any of the following changes:

- Route surface or HTTP contract
- Model fields, enums, indexes, or ownership assumptions
- Auth flow
- Environment variables
- Feature completeness status

Minimum docs to update when relevant:

- `docs/backend-architecture.md`
- `docs/backend-api-map.md`
- `README.md` if setup or run instructions changed
