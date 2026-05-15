const express = require('express');
const {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  getClassStats,
  getClassStudents,
  addStudent,
  removeStudent,
  generateClassCode,
  getClassCode,
  joinClassByCode
} = require('../controllers/classes');
const { validateClass, validate } = require('../middleware/validation');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getClasses)
  .post(validateClass, validate, createClass);

router.route('/:id')
  .get(getClass)
  .put(updateClass)
  .delete(deleteClass);

router.get('/:id/stats', getClassStats);
router.get('/:id/students', getClassStudents);
router.post('/:id/students', addStudent);
router.delete('/:id/students/:studentId', removeStudent);

// Class code routes (protected - teacher only)
router.post('/:id/generate-code', generateClassCode);
router.get('/:id/code', getClassCode);

// Get student's classes (syncs roster + profile)
router.get('/student/:studentId', async (req, res) => {
  try {
    const { getStudentEnrollmentsByIdentifier } = require('../utils/studentEnrollment');
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

    res.status(200).json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;