const express = require('express');
const router = express.Router();
const { createAccomplishmentTag, getAccomplishmentTags, updateAccomplishmentTag, deleteAccomplishmentTag } = require('../controllers/accomplishmentTagController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/accomplishment-tags
 * @desc    Create accomplishment tag
 * @access  Private (requires JWT token)
 * @body    { name }
 */
router.post('/', authenticate, createAccomplishmentTag);

/**
 * @route   GET /api/accomplishment-tags
 * @desc    Get accomplishment tags with optional search
 * @access  Private (requires JWT token)
 * @query   search
 */
router.get('/', authenticate, getAccomplishmentTags);

/**
 * @route   PUT /api/accomplishment-tags/:id
 * @desc    Update accomplishment tag
 * @access  Private (requires JWT token)
 * @body    { name }
 */
router.put('/:id', authenticate, updateAccomplishmentTag);

/**
 * @route   DELETE /api/accomplishment-tags/:id
 * @desc    Delete accomplishment tag
 * @access  Private (requires JWT token)
 */
router.delete('/:id', authenticate, deleteAccomplishmentTag);

module.exports = router;
