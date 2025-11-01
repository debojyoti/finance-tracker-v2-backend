const SavingTransaction = require('../models/SavingTransaction');

/**
 * Create saving transaction
 * @route POST /api/savings
 */
const createSaving = async (req, res) => {
  try {
    const { amount, type, title, category } = req.body;
    const userId = req.user.userId;

    if (!amount || !type || !title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Amount, type, title, and category are required'
      });
    }

    const saving = new SavingTransaction({
      amount,
      type,
      title: title.trim(),
      category,
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
      type,
      category,
      sort = '-createdOn'
    } = req.query;

    // Build query
    const query = { userId };

    // Date range filter
    if (startDate || endDate) {
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

    // Calculate aggregated data
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

    return res.status(200).json({
      success: true,
      data: {
        savings,
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
    console.error('Get savings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch savings',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createSaving,
  getSavings
};
