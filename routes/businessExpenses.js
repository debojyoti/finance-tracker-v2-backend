const express = require('express');
const router = express.Router();
const {
  createBusinessExpense,
  getBusinessExpenses,
  updateBusinessExpense,
  deleteBusinessExpense
} = require('../controllers/businessExpenseController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/business-expenses
 * @desc    Create business expense
 * @access  Private (requires JWT token)
 * @body    { title, amount, expenseDate, category, description }
 */
router.post('/', authenticate, createBusinessExpense);

/**
 * @route   GET /api/business-expenses
 * @desc    Get business expenses with pagination, filters, and sorting
 * @access  Private (requires JWT token)
 * @query   page, limit, startDate, endDate, category, sort
 */
router.get('/', authenticate, getBusinessExpenses);

/**
 * @route   PUT /api/business-expenses/:id
 * @desc    Update business expense
 * @access  Private (requires JWT token)
 * @body    { title, amount, expenseDate, category, description }
 */
router.put('/:id', authenticate, updateBusinessExpense);

/**
 * @route   DELETE /api/business-expenses/:id
 * @desc    Delete business expense
 * @access  Private (requires JWT token)
 */
router.delete('/:id', authenticate, deleteBusinessExpense);

module.exports = router;
