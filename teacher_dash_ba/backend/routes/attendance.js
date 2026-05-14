const express = require('express');
const router = express.Router();
const {
  submitAttendance,
  getClassAttendance
} = require('../controllers/attendance');

const { protect } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .post(submitAttendance);

router
  .route('/class/:classId')
  .get(getClassAttendance);

module.exports = router;
