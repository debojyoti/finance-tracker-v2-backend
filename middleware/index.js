const { authenticate, optionalAuthenticate } = require('./auth');
const { verifyFirebaseAuth, validateUserInfo } = require('./firebaseAuth');

module.exports = {
  authenticate,
  optionalAuthenticate,
  verifyFirebaseAuth,
  validateUserInfo
};
