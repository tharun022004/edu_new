const express = require('express');
const { joinClassByCode } = require('../controllers/classes');
const { getStudentEnrollmentsByIdentifier } = require('../utils/studentEnrollment');

const router = express.Router();

// Student join class by code - NO auth so student backend can call with body (classCode, email, name).
// The student backend already authenticates the student before forwarding the request.
router.post('/join', joinClassByCode);

// Get student's classes (used by student backend and content sync)
router.get('/student/:studentId', async (req, res) => {
  try {
    const { student, enrollments } = await getStudentEnrollmentsByIdentifier(
      req.params.studentId
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        searchedBy: req.params.studentId
      });
    }

    return res.status(200).json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
