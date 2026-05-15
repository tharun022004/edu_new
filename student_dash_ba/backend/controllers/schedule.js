const {
  fetchStudentEnrollments,
  extractEnrolledClassIds
} = require('../utils/teacherEnrollment');

const TEACHER_API_URL = () => process.env.TEACHER_API_URL || 'http://localhost:5001';

// @desc    Get student's schedule for enrolled classes (from teacher backend)
// @route   GET /api/schedule
// @access  Private
exports.getStudentSchedule = async (req, res, next) => {
  try {
    const enrolledClasses = await fetchStudentEnrollments({
      email: req.user.email,
      id: req.user._id || req.user.id
    });

    const classIds = extractEnrolledClassIds(enrolledClasses);

    if (classIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'No enrolled classes found'
      });
    }

    const queryParams = new URLSearchParams();
    classIds.forEach((id) => queryParams.append('class', id));

    const response = await fetch(
      `${TEACHER_API_URL()}/api/schedule/student?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Failed to fetch schedule from teacher backend'
      });
    }

    const payload = await response.json();
    const schedule = payload.data || [];

    res.status(200).json({
      success: true,
      count: schedule.length,
      data: schedule
    });
  } catch (err) {
    console.error('Get student schedule error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
