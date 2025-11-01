const ExpenseType = require('../models/ExpenseType');

/**
 * Create expense type
 * @route POST /api/expense-types
 */
const createType = async (req, res) => {
  try {
    const { expenseTypeName } = req.body;
    const userId = req.user.userId;

    if (!expenseTypeName) {
      return res.status(400).json({
        success: false,
        message: 'Expense type name is required'
      });
    }

    // Check if type with same name already exists for this user
    const existingType = await ExpenseType.findOne({
      expenseTypeName: expenseTypeName.trim(),
      userId
    });

    if (existingType) {
      return res.status(400).json({
        success: false,
        message: 'Type with this name already exists'
      });
    }

    const type = new ExpenseType({
      expenseTypeName: expenseTypeName.trim(),
      userId
    });

    await type.save();

    return res.status(201).json({
      success: true,
      message: 'Type created successfully',
      data: {
        type
      }
    });
  } catch (error) {
    console.error('Create type error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Type with this name already exists'
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
      message: 'Failed to create type',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get expense types with optional search
 * @route GET /api/expense-types
 */
const getTypes = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { search } = req.query;

    // Build query
    const query = { userId };

    // Search by name
    if (search) {
      query.expenseTypeName = { $regex: search, $options: 'i' };
    }

    // Get types
    const types = await ExpenseType.find(query)
      .sort('expenseTypeName')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        types,
        total: types.length
      }
    });
  } catch (error) {
    console.error('Get types error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch types',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createType,
  getTypes
};
