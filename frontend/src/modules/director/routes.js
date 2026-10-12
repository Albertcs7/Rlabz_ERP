import { DirectorLayout } from './DirectorLayout.js';

const directorChildren = [
  {
    path: '',
    name: 'director-dashboard-home',
    title: 'DIRECTOR DASHBOARD',
    component: () => import('./views/DirectorHome.js')
  },
  {
    path: 'projects',
    name: 'director-dashboard-projects',
    title: 'DIRECTOR DASHBOARD',
    component: () => import('./views/DirectorProjects.js')
  },
  {
    path: 'projects/create',
    name: 'director-dashboard-projects-create',
    title: 'DIRECTOR DASHBOARD',
    component: () => import('@/modules/project/views/ProjectCreate.js')
  },
  {
    path: 'projects/:id',
    name: 'director-dashboard-projects-details',
    title: 'DIRECTOR DASHBOARD',
    component: () => import('@/modules/project/views/ProjectDetails.js')
  },
  {
    path: 'students',
    name: 'director-dashboard-students',
    title: 'DIRECTOR DASHBOARD',
    component: () => import('./views/DirectorStudents.js')
  },
  {
    path: 'students/:id',
    name: 'director-dashboard-student-detail',
    title: 'DIRECTOR DASHBOARD',
    component: () => import('./views/DirectorStudentDetail.js')
  },
  {
    path: 'clients',
    name: 'director-dashboard-clients',
    title: 'DIRECTOR DASHBOARD',
    component: () => import('./views/DirectorClients.js')
  },
  {
    path: 'finance',
    name: 'director-dashboard-finance',
    title: 'DIRECTOR DASHBOARD',
    component: () => import('./views/DirectorFinance.js')
  },
  {
    path: 'audit',
    name: 'director-dashboard-audit',
    title: 'DIRECTOR DASHBOARD',
    component: () => import('./views/DirectorAuditLog.js')
  },
  {
    path: 'github',
    name: 'director-dashboard-github',
    title: 'DIRECTOR DASHBOARD',
    component: () => import('@/modules/github/views/GithubHome.js')
  }
];

const routes = [
  {
    path: '/director',
    name: 'director-dashboard',
    title: 'DIRECTOR DASHBOARD',
    component: DirectorLayout,
    children: directorChildren
  }
];

export default routes;
