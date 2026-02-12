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
      if (!expense.amount || !expense.expenseCategory || !expense.need_or_want) {
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
      month,
      year,
      categories,
      expenseType,
      need_or_want,
      sort = '-expense_date'
    } = req.query;

    // Build query
    const query = { userId };

    // Month/Year filter (takes precedence over startDate/endDate)
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      query.expense_date = { $gte: startOfMonth, $lte: endOfMonth };
    }
    // Date range filter
    else if (startDate || endDate) {
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
          totalCouldHaveSaved: { $sum: '$could_have_saved' },
          totalNeeds: {
            $sum: {
              $cond: [{ $eq: ['$need_or_want', 'need'] }, '$amount', 0]
            }
          },
          totalWants: {
            $sum: {
              $cond: [{ $eq: ['$need_or_want', 'want'] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    const stats = aggregation.length > 0 ? {
      totalAmount: aggregation[0].totalAmount,
      totalCouldHaveSaved: aggregation[0].totalCouldHaveSaved,
      totalNeeds: aggregation[0].totalNeeds,
      totalWants: aggregation[0].totalWants
    } : {
      totalAmount: 0,
      totalCouldHaveSaved: 0,
      totalNeeds: 0,
      totalWants: 0
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

/**
 * Update a single expense transaction
 * @route PUT /api/expenses/:id
 */
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updateData = req.body;

    // Find expense and check ownership
    const expense = await ExpenseTransaction.findOne({ _id: id, userId });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found or you do not have permission to update it'
      });
    }

    // Update expense
    const updatedExpense = await ExpenseTransaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('expenseCategory', 'expenseCategoryName expenseCategoryIcon')
      .populate('expenseTypeId', 'expenseTypeName');

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: {
        expense: updatedExpense
      }
    });
  } catch (error) {
    console.error('Update expense error:', error);

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
      message: 'Failed to update expense',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Delete a single expense transaction
 * @route DELETE /api/expenses/:id
 */
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find and delete expense (only if user owns it)
    const expense = await ExpenseTransaction.findOneAndDelete({ _id: id, userId });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found or you do not have permission to delete it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete expense',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get daily expense analytics for current month
 * @route GET /api/expenses/analytics/daily
 */
const getDailyExpenses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;

    // Default to current month if not provided
    const currentDate = new Date();
    const monthNum = month ? parseInt(month) : currentDate.getMonth() + 1;
    const yearNum = year ? parseInt(year) : currentDate.getFullYear();

    // Get start and end of month
    const startOfMonth = new Date(yearNum, monthNum - 1, 1);
    const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    // Aggregate expenses by day
    const dailyExpenses = await ExpenseTransaction.aggregate([
      {
        $match: {
          userId,
          expense_date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: '$expense_date' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Create array with all days of the month (fill missing days with 0)
    const daysInMonth = endOfMonth.getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const found = dailyExpenses.find(d => d._id === day);
      return {
        day,
        amount: found ? found.totalAmount : 0,
        count: found ? found.count : 0
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        month: monthNum,
        year: yearNum,
        dailyExpenses: dailyData
      }
    });
  } catch (error) {
    console.error('Get daily expenses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch daily expenses',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get top categories by total expense
 * @route GET /api/expenses/analytics/top-categories
 */
const getTopCategories = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year, limit = 10 } = req.query;

    // Build query
    const query = { userId };

    // Month/Year filter
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      query.expense_date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // Aggregate by category
    const topCategories = await ExpenseTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$expenseCategory',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: parseInt(limit) },
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

    return res.status(200).json({
      success: true,
      data: {
        topCategories
      }
    });
  } catch (error) {
    console.error('Get top categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top categories',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get transactions by category for a specific month
 * @route GET /api/expenses/analytics/category-transactions/:categoryId
 */
const getCategoryTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { categoryId } = req.params;
    const { month, year, page = 1, limit = 50 } = req.query;

    // Build query
    const query = { 
      userId,
      expenseCategory: categoryId
    };

    // Month/Year filter
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      query.expense_date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Get transactions
    const transactions = await ExpenseTransaction.find(query)
      .populate('expenseCategory', 'expenseCategoryName expenseCategoryIcon')
      .populate('expenseTypeId', 'expenseTypeName')
      .sort({ expense_date: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await ExpenseTransaction.countDocuments(query);

    // Calculate category stats
    const stats = await ExpenseTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCouldHaveSaved: { $sum: '$could_have_saved' },
          totalNeeds: {
            $sum: {
              $cond: [{ $eq: ['$need_or_want', 'need'] }, '$amount', 0]
            }
          },
          totalWants: {
            $sum: {
              $cond: [{ $eq: ['$need_or_want', 'want'] }, '$amount', 0]
            }
          },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = stats.length > 0 ? stats[0] : {
      totalAmount: 0,
      totalCouldHaveSaved: 0,
      totalNeeds: 0,
      totalWants: 0,
      transactionCount: 0
    };

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        },
        stats: categoryStats
      }
    });
  } catch (error) {
    console.error('Get category transactions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createExpenses,
  getExpenses,
  updateExpense,
  deleteExpense,
  getDailyExpenses,
  getTopCategories,
  getCategoryTransactions
};
