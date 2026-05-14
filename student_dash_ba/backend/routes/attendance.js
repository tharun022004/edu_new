const express = require('express');
const router = express.Router();
const { getStudentAttendance } = require('../controllers/attendance');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getStudentAttendance);

module.exports = router;
