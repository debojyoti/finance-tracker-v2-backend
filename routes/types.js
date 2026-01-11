const express = require('express');
const router = express.Router();
const { createType, getTypes, updateType, deleteType } = require('../controllers/typeController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/expense-types
 * @desc    Create expense type
 * @access  Private (requires JWT token)
 * @body    { expenseTypeName }
 */
router.post('/', authenticate, createType);

/**
 * @route   GET /api/expense-types
 * @desc    Get expense types with optional search
 * @access  Private (requires JWT token)
 * @query   search
 */
router.get('/', authenticate, getTypes);

/**
 * @route   PUT /api/expense-types/:id
 * @desc    Update expense type
 * @access  Private (requires JWT token)
 * @body    { expenseTypeName }
 */
router.put('/:id', authenticate, updateType);

/**
 * @route   DELETE /api/expense-types/:id
 * @desc    Delete expense type
 * @access  Private (requires JWT token)
 */
router.delete('/:id', authenticate, deleteType);

module.exports = router;
