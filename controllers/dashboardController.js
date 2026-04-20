const ExpenseTransaction = require('../models/ExpenseTransaction');
const BusinessExpense = require('../models/BusinessExpense');
const EarningTransaction = require('../models/EarningTransaction');
const WeeklyBudget = require('../models/WeeklyBudget');
const { materializeRecurringExpenses } = require('../utils/recurringExpenseMaterializer');

function getWeekRange(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const day = date.getDay(); // 0=Sun, 1=Mon...6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

/**
 * Get comprehensive dashboard overview
 * @route GET /api/dashboard/overview
 * Returns: weekly stats, yearly stats, punishment total, top categories, and chart data
 */
const getDashboardOverview = async (req, res) => {
  try {
    const userId = req.user.userId;
    await materializeRecurringExpenses(userId);

    const now = new Date();
    const currentYear = now.getFullYear();

    // ====== This Week ======
    const { start: weekStart, end: weekEnd } = getWeekRange();

    // Weekly spend (personal expenses, reportingMode = standard)
    const weeklyExpenseAgg = await ExpenseTransaction.aggregate([
      {
        $match: {
          userId,
          expense_date: { $gte: weekStart, $lte: weekEnd },
          reportingMode: 'standard'
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCouldHaveSaved: { $sum: '$could_have_saved' }
        }
      }
    ]);

    const weeklySpent = weeklyExpenseAgg.length > 0 ? weeklyExpenseAgg[0].totalAmount : 0;
    const weeklyCouldHaveSaved = weeklyExpenseAgg.length > 0 ? weeklyExpenseAgg[0].totalCouldHaveSaved : 0;

    // Weekly budget
    const weeklyBudget = await WeeklyBudget.findOne({
      userId,
      weekStartDate: { $lte: weekStart },
      weekEndDate: { $gte: weekStart }
    }).lean();

    const weekBudgetAmount = weeklyBudget ? weeklyBudget.amount : 0;
    const weekRemaining = weekBudgetAmount - weeklySpent;

    // ====== This Year ======
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

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

    // ====== Top Categories (Week, Month, Year) ======
    // Weekly top categories
    const weeklyTopCats = await ExpenseTransaction.aggregate([
      {
        $match: {
          userId,
          expense_date: { $gte: weekStart, $lte: weekEnd },
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

    // Monthly top categories (current month)
    const monthStart = new Date(currentYear, now.getMonth(), 1);
    const monthEnd = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59, 999);

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

    // Yearly top categories (current year)
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
    // Weekly spend by day (current week)
    const weeklyChartData = await ExpenseTransaction.aggregate([
      {
        $match: {
          userId,
          expense_date: { $gte: weekStart, $lte: weekEnd },
          reportingMode: 'standard'
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: '$expense_date' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Convert to day labels (Mon-Sun format)
    const weeklyChartSeries = Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);
      const day = dayDate.getDate();
      const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
      const found = weeklyChartData.find(d => d._id === day);
      return {
        date: dayName,
        amount: found ? found.totalAmount : 0
      };
    });

    // Monthly cumulative spend (last 12 months) - running total
    const monthlyCumulativeData = [];
    let cumulativeTotal = 0;
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(currentYear, now.getMonth() - i, 1);
      const m = monthDate.getMonth();
      const y = monthDate.getFullYear();
      const mStart = new Date(y, m, 1);
      const mEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

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
      const monthDate = new Date(currentYear, i, 1);
      const mStart = new Date(currentYear, i, 1);
      const mEnd = new Date(currentYear, i + 1, 0, 23, 59, 59, 999);

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
        week: {
          spent: weeklySpent,
          budget: weekBudgetAmount,
          couldHaveSaved: weeklyCouldHaveSaved,
          remaining: weekRemaining,
          startDate: weekStart,
          endDate: weekEnd
        },
        year: {
          personalSpend: yearPersonalSpend,
          businessSpend: yearBusinessSpend,
          cashIn: yearCashIn,
          cashOut: yearCashOut,
          year: currentYear
        },
        punishment: {
          lifetime: lifetimePunishment
        },
        topCategories: {
          week: weeklyTopCats,
          month: monthlyTopCats,
          year: yearlyTopCats
        },
        charts: {
          weeklySpend: weeklyChartSeries,
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
