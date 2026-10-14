import { DashboardLayout } from '@/core/layouts/DashboardLayout.js';

const routes = [
  {
    path: '/profile',
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'user-profile',
        component: () => import('./views/UserProfile.js')
      }
    ]
  }
];

export default routes;
