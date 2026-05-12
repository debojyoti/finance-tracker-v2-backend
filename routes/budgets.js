const express = require('express');
const router = express.Router();
const {
  getMonthlyDefault,
  updateMonthlyDefault
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

module.exports = router;
