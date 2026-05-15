const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Student = require('../models/Student');
const { normalizeStudentEmail } = require('../utils/studentEmail');

// @desc    Get attendance records for a student by email
// @route   GET /api/attendance/student/:email
// @access  Public (student backend proxies)
exports.getStudentAttendanceByEmail = async (req, res) => {
  try {
    const email = normalizeStudentEmail(decodeURIComponent(req.params.email));

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Student email is required'
      });
    }

    let student = await Student.findOne({ email });
    if (!student) {
      student = await Student.findOne({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    }

    if (!student) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        summary: {
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          rate: 100
        }
      });
    }

    const enrolledClasses = await Class.find({ students: student._id }).select(
      'name subject grade'
    );
    const classIds = enrolledClasses.map((c) => c._id);

    if (classIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        summary: {
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          rate: 100
        }
      });
    }

    const attendanceDocs = await Attendance.find({ class: { $in: classIds } })
      .populate('class', 'name subject grade')
      .sort('-date');

    const records = [];

    attendanceDocs.forEach((doc) => {
      const studentRecord = doc.records.find(
        (r) => r.student && r.student.toString() === student._id.toString()
      );
      if (studentRecord) {
        records.push({
          _id: doc._id,
          date: doc.date,
          class: doc.class,
          status: studentRecord.status
        });
      }
    });

    const present = records.filter((r) => r.status === 'present').length;
    const late = records.filter((r) => r.status === 'late').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const total = records.length;
    const rate =
      total === 0 ? 100 : Math.round(((present + late) / total) * 100);

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
      summary: { total, present, late, absent, rate },
      student: {
        name: student.name,
        email: student.email
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
