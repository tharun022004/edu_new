const Class = require('../models/Class');
const Student = require('../models/Student');
const { normalizeStudentEmail, displayNameFromEmail } = require('../utils/studentEmail');
const { getSyncedStudentEnrollments } = require('../utils/studentEnrollment');

function enrollmentClassId(entry) {
  if (!entry?.class) return null;
  if (typeof entry.class === 'object' && entry.class._id) {
    return entry.class._id.toString();
  }
  return entry.class.toString();
}

// @desc    Get all classes for a teacher
// @route   GET /api/classes
// @access  Private
exports.getClasses = async (req, res, next) => {
  try {
    const classes = await Class.find({ teacher: req.user.id, isActive: true })
      .populate('students', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single class
// @route   GET /api/classes/:id
// @access  Private
exports.getClass = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('students', 'name email avatar performance')
      .populate('assignments')
      .populate('doubts')
      .populate('content');

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Make sure user is class teacher
    if (classItem.teacher.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this class'
      });
    }

    res.status(200).json({
      success: true,
      data: classItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new class
// @route   POST /api/classes
// @access  Private
exports.createClass = async (req, res, next) => {
  try {
    // Add teacher to req.body
    req.body.teacher = req.user.id;

    const classItem = await Class.create(req.body);

    res.status(201).json({
      success: true,
      data: classItem,
      message: 'Class created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during class creation',
      error: error.message
    });
  }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Private
exports.updateClass = async (req, res, next) => {
  try {
    let classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Make sure user is class teacher
    if (classItem.teacher.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this class'
      });
    }

    classItem = await Class.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: classItem,
      message: 'Class updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during class update',
      error: error.message
    });
  }
};

// @desc    Delete class
// @route   DELETE /api/classes/:id
// @access  Private
exports.deleteClass = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Make sure user is class teacher
    if (classItem.teacher.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this class'
      });
    }

    // Soft delete - set isActive to false
    classItem.isActive = false;
    await classItem.save();

    res.status(200).json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during class deletion',
      error: error.message
    });
  }
};

// @desc    Get class statistics
// @route   GET /api/classes/:id/stats
// @access  Private
exports.getClassStats = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('assignments')
      .populate('doubts')
      .populate('content');

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Calculate statistics
    const stats = {
      totalStudents: classItem.studentCount,
      totalAssignments: classItem.assignments?.length || 0,
      pendingDoubts: classItem.doubts?.filter(doubt => doubt.status === 'pending').length || 0,
      totalContent: classItem.content?.length || 0,
      averageScore: classItem.stats.averageScore,
      engagement: classItem.stats.engagement
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get class students
// @route   GET /api/classes/:id/students
// @access  Private
exports.getClassStudents = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('students', 'name email avatar performance notes');

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.status(200).json({
      success: true,
      count: classItem.students.length,
      data: classItem.students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add student to class
// @route   POST /api/classes/:id/students
// @access  Private
exports.addStudent = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    const email = normalizeStudentEmail(req.body.email);
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'A valid student email is required (must match their student portal login email)'
      });
    }

    const name =
      (req.body.name && String(req.body.name).trim()) ||
      displayNameFromEmail(email);

    let student = await Student.findOne({ email });
    if (!student) {
      student = await Student.findOne({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    }

    if (!student) {
      student = await Student.create({
        name,
        email,
        studentId: (req.body.studentId && String(req.body.studentId).trim()) || `STU${Date.now()}`,
        classes: [{ class: classItem._id, joinedAt: new Date(), status: 'active' }]
      });
    } else {
      if (student.email !== email) {
        student.email = email;
      }
      const alreadyInClass = student.classes.some(
        (entry) => enrollmentClassId(entry) === classItem._id.toString()
      );
      if (!alreadyInClass) {
        student.classes.push({ class: classItem._id, joinedAt: new Date(), status: 'active' });
      }
      await student.save();
    }

    const alreadyOnRoster = classItem.students.some(
      (id) => id && id.toString() === student._id.toString()
    );
    if (!alreadyOnRoster) {
      classItem.students.push(student._id);
      classItem.studentCount = classItem.students.length;
      await classItem.save();

      if (req.io) {
        const populatedClass = await Class.findById(req.params.id)
          .populate('students', 'name email avatar');

        req.io.to(`teacher_${classItem.teacher}`).emit('student_added_to_class', {
          classId: req.params.id,
          student,
          class: populatedClass,
          timestamp: new Date()
        });
      }
    }

    const enrollments = await getSyncedStudentEnrollments(student);

    res.status(200).json({
      success: true,
      data: student,
      enrollments,
      message:
        'Student added to class successfully. They must sign in with this exact email on the student portal to see the class.'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A student with this email or ID already exists. Use the same email they use on the student portal.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Remove student from class
// @route   DELETE /api/classes/:id/students/:studentId
// @access  Private
exports.removeStudent = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id);
    const student = await Student.findById(req.params.studentId);

    if (!classItem || !student) {
      return res.status(404).json({
        success: false,
        message: 'Class or student not found'
      });
    }

    // Remove student from class
    classItem.students = classItem.students.filter(
      studentId => studentId.toString() !== req.params.studentId
    );
    classItem.studentCount = classItem.students.length;
    await classItem.save();

    // Remove class from student's classes
    student.classes = student.classes.filter(
      classId => classId.toString() !== req.params.id
    );
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student removed from class successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Generate class code
// @route   POST /api/classes/:id/generate-code
// @access  Private
exports.generateClassCode = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Make sure user is class teacher
    if (classItem.teacher.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to generate code for this class'
      });
    }

    // Generate new class code
    const classCode = classItem.generateClassCode();
    await classItem.save();

    res.status(200).json({
      success: true,
      data: {
        classCode: classCode,
        expiry: classItem.codeExpiry
      },
      message: 'Class code generated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get class code
// @route   GET /api/classes/:id/code
// @access  Private
exports.getClassCode = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Make sure user is class teacher
    if (classItem.teacher.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view code for this class'
      });
    }

    if (!classItem.classCode || !classItem.isCodeValid()) {
      return res.status(404).json({
        success: false,
        message: 'No valid class code found. Generate a new one.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        classCode: classItem.classCode,
        expiry: classItem.codeExpiry,
        isValid: classItem.isCodeValid()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Join class by code
// @route   POST /api/classes/join
// @access  Private
exports.joinClassByCode = async (req, res, next) => {
  try {
    const { classCode } = req.body;

    if (!classCode) {
      return res.status(400).json({
        success: false,
        message: 'Class code is required'
      });
    }

    // Find class by code
    const classItem = await Class.findOne({ classCode: classCode.toUpperCase() });

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Invalid class code'
      });
    }

    if (!classItem.isCodeValid()) {
      return res.status(400).json({
        success: false,
        message: 'Class code has expired'
      });
    }

    const studentEmail = normalizeStudentEmail(req.user?.email || req.body.email);
    const studentName =
      req.user?.name ||
      req.user?.fullName ||
      req.body.name ||
      displayNameFromEmail(studentEmail);

    if (!studentEmail) {
      return res.status(400).json({
        success: false,
        message: 'Student email is required'
      });
    }

    const existingStudent = await Student.findOne({ email: studentEmail });

    if (
      existingStudent &&
      existingStudent.classes.some(
        (entry) => enrollmentClassId(entry) === classItem._id.toString()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this class'
      });
    }

    let studentRecord = await Student.findOne({ email: studentEmail });

    if (!studentRecord) {
      studentRecord = await Student.create({
        name: studentName,
        email: studentEmail,
        studentId: (req.body.studentId && String(req.body.studentId).trim()) || `STU${Date.now()}`,
        classes: [{
          class: classItem._id,
          joinedAt: new Date(),
          status: 'active'
        }]
      });
    } else {
      const alreadyEnrolled = studentRecord.classes.some(
        (entry) => enrollmentClassId(entry) === classItem._id.toString()
      );
      
      if (!alreadyEnrolled) {
        // Add class to student's classes
        studentRecord.classes.push({
          class: classItem._id,
          joinedAt: new Date(),
          status: 'active'
        });
        await studentRecord.save();
      }
    }

    // Add student to class (students array holds Student refs)
    const alreadyInClass = classItem.students.some(
      id => id && id.toString() === studentRecord._id.toString()
    );
    if (!alreadyInClass) {
      classItem.students.push(studentRecord._id);
      classItem.studentCount = classItem.students.length;
      await classItem.save();
      
      // Emit real-time update via Socket.IO if available
      if (req.io) {
        const Student = require('../models/Student');
        const populatedClass = await Class.findById(classItem._id)
          .populate('students', 'name email avatar');
        
        req.io.to(`teacher_${classItem.teacher}`).emit('student_joined_class', {
          classId: classItem._id,
          student: studentRecord,
          class: populatedClass,
          timestamp: new Date()
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        class: {
          id: classItem._id,
          name: classItem.name,
          subject: classItem.subject,
          grade: classItem.grade
        },
        student: studentRecord
      },
      message: 'Successfully joined the class'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};