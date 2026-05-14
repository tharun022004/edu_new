const express = require('express');
const router = express.Router();
const { getStudentSchedule } = require('../controllers/schedule');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getStudentSchedule);

module.exports = router;
