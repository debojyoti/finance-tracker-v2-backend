const admin = require('firebase-admin');

/**
 * Decode base64 encoded Firebase service account
 * @returns {Object} Decoded service account JSON
 */
const decodeServiceAccount = () => {
  try {
    const base64ServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (!base64ServiceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not defined in environment variables');
    }

    // Decode base64 to JSON string
    const jsonString = Buffer.from(base64ServiceAccount, 'base64').toString('utf-8');

    // Parse JSON string to object
    const serviceAccount = JSON.parse(jsonString);

    return serviceAccount;
  } catch (error) {
    console.error('Error decoding Firebase service account:', error.message);
    throw error;
  }
};

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebaseAdmin = () => {
  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase Admin SDK already initialized');
      return;
    }

    const serviceAccount = decodeServiceAccount();

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    throw error;
  }
};

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token to verify
 * @returns {Promise<Object>} Decoded token containing user information
 */
const verifyFirebaseToken = async (idToken) => {
  try {
    if (!idToken) {
      throw new Error('No token provided');
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error.message);
    throw error;
  }
};

/**
 * Get user by Firebase UID
 * @param {string} uid - Firebase user UID
 * @returns {Promise<Object>} Firebase user record
 */
const getUserByUid = async (uid) => {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Error getting user by UID:', error.message);
    throw error;
  }
};

module.exports = {
  initializeFirebaseAdmin,
  verifyFirebaseToken,
  getUserByUid,
  admin
};
