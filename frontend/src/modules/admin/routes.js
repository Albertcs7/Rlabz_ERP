import { DashboardLayout } from '@/core/layouts/DashboardLayout.js';

const routes = [
  {
    path: '/admin',
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'admin-users',
        component: () => import('./views/AdminUsers.js'),
        meta: {
          requiresAuth: true,
          moduleName: 'admin',
          allowedRoles: ['admin'],
        }
      },
      {
        path: 'projects',
        name: 'admin-projects',
        component: () => import('@/modules/project/views/ProjectDashboard.js'),
        meta: {
          requiresAuth: true,
          moduleName: 'admin',
          allowedRoles: ['admin'],
        }
      },
      {
        path: 'students',
        name: 'admin-students',
        component: () => import('@/modules/director/views/DirectorStudents.js'),
        meta: {
          requiresAuth: true,
          moduleName: 'admin',
          allowedRoles: ['admin'],
        }
      },
      {
        path: 'students/:id',
        name: 'admin-students-detail',
        component: () => import('@/modules/director/views/DirectorStudentDetail.js'),
        meta: {
          requiresAuth: true,
          moduleName: 'admin',
          allowedRoles: ['admin'],
        }
      }
    ]
  }
];

export default routes;
