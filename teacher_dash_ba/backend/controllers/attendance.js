const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Student = require('../models/Student');

// @desc    Submit attendance for a class
// @route   POST /api/attendance
// @access  Private
exports.submitAttendance = async (req, res, next) => {
  try {
    const { classId, date, records } = req.body;
    
    // Parse date to start of day to avoid timezone issues
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      class: classId,
      date: attendanceDate
    });

    if (attendance) {
      // Update existing attendance
      if (attendance.teacher.toString() !== req.user.id) {
        return res.status(401).json({ success: false, message: 'Not authorized to modify this attendance' });
      }
      attendance.records = records;
      await attendance.save();
    } else {
      // Create new attendance
      attendance = await Attendance.create({
        class: classId,
        teacher: req.user.id,
        date: attendanceDate,
        records
      });
    }

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (err) {
    if (err.code === 11000) {
       return res.status(400).json({ success: false, message: 'Attendance already submitted for this date' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get attendance for a specific class
// @route   GET /api/attendance/class/:classId
// @access  Private
exports.getClassAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.find({ class: req.params.classId })
      .populate('records.student', 'name email')
      .sort('-date');

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
