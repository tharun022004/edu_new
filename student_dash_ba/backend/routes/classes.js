const express = require('express');
const { protect } = require('../middleware/auth');
const { fetchStudentEnrollments } = require('../utils/teacherEnrollment');

const router = express.Router();

// @desc    Join class by code
// @route   POST /api/classes/join
// @access  Private (requires authenticated student)
router.post('/join', protect, async (req, res) => {
  try {
    const { classCode } = req.body;

    if (!classCode) {
      return res.status(400).json({
        success: false,
        message: 'Class code is required'
      });
    }

    // Call teacher backend to join class (no auth header - teacher endpoint accepts body only)
    const response = await fetch(`${process.env.TEACHER_API_URL || 'http://localhost:5001'}/api/classes/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classCode: classCode.trim().toUpperCase(),
        email: (req.user.email || '').trim().toLowerCase(),
        name: req.user.name || req.user.fullName || req.user.email,
        studentId: req.user.studentId || req.user.id
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Join class error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error joining class',
      error: error.message
    });
  }
});

// @desc    Get student's classes
// @route   GET /api/classes
// @access  Private (requires authenticated student)
router.get('/', protect, async (req, res) => {
  try {
    const enrolledClasses = await fetchStudentEnrollments({
      email: req.user.email,
      id: req.user.id || req.user._id
    });

    console.log('Enrolled classes for student:', {
      email: req.user.email,
      count: enrolledClasses.length
    });

    res.status(200).json({
      success: true,
      data: enrolledClasses
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching classes',
      error: error.message
    });
  }
});

module.exports = router;
