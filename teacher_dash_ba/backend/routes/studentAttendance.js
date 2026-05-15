const express = require('express');
const { getStudentAttendanceByEmail } = require('../controllers/studentAttendance');

const router = express.Router();

router.get('/:email', getStudentAttendanceByEmail);

module.exports = router;
