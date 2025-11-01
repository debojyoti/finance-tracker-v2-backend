const express = require('express');
const router = express.Router();
const { createSaving, getSavings } = require('../controllers/savingController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/savings
 * @desc    Create saving transaction
 * @access  Private (requires JWT token)
 * @body    { amount, type, title, category }
 */
router.post('/', authenticate, createSaving);

/**
 * @route   GET /api/savings
 * @desc    Get savings with pagination, filters, and sorting
 * @access  Private (requires JWT token)
 * @query   page, limit, startDate, endDate, type, category, sort
 */
router.get('/', authenticate, getSavings);

module.exports = router;
