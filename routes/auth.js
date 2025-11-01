const express = require('express');
const router = express.Router();
const { authenticateUser, getCurrentUser, logout } = require('../controllers/authController');
const { verifyFirebaseAuth, validateUserInfo } = require('../middleware/firebaseAuth');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/auth
 * @desc    Authenticate user with Firebase token and create/login user
 * @access  Public
 * @body    { firebaseToken: string, user: { name: string, email: string } }
 */
router.post('/', verifyFirebaseAuth, validateUserInfo, authenticateUser);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private (requires JWT token)
 * @header  Authorization: Bearer <token>
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private (requires JWT token)
 * @header  Authorization: Bearer <token>
 */
router.post('/logout', authenticate, logout);

module.exports = router;
