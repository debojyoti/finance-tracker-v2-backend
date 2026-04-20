const express = require('express');
const router = express.Router();
const {
  createSaving,
  getSavings,
  createRecurringSavingPlan,
  getRecurringSavingPlans,
  updateRecurringSavingPlan,
  deleteRecurringSavingPlan
} = require('../controllers/savingController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/savings
 * @desc    Create saving transaction
 * @access  Private (requires JWT token)
 * @body    { amount, type, title, category, assetType }
 */
router.post('/', authenticate, createSaving);

/**
 * @route   GET /api/savings
 * @desc    Get savings with pagination, filters, and sorting
 * @access  Private (requires JWT token)
 * @query   page, limit, startDate, endDate, month, year, type, category, assetType, sort
 */
router.get('/', authenticate, getSavings);

/**
 * @route   POST /api/savings/plans
 * @desc    Create recurring saving plan
 * @access  Private (requires JWT token)
 * @body    { title, amount, frequency, assetType, category, startDate }
 */
router.post('/plans', authenticate, createRecurringSavingPlan);

/**
 * @route   GET /api/savings/plans
 * @desc    Get recurring saving plans
 * @access  Private (requires JWT token)
 * @query   isActive, assetType, sort
 */
router.get('/plans', authenticate, getRecurringSavingPlans);

/**
 * @route   PUT /api/savings/plans/:id
 * @desc    Update recurring saving plan
 * @access  Private (requires JWT token)
 * @body    { title, amount, frequency, assetType, category, startDate, isActive }
 */
router.put('/plans/:id', authenticate, updateRecurringSavingPlan);

/**
 * @route   DELETE /api/savings/plans/:id
 * @desc    Delete recurring saving plan
 * @access  Private (requires JWT token)
 */
router.delete('/plans/:id', authenticate, deleteRecurringSavingPlan);

module.exports = router;
