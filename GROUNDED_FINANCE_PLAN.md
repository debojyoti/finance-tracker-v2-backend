# Grounded Finance Evolution Plan

## Goal

Extend the current personal expense tracker into a broader money tracker without turning it into a generic accounting system.

The codebase should stay close to the current shape:

- backend remains Express controllers + Mongoose models
- frontend remains route/page driven with local state and `src/services/api.js`
- existing response envelope stays `success`, `message`, `data`
- personal expense analytics remain centered around the existing expense feature

## What We Will Not Do

- No generic double-entry ledger
- No plugin or rules engine
- No job queue or cron dependency for recurring entries
- No global frontend state store
- No attempt to unify every money concept into one mega model
- No prediction/ML forecasting for “next month”

## High-Level Design Decisions

### 1. Personal expenses stay in `ExpenseTransaction`

Add only the minimum new meaning needed for visibility and punishment:

- `reportingMode`
  - `standard`: show in week, month, year, lifetime
  - `yearly_only`: hide from week and month, show in year and lifetime
  - `lifetime_only`: show only in lifetime
- `entryPurpose`
  - `regular`
  - `punishment`

Why this is grounded:

- it keeps normal personal expenses in the existing collection
- it solves “exclude from weekly/monthly” and “punishment only in lifetime”
- it avoids a second punishment model

### 2. Office and business expenses get separate collections

They are separate enough from personal expenses that forcing them into `ExpenseTransaction` would make expense analytics harder to reason about.

Add:

- `OfficeExpense`
- `BusinessExpense`

Use simple fields:

- `title`
- `amount`
- `expenseDate`
- `category` as plain string
- `description`
- `userId`

Why this is grounded:

- the user explicitly wants separate data and separate pages
- no need to build separate category/type master tables for office and business right now
- yearly dashboard totals can still include business totals without contaminating personal monthly/weekly analytics

### 3. Recurring fixed expenses use definitions plus lazy materialization

Add `RecurringExpense` with:

- `title`
- `amount`
- `frequency`: `monthly` or `yearly`
- `startDate`
- `isActive`
- `expenseCategory`
- `expenseTypeId`
- `need_or_want`
- `description`
- optional `reportingMode`
- `userId`

When reading dashboard or expense data, backend runs a small idempotent “materialize due recurring expenses” helper before querying.

Why this is grounded:

- recurring entries become real expense rows, so all existing analytics keep working
- no scheduler is required
- no duplicate generation if materialization is idempotent

### 4. Income keeps the existing earnings area

Keep `EarningTransaction` as the income log. Do not replace it.

Add a lightweight `EarningType` model for user-managed income types. Keep the transaction `type` stored as a string so old data does not need a hard migration.

Why this is grounded:

- existing earnings backend already exists
- managed types are added without breaking current data
- cash-in summaries become straightforward

### 5. Budgets stay simple: one current monthly default plus weekly snapshots

Add:

- `BudgetSetting`
  - `defaultMonthlyBudget`
  - `userId`
- `WeeklyBudget`
  - `weekStartDate`
  - `weekEndDate`
  - `amount`
  - `source`: `auto` or `manual`
  - `userId`

Rule:

- when a week is first requested, create that week’s `WeeklyBudget` from the current monthly default
- editing the monthly default affects only future weeks
- editing a weekly budget only affects that specific week

Why this is grounded:

- no budget history engine is needed
- snapshotting each week preserves non-retroactive behavior
- dashboard calculations stay simple

### 6. Savings and investments remain a separate feature area

Keep the current savings concept but expand it instead of inventing a wealth platform.

Use:

- existing `SavingTransaction`, extended with `assetType`
  - `saving`
  - `investment`
- add `RecurringSavingPlan` for recurring savings/investment entries

These remain fully separate from personal expense, income, and dashboard spend analytics.

Why this is grounded:

- the user explicitly wants this data separate
- current savings feature already exists and can be extended

### 7. Dashboard gets one dedicated overview endpoint

Add a new backend route for dashboard assembly instead of making the frontend stitch many unrelated calls together.

Suggested route:

- `GET /api/dashboard/overview`

This route can return:

- this week spend
- this week budget
- this week could-have-saved
- this week remaining budget
- this year personal spend
- this year business spend
- this year cash in
- this year cash out
- punishment lifetime total
- top categories for week, month, year
- chart series needed by the dashboard

Why this is grounded:

- one endpoint matches one dashboard page
- it avoids frontend orchestration sprawl
- existing expense endpoints can still power the expenses page

## Reporting Rules

These rules should be implemented explicitly and documented in backend docs.

### Personal expenses

- `standard`: included in week, month, year, lifetime
- `yearly_only`: excluded from week and month, included in year and lifetime
- `lifetime_only`: excluded from week, month, year, included in lifetime
- `entryPurpose = punishment` should default to `lifetime_only`

### Office expenses

- never included in personal weekly, monthly, yearly, or lifetime spend stats
- visible only in the office expenses section

### Business expenses

- excluded from personal weekly and monthly views
- included in yearly cash-out summaries
- shown in their own section

### Savings and investments

- never included in spend or cash-in/cash-out dashboard totals
- shown only in the savings and investments section

## Migration Strategy

This plan assumes frontend and backend are released together and existing Mongo data is migrated once.

That means:

- no permanent backward-compatibility branches in normal query logic
- no legacy-aware reporting filters left in the codebase after rollout
- one explicit migration step per schema change when stored data would otherwise behave differently

For Phase 1 specifically:

- existing `ExpenseTransaction` documents must be backfilled with:
  - `reportingMode: standard`
  - `entryPurpose: regular`
- once the backfill is done, reporting queries can match explicit enum values only

Migration shape should stay simple:

- use a small one-off script under a dedicated backend migrations/scripts area
- make it idempotent where practical
- log how many documents were matched and updated
- document how to run it before release
- do not build a general migration framework unless later phases truly need it

## Dashboard Interpretation

The requested “next month projection” is ambiguous because the details listed are current-month numbers. To stay grounded, v1 should implement a current-month projection card, not a true next-calendar-month forecast.

Projection formula for v1:

- current month actual spend
- plus fixed recurring expenses still due in the rest of the current month

No speculative forecasting beyond that.

## Phase Plan

## Phase 1: Personal Expense Reporting, Weekly View, Punishment

### Scope

- extend `ExpenseTransaction` with `reportingMode` and `entryPurpose`
- add a one-time migration to backfill existing expense documents with default reporting fields
- update expense create, update, list, and analytics filters
- add week-based filtering using Monday to Sunday
- update expense logging UI so entries can be marked as:
  - normal
  - yearly only
  - punishment/lifetime only
- update expenses page to support a weekly view alongside the current month view

### Deliverables

- one migration script for existing expenses
- weekly expense list and weekly totals
- flag/visibility support in create and edit flows
- punishment entries excluded from week, month, year analytics
- lifetime punishment total available for dashboard use

### Simplicity Review 1

- Do not create a separate punishment model.
- Do not redesign the current expense/category/type data model.
- Keep weekly filtering inside the existing expense feature.

### Simplicity Review 2

- Reuse current expense pages and modal instead of adding a separate weekly page.
- Keep analytics helpers near `expenseController.js`; no new analytics framework.
- Keep response shapes consistent with current endpoints.
- Prefer a one-time data migration over permanent legacy-query complexity.

### Simplicity Review 3

- If a field is only needed by UI labels, do not persist it.
- If a filter can be expressed with one enum, do not add multiple booleans.
- Do not add a new page for punishment in v1.

## Phase 2: Budgets

### Scope

- add `BudgetSetting` and `WeeklyBudget`
- create endpoints to:
  - get current monthly default budget
  - update current monthly default budget
  - get or create weekly budget for a given week
  - override a weekly budget
- show weekly budget and remaining amount on dashboard

### Deliverables

- default monthly budget stored per user
- weekly budget snapshots created when needed
- weekly override support
- dashboard cards for spent, available, remaining, could-have-saved

### Simplicity Review 1

- No full budget history model.
- No daily budget allocation.
- No attempt to rebalance older weeks.

### Simplicity Review 2

- Use one current monthly setting doc plus weekly snapshot docs.
- Derive weekly default with one helper; do not build a rules system.
- Keep budget management inline on dashboard or a small settings block, not a new complex module.

### Simplicity Review 3

- Only persist week-level budgets.
- Avoid automation beyond “create week snapshot on first access”.
- Do not retroactively mutate previous week budgets.

## Phase 3: Fixed Recurring Expenses

### Scope

- add `RecurringExpense`
- add CRUD endpoints and a simple management page
- materialize due monthly/yearly entries on reads that depend on personal expenses
- generated entries should appear as normal expenses on the 1st day of the month or year

### Deliverables

- new recurring expenses page
- fixed monthly/yearly expenses automatically added without cron
- recurring entries visible in normal personal expenses and yearly totals according to `reportingMode`

### Simplicity Review 1

- No scheduler, queue, or worker process.
- No generic recurring engine shared across all domains.
- Only support monthly and yearly recurrence.

### Simplicity Review 2

- Recurring entries should materialize into real expense rows.
- Keep recurrence logic server-side and idempotent.
- Do not introduce forecasting beyond materializing due items.

### Simplicity Review 3

- No complex exceptions calendar.
- No proration rules.
- One page, one model, one helper is enough for v1.

## Phase 4: Income and Cash In

### Scope

- add `EarningType` CRUD
- extend earnings endpoints to support month and year filters plus summary totals
- build income page for adding and viewing income
- support default types `salary`, `freelance`, `others` plus user-managed custom types

### Deliverables

- income logging page
- income type management
- monthly and yearly cash-in totals for dashboard

### Simplicity Review 1

- Keep `EarningTransaction` as the transaction store.
- Store the earning type as a string on the transaction.
- Do not replace current earnings feature with a new income domain model.

### Simplicity Review 2

- Use one small `EarningType` collection only for options management.
- Keep page structure similar to other CRUD pages.
- No payroll concepts, no tax handling, no invoice tracking.

### Simplicity Review 3

- Cash-in summary is enough for v1.
- Do not add attachments, client management, or receivable states.
- Avoid coupling earnings to budgets beyond dashboard totals.

## Phase 5: Office and Business Expenses

### Scope

- add `OfficeExpense` CRUD and page
- add `BusinessExpense` CRUD and page
- use plain string categories
- include business totals in yearly cash-out
- exclude office from personal/yearly cash-out dashboard totals

### Deliverables

- office expenses page
- business expenses page
- separate storage and separate UI
- yearly business spend available to dashboard

### Simplicity Review 1

- Do not reuse `ExpenseTransaction` for these areas.
- Do not add category/type master tables for office/business.
- Keep both models intentionally small.

### Simplicity Review 2

- No reimbursement workflow engine for office expenses in v1.
- No vendor management.
- No project/client linkage for business expenses.

### Simplicity Review 3

- Separate pages are enough.
- CRUD + list + summary is enough.
- Keep their inclusion rules explicit in dashboard queries.

## Phase 6: Savings and Investments

### Scope

- expand savings into a “Savings & Investments” section
- extend `SavingTransaction` with `assetType`
- add `RecurringSavingPlan`
- build page for manual and recurring savings/investment entries

### Deliverables

- savings and investments page
- recurring saving and recurring investment support
- separate totals inside this section only

### Simplicity Review 1

- Do not fold savings into dashboard cash-out.
- Do not create portfolio analytics.
- Do not fetch market prices or returns.

### Simplicity Review 2

- One transaction model plus one recurring plan model is enough.
- Keep investments as logged cash movements, not live asset valuation.
- No broker/account abstractions.

### Simplicity Review 3

- Manual totals and recurring plans are enough for v1.
- No goal planner.
- No performance graphs beyond simple contribution history.

## Phase 7: Dashboard, Navigation, and Docs

### Scope

- add dashboard overview backend route
- rebuild dashboard around weekly, monthly, yearly, and lifetime sections
- add routes/sidebar entries for:
  - recurring expenses
  - office expenses
  - business expenses
  - income
  - savings and investments
- update repo docs

### Deliverables

- top section:
  - total spent this week
  - available budget this week
  - could have saved this week
  - remaining budget progress
  - total spent this year
  - cash in vs cash out this year
- weekly top 10 categories
- current month projection section
- punishment lifetime total
- yearly stats section
- a small set of charts:
  - weekly spend by day
  - monthly cumulative spend
  - yearly cash in vs cash out by month
  - top categories pie/bar for current week or month

### Simplicity Review 1

- Build one dashboard page, not a dashboard framework.
- Use one overview endpoint, not many new analytics endpoints unless a page truly needs them.
- Keep charts limited to the requested decisions.

### Simplicity Review 2

- Reuse Recharts.
- Reuse current layout and sidebar patterns.
- Avoid adding interactive complexity that does not change decisions.

### Simplicity Review 3

- Prefer clear cards and simple charts over dense control panels.
- Do not hide important totals behind tabs.
- Update docs in the same phase so future changes stay grounded.

## Suggested Backend File Map

- Personal expense changes:
  - `finance-tracker-v2-backend/models/ExpenseTransaction.js`
  - `finance-tracker-v2-backend/controllers/expenseController.js`
  - `finance-tracker-v2-backend/routes/expenses.js`
  - `finance-tracker-v2-backend/scripts/` or `finance-tracker-v2-backend/migrations/` for one-off data backfills
- Budgets:
  - `finance-tracker-v2-backend/models/BudgetSetting.js`
  - `finance-tracker-v2-backend/models/WeeklyBudget.js`
  - `finance-tracker-v2-backend/controllers/budgetController.js`
  - `finance-tracker-v2-backend/routes/budgets.js`
- Recurring expenses:
  - `finance-tracker-v2-backend/models/RecurringExpense.js`
  - `finance-tracker-v2-backend/controllers/recurringExpenseController.js`
  - `finance-tracker-v2-backend/routes/recurringExpenses.js`
- Income:
  - `finance-tracker-v2-backend/models/EarningType.js`
  - `finance-tracker-v2-backend/controllers/earningController.js`
  - `finance-tracker-v2-backend/controllers/earningTypeController.js`
  - `finance-tracker-v2-backend/routes/earnings.js`
  - `finance-tracker-v2-backend/routes/earningTypes.js`
- Office and business:
  - `finance-tracker-v2-backend/models/OfficeExpense.js`
  - `finance-tracker-v2-backend/models/BusinessExpense.js`
  - `finance-tracker-v2-backend/controllers/officeExpenseController.js`
  - `finance-tracker-v2-backend/controllers/businessExpenseController.js`
  - `finance-tracker-v2-backend/routes/officeExpenses.js`
  - `finance-tracker-v2-backend/routes/businessExpenses.js`
- Savings and investments:
  - `finance-tracker-v2-backend/models/SavingTransaction.js`
  - `finance-tracker-v2-backend/models/RecurringSavingPlan.js`
  - `finance-tracker-v2-backend/controllers/savingController.js`
  - `finance-tracker-v2-backend/routes/savings.js`
- Dashboard:
  - `finance-tracker-v2-backend/controllers/dashboardController.js`
  - `finance-tracker-v2-backend/routes/dashboard.js`
- Docs:
  - `finance-tracker-v2-backend/docs/backend-architecture.md`
  - `finance-tracker-v2-backend/docs/backend-api-map.md`

## Suggested Frontend File Map

- Routing and navigation:
  - `finance-tracker-v2-ui/src/App.js`
  - `finance-tracker-v2-ui/src/components/Sidebar.js`
- API wrappers:
  - `finance-tracker-v2-ui/src/services/api.js`
- Personal expenses:
  - `finance-tracker-v2-ui/src/pages/ExpensesPage.js`
  - `finance-tracker-v2-ui/src/components/BulkExpenseModal.js`
- Dashboard:
  - `finance-tracker-v2-ui/src/pages/ExpenseDashboard.js`
- Recurring expenses:
  - `finance-tracker-v2-ui/src/pages/RecurringExpensesPage.js`
- Income:
  - `finance-tracker-v2-ui/src/pages/IncomePage.js`
- Office and business:
  - `finance-tracker-v2-ui/src/pages/OfficeExpensesPage.js`
  - `finance-tracker-v2-ui/src/pages/BusinessExpensesPage.js`
- Savings and investments:
  - `finance-tracker-v2-ui/src/pages/SavingsInvestmentsPage.js`
- Docs:
  - `finance-tracker-v2-ui/docs/frontend-architecture.md`
  - `AGENTS.md` at repo root if route/feature map changes materially

## Recommended Delivery Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 7

This order keeps user-visible value moving while avoiding a large cross-repo rewrite.
