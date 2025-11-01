const express = require('express');
const router = express.Router();
const { createEarning, getEarnings } = require('../controllers/earningController');
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

module.exports = router;
