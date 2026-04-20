const BusinessExpense = require('../models/BusinessExpense');

/**
 * Create business expense
 * @route POST /api/business-expenses
 */
const createBusinessExpense = async (req, res) => {
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

    const expense = new BusinessExpense({
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
      message: 'Business expense created successfully',
      data: {
        expense
      }
    });
  } catch (error) {
    console.error('Create business expense error:', error);

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
      message: 'Failed to create business expense',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get business expenses with pagination, filters, and sorting
 * @route GET /api/business-expenses
 */
const getBusinessExpenses = async (req, res) => {
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
    const expenses = await BusinessExpense.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await BusinessExpense.countDocuments(query);

    // Calculate total amount
    const aggregation = await BusinessExpense.aggregate([
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
      message: 'Business expenses fetched successfully',
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
    console.error('Get business expenses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch business expenses',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Update business expense
 * @route PUT /api/business-expenses/:id
 */
const updateBusinessExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, amount, expenseDate, category, description } = req.body;

    const expense = await BusinessExpense.findOne({ _id: id, userId });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Business expense not found'
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
      message: 'Business expense updated successfully',
      data: {
        expense
      }
    });
  } catch (error) {
    console.error('Update business expense error:', error);

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
      message: 'Failed to update business expense',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Delete business expense
 * @route DELETE /api/business-expenses/:id
 */
const deleteBusinessExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await BusinessExpense.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Business expense not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Business expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete business expense error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete business expense',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createBusinessExpense,
  getBusinessExpenses,
  updateBusinessExpense,
  deleteBusinessExpense
};
