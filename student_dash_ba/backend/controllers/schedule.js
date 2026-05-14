const Schedule = require('../models/Schedule');
const Class = require('../models/Class');

// @desc    Get student's schedule based on enrolled classes
// @route   GET /api/schedule
// @access  Private
exports.getStudentSchedule = async (req, res, next) => {
  try {
    // 1. Get classes the student is enrolled in
    const enrolledClasses = await Class.find({ students: req.user.id })
      .select('_id');
    
    const classIds = enrolledClasses.map(c => c._id);

    // 2. Fetch the schedules for those classes
    const schedule = await Schedule.find({ class: { $in: classIds } })
      .populate('class', 'name subject grade')
      .populate('teacher', 'name fullName email')
      .sort('startTime');

    res.status(200).json({
      success: true,
      count: schedule.length,
      data: schedule
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
