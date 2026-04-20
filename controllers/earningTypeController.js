const EarningType = require('../models/EarningType');

const DEFAULT_TYPES = ['salary', 'freelance', 'others'];

/**
 * Ensure default earning types exist for a user
 */
const ensureDefaultTypes = async (userId) => {
  try {
    const existing = await EarningType.find({ userId, name: { $in: DEFAULT_TYPES } });
    const existingNames = existing.map(t => t.name);
    const toCreate = DEFAULT_TYPES.filter(name => !existingNames.includes(name));

    if (toCreate.length > 0) {
      await EarningType.insertMany(
        toCreate.map(name => ({ userId, name, isActive: true }))
      );
    }
  } catch (error) {
    console.error('Error ensuring default earning types:', error);
  }
};

/**
 * Create earning type
 * @route POST /api/earning-types
 */
const createEarningType = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const earningType = new EarningType({
      userId,
      name: name.trim(),
      isActive: true
    });

    await earningType.save();

    return res.status(201).json({
      success: true,
      message: 'Earning type created successfully',
      data: {
        earningType
      }
    });
  } catch (error) {
    console.error('Create earning type error:', error);

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
      message: 'Failed to create earning type',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get earning types for current user
 * @route GET /api/earning-types
 */
const getEarningTypes = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Ensure defaults exist on first fetch
    await ensureDefaultTypes(userId);

    const earningTypes = await EarningType.find({ userId }).sort({ name: 1 }).lean();

    return res.status(200).json({
      success: true,
      data: {
        earningTypes
      }
    });
  } catch (error) {
    console.error('Get earning types error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch earning types',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Update earning type
 * @route PUT /api/earning-types/:id
 */
const updateEarningType = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updateData = { ...req.body };

    delete updateData.userId;

    if (updateData.name !== undefined) {
      updateData.name = updateData.name.trim();
    }

    const earningType = await EarningType.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!earningType) {
      return res.status(404).json({
        success: false,
        message: 'Earning type not found or you do not have permission to update it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Earning type updated successfully',
      data: {
        earningType
      }
    });
  } catch (error) {
    console.error('Update earning type error:', error);

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
      message: 'Failed to update earning type',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Delete earning type
 * @route DELETE /api/earning-types/:id
 */
const deleteEarningType = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const earningType = await EarningType.findOneAndDelete({ _id: id, userId });

    if (!earningType) {
      return res.status(404).json({
        success: false,
        message: 'Earning type not found or you do not have permission to delete it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Earning type deleted successfully'
    });
  } catch (error) {
    console.error('Delete earning type error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete earning type',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createEarningType,
  getEarningTypes,
  updateEarningType,
  deleteEarningType,
  ensureDefaultTypes
};
