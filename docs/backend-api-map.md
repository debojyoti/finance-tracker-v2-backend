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
- `GET /`

Files:

- `routes/earnings.js`
- `controllers/earningController.js`
- `models/EarningTransaction.js`

Supported filters:

- `startDate`
- `endDate`
- `type`
- `page`
- `limit`
- `sort`

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
