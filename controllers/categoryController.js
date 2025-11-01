const ExpenseCategory = require('../models/ExpenseCategory');

/**
 * Create expense category
 * @route POST /api/expense-categories
 */
const createCategory = async (req, res) => {
  try {
    const { expenseCategoryName, expenseCategoryIcon } = req.body;
    const userId = req.user.userId;

    if (!expenseCategoryName) {
      return res.status(400).json({
        success: false,
        message: 'Expense category name is required'
      });
    }

    // Check if category with same name already exists for this user
    const existingCategory = await ExpenseCategory.findOne({
      expenseCategoryName: expenseCategoryName.trim(),
      userId
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const category = new ExpenseCategory({
      expenseCategoryName: expenseCategoryName.trim(),
      expenseCategoryIcon: expenseCategoryIcon || '',
      userId
    });

    await category.save();

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: {
        category
      }
    });
  } catch (error) {
    console.error('Create category error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

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
      message: 'Failed to create category',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get expense categories with optional search
 * @route GET /api/expense-categories
 */
const getCategories = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { search } = req.query;

    // Build query
    const query = { userId };

    // Search by name
    if (search) {
      query.expenseCategoryName = { $regex: search, $options: 'i' };
    }

    // Get categories
    const categories = await ExpenseCategory.find(query)
      .sort('expenseCategoryName')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        categories,
        total: categories.length
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createCategory,
  getCategories
};
