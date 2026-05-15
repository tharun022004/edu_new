const express = require('express');
const { protect } = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboard');
const { getRecentActivity } = require('../controllers/activity');

const router = express.Router();

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private
router.get('/', protect, getDashboard);

// @desc    Get recent activity (teacher-backed, same shape as teacher dashboard)
// @route   GET /api/dashboard/activity
// @access  Private
router.get('/activity', protect, getRecentActivity);

module.exports = router;