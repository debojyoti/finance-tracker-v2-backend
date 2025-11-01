const jwt = require('jsonwebtoken');

/**
 * Generate JWT token
 * @param {Object} payload - Data to encode in the token
 * @param {String} expiresIn - Token expiration time (default: 7 days)
 * @returns {String} JWT token
 */
const generateToken = (payload, expiresIn = '7d') => {
  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const token = jwt.sign(payload, secret, {
      expiresIn,
      issuer: 'finance-tracker-v2'
    });

    return token;
  } catch (error) {
    console.error('Error generating JWT token:', error.message);
    throw error;
  }
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const decoded = jwt.verify(token, secret, {
      issuer: 'finance-tracker-v2'
    });

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw error;
    }
  }
};

/**
 * Decode JWT token without verification (useful for debugging)
 * @param {String} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT token:', error.message);
    throw new Error('Invalid token format');
  }
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
};
