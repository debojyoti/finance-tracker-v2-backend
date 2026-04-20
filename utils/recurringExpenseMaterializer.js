const RecurringExpense = require('../models/RecurringExpense');
const ExpenseTransaction = require('../models/ExpenseTransaction');

/**
 * Materialize all due recurring expense definitions into ExpenseTransaction rows
 * for the given user. Safe to call multiple times — duplicate occurrences are
 * silently skipped via the unique recurringOccurrenceKey index.
 *
 * Monthly: one row per calendar month whose 1st day >= startDate, up through the current month.
 * Yearly: one row per calendar year whose 1st day of the recurrence month >= startDate, up through the current year.
 *
 * The candidate expense_date (1st of period) is compared against the full startDate so that
 * a mid-month or mid-year startDate does not generate an occurrence in the same period.
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
    // Normalize to local midnight so candidateDate comparisons are timezone-safe.
    // new Date('YYYY-MM-DD') parses as UTC midnight; new Date(y, m, d) creates local midnight.
    // Using local date components from startDate ensures both sides are in the same timezone.
    const startDateLocal = new Date(startYear, startMonth, startDate.getDate());

    if (def.frequency === 'monthly') {
      let y = startYear;
      let m = startMonth;
      while (y < currentYear || (y === currentYear && m <= currentMonth)) {
        const candidateDate = new Date(y, m, 1);
        // Only generate if the 1st of this month is on or after the full startDate
        if (candidateDate >= startDateLocal) {
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
            expense_date: candidateDate,
            recurringExpenseId: def._id,
            recurringOccurrenceKey: occurrenceKey
          });
        }
        m += 1;
        if (m > 11) { m = 0; y += 1; }
      }
    } else if (def.frequency === 'yearly') {
      for (let y = startYear; y <= currentYear; y++) {
        const candidateDate = new Date(y, startMonth, 1);
        // Skip if the 1st of the recurrence month hasn't arrived yet this year
        if (y === currentYear && startMonth > currentMonth) continue;
        // Only generate if the 1st of the recurrence month is on or after the full startDate
        if (candidateDate < startDateLocal) continue;
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
          expense_date: candidateDate,
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
    // In mongoose 8 / MongoDB driver 6+, the code is at writeError.err.code (not writeError.code).
    const isOnlyDuplicates =
      err.code === 11000 ||
      (Array.isArray(err.writeErrors) &&
        err.writeErrors.length > 0 &&
        err.writeErrors.every(e => e.code === 11000 || (e.err && e.err.code === 11000)));
    if (!isOnlyDuplicates) throw err;
  }
}

module.exports = { materializeRecurringExpenses };
