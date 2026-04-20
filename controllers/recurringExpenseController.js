const RecurringExpense = require('../models/RecurringExpense');

const VALID_FREQUENCIES = ['monthly', 'yearly'];
const VALID_REPORTING_MODES = ['standard', 'yearly_only', 'lifetime_only'];
const VALID_NEED_OR_WANT = ['need', 'want'];

/**
 * Create a recurring expense definition
 * @route POST /api/recurring-expenses
 */
const createRecurringExpense = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      title,
      amount,
      frequency,
      startDate,
      isActive,
      expenseCategory,
      expenseTypeId,
      need_or_want,
      reportingMode,
      description
    } = req.body;

    if (!title || amount === undefined || amount === null || !frequency || !expenseCategory || !need_or_want) {
      return res.status(400).json({
        success: false,
        message: 'title, amount, frequency, expenseCategory, and need_or_want are required'
      });
    }

    if (!VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`
      });
    }

    if (!VALID_NEED_OR_WANT.includes(need_or_want)) {
      return res.status(400).json({
        success: false,
        message: `need_or_want must be one of: ${VALID_NEED_OR_WANT.join(', ')}`
      });
    }

    if (reportingMode !== undefined && !VALID_REPORTING_MODES.includes(reportingMode)) {
      return res.status(400).json({
        success: false,
        message: `reportingMode must be one of: ${VALID_REPORTING_MODES.join(', ')}`
      });
    }

    const recurringExpense = new RecurringExpense({
      userId,
      title: title.trim(),
      amount,
      frequency,
      startDate: startDate || Date.now(),
      isActive: isActive !== undefined ? isActive : true,
      expenseCategory,
      expenseTypeId: expenseTypeId || undefined,
      need_or_want,
      reportingMode: reportingMode || 'standard',
      description: description ? description.trim() : ''
    });

    await recurringExpense.save();

    return res.status(201).json({
      success: true,
      message: 'Recurring expense created successfully',
      data: {
        recurringExpense
      }
    });
  } catch (error) {
    console.error('Create recurring expense error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create recurring expense',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * List recurring expenses for the current user
 * @route GET /api/recurring-expenses
 */
const getRecurringExpenses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { frequency, isActive, sort = '-createdAt' } = req.query;

    const query = { userId };

    if (frequency) {
      if (!VALID_FREQUENCIES.includes(frequency)) {
        return res.status(400).json({
          success: false,
          message: `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`
        });
      }
      query.frequency = frequency;
    }

    if (isActive !== undefined) {
      if (isActive === 'true') query.isActive = true;
      else if (isActive === 'false') query.isActive = false;
    }

    const recurringExpenses = await RecurringExpense.find(query)
      .populate('expenseCategory', 'expenseCategoryName expenseCategoryIcon')
      .populate('expenseTypeId', 'expenseTypeName')
      .sort(sort)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        recurringExpenses
      }
    });
  } catch (error) {
    console.error('Get recurring expenses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recurring expenses',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Update a recurring expense definition
 * @route PUT /api/recurring-expenses/:id
 */
const updateRecurringExpense = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updateData = { ...req.body };

    delete updateData.userId;

    if (updateData.frequency !== undefined && !VALID_FREQUENCIES.includes(updateData.frequency)) {
      return res.status(400).json({
        success: false,
        message: `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`
      });
    }

    if (updateData.need_or_want !== undefined && !VALID_NEED_OR_WANT.includes(updateData.need_or_want)) {
      return res.status(400).json({
        success: false,
        message: `need_or_want must be one of: ${VALID_NEED_OR_WANT.join(', ')}`
      });
    }

    if (updateData.reportingMode !== undefined && !VALID_REPORTING_MODES.includes(updateData.reportingMode)) {
      return res.status(400).json({
        success: false,
        message: `reportingMode must be one of: ${VALID_REPORTING_MODES.join(', ')}`
      });
    }

    if (typeof updateData.title === 'string') updateData.title = updateData.title.trim();
    if (typeof updateData.description === 'string') updateData.description = updateData.description.trim();

    const recurringExpense = await RecurringExpense.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('expenseCategory', 'expenseCategoryName expenseCategoryIcon')
      .populate('expenseTypeId', 'expenseTypeName');

    if (!recurringExpense) {
      return res.status(404).json({
        success: false,
        message: 'Recurring expense not found or you do not have permission to update it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Recurring expense updated successfully',
      data: {
        recurringExpense
      }
    });
  } catch (error) {
    console.error('Update recurring expense error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update recurring expense',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Delete a recurring expense definition
 * @route DELETE /api/recurring-expenses/:id
 */
const deleteRecurringExpense = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const recurringExpense = await RecurringExpense.findOneAndDelete({ _id: id, userId });

    if (!recurringExpense) {
      return res.status(404).json({
        success: false,
        message: 'Recurring expense not found or you do not have permission to delete it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Recurring expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete recurring expense error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete recurring expense',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createRecurringExpense,
  getRecurringExpenses,
  updateRecurringExpense,
  deleteRecurringExpense
};
