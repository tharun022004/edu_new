const TEACHER_API_URL = () => process.env.TEACHER_API_URL || 'http://localhost:5001';

// @desc    Get student's attendance from teacher backend
// @route   GET /api/attendance
// @access  Private
exports.getStudentAttendance = async (req, res, next) => {
  try {
    const email = (req.user.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        summary: { total: 0, present: 0, late: 0, absent: 0, rate: 100 }
      });
    }

    const response = await fetch(
      `${TEACHER_API_URL()}/api/attendance/student/${encodeURIComponent(email)}`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        message: errorData.message || 'Failed to fetch attendance'
      });
    }

    const payload = await response.json();

    res.status(200).json({
      success: true,
      count: payload.count || (payload.data || []).length,
      data: payload.data || [],
      summary: payload.summary || {
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        rate: 100
      }
    });
  } catch (err) {
    console.error('Get student attendance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
