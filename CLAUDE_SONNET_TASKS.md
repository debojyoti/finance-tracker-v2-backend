# Claude Sonnet Execution Tasks

## Operating Rules

- Execute one task at a time in the order listed below.
- Do not skip ahead.
- After each task, stop and summarize:
  - files changed
  - API changes
  - manual verification performed
  - docs updated
- Do not introduce abstractions not called for in `GROUNDED_FINANCE_PLAN.md`.
- Keep backend response envelopes as `success`, `message`, `data`.
- Preserve `req.user.userId` scoping on every new query and mutation.
- Update docs whenever routes, models, or page maps change.

## Task 1: Personal Expense Reporting Rules In Backend

### Goal

Teach the backend how to classify personal expenses for weekly, monthly, yearly, and lifetime reporting, and cleanly migrate existing data so no permanent legacy-query complexity is needed.

### Do

- Update `models/ExpenseTransaction.js` to add:
  - `reportingMode` with `standard`, `yearly_only`, `lifetime_only`
  - `entryPurpose` with `regular`, `punishment`
- Default new normal expenses to:
  - `reportingMode = standard`
  - `entryPurpose = regular`
- Add a one-time migration script that backfills existing `ExpenseTransaction` documents missing those fields with:
  - `reportingMode = standard`
  - `entryPurpose = regular`
- Document how to run that migration before release.
- Ensure punishment entries default to `lifetime_only` in controller validation if needed.
- Update `controllers/expenseController.js` so list and analytics queries can filter by a requested view:
  - `week`
  - `month`
  - `year`
  - `lifetime`
- Keep current month/year and date-range filters working.
- Add Monday-to-Sunday week range handling.
- Keep the query logic clean after migration:
  - do not add permanent legacy `null` matching branches for missing fields
  - assume migrated data once the script has been run

### Do Not

- Do not create a new punishment model.
- Do not redesign categories or types.
- Do not build a generic migration framework.

### Verify

- Run the migration against test or local data shape and report matched/modified counts.
- Create one `standard`, one `yearly_only`, and one `lifetime_only` expense.
- Confirm weekly and monthly queries exclude the last two appropriately.
- Confirm yearly query includes `standard` and `yearly_only`.
- Confirm lifetime query includes all three.
- Confirm invalid `view` values return `400` instead of silently widening results.

## Task 2: Weekly View And Flags In Expense UI

### Goal

Allow the user to log and edit personal expenses with the new visibility flags and view them weekly.

### Do

- Update `src/components/BulkExpenseModal.js` to capture:
  - reporting mode
  - entry purpose
- Update `src/pages/ExpensesPage.js` edit flow to support the same fields.
- Add a week/month view toggle to `src/pages/ExpensesPage.js`.
- In week mode, show Monday-to-Sunday transactions and totals.
- Keep the current monthly workflow intact.

### Do Not

- Do not create a separate weekly page.
- Do not add a separate punishment page.

### Verify

- Add a normal expense, a yearly-only expense, and a punishment expense from the UI.
- Confirm week view only shows the normal expense.
- Confirm month view only shows the normal expense.
- Confirm edit flow can change the reporting mode.

## Task 3: Budget Backend

### Goal

Store one default monthly budget and stable weekly budget snapshots.

### Do

- Add:
  - `models/BudgetSetting.js`
  - `models/WeeklyBudget.js`
- Create:
  - `controllers/budgetController.js`
  - `routes/budgets.js`
- Add endpoints to:
  - get current monthly default budget
  - update current monthly default budget
  - get-or-create a weekly budget for a given week
  - override a specific weekly budget
- Use a small helper to derive the week’s default from the current monthly budget.
- Persist weekly snapshots so later monthly default changes do not rewrite old weeks.

### Do Not

- Do not build a full budget history system.
- Do not create daily budgets.

### Verify

- Set a monthly default budget.
- Request the current week budget and confirm it is created.
- Change the monthly default budget.
- Confirm the already-created week budget did not change.

## Task 4: Budget UI

### Goal

Expose monthly default budget and weekly override controls in the UI.

### Do

- Add API wrappers in `src/services/api.js`.
- Add budget controls to `src/pages/ExpenseDashboard.js` or a small related component.
- Show:
  - current weekly budget
  - weekly spent
  - remaining
  - could-have-saved this week
- Allow:
  - editing the monthly default budget
  - overriding this week’s budget

### Do Not

- Do not add a separate budget management module or route.

### Verify

- Load the dashboard and confirm weekly budget data appears.
- Update the monthly default budget and confirm only future week creation will use it.
- Override the current week and confirm the card updates.

## Task 5: Recurring Expense Backend

### Goal

Support fixed monthly and yearly personal expenses without cron.

### Do

- Add `models/RecurringExpense.js`.
- Add `controllers/recurringExpenseController.js` and `routes/recurringExpenses.js`.
- Support CRUD for recurring expense definitions.
- Implement an idempotent materialization helper that creates due personal expense rows on the 1st day of each relevant period.
- Run materialization before expense reads and dashboard overview reads that depend on personal expenses.
- Make generated rows traceable back to the recurring definition.

### Do Not

- Do not add a scheduler or background worker.
- Do not build a generic recurring engine for all domains.

### Verify

- Create one monthly recurring expense and one yearly recurring expense.
- Trigger materialization through a read endpoint.
- Confirm due rows appear once and are not duplicated on repeated reads.

## Task 6: Recurring Expense Page

### Goal

Let the user manage fixed monthly and yearly recurring personal expenses.

### Do

- Add `src/pages/RecurringExpensesPage.js`.
- Add route and sidebar entry.
- Add API wrappers.
- Support:
  - create
  - list
  - edit
  - activate/deactivate
  - delete
- Keep the page intentionally simple and table/form based.

### Do Not

- Do not add calendars, simulations, or forecast graphs.

### Verify

- Create and edit recurring definitions from the UI.
- Deactivate one and confirm it no longer materializes future rows.

## Task 7: Income Backend

### Goal

Turn the current earnings feature into a practical income tracker with managed types and month/year summaries.

### Do

- Add `models/EarningType.js`.
- Add `controllers/earningTypeController.js` and `routes/earningTypes.js`.
- Seed or auto-create the default type names:
  - `salary`
  - `freelance`
  - `others`
- Keep `EarningTransaction.type` as a string.
- Extend earnings controller to support:
  - month filter
  - year filter
  - monthly totals
  - yearly totals
  - breakdown by type

### Do Not

- Do not replace earnings with a new model.
- Do not add invoices, taxes, or receivables.

### Verify

- Create income types.
- Create income entries for different months and years.
- Confirm summaries match filters.

## Task 8: Income Page

### Goal

Add a dedicated page to log and review cash-in.

### Do

- Add `src/pages/IncomePage.js`.
- Replace the current `/earnings` placeholder route.
- Add API wrappers for earnings and earning types.
- Support:
  - add income
  - filter by month/year
  - view totals and type breakdown
  - manage type options inline or in a simple modal

### Do Not

- Do not add export or invoicing flows.

### Verify

- Log salary and freelance entries from the UI.
- Confirm monthly and yearly totals update correctly.

## Task 9: Office Expenses Backend And Page

### Goal

Create a fully separate office expense area.

### Do

- Add:
  - `models/OfficeExpense.js`
  - `controllers/officeExpenseController.js`
  - `routes/officeExpenses.js`
- Use simple fields:
  - title
  - amount
  - expenseDate
  - category string
  - description
- Add `src/pages/OfficeExpensesPage.js`.
- Add route, sidebar entry, and API wrappers.
- Support create, list, edit, delete, and simple totals.

### Do Not

- Do not merge office entries into personal expense stats.
- Do not build reimbursement workflow states in v1.

### Verify

- Create office expenses.
- Confirm they appear only in the office page.
- Confirm dashboard personal totals do not change.

## Task 10: Business Expenses Backend And Page

### Goal

Create a separate business expense area whose totals only matter for yearly cash-out.

### Do

- Add:
  - `models/BusinessExpense.js`
  - `controllers/businessExpenseController.js`
  - `routes/businessExpenses.js`
- Use the same simple shape as office expenses.
- Add `src/pages/BusinessExpensesPage.js`.
- Add route, sidebar entry, and API wrappers.
- Support create, list, edit, delete, and simple totals.

### Do Not

- Do not merge business entries into weekly or monthly personal analytics.
- Do not add project/vendor/client abstractions.

### Verify

- Create business expenses.
- Confirm they do not appear in weekly or monthly personal views.
- Confirm backend can expose yearly business totals for dashboard use.

## Task 11: Savings And Investments Backend

### Goal

Expand the current savings feature into a separate savings/investments tracker with recurring support.

### Do

- Extend `models/SavingTransaction.js` with `assetType`:
  - `saving`
  - `investment`
- Add `models/RecurringSavingPlan.js`.
- Extend `controllers/savingController.js` and `routes/savings.js` to support:
  - manual saving/investment entries
  - recurring saving/investment plans
  - month/year filtering
  - section-only totals
- Keep all data user-scoped.

### Do Not

- Do not include these values in dashboard spend or cash-flow totals.
- Do not add live investment valuation.

### Verify

- Create one saving entry and one investment entry.
- Create one recurring plan.
- Confirm totals appear only in savings/investments APIs.

## Task 12: Savings And Investments Page

### Goal

Replace the current savings placeholder with a real separate section.

### Do

- Add `src/pages/SavingsInvestmentsPage.js`.
- Replace the `/savings` placeholder route.
- Add API wrappers.
- Support:
  - add manual entries
  - add recurring plans
  - filter by asset type and period
  - view separate section totals

### Do Not

- Do not add portfolio charts based on external price feeds.

### Verify

- Log savings and investments from the UI.
- Confirm they do not affect dashboard or expense totals.

## Task 13: Dashboard Overview Backend

### Goal

Assemble all required weekly, monthly, yearly, and lifetime data behind one dashboard endpoint.

### Do

- Add:
  - `controllers/dashboardController.js`
  - `routes/dashboard.js`
- Return data for:
  - this week spent
  - this week budget
  - this week could-have-saved
  - this week remaining
  - this year personal spend
  - this year business spend
  - this year cash in
  - this year cash out
  - lifetime punishment total
  - weekly top categories
  - monthly top categories
  - yearly top categories
  - chart series for weekly spend, monthly cumulative spend, yearly cash in vs cash out
- Keep office and savings/investments excluded from dashboard spend totals.

### Do Not

- Do not add multiple dashboard-specific routes unless truly necessary.
- Do not predict future months beyond simple current-month projection inputs.

### Verify

- Seed data across personal, business, office, income, and punishment areas.
- Confirm the overview payload obeys inclusion rules.

## Task 14: Dashboard UI Rebuild

### Goal

Rebuild the dashboard around the new overview payload and required sections.

### Do

- Update `src/pages/ExpenseDashboard.js` to use the new overview endpoint.
- Show:
  - weekly spend
  - weekly budget
  - could-have-saved this week
  - remaining progress
  - this year spend
  - cash in vs cash out this year
  - top 10 categories this week
  - current month projection section
  - punishment lifetime total
  - yearly stats section
- Add a small, focused set of charts with Recharts.

### Do Not

- Do not overload the page with extra filters or chart types.
- Do not hide the important top cards behind tabs.

### Verify

- Load the dashboard with mixed data and confirm every section renders.
- Confirm office and savings/investments remain excluded.
- Confirm business only affects yearly cash-out.

## Task 15: Docs And Final Cleanup

### Goal

Bring docs back in sync with the new architecture and routes.

### Do

- Update:
  - `finance-tracker-v2-backend/docs/backend-architecture.md`
  - `finance-tracker-v2-backend/docs/backend-api-map.md`
  - `finance-tracker-v2-ui/docs/frontend-architecture.md`
  - root `AGENTS.md` if the feature map and route map materially changed
- Remove or replace outdated “coming soon” references.
- Make sure route names and feature ownership are accurate.

### Do Not

- Do not leave undocumented models or routes behind.

### Verify

- Read the updated docs end-to-end.
- Confirm each new page, route, and model is documented once and only once.

## Suggested Review Rhythm

After each task, ask for verification before starting the next one.

Recommended check after each task:

1. Is the task complete within its original scope?
2. Did it avoid new abstractions not in the plan?
3. Did it preserve existing behavior outside the task’s area?
