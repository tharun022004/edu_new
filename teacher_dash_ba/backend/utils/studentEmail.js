/**
 * Normalize student email for lookups and storage (must match student portal login).
 */
function normalizeStudentEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function displayNameFromEmail(email) {
  const normalized = normalizeStudentEmail(email);
  if (!normalized) return 'Student';
  const local = normalized.split('@')[0] || 'Student';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

module.exports = {
  normalizeStudentEmail,
  displayNameFromEmail
};
