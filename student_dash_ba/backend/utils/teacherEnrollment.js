const TEACHER_API_URL = () => process.env.TEACHER_API_URL || 'http://localhost:5001';

function classIdFromEnrollment(entry) {
  if (!entry) return null;
  if (entry.class) {
    if (typeof entry.class === 'object') {
      return (entry.class._id || entry.class.id || entry.class).toString();
    }
    return entry.class.toString();
  }
  if (entry._id) return entry._id.toString();
  if (entry.id) return entry.id.toString();
  return null;
}

function mergeEnrollments(existing, incoming) {
  const byClassId = new Map();
  for (const entry of [...existing, ...incoming]) {
    const classId = classIdFromEnrollment(entry);
    if (classId && !byClassId.has(classId)) {
      byClassId.set(classId, entry);
    }
  }
  return Array.from(byClassId.values());
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

async function fetchEnrollmentsFromTeacher(identifier) {
  const response = await fetch(
    `${TEACHER_API_URL()}/api/classes/student/${encodeURIComponent(identifier)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.warn('Teacher enrollment lookup failed:', {
      identifier,
      status: response.status,
      message: body.message
    });
    return [];
  }

  const payload = await response.json();
  return payload.data || (payload.success ? payload.data || [] : []);
}

/**
 * Load classes for a student portal user. Email is the canonical key (portal login).
 */
async function fetchStudentEnrollments({ email, id }) {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail) {
    try {
      const byEmail = await fetchEnrollmentsFromTeacher(normalizedEmail);
      if (byEmail.length > 0) {
        return byEmail;
      }
    } catch (err) {
      console.warn('Could not fetch classes by email:', err.message);
    }
  }

  if (id) {
    try {
      return await fetchEnrollmentsFromTeacher(id.toString());
    } catch (err) {
      console.warn('Could not fetch classes by id:', err.message);
    }
  }

  return [];
}

function extractEnrolledClassIds(enrollments) {
  return enrollments.map(classIdFromEnrollment).filter(Boolean);
}

module.exports = {
  fetchStudentEnrollments,
  extractEnrolledClassIds,
  classIdFromEnrollment,
  mergeEnrollments
};
