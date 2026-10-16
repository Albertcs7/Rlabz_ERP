import { DashboardLayout } from '@/core/layouts/DashboardLayout.js';

const routes = [
  {
    path: '/student',
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'student-dashboard',
        component: () => import('./views/StudentDashboard.js')
      },
      {
        path: 'projects',
        name: 'student-projects',
        component: () => import('./views/StudentProjects.js')
      },
      {
        path: 'projects/:id',
        name: 'student-projects-details',
        component: () => import('./views/StudentProjects.js')
      },
      {
        path: 'reports',
        name: 'student-reports',
        component: () => import('./views/StudentReports.js')
      },
      {
        path: 'work-logs',
        name: 'student-work-logs',
        component: () => import('./views/StudentWorkLogs.js')
      },
      {
        path: 'certificates',
        name: 'student-certificates',
        component: () => import('./views/StudentCertificates.js')
      },
      {
        path: 'meetings',
        name: 'student-meetings',
        component: () => import('./views/StudentMeetings.js')
      },
      {
        path: 'github',
        name: 'student-github',
        component: () => import('./views/StudentGithub.js')
      },
      {
        path: 'chat',
        name: 'student-chat',
        component: () => import('./views/StudentChat.js')
      },
      {
        path: 'notifications',
        name: 'student-notifications',
        title: 'ACTION ITEMS & NOTIFICATIONS',
        component: () => import('./views/StudentNotifications.js')
      },
      {
        path: 'design',
        name: 'student-design',
        title: 'STUDENT DESIGN WORKSPACE',
        component: () => import('./views/StudentDesign.js')
      },
      {
        path: 'design/:id',
        name: 'student-design-ticket',
        title: 'STUDENT DESIGN WORKSPACE',
        component: () => import('./views/StudentDesign.js')
      },
      {
        path: 'profile',
        name: 'student-profile',
        title: 'STUDENT PROFILE & SETTINGS',
        component: () => import('./views/StudentProfile.js')
      }
    ]
  }
];

export default routes;
