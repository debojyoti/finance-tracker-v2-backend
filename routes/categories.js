const express = require('express');
const router = express.Router();
const { createCategory, getCategories } = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/expense-categories
 * @desc    Create expense category
 * @access  Private (requires JWT token)
 * @body    { expenseCategoryName, expenseCategoryIcon }
 */
router.post('/', authenticate, createCategory);

/**
 * @route   GET /api/expense-categories
 * @desc    Get expense categories with optional search
 * @access  Private (requires JWT token)
 * @query   search
 */
router.get('/', authenticate, getCategories);

module.exports = router;
