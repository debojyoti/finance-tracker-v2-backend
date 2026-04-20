const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDashboardOverview } = require('../controllers/dashboardController');

// Get dashboard overview
router.get('/overview', authenticate, getDashboardOverview);

module.exports = router;
