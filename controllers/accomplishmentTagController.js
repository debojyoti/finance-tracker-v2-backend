const AccomplishmentTag = require('../models/AccomplishmentTag');

/**
 * Create accomplishment tag
 * @route POST /api/accomplishment-tags
 */
const createAccomplishmentTag = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tag name is required'
      });
    }

    // Check if tag with same name already exists for this user
    const existingTag = await AccomplishmentTag.findOne({
      name: name.trim(),
      userId
    });

    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'Tag with this name already exists'
      });
    }

    const tag = new AccomplishmentTag({
      name: name.trim(),
      userId
    });

    await tag.save();

    return res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      data: { tag }
    });
  } catch (error) {
    console.error('Create accomplishment tag error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tag with this name already exists'
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
      message: 'Failed to create tag',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get accomplishment tags with optional search
 * @route GET /api/accomplishment-tags
 */
const getAccomplishmentTags = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { search } = req.query;

    const query = { userId };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const tags = await AccomplishmentTag.find(query)
      .sort('name')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        tags,
        total: tags.length
      }
    });
  } catch (error) {
    console.error('Get accomplishment tags error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Update accomplishment tag
 * @route PUT /api/accomplishment-tags/:id
 */
const updateAccomplishmentTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user.userId;

    const tag = await AccomplishmentTag.findOne({ _id: id, userId });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found or you do not have permission to update it'
      });
    }

    if (name && name.trim() !== tag.name) {
      const existingTag = await AccomplishmentTag.findOne({
        name: name.trim(),
        userId,
        _id: { $ne: id }
      });

      if (existingTag) {
        return res.status(400).json({
          success: false,
          message: 'Tag with this name already exists'
        });
      }
    }

    const updatedTag = await AccomplishmentTag.findByIdAndUpdate(
      id,
      { name: name?.trim() || tag.name },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Tag updated successfully',
      data: { tag: updatedTag }
    });
  } catch (error) {
    console.error('Update accomplishment tag error:', error);

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
      message: 'Failed to update tag',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Delete accomplishment tag
 * @route DELETE /api/accomplishment-tags/:id
 */
const deleteAccomplishmentTag = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const tag = await AccomplishmentTag.findOneAndDelete({ _id: id, userId });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found or you do not have permission to delete it'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Tag deleted successfully'
    });
  } catch (error) {
    console.error('Delete accomplishment tag error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete tag',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  createAccomplishmentTag,
  getAccomplishmentTags,
  updateAccomplishmentTag,
  deleteAccomplishmentTag
};
