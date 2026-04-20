const express = require('express');
const router = express.Router();
const {
  createEarningType,
  getEarningTypes,
  updateEarningType,
  deleteEarningType
} = require('../controllers/earningTypeController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/earning-types
 * @desc    Create an earning type
 * @access  Private (requires JWT token)
 * @body    { name }
 */
router.post('/', authenticate, createEarningType);

/**
 * @route   GET /api/earning-types
 * @desc    Get earning types for current user
 * @access  Private (requires JWT token)
 */
router.get('/', authenticate, getEarningTypes);

/**
 * @route   PUT /api/earning-types/:id
 * @desc    Update an earning type
 * @access  Private (requires JWT token)
 */
router.put('/:id', authenticate, updateEarningType);

/**
 * @route   DELETE /api/earning-types/:id
 * @desc    Delete an earning type
 * @access  Private (requires JWT token)
 */
router.delete('/:id', authenticate, deleteEarningType);

module.exports = router;
