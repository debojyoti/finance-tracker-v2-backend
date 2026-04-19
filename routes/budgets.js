const express = require('express');
const router = express.Router();
const {
  getMonthlyDefault,
  updateMonthlyDefault,
  getOrCreateWeeklyBudget,
  updateWeeklyBudget
} = require('../controllers/budgetController');
const { authenticate } = require('../middleware/auth');

/**
 * @route  GET /api/budgets/monthly-default
 * @desc   Get user's current default monthly budget
 * @access Private
 */
router.get('/monthly-default', authenticate, getMonthlyDefault);

/**
 * @route  PUT /api/budgets/monthly-default
 * @desc   Set or update user's default monthly budget
 * @access Private
 * @body   { defaultMonthlyBudget: Number }
 */
router.put('/monthly-default', authenticate, updateMonthlyDefault);

/**
 * @route  GET /api/budgets/weekly
 * @desc   Get or create the WeeklyBudget for the week containing weekDate
 * @access Private
 * @query  weekDate (optional, YYYY-MM-DD, defaults to today)
 */
router.get('/weekly', authenticate, getOrCreateWeeklyBudget);

/**
 * @route  PUT /api/budgets/weekly/:id
 * @desc   Override the amount for a specific weekly budget
 * @access Private
 * @body   { amount: Number }
 */
router.put('/weekly/:id', authenticate, updateWeeklyBudget);

module.exports = router;
