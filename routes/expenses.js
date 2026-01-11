const express = require('express');
const router = express.Router();
const { createExpenses, getExpenses, updateExpense, deleteExpense, getDailyExpenses, getTopCategories } = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/expenses/analytics/daily
 * @desc    Get daily expense breakdown for a month
 * @access  Private (requires JWT token)
 * @query   month, year
 */
router.get('/analytics/daily', authenticate, getDailyExpenses);

/**
 * @route   GET /api/expenses/analytics/top-categories
 * @desc    Get top categories by total expense
 * @access  Private (requires JWT token)
 * @query   month, year, limit (default: 10)
 */
router.get('/analytics/top-categories', authenticate, getTopCategories);

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
 * @query   page, limit, startDate, endDate, month, year, categories, expenseType, need_or_want, sort
 */
router.get('/', authenticate, getExpenses);

/**
 * @route   PUT /api/expenses/:id
 * @desc    Update a single expense transaction
 * @access  Private (requires JWT token)
 * @body    { expenseTypeId, amount, expenseCategory, description, expense_date, need_or_want, could_have_saved }
 */
router.put('/:id', authenticate, updateExpense);

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Delete a single expense transaction
 * @access  Private (requires JWT token)
 */
router.delete('/:id', authenticate, deleteExpense);

module.exports = router;
