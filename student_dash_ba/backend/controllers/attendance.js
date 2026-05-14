const Attendance = require('../models/Attendance');

// @desc    Get student's own attendance records
// @route   GET /api/attendance
// @access  Private
exports.getStudentAttendance = async (req, res, next) => {
  try {
    // Find all attendance documents where this student's ID exists in the records array
    const attendanceRecords = await Attendance.find({
      'records.student': req.user.id
    })
    .populate('class', 'name subject grade')
    .sort('-date');

    // We only want to return the specific student's status, not the whole class
    const formattedData = attendanceRecords.map(record => {
      const studentRecord = record.records.find(
        r => r.student.toString() === req.user.id
      );

      return {
        _id: record._id,
        date: record.date,
        class: record.class,
        status: studentRecord ? studentRecord.status : 'unknown'
      };
    });

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
