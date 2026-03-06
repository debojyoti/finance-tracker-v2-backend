const express = require('express');
const router = express.Router();
const { createAccomplishment, getAccomplishments, updateAccomplishment, deleteAccomplishment } = require('../controllers/accomplishmentController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/accomplishments
 * @desc    Create accomplishment
 * @access  Private (requires JWT token)
 * @body    { title, minutes, date, tags }
 */
router.post('/', authenticate, createAccomplishment);

/**
 * @route   GET /api/accomplishments
 * @desc    Get accomplishments with filters (date, month, year, tag)
 * @access  Private (requires JWT token)
 * @query   date, month, year, tag
 */
router.get('/', authenticate, getAccomplishments);

/**
 * @route   PUT /api/accomplishments/:id
 * @desc    Update accomplishment
 * @access  Private (requires JWT token)
 * @body    { title, minutes, date, tags }
 */
router.put('/:id', authenticate, updateAccomplishment);

/**
 * @route   DELETE /api/accomplishments/:id
 * @desc    Delete accomplishment
 * @access  Private (requires JWT token)
 */
router.delete('/:id', authenticate, deleteAccomplishment);

module.exports = router;
