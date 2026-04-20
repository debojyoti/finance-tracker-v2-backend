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
- `RecurringExpense`
- `OfficeExpense`
- `BusinessExpense`
- `SavingTransaction`
- `RecurringSavingPlan`
- `EarningTransaction`
- `Accomplishment`
- `AccomplishmentTag`
- `BudgetSetting`
- `WeeklyBudget`

### `middleware/`

- `firebaseAuth.js`: verifies Firebase token during login
- `auth.js`: verifies backend JWT for all other private routes

### `config/`

- `database.js`: opens the MongoDB connection
- `firebase.js`: decodes the base64 service account and initializes Firebase Admin

### `utils/`

- `jwt.js`: token generation and verification for backend sessions
- `recurringExpenseMaterializer.js`: lazily materializes due recurring expense definitions into `ExpenseTransaction` rows before reads

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
- Supports weekly/monthly/yearly/lifetime reporting views via the `view` query parameter
- Important fields:
  - `expense_date`
  - `expenseCategory`
  - `expenseTypeId`
  - `need_or_want`
  - `could_have_saved`
  - `reportingMode` (`standard` | `yearly_only` | `lifetime_only`, default `standard`)
  - `entryPurpose` (`regular` | `punishment`, default `regular`)

#### Reporting rules

- `standard`: counted in week, month, year, lifetime
- `yearly_only`: counted only in year and lifetime
- `lifetime_only`: counted only in lifetime
- `entryPurpose = punishment` entries default to `reportingMode = lifetime_only` so they do not distort weekly or monthly totals
- Weeks run Monday 00:00 through Sunday 23:59:59.999 in server local time
- All documents must have `reportingMode` and `entryPurpose` set. Run `scripts/backfill-expense-reporting-fields.js` once before first release to backfill existing documents.
- Analytics and list endpoints that accept `view` return `400` on an unrecognized value instead of silently widening results

### Recurring Expenses

- `RecurringExpense`: defines a repeating expense with `frequency` (`monthly` or `yearly`), `startDate`, and all expense fields inherited by the generated transactions.
- On each expense list or analytics read, `utils/recurringExpenseMaterializer.js` is called first for the requesting user.
- The materializer finds all active `RecurringExpense` definitions and inserts one `ExpenseTransaction` per due occurrence (month or year) whose candidate date (1st of month or 1st of recurrence month in the year) is on or after the full `startDate` and up through today. A mid-month or mid-year `startDate` therefore does not produce a row in the same period it begins — the first row appears in the next due period.
- Idempotency is guaranteed by a unique sparse index on `ExpenseTransaction.recurringOccurrenceKey`, which encodes `{recurringExpenseId}_{YYYY-MM}` for monthly and `{recurringExpenseId}_{YYYY}` for yearly occurrences. Duplicate-key errors on re-runs are silently ignored.
- Generated transactions set `entryPurpose = regular` and inherit `reportingMode` from the definition, so they obey the same reporting-view rules as manual entries.
- No cron job, worker, or background process is required.

#### Pre-release migration

Before deploying this feature for the first time, run the one-time backfill script:

```
node scripts/backfill-expense-reporting-fields.js
```

This idempotently sets `reportingMode = standard` and `entryPurpose = regular` on any existing documents that are missing those fields. After the script runs, query logic matches only explicit enum values.

### Categories and Types

- Supporting master data for expenses
- Queried by user
- Used heavily by the expense creation and editing UI

### Savings and Investments

- Transaction log for saving and investment activity
- `SavingTransaction` fields:
  - `amount` (number, non-negative)
  - `type`: `add` or `withdraw`
  - `title` (string)
  - `assetType`: `saving` or `investment`
  - `category`: `fixed` or `topup`
  - `createdOn` (date)
  - `userId`
- Supports month/year filtering and section-only totals (separate from expense analytics)
- `RecurringSavingPlan` defines recurring saving/investment entries:
  - `title`, `amount`, `frequency` (`monthly` or `yearly`)
  - `assetType`, `category`, `startDate`
  - `isActive` flag
  - `userId`
- Recurring plans can be created, updated, and deleted; they do not auto-generate transactions
- Backend routes exist at `/api/savings` (transactions) and `/api/savings/plans` (definitions)
- Frontend page implemented at `/savings` with transaction and recurring plan management

### Earnings

- `EarningTransaction`: transaction log with amount, type (string), title, createdOn, userId
- `EarningType`: user-managed income type definitions with auto-seeded defaults (salary, freelance, others)
- Supports flexible date filtering:
  - `month` + `year`: exact month range
  - `year` only: full year range (Jan 1 to Dec 31)
  - `month` only: month in current year
  - `startDate`/`endDate`: explicit range (overridden by month/year)
- Returns type breakdown in stats object
- Backend routes exist at `/api/earnings` (create, list with filters, update, delete) and `/api/earning-types` (CRUD)
- Frontend page implemented at `/earnings` with income CRUD and type management

### Office Expenses

- Separate transaction log for office-related spending
- Fields: title, amount, expenseDate, category (string), description, userId
- Intentionally simple; no reimbursement, approval, or vendor workflows
- Supports CRUD via `/api/office-expenses`
- Date range and category filtering supported
- Completely separate from personal expense analytics and dashboard totals
- User-owned and scoped by userId

### Business Expenses

- Separate transaction log for business-related spending
- Fields: title, amount, expenseDate, category (string), description, userId
- Intentionally simple; no vendor, client, or project tracking
- Supports CRUD via `/api/business-expenses`
- Date range and category filtering supported
- Completely separate from personal expense analytics, office expenses, and dashboard totals
- User-owned and scoped by userId

### Accomplishments

- Time-tracking style feature
- Types: `task`, `meeting`
- Supports tags
- Supports bulk create and weekly retrieval in the UI

### Budgets

- `BudgetSetting`: one document per user storing `defaultMonthlyBudget`
- `WeeklyBudget`: one document per user per week; created on first access
- Weekly budget amount is derived from the monthly default using: `monthlyDefault × 12 ÷ 52` (rounded to 2 decimal places)
- Changing the monthly default does not retroactively update existing `WeeklyBudget` rows
- Overriding a weekly budget sets `source = manual` and only affects that specific week
- Week boundaries are Monday 00:00 through Sunday 23:59:59.999 in server local time

### Dashboard

- Single-endpoint overview at `/api/dashboard/overview` assembles all dashboard data in one call
- Response envelope: `{ success: true, message, data: {...} }` following repo-wide convention
- Returns:
  - Weekly metrics: spent, budget, could-have-saved, remaining
  - Yearly metrics: personal spend, business spend, cash in, cash out
  - Lifetime punishment total
  - Top categories for week, month, year (10 per period)
  - Chart data:
    - `weeklySpend`: 7-day series (Mon-Sun) with daily personal spend (standard reporting only)
    - `monthlyCumulative`: 12-month running total of personal spend (standard + yearly_only reporting) within current year
    - `yearlyCashFlow`: 12-month breakdown of cash-in (earnings) vs cash-out (personal + business) within current year
- Inclusion rules:
  - Personal expenses (standard + yearly_only reporting modes) counted in week/month/year and cumulative charts
  - Business expenses counted **only** in yearly cash-out and yearly cash-flow chart
  - Office expenses **excluded** from all dashboard totals and charts
  - Savings/investments **excluded** from all dashboard totals and charts
  - Earnings counted in yearly cash-in and yearly cash-flow chart
  - Punishment total reported separately (lifetime only)
- Materializes recurring expenses before each read
- Week boundaries follow expense reporting rules (Monday-Sunday, server local time)

## Current Feature Completeness

- Auth: implemented end-to-end
- Expenses: implemented end-to-end (with weekly/monthly/yearly/lifetime reporting views)
- Recurring expenses: definition CRUD and lazy materialization implemented end-to-end
- Expense analytics: implemented end-to-end
- Categories/types: implemented end-to-end
- Accomplishments/tags: implemented end-to-end
- Budgets: implemented end-to-end (monthly default + weekly snapshots)
- Earnings/Income: implemented end-to-end (with type management)
- Office expenses: implemented end-to-end
- Business expenses: implemented end-to-end
- Savings and investments: implemented end-to-end (manual transactions + recurring plans)
- Dashboard overview: implemented end-to-end (single endpoint with weekly, monthly, yearly, and lifetime sections)

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
- Monday-to-Sunday week ranges
- view-based filters (`week`/`month`/`year`/`lifetime`) that also apply reporting-mode rules
- category/type/need-vs-want filters and `entryPurpose` filtering
- paginated list queries
- aggregate stats
- daily chart data
- top category chart data
- category-specific drilldown

### Dashboard

`controllers/dashboardController.js` assembles dashboard data from multiple sources:

- Queries personal expenses (with reporting-mode filtering) for week/month/year totals
- Queries business expenses for yearly cash-out only
- Queries earnings for yearly cash-in
- Queries punishment entries for lifetime total
- Builds top-category lists for week, month, year using MongoDB `$lookup` for category details
- Generates chart series: weekly spend by day, monthly cumulative spend (12 months), yearly cash flow by month
- All queries scoped to `userId`
- Materializes recurring expenses before expense reads

### Savings and earnings

These use a lighter pattern:

- paginated list
- optional filter set
- aggregated totals by type

## Important Couplings With Frontend

- Frontend expects backend JWT auth, not Firebase auth, for normal API calls.
- Frontend service methods map closely to current route names.
- Frontend expects response envelopes shaped as `response.data.<payload>`.
- Dashboard page calls single `/api/dashboard/overview` endpoint for all dashboard data.
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
