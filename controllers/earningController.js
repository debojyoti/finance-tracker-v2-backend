const EarningTransaction = require('../models/EarningTransaction');

/**
 * Create earning transaction
 * @route POST /api/earnings
 */
const createEarning = async (req, res) => {
  try {
    const { amount, type, title } = req.body;
    const userId = req.user.userId;

    if (!amount || !type || !title) {
      return res.status(400).json({
        success: false,
        message: 'Amount, type, and title are required'
      });
    }

    const earning = new EarningTransaction({
      amount,
      type,
      title: title.trim(),
      userId
    });

    await earning.save();

    return res.status(201).json({
      success: true,
      message: 'Earning transaction created successfully',
      data: {
        earning
      }
    });
  } catch (error) {
    console.error('Create earning error:', error);

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
      message: 'Failed to create earning transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get earning transactions with pagination, filters, and sorting
 * @route GET /api/earnings
 */
const getEarnings = async (req, res) => {
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
      sort = '-createdOn'
    } = req.query;

    // Build query
    const query = { userId };

    // Date range filter (handles explicit dates or month/year)
    if (startDate || endDate || month || year) {
      query.createdOn = {};

      if (month && year) {
        // Month + year: exact month range
        const yearNum = parseInt(year);
        const monthNum = parseInt(month) - 1;

        const start = new Date(yearNum, monthNum, 1);
        const end = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999);

        query.createdOn.$gte = start;
        query.createdOn.$lte = end;
      } else if (year && !month) {
        // Year only: full year range
        const yearNum = parseInt(year);

        const start = new Date(yearNum, 0, 1);
        const end = new Date(yearNum, 11, 31, 23, 59, 59, 999);

        query.createdOn.$gte = start;
        query.createdOn.$lte = end;
      } else if (month && !year) {
        // Month only: use current year
        const yearNum = new Date().getFullYear();
        const monthNum = parseInt(month) - 1;

        const start = new Date(yearNum, monthNum, 1);
        const end = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999);

        query.createdOn.$gte = start;
        query.createdOn.$lte = end;
      } else {
        // Explicit date range
        if (startDate) {
          query.createdOn.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdOn.$lte = new Date(endDate);
        }
      }
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Execute query with pagination
    const earnings = await EarningTransaction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const total = await EarningTransaction.countDocuments(query);

    // Calculate aggregated data by type
    const aggregation = await EarningTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate total earnings
    let totalEarnings = 0;
    const byType = {};

    aggregation.forEach(item => {
      byType[item._id] = item.totalAmount;
      totalEarnings += item.totalAmount;
    });

    const stats = {
      totalEarnings,
      byType
    };

    return res.status(200).json({
      success: true,
      data: {
        earnings,
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
    console.error('Get earnings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Update earning transaction
 * @route PUT /api/earnings/:id
 */
const updateEarning = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { amount, type, title, createdOn } = req.body;

    const updateData = {};

    if (amount !== undefined) {
      const amountValue = Number(amount);
      if (Number.isNaN(amountValue) || amountValue < 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a non-negative number'
        });
      }
      updateData.amount = amountValue;
    }

    if (type !== undefined) {
      if (!type || !String(type).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Type cannot be empty'
        });
      }
      updateData.type = String(type).trim();
    }

    if (title !== undefined) {
      if (!title || !String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title cannot be empty'
        });
      }
      updateData.title = String(title).trim();
    }

    if (createdOn !== undefined) {
      const parsedDate = new Date(createdOn);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'createdOn must be a valid date'
        });
      }
      updateData.createdOn = parsedDate;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field must be provided to update'
      });
    }

    const earning = await EarningTransaction.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!earning) {
      return res.status(404).json({
        success: false,
        message: 'Earning transaction not found or you do not have permission to update it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Earning transaction updated successfully',
      data: {
        earning
      }
    });
  } catch (error) {
    console.error('Update earning error:', error);

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
      message: 'Failed to update earning transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Delete earning transaction
 * @route DELETE /api/earnings/:id
 */
const deleteEarning = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const earning = await EarningTransaction.findOneAndDelete({ _id: id, userId });

    if (!earning) {
      return res.status(404).json({
        success: false,
        message: 'Earning transaction not found or you do not have permission to delete it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Earning transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete earning error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete earning transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createEarning,
  getEarnings,
  updateEarning,
  deleteEarning
};
