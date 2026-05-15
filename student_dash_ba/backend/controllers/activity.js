const { formatRelativeTime } = require('../utils/formatRelativeTime');
const {
  fetchStudentEnrollments,
  classIdFromEnrollment
} = require('../utils/teacherEnrollment');

const TEACHER_API_URL = () => process.env.TEACHER_API_URL || 'http://localhost:5001';

function classLabel(cls) {
  if (!cls) return 'Class';
  if (typeof cls === 'object') {
    return cls.name || cls.subject || 'Class';
  }
  return 'Class';
}

function pushActivity(list, item) {
  if (!item.time) return;
  list.push(item);
}

// @desc    Get recent activity for student (from teacher backend data)
// @route   GET /api/dashboard/activity
// @access  Private
exports.getRecentActivity = async (req, res, next) => {
  try {
    const email = (req.user.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const teacherApi = TEACHER_API_URL();
    const activity = [];

    const [doubtsRes, assignmentsRes, enrollments] = await Promise.all([
      fetch(`${teacherApi}/api/student-doubts/${encodeURIComponent(email)}`, {
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => null),
      fetch(`${teacherApi}/api/assignments/student/${encodeURIComponent(email)}`, {
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => null),
      fetchStudentEnrollments({ email, id: req.user._id || req.user.id })
    ]);

    if (doubtsRes?.ok) {
      const doubtsPayload = await doubtsRes.json();
      const doubts = (doubtsPayload.data || []).slice(0, 8);

      doubts.forEach((doubt) => {
        const cls = classLabel(doubt.class);
        pushActivity(activity, {
          id: `doubt_${doubt._id}`,
          student: 'You',
          action: `asked a doubt: "${doubt.title}"`,
          time: doubt.createdAt,
          type: 'doubt',
          class: cls
        });

        (doubt.responses || [])
          .filter((r) => r.authorType === 'teacher')
          .forEach((response, index) => {
            pushActivity(activity, {
              id: `doubt_reply_${doubt._id}_${index}`,
              student: response.author || 'Teacher',
              action: `answered your doubt: "${doubt.title}"`,
              time: response.createdAt || doubt.updatedAt,
              type: 'doubt',
              class: cls
            });
          });
      });
    }

    if (assignmentsRes?.ok) {
      const assignmentsPayload = await assignmentsRes.json();
      const grouped = assignmentsPayload.data || {};
      const assignments = Object.values(grouped).flat();

      assignments.slice(0, 15).forEach((assignment) => {
        const cls = classLabel(assignment.class);
        const teacherName =
          assignment.teacher?.name || assignment.teacher?.fullName || 'Teacher';

        pushActivity(activity, {
          id: `assignment_new_${assignment._id}`,
          student: teacherName,
          action: `posted a new assignment: "${assignment.title}"`,
          time: assignment.createdAt,
          type: 'assignment',
          class: cls
        });

        const submission = assignment.studentSubmission;
        if (submission?.submittedAt) {
          pushActivity(activity, {
            id: `assignment_submit_${assignment._id}`,
            student: 'You',
            action: `submitted assignment: "${assignment.title}"`,
            time: submission.submittedAt,
            type: 'assignment',
            class: cls
          });
        }

        if (
          submission &&
          (submission.gradedAt ||
            submission.status === 'graded' ||
            submission.score !== undefined)
        ) {
          pushActivity(activity, {
            id: `assignment_graded_${assignment._id}`,
            student: teacherName,
            action: `graded your assignment: "${assignment.title}"`,
            time: submission.gradedAt || submission.submittedAt,
            type: 'content',
            class: cls
          });
        }
      });
    }

    enrollments.forEach((entry) => {
      if (!entry.joinedAt) return;
      const cls = classLabel(entry.class);
      const classId = classIdFromEnrollment(entry);
      pushActivity(activity, {
        id: `enroll_${classId}_${new Date(entry.joinedAt).getTime()}`,
        student: 'You',
        action: `joined class: "${cls}"`,
        time: entry.joinedAt,
        type: 'content',
        class: cls
      });
    });

    activity.sort((a, b) => new Date(b.time) - new Date(a.time));

    const formattedActivity = activity.slice(0, 10).map((item) => ({
      id: item.id,
      student: item.student,
      action: item.action,
      type: item.type,
      class: item.class,
      time: formatRelativeTime(item.time)
    }));

    res.status(200).json({
      success: true,
      count: formattedActivity.length,
      data: formattedActivity
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching recent activity',
      error: error.message
    });
  }
};
