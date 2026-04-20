const RecurringExpense = require('../models/RecurringExpense');
const ExpenseTransaction = require('../models/ExpenseTransaction');

/**
 * Materialize all due recurring expense definitions into ExpenseTransaction rows
 * for the given user. Safe to call multiple times — duplicate occurrences are
 * silently skipped via the unique recurringOccurrenceKey index.
 *
 * Monthly: one row per calendar month from startDate through the current month,
 *   dated the 1st of that month.
 * Yearly: one row per calendar year from startDate through the current year,
 *   dated the 1st of the same month as startDate in each subsequent year.
 */
async function materializeRecurringExpenses(userId) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const definitions = await RecurringExpense.find({ userId, isActive: true }).lean();
  if (definitions.length === 0) return;

  const toInsert = [];

  for (const def of definitions) {
    const startDate = new Date(def.startDate);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth(); // 0-indexed

    if (def.frequency === 'monthly') {
      let y = startYear;
      let m = startMonth;
      while (y < currentYear || (y === currentYear && m <= currentMonth)) {
        const paddedMonth = String(m + 1).padStart(2, '0');
        const occurrenceKey = `${def._id}_${y}-${paddedMonth}`;
        toInsert.push({
          userId: def.userId,
          amount: def.amount,
          expenseCategory: def.expenseCategory,
          expenseTypeId: def.expenseTypeId || undefined,
          need_or_want: def.need_or_want,
          reportingMode: def.reportingMode || 'standard',
          entryPurpose: 'regular',
          description: def.description || '',
          expense_date: new Date(y, m, 1),
          recurringExpenseId: def._id,
          recurringOccurrenceKey: occurrenceKey
        });
        m += 1;
        if (m > 11) { m = 0; y += 1; }
      }
    } else if (def.frequency === 'yearly') {
      for (let y = startYear; y <= currentYear; y++) {
        // Skip the current year if the annual recurrence month hasn't arrived yet
        if (y === currentYear && startMonth > currentMonth) continue;
        const occurrenceKey = `${def._id}_${y}`;
        toInsert.push({
          userId: def.userId,
          amount: def.amount,
          expenseCategory: def.expenseCategory,
          expenseTypeId: def.expenseTypeId || undefined,
          need_or_want: def.need_or_want,
          reportingMode: def.reportingMode || 'standard',
          entryPurpose: 'regular',
          description: def.description || '',
          expense_date: new Date(y, startMonth, 1),
          recurringExpenseId: def._id,
          recurringOccurrenceKey: occurrenceKey
        });
      }
    }
  }

  if (toInsert.length === 0) return;

  try {
    await ExpenseTransaction.insertMany(toInsert, { ordered: false });
  } catch (err) {
    // ordered: false means all non-duplicate documents are still inserted.
    // Ignore bulk write errors only when every individual failure is a duplicate key violation.
    const isOnlyDuplicates =
      Array.isArray(err.writeErrors) &&
      err.writeErrors.length > 0 &&
      err.writeErrors.every(e => e.code === 11000);
    if (!isOnlyDuplicates) throw err;
  }
}

module.exports = { materializeRecurringExpenses };
