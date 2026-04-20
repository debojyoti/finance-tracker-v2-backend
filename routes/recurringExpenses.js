const express = require('express');
const router = express.Router();
const {
  createRecurringExpense,
  getRecurringExpenses,
  updateRecurringExpense,
  deleteRecurringExpense
} = require('../controllers/recurringExpenseController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/recurring-expenses
 * @desc    Create a recurring expense definition
 * @access  Private (requires JWT token)
 * @body    { title, amount, frequency, startDate, isActive, expenseCategory, expenseTypeId, need_or_want, reportingMode, description }
 */
router.post('/', authenticate, createRecurringExpense);

/**
 * @route   GET /api/recurring-expenses
 * @desc    List recurring expenses for the current user
 * @access  Private (requires JWT token)
 * @query   frequency, isActive, sort
 */
router.get('/', authenticate, getRecurringExpenses);

/**
 * @route   PUT /api/recurring-expenses/:id
 * @desc    Update a recurring expense definition
 * @access  Private (requires JWT token)
 */
router.put('/:id', authenticate, updateRecurringExpense);

/**
 * @route   DELETE /api/recurring-expenses/:id
 * @desc    Delete a recurring expense definition
 * @access  Private (requires JWT token)
 */
router.delete('/:id', authenticate, deleteRecurringExpense);

module.exports = router;
