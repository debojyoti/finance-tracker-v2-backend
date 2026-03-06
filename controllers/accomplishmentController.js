const Accomplishment = require('../models/Accomplishment');

/**
 * Create accomplishment
 * @route POST /api/accomplishments
 */
const createAccomplishment = async (req, res) => {
  try {
    const { title, minutes, date, tags, type } = req.body;
    const userId = req.user.userId;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    if (minutes === undefined || minutes === null) {
      return res.status(400).json({
        success: false,
        message: 'Minutes is required'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const accomplishment = new Accomplishment({
      type: type || 'task',
      title: title.trim(),
      minutes,
      date,
      tags: tags || [],
      userId
    });

    await accomplishment.save();

    // Populate tags before returning
    await accomplishment.populate('tags');

    return res.status(201).json({
      success: true,
      message: 'Accomplishment created successfully',
      data: { accomplishment }
    });
  } catch (error) {
    console.error('Create accomplishment error:', error);

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
      message: 'Failed to create accomplishment',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get accomplishments with filters
 * @route GET /api/accomplishments
 * @query date - specific date (YYYY-MM-DD)
 * @query month - month number (1-12)
 * @query year - year (e.g. 2026)
 * @query tag - tag ID to filter by
 */
const getAccomplishments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date, month, year, tag, startDate, endDate, type } = req.query;

    const query = { userId };

    // Filter by date range (for week view)
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    } else if (date) {
      // Filter by specific date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (month && year) {
      // Filter by month and year
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (year) {
      // Filter by year only
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      query.date = { $gte: startOfYear, $lte: endOfYear };
    }

    // Filter by tag
    if (tag) {
      query.tags = tag;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    const accomplishments = await Accomplishment.find(query)
      .populate('tags')
      .sort({ date: -1, createdOn: -1 })
      .lean();

    // Calculate total minutes
    const totalMinutes = accomplishments.reduce((sum, a) => sum + a.minutes, 0);

    return res.status(200).json({
      success: true,
      data: {
        accomplishments,
        total: accomplishments.length,
        totalMinutes
      }
    });
  } catch (error) {
    console.error('Get accomplishments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch accomplishments',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Update accomplishment
 * @route PUT /api/accomplishments/:id
 */
const updateAccomplishment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, minutes, date, tags, type } = req.body;
    const userId = req.user.userId;

    const accomplishment = await Accomplishment.findOne({ _id: id, userId });

    if (!accomplishment) {
      return res.status(404).json({
        success: false,
        message: 'Accomplishment not found or you do not have permission to update it'
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (minutes !== undefined) updateData.minutes = minutes;
    if (date !== undefined) updateData.date = date;
    if (tags !== undefined) updateData.tags = tags;
    if (type !== undefined) updateData.type = type;

    const updatedAccomplishment = await Accomplishment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('tags');

    return res.status(200).json({
      success: true,
      message: 'Accomplishment updated successfully',
      data: { accomplishment: updatedAccomplishment }
    });
  } catch (error) {
    console.error('Update accomplishment error:', error);

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
      message: 'Failed to update accomplishment',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Delete accomplishment
 * @route DELETE /api/accomplishments/:id
 */
const deleteAccomplishment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const accomplishment = await Accomplishment.findOneAndDelete({ _id: id, userId });

    if (!accomplishment) {
      return res.status(404).json({
        success: false,
        message: 'Accomplishment not found or you do not have permission to delete it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Accomplishment deleted successfully'
    });
  } catch (error) {
    console.error('Delete accomplishment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete accomplishment',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Bulk create accomplishments
 * @route POST /api/accomplishments/bulk
 */
const bulkCreateAccomplishments = async (req, res) => {
  try {
    const { accomplishments } = req.body;
    const userId = req.user.userId;

    if (!accomplishments || !Array.isArray(accomplishments) || accomplishments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Accomplishments array is required and must not be empty'
      });
    }

    const accomplishmentsWithUser = accomplishments.map(item => ({
      ...item,
      title: item.title?.trim(),
      type: item.type || 'task',
      tags: item.tags || [],
      userId
    }));

    for (let i = 0; i < accomplishmentsWithUser.length; i++) {
      const item = accomplishmentsWithUser[i];
      if (!item.title || !item.date || item.minutes === undefined || item.minutes === null) {
        return res.status(400).json({
          success: false,
          message: `Accomplishment at index ${i} is missing required fields`
        });
      }
    }

    const created = await Accomplishment.insertMany(accomplishmentsWithUser);

    const populated = await Accomplishment.find({
      _id: { $in: created.map(a => a._id) }
    }).populate('tags').lean();

    return res.status(201).json({
      success: true,
      message: `${created.length} accomplishment(s) created successfully`,
      data: { accomplishments: populated }
    });
  } catch (error) {
    console.error('Bulk create accomplishments error:', error);

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
      message: 'Failed to create accomplishments',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createAccomplishment,
  getAccomplishments,
  updateAccomplishment,
  deleteAccomplishment,
  bulkCreateAccomplishments
};
