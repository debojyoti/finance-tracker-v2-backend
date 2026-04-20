const OfficeExpense = require('../models/OfficeExpense');

/**
 * Create office expense
 * @route POST /api/office-expenses
 */
const createOfficeExpense = async (req, res) => {
  try {
    const { title, amount, expenseDate, category, description } = req.body;
    const userId = req.user.userId;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    if (!amount || isNaN(amount) || Number(amount) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (!expenseDate) {
      return res.status(400).json({
        success: false,
        message: 'Expense date is required'
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    const expense = new OfficeExpense({
      title: title.trim(),
      amount: Number(amount),
      expenseDate: new Date(expenseDate),
      category: category.trim(),
      description: description ? description.trim() : '',
      userId
    });

    await expense.save();

    return res.status(201).json({
      success: true,
      message: 'Office expense created successfully',
      data: {
        expense
      }
    });
  } catch (error) {
    console.error('Create office expense error:', error);

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
      message: 'Failed to create office expense',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get office expenses with pagination, filters, and sorting
 * @route GET /api/office-expenses
 */
const getOfficeExpenses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      category,
      sort = '-expenseDate'
    } = req.query;

    // Build query
    const query = { userId };

    // Date range filter
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) {
        query.expenseDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.expenseDate.$lte = new Date(endDate);
      }
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Execute query with pagination
    const expenses = await OfficeExpense.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await OfficeExpense.countDocuments(query);

    // Calculate total amount
    const aggregation = await OfficeExpense.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const stats = {
      totalAmount: aggregation.length > 0 ? aggregation[0].totalAmount : 0
    };

    return res.status(200).json({
      success: true,
      message: 'Office expenses fetched successfully',
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
    console.error('Get office expenses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch office expenses',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Update office expense
 * @route PUT /api/office-expenses/:id
 */
const updateOfficeExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, amount, expenseDate, category, description } = req.body;

    const expense = await OfficeExpense.findOne({ _id: id, userId });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Office expense not found'
      });
    }

    if (title !== undefined) {
      expense.title = title.trim();
    }

    if (amount !== undefined) {
      if (isNaN(amount) || Number(amount) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }
      expense.amount = Number(amount);
    }

    if (expenseDate !== undefined) {
      expense.expenseDate = new Date(expenseDate);
    }

    if (category !== undefined) {
      expense.category = category.trim();
    }

    if (description !== undefined) {
      expense.description = description.trim();
    }

    await expense.save();

    return res.status(200).json({
      success: true,
      message: 'Office expense updated successfully',
      data: {
        expense
      }
    });
  } catch (error) {
    console.error('Update office expense error:', error);

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
      message: 'Failed to update office expense',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Delete office expense
 * @route DELETE /api/office-expenses/:id
 */
const deleteOfficeExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await OfficeExpense.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Office expense not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Office expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete office expense error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete office expense',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createOfficeExpense,
  getOfficeExpenses,
  updateOfficeExpense,
  deleteOfficeExpense
};
