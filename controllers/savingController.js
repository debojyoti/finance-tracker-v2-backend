const SavingTransaction = require('../models/SavingTransaction');
const RecurringSavingPlan = require('../models/RecurringSavingPlan');

/**
 * Create saving transaction
 * @route POST /api/savings
 */
const createSaving = async (req, res) => {
  try {
    const { amount, type, title, category, assetType } = req.body;
    const userId = req.user.userId;

    if (!amount || !type || !title || !category || !assetType) {
      return res.status(400).json({
        success: false,
        message: 'Amount, type, title, category, and assetType are required'
      });
    }

    const saving = new SavingTransaction({
      amount,
      type,
      title: title.trim(),
      category,
      assetType,
      userId
    });

    await saving.save();

    return res.status(201).json({
      success: true,
      message: 'Saving transaction created successfully',
      data: {
        saving
      }
    });
  } catch (error) {
    console.error('Create saving error:', error);

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
      message: 'Failed to create saving transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get saving transactions with pagination, filters, and sorting
 * @route GET /api/savings
 */
const getSavings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      month,
      year,
      type,
      category,
      assetType,
      sort = '-createdOn'
    } = req.query;

    // Build query
    const query = { userId };

    // Date range filter: month/year take priority
    if (month || year) {
      query.createdOn = {};
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      if (month && year) {
        // Exact month
        const start = new Date(yearNum, monthNum - 1, 1);
        const end = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
        query.createdOn.$gte = start;
        query.createdOn.$lte = end;
      } else if (year) {
        // Full year
        const start = new Date(yearNum, 0, 1);
        const end = new Date(yearNum, 11, 31, 23, 59, 59, 999);
        query.createdOn.$gte = start;
        query.createdOn.$lte = end;
      } else if (month) {
        // Month in current year
        const currentYear = new Date().getFullYear();
        const start = new Date(currentYear, monthNum - 1, 1);
        const end = new Date(currentYear, monthNum, 0, 23, 59, 59, 999);
        query.createdOn.$gte = start;
        query.createdOn.$lte = end;
      }
    } else if (startDate || endDate) {
      query.createdOn = {};
      if (startDate) {
        query.createdOn.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdOn.$lte = new Date(endDate);
      }
    }

    // Type filter (add/withdraw)
    if (type) {
      query.type = type;
    }

    // Category filter (fixed/topup)
    if (category) {
      query.category = category;
    }

    // Asset type filter (saving/investment)
    if (assetType) {
      query.assetType = assetType;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Execute query with pagination
    const savings = await SavingTransaction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await SavingTransaction.countDocuments(query);

    // Calculate aggregated data by type
    const aggregation = await SavingTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const stats = {
      totalAdded: 0,
      totalWithdrawn: 0,
      netSavings: 0
    };

    aggregation.forEach(item => {
      if (item._id === 'add') {
        stats.totalAdded = item.totalAmount;
      } else if (item._id === 'withdraw') {
        stats.totalWithdrawn = item.totalAmount;
      }
    });

    stats.netSavings = stats.totalAdded - stats.totalWithdrawn;

    // Calculate stats by assetType if filtering by it
    let assetTypeStats = null;
    if (assetType) {
      assetTypeStats = {
        assetType,
        totalAdded: stats.totalAdded,
        totalWithdrawn: stats.totalWithdrawn,
        netAmount: stats.netSavings
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Savings fetched successfully',
      data: {
        savings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        },
        stats: assetTypeStats || stats
      }
    });
  } catch (error) {
    console.error('Get savings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch savings',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Create recurring saving plan
 * @route POST /api/savings/plans
 */
const createRecurringSavingPlan = async (req, res) => {
  try {
    const { title, amount, frequency, assetType, category, startDate } = req.body;
    const userId = req.user.userId;

    if (!title || !amount || !frequency || !assetType || !category || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, amount, frequency, assetType, category, and startDate are required'
      });
    }

    const plan = new RecurringSavingPlan({
      title: title.trim(),
      amount,
      frequency,
      assetType,
      category,
      startDate: new Date(startDate),
      userId
    });

    await plan.save();

    return res.status(201).json({
      success: true,
      message: 'Recurring saving plan created successfully',
      data: {
        plan
      }
    });
  } catch (error) {
    console.error('Create recurring saving plan error:', error);

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
      message: 'Failed to create recurring saving plan',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get recurring saving plans
 * @route GET /api/savings/plans
 */
const getRecurringSavingPlans = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isActive, assetType, sort = '-createdOn' } = req.query;

    const query = { userId };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (assetType) {
      query.assetType = assetType;
    }

    const plans = await RecurringSavingPlan.find(query)
      .sort(sort)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Recurring saving plans fetched successfully',
      data: {
        plans
      }
    });
  } catch (error) {
    console.error('Get recurring saving plans error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recurring saving plans',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Update recurring saving plan
 * @route PUT /api/savings/plans/:id
 */
const updateRecurringSavingPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, amount, frequency, assetType, category, startDate, isActive } = req.body;

    const plan = await RecurringSavingPlan.findOne({ _id: id, userId });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Recurring saving plan not found'
      });
    }

    if (title !== undefined) plan.title = title.trim();
    if (amount !== undefined) plan.amount = amount;
    if (frequency !== undefined) plan.frequency = frequency;
    if (assetType !== undefined) plan.assetType = assetType;
    if (category !== undefined) plan.category = category;
    if (startDate !== undefined) plan.startDate = new Date(startDate);
    if (isActive !== undefined) plan.isActive = isActive;

    await plan.save();

    return res.status(200).json({
      success: true,
      message: 'Recurring saving plan updated successfully',
      data: {
        plan
      }
    });
  } catch (error) {
    console.error('Update recurring saving plan error:', error);

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
      message: 'Failed to update recurring saving plan',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Delete recurring saving plan
 * @route DELETE /api/savings/plans/:id
 */
const deleteRecurringSavingPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await RecurringSavingPlan.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recurring saving plan not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Recurring saving plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete recurring saving plan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete recurring saving plan',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createSaving,
  getSavings,
  createRecurringSavingPlan,
  getRecurringSavingPlans,
  updateRecurringSavingPlan,
  deleteRecurringSavingPlan
};
