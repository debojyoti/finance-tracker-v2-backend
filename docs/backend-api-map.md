# Finance Tracker V2 Backend API Map

This file is a fast index for agent navigation.

## Auth

Base path: `/api/auth`

- `POST /`
  - file path: `routes/auth.js`, `controllers/authController.js`
  - middleware: `verifyFirebaseAuth`, `validateUserInfo`
  - purpose: exchange Firebase token for backend JWT
- `GET /me`
  - middleware: `authenticate`
  - purpose: get current backend user
- `POST /logout`
  - middleware: `authenticate`
  - purpose: logical logout only, client clears token

## Expenses

Base path: `/api/expenses`

- `POST /`
  - create many expenses at once
  - file path: `controllers/expenseController.js#createExpenses`
  - body per expense: `expenseTypeId`, `amount`, `expenseCategory`, `description`, `expense_date`, `need_or_want`, `could_have_saved`, optional `reportingMode`, optional `entryPurpose`
  - when `entryPurpose = punishment` and no `reportingMode` is supplied, `reportingMode` defaults to `lifetime_only`
- `GET /`
  - paginated expense list + aggregate stats
  - supports `month`, `year`, `weekDate`, `view`, `startDate`, `endDate`, `categories`, `expenseType`, `need_or_want`, `entryPurpose`, `page`, `limit`, `sort`
  - `view` values: `week`, `month`, `year`, `lifetime` (applies reporting rules, overrides explicit date filters). Any other value returns `400` with a descriptive message.
  - `month` + `year` without `view`: equivalent to `view=month` — only `reportingMode = standard` entries are returned
- `PUT /:id`
  - update one expense
  - body may include `reportingMode` and `entryPurpose`; switching to `entryPurpose = punishment` without a reporting mode defaults `reportingMode` to `lifetime_only`
- `DELETE /:id`
  - delete one expense

### Expense analytics

- `GET /analytics/daily`
  - daily totals for a month (only counts `reportingMode = standard` entries so monthly charts stay clean)
- `GET /analytics/top-categories`
  - top categories by amount
  - supports the same `view` + `weekDate` query params as list; an unrecognized `view` returns `400`
  - `month` + `year` without `view` also restricts to `reportingMode = standard`
- `GET /analytics/category-transactions/:categoryId`
  - paginated transactions for one category
  - supports the same `view` + `weekDate` query params as list; an unrecognized `view` returns `400`
  - `month` + `year` without `view` also restricts to `reportingMode = standard`

### Reporting rules (personal expenses)

| `reportingMode`  | week | month | year | lifetime |
| ---------------- | ---- | ----- | ---- | -------- |
| `standard`       | yes  | yes   | yes  | yes      |
| `yearly_only`    | no   | no    | yes  | yes      |
| `lifetime_only`  | no   | no    | no   | yes      |

`entryPurpose = punishment` entries default to `reportingMode = lifetime_only`, so they only appear in lifetime totals.

All existing documents must be backfilled with `reportingMode` and `entryPurpose` before release. Run `node scripts/backfill-expense-reporting-fields.js` once. After migration, queries match only explicit enum values — no null fallback branches in runtime code.

Week ranges are Monday 00:00 through Sunday 23:59:59.999 in server local time. Pass `weekDate` (any date within the target week) to select a non-current week; otherwise the current week is used.

## Recurring Expenses

Base path: `/api/recurring-expenses`

- `POST /`
  - create a recurring expense definition
  - body: `title`, `amount`, `frequency` (`monthly`|`yearly`), `expenseCategory`, `need_or_want`, optional `startDate`, `expenseTypeId`, `reportingMode`, `description`, `isActive`
  - file path: `controllers/recurringExpenseController.js#createRecurringExpense`
- `GET /`
  - list definitions for current user
  - supports `frequency`, `isActive`, `sort` filters
  - file path: `controllers/recurringExpenseController.js#getRecurringExpenses`
- `PUT /:id`
  - update a definition (ownership-checked)
  - file path: `controllers/recurringExpenseController.js#updateRecurringExpense`
- `DELETE /:id`
  - delete a definition (ownership-checked)
  - file path: `controllers/recurringExpenseController.js#deleteRecurringExpense`

Files:

- `routes/recurringExpenses.js`
- `controllers/recurringExpenseController.js`
- `models/RecurringExpense.js`
- `utils/recurringExpenseMaterializer.js`

### Lazy materialization

Before every expense list and analytics response, `materializeRecurringExpenses(userId)` runs and converts all due recurring definitions into real `ExpenseTransaction` rows. This is idempotent: a unique sparse index on `recurringOccurrenceKey` (`{id}_{YYYY-MM}` or `{id}_{YYYY}`) prevents duplicate rows for the same occurrence.

A candidate row is only inserted when its `expense_date` (1st of the month for monthly, 1st of the recurrence month for yearly) is on or after the definition's full `startDate`. This means a mid-month or mid-year `startDate` does not generate a row in the same period it begins.

## Budgets

Base path: `/api/budgets`

Files:

- `routes/budgets.js`
- `controllers/budgetController.js`
- `models/BudgetSetting.js`
- `models/WeeklyBudget.js`

### Monthly default

- `GET /monthly-default`
  - returns `{ defaultMonthlyBudget, isSet }` for the current user
  - `isSet: false` and `defaultMonthlyBudget: 0` if not yet configured
- `PUT /monthly-default`
  - body: `{ defaultMonthlyBudget: Number }`
  - upserts a single `BudgetSetting` row per user
  - does **not** update already-created `WeeklyBudget` rows

### Weekly budget

- `GET /weekly?weekDate=YYYY-MM-DD`
  - returns the `WeeklyBudget` for the week containing `weekDate` (defaults to today)
  - creates the row if it does not exist yet, deriving amount from current monthly default
  - derivation formula: `monthlyDefault × 12 ÷ 52` rounded to 2 decimal places
  - created row has `source = auto`
- `PUT /weekly/:id`
  - body: `{ amount: Number }`
  - overrides the amount for one specific week
  - sets `source = manual`
  - ownership-checked via `userId`; returns `404` if not found or not owned

### Behavior rules

- One `BudgetSetting` per user (upserted, not inserted multiple times)
- One `WeeklyBudget` per user per week start date (unique index enforces this)
- Monthly default changes affect only future week creations
- Manual weekly overrides are isolated to the specific week

## Expense Categories

Base path: `/api/expense-categories`

- `POST /`
- `GET /`
- `PUT /:id`
- `DELETE /:id`

Files:

- `routes/categories.js`
- `controllers/categoryController.js`
- `models/ExpenseCategory.js`

## Expense Types

Base path: `/api/expense-types`

- `POST /`
- `GET /`
- `PUT /:id`
- `DELETE /:id`

Files:

- `routes/types.js`
- `controllers/typeController.js`
- `models/ExpenseType.js`

## Savings

Base path: `/api/savings`

- `POST /`
- `GET /`

Files:

- `routes/savings.js`
- `controllers/savingController.js`
- `models/SavingTransaction.js`

Supported filters:

- `startDate`
- `endDate`
- `type`
- `category`
- `page`
- `limit`
- `sort`

## Earnings

Base path: `/api/earnings`

- `POST /`
  - create an earning transaction
  - body: `amount`, `type`, `title`
  - `type` is a string and can be any user-managed type or default (`salary`, `freelance`, `others`)
- `GET /`
  - list earning transactions with pagination, filtering, and type breakdown
  - returns: earnings array, pagination info, stats with total and breakdown by type

Files:

- `routes/earnings.js`
- `controllers/earningController.js`
- `models/EarningTransaction.js`

Supported filters on `GET /`:

- `startDate` — filter by start date (ISO format)
- `endDate` — filter by end date (ISO format)
- `month` — filter by month (1-12); when supplied with `year`, returns that exact month; when supplied alone, uses current year
- `year` — filter by year (YYYY); when supplied alone, returns the full year (Jan 1 to Dec 31); when supplied with `month`, returns that exact month
- `type` — filter by earning type
- `page` — pagination (default 1)
- `limit` — items per page (default 10)
- `sort` — sort order (default `-createdOn`)

**Note:** `month` and `year` filters override `startDate` and `endDate`. Priority: `month`+`year` (exact month) > `year` only (full year) > `month` only (current year) > explicit `startDate`/`endDate`.

## Earning Types

Base path: `/api/earning-types`

- `POST /`
  - create a new earning type
  - body: `name`
- `GET /`
  - list all earning types for the current user
  - on first fetch, auto-creates default types: `salary`, `freelance`, `others`
- `PUT /:id`
  - update an earning type (ownership-checked)
- `DELETE /:id`
  - delete an earning type (ownership-checked)

Files:

- `routes/earningTypes.js`
- `controllers/earningTypeController.js`
- `models/EarningType.js`

## Office Expenses

Base path: `/api/office-expenses`

- `POST /`
  - create an office expense
  - body: `title`, `amount`, `expenseDate`, `category`, optional `description`
  - returns: `{ success, message, data: { expense } }`
- `GET /`
  - list office expenses with pagination, filters, and sorting
  - returns: `{ success, message, data: { expenses, pagination, stats } }`
  - `expenses` array with all matching office expenses
  - `pagination` includes currentPage, totalPages, totalItems, itemsPerPage
  - `stats` includes totalAmount (sum of all filtered expenses)
- `PUT /:id`
  - update one office expense (ownership-checked)
  - body: `title`, `amount`, `expenseDate`, `category`, `description` (any field optional)
  - returns: `{ success, message, data: { expense } }`
- `DELETE /:id`
  - delete one office expense (ownership-checked)
  - returns: `{ success, message }`

Files:

- `routes/officeExpenses.js`
- `controllers/officeExpenseController.js`
- `models/OfficeExpense.js`

Supported filters on `GET /`:

- `startDate` — filter by start date (ISO format)
- `endDate` — filter by end date (ISO format)
- `category` — filter by category string
- `page` — pagination (default 1)
- `limit` — items per page (default 10)
- `sort` — sort order (default `-expenseDate`)

**Note:** Office expenses are completely separate from personal expense views and are not included in dashboard totals.

## Accomplishment Tags

Base path: `/api/accomplishment-tags`

- `POST /`
- `GET /`
- `PUT /:id`
- `DELETE /:id`

Files:

- `routes/accomplishmentTags.js`
- `controllers/accomplishmentTagController.js`
- `models/AccomplishmentTag.js`

## Accomplishments

Base path: `/api/accomplishments`

- `POST /`
  - create one
- `POST /bulk`
  - create many
- `GET /`
  - list with date and tag filters
- `PUT /:id`
- `DELETE /:id`

Files:

- `routes/accomplishments.js`
- `controllers/accomplishmentController.js`
- `models/Accomplishment.js`

Supported filters:

- `date`
- `month`
- `year`
- `startDate`
- `endDate`
- `tag`
- `type`

## Which File Should I Change?

- Change request validation:
  - usually controller
  - sometimes middleware for auth routes
- Change a route path or middleware stack:
  - route file
- Change persistence fields or enum rules:
  - model file
  - then update controller validation and docs
- Change aggregated dashboard output:
  - `controllers/expenseController.js`
- Change budget default or weekly budget logic:
  - `controllers/budgetController.js`, `models/BudgetSetting.js`, `models/WeeklyBudget.js`
