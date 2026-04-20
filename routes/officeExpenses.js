const express = require('express');
const router = express.Router();
const {
  createOfficeExpense,
  getOfficeExpenses,
  updateOfficeExpense,
  deleteOfficeExpense
} = require('../controllers/officeExpenseController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/office-expenses
 * @desc    Create office expense
 * @access  Private (requires JWT token)
 * @body    { title, amount, expenseDate, category, description }
 */
router.post('/', authenticate, createOfficeExpense);

/**
 * @route   GET /api/office-expenses
 * @desc    Get office expenses with pagination, filters, and sorting
 * @access  Private (requires JWT token)
 * @query   page, limit, startDate, endDate, category, sort
 */
router.get('/', authenticate, getOfficeExpenses);

/**
 * @route   PUT /api/office-expenses/:id
 * @desc    Update office expense
 * @access  Private (requires JWT token)
 * @body    { title, amount, expenseDate, category, description }
 */
router.put('/:id', authenticate, updateOfficeExpense);

/**
 * @route   DELETE /api/office-expenses/:id
 * @desc    Delete office expense
 * @access  Private (requires JWT token)
 */
router.delete('/:id', authenticate, deleteOfficeExpense);

module.exports = router;
