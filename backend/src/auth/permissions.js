
const ROLE_HIERARCHY = {
  student: 1,
  instructor: 2,
  admin: 3
};

const PERMISSIONS = {
  ROOM_CREATE: 'student',
  EXPERIMENT_ROLLBACK: 'instructor',
  EXPERIMENT_SAVE: 'student',
  MANAGE_USERS: 'admin'
};

function hasPermission(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

const canCreateRoom = (role) => hasPermission(role, PERMISSIONS.ROOM_CREATE);
const canManageExperiment = (role) => hasPermission(role, PERMISSIONS.EXPERIMENT_ROLLBACK);
const canSaveExperiment = (role) => hasPermission(role, PERMISSIONS.EXPERIMENT_SAVE);

module.exports = {
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasPermission,
  canCreateRoom,
  canManageExperiment,
  canSaveExperiment
};
