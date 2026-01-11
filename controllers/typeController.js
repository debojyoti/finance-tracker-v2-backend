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

/**
 * Update expense type
 * @route PUT /api/expense-types/:id
 */
const updateType = async (req, res) => {
  try {
    const { id } = req.params;
    const { expenseTypeName } = req.body;
    const userId = req.user.userId;

    // Find type and check ownership
    const type = await ExpenseType.findOne({ _id: id, userId });

    if (!type) {
      return res.status(404).json({
        success: false,
        message: 'Type not found or you do not have permission to update it'
      });
    }

    // Check if new name conflicts with existing type
    if (expenseTypeName && expenseTypeName.trim() !== type.expenseTypeName) {
      const existingType = await ExpenseType.findOne({
        expenseTypeName: expenseTypeName.trim(),
        userId,
        _id: { $ne: id }
      });

      if (existingType) {
        return res.status(400).json({
          success: false,
          message: 'Type with this name already exists'
        });
      }
    }

    // Update type
    const updatedType = await ExpenseType.findByIdAndUpdate(
      id,
      {
        expenseTypeName: expenseTypeName?.trim() || type.expenseTypeName
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Type updated successfully',
      data: {
        type: updatedType
      }
    });
  } catch (error) {
    console.error('Update type error:', error);

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
      message: 'Failed to update type',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Delete expense type
 * @route DELETE /api/expense-types/:id
 */
const deleteType = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find and delete type (only if user owns it)
    const type = await ExpenseType.findOneAndDelete({ _id: id, userId });

    if (!type) {
      return res.status(404).json({
        success: false,
        message: 'Type not found or you do not have permission to delete it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Type deleted successfully'
    });
  } catch (error) {
    console.error('Delete type error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete type',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createType,
  getTypes,
  updateType,
  deleteType
};
