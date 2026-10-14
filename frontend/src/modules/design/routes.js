import { DashboardLayout } from '@/core/layouts/DashboardLayout.js';

const routes = [
  {
    path: '/design',
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'design-dashboard',
        title: 'DESIGN STUDIO & ASSETS',
        component: () => import('./views/DesignDashboard.js')
      }
    ]
  }
];

export default routes;
