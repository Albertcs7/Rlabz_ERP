import { useAuthStore } from '../stores/auth.js';
import { modules } from '../../module-manifest.js';

export function authGuard(to, from, next) {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;
  const defaultRoute = authStore.user?.defaultRoute || (authStore.role === 'admin' ? '/admin' : (authStore.role === 'developer' ? '/developer' : (authStore.role === 'director' ? '/director' : '/dashboard')));

  // 1. Unauthenticated users accessing protected routes -> redirect to /login
  if (to.meta?.requiresAuth && !isAuthenticated) {
    return next('/login');
  }

  // 2. Authenticated users accessing login pages -> redirect to default route
  const isAuthRoute = to.path === '/login' || to.path === '/auth' || to.path === '/auth/login' || to.name === 'login';
  if (isAuthRoute && isAuthenticated) {
    return next(defaultRoute);
  }

  // Admin explicitly does not have access to director or developer dashboards
  if (authStore.role === 'admin' && (to.path.startsWith('/director') || to.path.startsWith('/developer') || to.meta?.moduleName === 'director' || to.meta?.moduleName === 'developer')) {
    return next(defaultRoute);
  }

  // 3. Module permission check for authenticated users
  if (isAuthenticated && to.meta?.moduleName && to.meta.moduleName !== 'auth' && to.meta.moduleName !== 'profile') {
    const allowedModules = authStore.modules;
    
    // Failsafe: if modules array is entirely missing (stale localStorage), force logout
    if (!allowedModules || !Array.isArray(allowedModules)) {
      authStore.logout();
      return next('/login');
    }

    if (!allowedModules.includes(to.meta.moduleName) && !(to.meta.moduleName === 'admin' && (authStore.role === 'admin' || authStore.permissions?.includes('admin.manage_users') || authStore.permissions?.includes('system.admin')))) {
      return next(defaultRoute);
    }

    // Check module-level role restrictions from manifest
    const targetModule = modules.find(m => m.name === to.meta.moduleName);
    const hasAdminPerm = to.meta?.moduleName === 'admin' && (authStore.role === 'admin' || authStore.permissions?.includes('admin.manage_users') || authStore.permissions?.includes('system.admin'));
    if (targetModule && targetModule.allowedRoles && !targetModule.allowedRoles.includes(authStore.role) && !hasAdminPerm) {
      return next(defaultRoute);
    }
  }

  // 4. Specific granular permissions check
  if (to.meta?.requiredPermissions && isAuthenticated) {
    const userPermissions = authStore.permissions || [];
    const hasPermission = to.meta.requiredPermissions.every(p =>
      userPermissions.includes(p)
    );
    if (!hasPermission) {
      return next(defaultRoute);
    }
  }

  next();
}
