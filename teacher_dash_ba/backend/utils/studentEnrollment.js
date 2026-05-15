const Student = require('../models/Student');
const Class = require('../models/Class');
const { normalizeStudentEmail } = require('./studentEmail');

function enrollmentClassId(entry) {
  if (!entry?.class) return null;
  if (typeof entry.class === 'object' && entry.class._id) {
    return entry.class._id.toString();
  }
  return entry.class.toString();
}

/**
 * Resolve a teacher-side Student by email (preferred), Mongo _id, or studentId field.
 */
async function findStudentByIdentifier(identifier) {
  const param = String(identifier || '').trim();
  if (!param) return null;

  if (param.includes('@')) {
    const email = normalizeStudentEmail(param);
    let byEmail = await Student.findOne({ email });
    if (!byEmail) {
      byEmail = await Student.findOne({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    }
    if (byEmail) return byEmail;
  }

  if (/^[0-9a-fA-F]{24}$/.test(param)) {
    const byId = await Student.findById(param);
    if (byId) return byId;
  }

  return Student.findOne({ studentId: param });
}

function classIdFromEnrollment(entry) {
  if (!entry?.class) return null;
  if (typeof entry.class === 'object') {
    return (entry.class._id || entry.class.id || entry.class).toString();
  }
  return entry.class.toString();
}

/**
 * Merge Student.classes with Class.students roster; persist missing profile entries.
 */
async function getSyncedStudentEnrollments(student) {
  if (!student) return [];

  const rosterClasses = await Class.find({ students: student._id }).select(
    'name subject grade classCode'
  );

  let profileChanged = false;
  for (const classDoc of rosterClasses) {
    const alreadyListed = student.classes.some(
      (entry) =>
        enrollmentClassId(entry) === classDoc._id.toString() &&
        entry.status !== 'inactive'
    );
    if (!alreadyListed) {
      student.classes.push({
        class: classDoc._id,
        joinedAt: new Date(),
        status: 'active'
      });
      profileChanged = true;
    }
  }

  if (profileChanged) {
    await student.save();
  }

  await student.populate('classes.class', 'name subject grade classCode');

  return student.classes.filter(
    (entry) => entry.status !== 'inactive' && entry.class
  );
}

async function getStudentEnrollmentsByIdentifier(identifier) {
  const student = await findStudentByIdentifier(identifier);
  if (!student) {
    return { student: null, enrollments: [] };
  }

  const enrollments = await getSyncedStudentEnrollments(student);
  return { student, enrollments };
}

module.exports = {
  findStudentByIdentifier,
  getSyncedStudentEnrollments,
  getStudentEnrollmentsByIdentifier,
  classIdFromEnrollment
};
