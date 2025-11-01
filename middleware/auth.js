const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Authentication middleware to verify JWT token
 * Extracts token from Authorization header, verifies it, and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Check if token starts with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format. Use: Bearer <token>'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Check if user exists in database
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Invalid token.'
      });
    }

    // Attach user info to request object
    req.user = {
      userId: user._id,
      firebaseUserId: user.firebaseUserId,
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);

    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }

    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if token is missing
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = {
        userId: user._id,
        firebaseUserId: user.firebaseUserId,
        email: user.email,
        name: user.name
      };
    }

    next();
  } catch (error) {
    // If optional auth fails, just continue without user
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate
};
