const { verifyFirebaseToken } = require('../config/firebase');

/**
 * Middleware to verify Firebase ID token
 * Extracts Firebase token from request body and verifies it
 * Attaches decoded Firebase user info to request
 */
const verifyFirebaseAuth = async (req, res, next) => {
  try {
    // Get Firebase token from request body
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase token is required'
      });
    }

    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(firebaseToken);

    if (!decodedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token'
      });
    }

    // Attach Firebase user info to request
    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.displayName || '',
      emailVerified: decodedToken.email_verified,
      picture: decodedToken.picture || '',
      provider: decodedToken.firebase.sign_in_provider
    };

    next();
  } catch (error) {
    console.error('Firebase authentication error:', error.message);

    // Handle specific Firebase errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Firebase token has expired. Please login again.'
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        message: 'Firebase token has been revoked. Please login again.'
      });
    }

    if (error.code === 'auth/argument-error' || error.message.includes('No token provided')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Firebase token format'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Firebase authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Middleware to extract user info from request body
 * Validates that user object is present
 */
const validateUserInfo = (req, res, next) => {
  try {
    const { user } = req.body;

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User information is required'
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: 'User email is required'
      });
    }

    if (!user.name) {
      return res.status(400).json({
        success: false,
        message: 'User name is required'
      });
    }

    next();
  } catch (error) {
    console.error('User validation error:', error.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid user information',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  verifyFirebaseAuth,
  validateUserInfo
};
