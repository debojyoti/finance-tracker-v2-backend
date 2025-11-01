const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

/**
 * Authenticate user with Firebase token
 * Creates user if not exists, generates JWT token
 * @route POST /api/auth
 */
const authenticateUser = async (req, res) => {
  try {
    // Firebase user info is attached by verifyFirebaseAuth middleware
    const { firebaseUser } = req;
    const { user: userInfo } = req.body;

    if (!firebaseUser) {
      return res.status(400).json({
        success: false,
        message: 'Firebase authentication failed'
      });
    }

    // Check if user exists by Firebase UID
    let user = await User.findOne({ firebaseUserId: firebaseUser.uid });

    if (user) {
      // User exists - update last login information if needed
      user.updatedAt = Date.now();
      await user.save();

      console.log(`User logged in: ${user.email}`);
    } else {
      // User doesn't exist - create new user
      user = new User({
        firebaseUserId: firebaseUser.uid,
        name: userInfo.name || firebaseUser.name,
        email: userInfo.email || firebaseUser.email,
        loginMedium: firebaseUser.provider === 'google.com' ? 'google' :
                     firebaseUser.provider === 'facebook.com' ? 'facebook' : 'email'
      });

      await user.save();
      console.log(`New user created: ${user.email}`);
    }

    // Generate custom JWT token
    const token = generateToken({
      userId: user._id,
      email: user.email,
      firebaseUserId: user.firebaseUserId
    });

    // Return user info and JWT token
    return res.status(200).json({
      success: true,
      message: user ? 'Login successful' : 'User created successfully',
      data: {
        token,
        user: {
          userId: user._id,
          name: user.name,
          email: user.email,
          loginMedium: user.loginMedium,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists with a different account'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get current user info
 * @route GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
  try {
    // User is attached by authenticate middleware
    const userId = req.user.userId;

    const user = await User.findById(userId).select('-__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          userId: user._id,
          name: user.name,
          email: user.email,
          loginMedium: user.loginMedium,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user information',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Logout user (client-side token removal)
 * @route POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // In JWT-based authentication, logout is mainly handled on client-side
    // by removing the token. This endpoint can be used for logging or other purposes.

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  authenticateUser,
  getCurrentUser,
  logout
};
