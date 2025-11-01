const express = require('express');
const router = express.Router();
const { createExpenses, getExpenses } = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/expenses
 * @desc    Create multiple expense transactions
 * @access  Private (requires JWT token)
 * @body    { expenses: [{ expenseTypeId, amount, expenseCategory, description, expense_date, need_or_want, could_have_saved }] }
 */
router.post('/', authenticate, createExpenses);

/**
 * @route   GET /api/expenses
 * @desc    Get expenses with pagination, filters, and sorting
 * @access  Private (requires JWT token)
 * @query   page, limit, startDate, endDate, categories, expenseType, need_or_want, sort
 */
router.get('/', authenticate, getExpenses);

module.exports = router;
