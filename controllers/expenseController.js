const ExpenseTransaction = require('../models/ExpenseTransaction');
const ExpenseCategory = require('../models/ExpenseCategory');
const ExpenseType = require('../models/ExpenseType');

/**
 * Create multiple expense transactions
 * @route POST /api/expenses
 */
const createExpenses = async (req, res) => {
  try {
    const { expenses } = req.body;
    const userId = req.user.userId;

    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Expenses array is required and must not be empty'
      });
    }

    // Add userId to each expense
    const expensesWithUser = expenses.map(expense => ({
      ...expense,
      userId
    }));

    // Validate each expense has required fields
    for (let i = 0; i < expensesWithUser.length; i++) {
      const expense = expensesWithUser[i];
      if (!expense.expenseTypeId || !expense.amount || !expense.expenseCategory || !expense.need_or_want) {
        return res.status(400).json({
          success: false,
          message: `Expense at index ${i} is missing required fields`
        });
      }
    }

    // Create all expenses
    const createdExpenses = await ExpenseTransaction.insertMany(expensesWithUser);

    return res.status(201).json({
      success: true,
      message: `${createdExpenses.length} expense(s) created successfully`,
      data: {
        expenses: createdExpenses
      }
    });
  } catch (error) {
    console.error('Create expenses error:', error);

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
      message: 'Failed to create expenses',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get expenses with pagination, filters, and sorting
 * @route GET /api/expenses
 */
const getExpenses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      categories,
      expenseType,
      need_or_want,
      sort = '-expense_date'
    } = req.query;

    // Build query
    const query = { userId };

    // Date range filter
    if (startDate || endDate) {
      query.expense_date = {};
      if (startDate) {
        query.expense_date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.expense_date.$lte = new Date(endDate);
      }
    }

    // Category filter (can be comma-separated IDs)
    if (categories) {
      const categoryIds = categories.split(',').map(id => id.trim());
      query.expenseCategory = { $in: categoryIds };
    }

    // Expense type filter
    if (expenseType) {
      query.expenseTypeId = expenseType;
    }

    // Need or want filter
    if (need_or_want) {
      query.need_or_want = need_or_want;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Execute query with pagination
    const expenses = await ExpenseTransaction.find(query)
      .populate('expenseCategory', 'expenseCategoryName expenseCategoryIcon')
      .populate('expenseTypeId', 'expenseTypeName')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await ExpenseTransaction.countDocuments(query);

    // Calculate aggregated data
    const aggregation = await ExpenseTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCouldHaveSaved: { $sum: '$could_have_saved' }
        }
      }
    ]);

    const stats = aggregation.length > 0 ? {
      totalAmount: aggregation[0].totalAmount,
      totalCouldHaveSaved: aggregation[0].totalCouldHaveSaved
    } : {
      totalAmount: 0,
      totalCouldHaveSaved: 0
    };

    return res.status(200).json({
      success: true,
      data: {
        expenses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        },
        stats
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createExpenses,
  getExpenses
};
