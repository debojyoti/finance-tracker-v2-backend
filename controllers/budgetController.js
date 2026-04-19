const BudgetSetting = require('../models/BudgetSetting');
const WeeklyBudget = require('../models/WeeklyBudget');

// Weekly amount formula: monthlyDefault * 12 / 52, rounded to 2 decimal places.
// 12 months × monthly budget ÷ 52 weeks gives a consistent yearly-normalised weekly figure.
function deriveWeeklyAmount(monthlyBudget) {
  return Math.round(monthlyBudget * 12 / 52 * 100) / 100;
}

function getWeekRange(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const day = date.getDay(); // 0=Sun ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { weekStart: monday, weekEnd: sunday };
}

/**
 * Get the user's current default monthly budget.
 * Returns { defaultMonthlyBudget: 0 } if not yet set.
 * @route GET /api/budgets/monthly-default
 */
const getMonthlyDefault = async (req, res) => {
  try {
    const userId = req.user.userId;
    const setting = await BudgetSetting.findOne({ userId }).lean();

    return res.status(200).json({
      success: true,
      data: {
        defaultMonthlyBudget: setting ? setting.defaultMonthlyBudget : 0,
        isSet: !!setting
      }
    });
  } catch (error) {
    console.error('Get monthly default error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly default budget',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Set or update the user's default monthly budget.
 * Does NOT retroactively change already-created WeeklyBudget rows.
 * @route PUT /api/budgets/monthly-default
 * @body { defaultMonthlyBudget: Number }
 */
const updateMonthlyDefault = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { defaultMonthlyBudget } = req.body;

    if (defaultMonthlyBudget === undefined || defaultMonthlyBudget === null) {
      return res.status(400).json({
        success: false,
        message: 'defaultMonthlyBudget is required'
      });
    }

    const amount = parseFloat(defaultMonthlyBudget);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'defaultMonthlyBudget must be a non-negative number'
      });
    }

    const setting = await BudgetSetting.findOneAndUpdate(
      { userId },
      { defaultMonthlyBudget: amount },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Monthly default budget updated',
      data: {
        defaultMonthlyBudget: setting.defaultMonthlyBudget
      }
    });
  } catch (error) {
    console.error('Update monthly default error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update monthly default budget',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get or create the WeeklyBudget for the week containing the given date.
 * Uses a single atomic upsert so concurrent requests for the same user/week
 * never race or produce duplicate-key errors.
 *
 * $setOnInsert ensures existing rows (including manual overrides) are never
 * overwritten — only newly inserted rows get weekEndDate, amount, and source.
 *
 * @route GET /api/budgets/weekly?weekDate=YYYY-MM-DD
 */
const getOrCreateWeeklyBudget = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { weekDate } = req.query;

    const { weekStart, weekEnd } = getWeekRange(weekDate);

    // Fetch the monthly default before the upsert so we know what amount to
    // seed with. We always compute it, even if the row already exists, because
    // $setOnInsert means it is only applied on a real insert.
    const setting = await BudgetSetting.findOne({ userId }).lean();
    const monthlyDefault = setting ? setting.defaultMonthlyBudget : 0;
    const weeklyAmount = deriveWeeklyAmount(monthlyDefault);

    const weeklyBudget = await WeeklyBudget.findOneAndUpdate(
      { userId, weekStartDate: weekStart },
      {
        $setOnInsert: {
          userId,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          amount: weeklyAmount,
          source: 'auto'
        }
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      data: {
        weeklyBudget
      }
    });
  } catch (error) {
    // Narrow race: if two requests hit simultaneously and both pass the upsert
    // at the exact same moment, one may get a duplicate-key error (code 11000).
    // In that case the row already exists — just fetch and return it.
    if (error.code === 11000) {
      try {
        const userId = req.user.userId;
        const { weekDate } = req.query;
        const { weekStart } = getWeekRange(weekDate);
        const existing = await WeeklyBudget.findOne({ userId, weekStartDate: weekStart });
        if (existing) {
          return res.status(200).json({ success: true, data: { weeklyBudget: existing } });
        }
      } catch (_) {
        // fall through to generic error below
      }
    }

    console.error('Get or create weekly budget error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get weekly budget',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Override the amount for a specific weekly budget.
 * Sets source to manual. Does not affect any other week or the monthly default.
 * @route PUT /api/budgets/weekly/:id
 * @body { amount: Number }
 */
const updateWeeklyBudget = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { amount } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: 'amount is required'
      });
    }

    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'amount must be a non-negative number'
      });
    }

    const weeklyBudget = await WeeklyBudget.findOneAndUpdate(
      { _id: id, userId },
      { amount: newAmount, source: 'manual' },
      { new: true, runValidators: true }
    );

    if (!weeklyBudget) {
      return res.status(404).json({
        success: false,
        message: 'Weekly budget not found or you do not have permission to update it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Weekly budget updated',
      data: {
        weeklyBudget
      }
    });
  } catch (error) {
    console.error('Update weekly budget error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update weekly budget',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getMonthlyDefault,
  updateMonthlyDefault,
  getOrCreateWeeklyBudget,
  updateWeeklyBudget
};
