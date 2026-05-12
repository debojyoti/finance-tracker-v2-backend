const ExpenseTransaction = require('../models/ExpenseTransaction');
const BusinessExpense = require('../models/BusinessExpense');
const EarningTransaction = require('../models/EarningTransaction');
const BudgetSetting = require('../models/BudgetSetting');
const { materializeRecurringExpenses } = require('../utils/recurringExpenseMaterializer');

function parseSelectedPeriod(query) {
  const now = new Date();
  const selectedMonth = query.month === undefined ? now.getMonth() + 1 : Number(query.month);
  const selectedYear = query.year === undefined ? now.getFullYear() : Number(query.year);

  if (!Number.isInteger(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) {
    return { error: 'month must be an integer between 1 and 12' };
  }

  if (!Number.isInteger(selectedYear) || selectedYear < 1970 || selectedYear > 9999) {
    return { error: 'year must be a four-digit year' };
  }

  return { selectedMonth, selectedYear };
}

/**
 * Get comprehensive dashboard overview
 * @route GET /api/dashboard/overview
 * Returns: selected month stats, yearly stats, punishment total, top categories, and chart data
 */
const getDashboardOverview = async (req, res) => {
  try {
    const userId = req.user.userId;
    await materializeRecurringExpenses(userId);

    const period = parseSelectedPeriod(req.query);
    if (period.error) {
      return res.status(400).json({
        success: false,
        message: period.error
      });
    }

    const { selectedMonth, selectedYear } = period;
    const monthIndex = selectedMonth - 1;

    // ====== Selected Month ======
    const monthStart = new Date(selectedYear, monthIndex, 1);
    const monthEnd = new Date(selectedYear, monthIndex + 1, 0, 23, 59, 59, 999);

    const monthlyExpenseAgg = await ExpenseTransaction.aggregate([
      {
        $match: {
          userId,
          expense_date: { $gte: monthStart, $lte: monthEnd },
          reportingMode: 'standard'
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const monthSpent = monthlyExpenseAgg.length > 0 ? monthlyExpenseAgg[0].totalAmount : 0;
    const budgetSetting = await BudgetSetting.findOne({ userId }).lean();
    const monthBudget = budgetSetting ? budgetSetting.defaultMonthlyBudget : 0;
    const monthRemaining = monthBudget - monthSpent;

    // ====== Selected Year ======
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    // Year personal spend (reportingMode = standard or yearly_only)
    const yearlyPersonalAgg = await ExpenseTransaction.aggregate([
      {
        $match: {
          userId,
          expense_date: { $gte: yearStart, $lte: yearEnd },
          reportingMode: { $in: ['standard', 'yearly_only'] }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const yearPersonalSpend = yearlyPersonalAgg.length > 0 ? yearlyPersonalAgg[0].totalAmount : 0;

    // Year business spend
    const yearlyBusinessAgg = await BusinessExpense.aggregate([
      {
        $match: {
          userId,
          expenseDate: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const yearBusinessSpend = yearlyBusinessAgg.length > 0 ? yearlyBusinessAgg[0].totalAmount : 0;

    // Year cash in (from earnings)
    const yearlyEarningsAgg = await EarningTransaction.aggregate([
      {
        $match: {
          userId,
          createdOn: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const yearCashIn = yearlyEarningsAgg.length > 0 ? yearlyEarningsAgg[0].totalAmount : 0;

    // Year cash out (personal + business)
    const yearCashOut = yearPersonalSpend + yearBusinessSpend;

    // ====== Lifetime Punishment Total ======
    const punishmentAgg = await ExpenseTransaction.aggregate([
      {
        $match: {
          userId,
          entryPurpose: 'punishment'
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const lifetimePunishment = punishmentAgg.length > 0 ? punishmentAgg[0].totalAmount : 0;

    // ====== Top Categories (Month, Year) ======
    // Monthly top categories (selected month)
    const monthlyTopCats = await ExpenseTransaction.aggregate([
      {
        $match: {
          userId,
          expense_date: { $gte: monthStart, $lte: monthEnd },
          reportingMode: 'standard'
        }
      },
      {
        $group: {
          _id: '$expenseCategory',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'expensecategories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          totalAmount: 1,
          count: 1,
          categoryName: '$category.expenseCategoryName',
          categoryIcon: '$category.expenseCategoryIcon'
        }
      }
    ]);

    // Yearly top categories (selected year)
    const yearlyTopCats = await ExpenseTransaction.aggregate([
      {
        $match: {
          userId,
          expense_date: { $gte: yearStart, $lte: yearEnd },
          reportingMode: { $in: ['standard', 'yearly_only'] }
        }
      },
      {
        $group: {
          _id: '$expenseCategory',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'expensecategories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          totalAmount: 1,
          count: 1,
          categoryName: '$category.expenseCategoryName',
          categoryIcon: '$category.expenseCategoryIcon'
        }
      }
    ]);

    // ====== Chart Data ======
    // Monthly cumulative spend (selected year) - running total
    const monthlyCumulativeData = [];
    let cumulativeTotal = 0;
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(selectedYear, i, 1);
      const mStart = new Date(selectedYear, i, 1);
      const mEnd = new Date(selectedYear, i + 1, 0, 23, 59, 59, 999);

      const monthAgg = await ExpenseTransaction.aggregate([
        {
          $match: {
            userId,
            expense_date: { $gte: mStart, $lte: mEnd },
            reportingMode: { $in: ['standard', 'yearly_only'] }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const monthAmount = monthAgg.length > 0 ? monthAgg[0].totalAmount : 0;
      cumulativeTotal += monthAmount;
      const monthName = monthDate.toLocaleString('en-US', { month: 'short' });
      monthlyCumulativeData.push({ month: monthName, amount: cumulativeTotal });
    }

    // Yearly cash in vs cash out by month
    const yearlyCashFlowData = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(selectedYear, i, 1);
      const mStart = new Date(selectedYear, i, 1);
      const mEnd = new Date(selectedYear, i + 1, 0, 23, 59, 59, 999);

      // Cash in (earnings)
      const inAgg = await EarningTransaction.aggregate([
        {
          $match: {
            userId,
            createdOn: { $gte: mStart, $lte: mEnd }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      // Cash out (personal + business)
      const personalOutAgg = await ExpenseTransaction.aggregate([
        {
          $match: {
            userId,
            expense_date: { $gte: mStart, $lte: mEnd },
            reportingMode: { $in: ['standard', 'yearly_only'] }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const businessOutAgg = await BusinessExpense.aggregate([
        {
          $match: {
            userId,
            expenseDate: { $gte: mStart, $lte: mEnd }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const monthName = monthDate.toLocaleString('en-US', { month: 'short' });
      const cashIn = inAgg.length > 0 ? inAgg[0].totalAmount : 0;
      const personalOut = personalOutAgg.length > 0 ? personalOutAgg[0].totalAmount : 0;
      const businessOut = businessOutAgg.length > 0 ? businessOutAgg[0].totalAmount : 0;

      yearlyCashFlowData.push({
        month: monthName,
        cashIn,
        cashOut: personalOut + businessOut
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Dashboard overview retrieved successfully',
      data: {
        month: {
          spent: monthSpent,
          budget: monthBudget,
          remaining: monthRemaining,
          month: selectedMonth,
          year: selectedYear,
          startDate: monthStart,
          endDate: monthEnd
        },
        year: {
          personalSpend: yearPersonalSpend,
          businessSpend: yearBusinessSpend,
          cashIn: yearCashIn,
          cashOut: yearCashOut,
          year: selectedYear
        },
        punishment: {
          lifetime: lifetimePunishment
        },
        topCategories: {
          month: monthlyTopCats,
          year: yearlyTopCats
        },
        charts: {
          monthlyCumulative: monthlyCumulativeData,
          yearlyCashFlow: yearlyCashFlowData
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getDashboardOverview
};
