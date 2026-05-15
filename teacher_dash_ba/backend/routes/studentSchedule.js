const express = require('express');
const { getScheduleForStudentClasses } = require('../controllers/schedule');

const router = express.Router();

// @route   GET /api/schedule/student?class=<id>&class=<id>
// @access  Public (student backend proxies with enrolled class IDs)
router.get('/', getScheduleForStudentClasses);

module.exports = router;
