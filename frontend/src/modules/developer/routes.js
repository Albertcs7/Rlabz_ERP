import { DeveloperLayout } from './DeveloperLayout.js';

const developerChildren = [
  {
    path: '',
    name: 'developer-dashboard-home',
    title: 'DEVELOPER DASHBOARD',
    component: () => import('./views/DeveloperHome.js')
  },
  {
    path: 'projects',
    name: 'developer-dashboard-projects',
    title: 'DEVELOPER DASHBOARD',
    component: () => import('./views/DeveloperProjects.js')
  },
  {
    path: 'projects/create',
    name: 'developer-dashboard-projects-create',
    title: 'DEVELOPER DASHBOARD',
    component: () => import('@/modules/project/views/ProjectCreate.js')
  },
  {
    path: 'projects/:id',
    name: 'developer-dashboard-projects-details',
    title: 'DEVELOPER DASHBOARD',
    component: () => import('@/modules/project/views/ProjectDetails.js')
  },
  {
    path: 'students',
    name: 'developer-dashboard-students',
    title: 'DEVELOPER DASHBOARD',
    component: () => import('./views/DeveloperStudents.js')
  },
  {
    path: 'students/:id',
    name: 'developer-dashboard-student-detail',
    title: 'DEVELOPER DASHBOARD',
    component: () => import('./views/DeveloperStudentDetail.js')
  },
  {
    path: 'clients',
    name: 'developer-dashboard-clients',
    title: 'DEVELOPER DASHBOARD',
    component: () => import('./views/DeveloperClients.js')
  },
  {
    path: 'finance',
    name: 'developer-dashboard-finance',
    title: 'DEVELOPER DASHBOARD',
    component: () => import('./views/DeveloperFinance.js')
  },
  {
    path: 'audit',
    name: 'developer-dashboard-audit',
    title: 'DEVELOPER DASHBOARD',
    component: () => import('./views/DeveloperAuditLog.js')
  },
  {
    path: 'github',
    name: 'developer-dashboard-github',
    title: 'DEVELOPER DASHBOARD',
    component: () => import('@/modules/github/views/GithubHome.js')
  }
];

const routes = [
  {
    path: '/developer',
    name: 'developer-dashboard',
    title: 'DEVELOPER DASHBOARD',
    component: DeveloperLayout,
    children: developerChildren
  }
];

export default routes;
