/**
 * Multi-Tenant User Scope & Ownership Utility
 */

/**
 * Returns Mongoose query criteria based on authenticated user and role.
 * - Admin: If req.query.userId is provided and != 'all', filters by user. Otherwise global filter {}.
 * - Chemist / Regular User: ALWAYS scoped strictly to req.user._id.
 */
const getUserScope = (req, targetParam = 'userId') => {
  if (!req.user) return {};

  const isAdmin = req.user.role && (req.user.role.name === 'Admin' || req.user.role.name === 'Super Admin');
  
  if (isAdmin) {
    const requestedUser = req.query[targetParam] || (req.body && req.body[targetParam]);
    if (requestedUser && requestedUser !== 'all') {
      return { user: requestedUser };
    }
    return {}; // Super Admin sees all data when no specific chemist requested
  }

  // Chemist is strictly locked to their own account
  return { user: req.user._id };
};

/**
 * Verifies if the authenticated user owns the document (or is Admin).
 * Returns true if owner/admin, false otherwise.
 */
const verifyOwnership = (req, document, userField = 'user') => {
  if (!req.user || !document) return false;

  const isAdmin = req.user.role && (req.user.role.name === 'Admin' || req.user.role.name === 'Super Admin');
  if (isAdmin) return true;

  const docUserId = document[userField] ? (document[userField]._id || document[userField]).toString() : null;
  return docUserId === req.user._id.toString();
};

module.exports = {
  getUserScope,
  verifyOwnership
};
