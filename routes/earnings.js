const express = require('express');
const router = express.Router();
const { createEarning, getEarnings, updateEarning, deleteEarning } = require('../controllers/earningController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/earnings
 * @desc    Create earning transaction
 * @access  Private (requires JWT token)
 * @body    { amount, type, title }
 */
router.post('/', authenticate, createEarning);

/**
 * @route   GET /api/earnings
 * @desc    Get earnings with pagination, filters, and sorting
 * @access  Private (requires JWT token)
 * @query   page, limit, startDate, endDate, type, sort
 */
router.get('/', authenticate, getEarnings);

/**
 * @route   PUT /api/earnings/:id
 * @desc    Update earning transaction
 * @access  Private (requires JWT token)
 * @body    { amount?, type?, title?, createdOn? }
 */
router.put('/:id', authenticate, updateEarning);

/**
 * @route   DELETE /api/earnings/:id
 * @desc    Delete earning transaction
 * @access  Private (requires JWT token)
 */
router.delete('/:id', authenticate, deleteEarning);

module.exports = router;
