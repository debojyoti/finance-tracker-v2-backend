const BudgetSetting = require('../models/BudgetSetting');

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

module.exports = {
  getMonthlyDefault,
  updateMonthlyDefault
};
