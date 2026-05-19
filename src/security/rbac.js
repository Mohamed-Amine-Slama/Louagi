export const Roles = {
  PASSENGER: 'passenger',
  DRIVER: 'driver',
  ADMIN: 'admin',
};

const matrix = {
  'rides:search': ['passenger', 'driver', 'admin'],
  'rides:book': ['passenger'],
  'rides:create': ['driver'],
  'rides:manage': ['driver', 'admin'],
  'rides:cancel:any': ['admin'],
  'admin:read': ['admin'],
  'admin:verify-driver': ['admin'],
  'admin:suspend-user': ['admin'],
  'admin:refund': ['admin'],
  'admin:impersonate': ['admin'],
  'driver:earnings': ['driver'],
  'profile:self': ['passenger', 'driver', 'admin'],
};

export function can(role, action) {
  return matrix[action]?.includes(role) ?? false;
}

// Admin IP allowlist simulation. Production lives at the API gateway.
const ADMIN_ALLOWLIST = new Set(['127.0.0.1', '::1', '10.0.0.0/8', 'dev-local']);

export function isAdminIpAllowed(ip) {
  if (!ip) return false;
  return ADMIN_ALLOWLIST.has(ip);
}
