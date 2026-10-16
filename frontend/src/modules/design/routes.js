import { DesignLayout } from './layouts/DesignLayout.js';

const routes = [
  {
    path: '/design',
    component: DesignLayout,
    children: [
      {
        path: '',
        name: 'design-dashboard',
        title: 'DESIGN STUDIO & DASHBOARD',
        component: () => import('./views/DesignDashboard.js').then(m => m.default || m.DesignDashboard)
      },
      {
        path: 'users',
        name: 'design-users',
        title: 'USERS & ROLES',
        component: () => import('./views/DesignUsers.js').then(m => m.default || m.DesignUsers)
      },
      {
        path: 'brand-kit',
        name: 'design-brand-kit',
        title: 'BRAND KIT & GUIDELINES',
        component: () => import('./views/DesignBrandKit.js').then(m => m.default || m.DesignBrandKit)
      },
      {
        path: 'requests',
        name: 'design-requests',
        title: 'DESIGN REQUESTS INTAKE',
        component: () => import('./views/DesignRequests.js').then(m => m.default || m.DesignRequests)
      },
      {
        path: 'scheduling',
        name: 'design-scheduling',
        title: 'ASSIGNMENT & SCHEDULING',
        component: () => import('./views/DesignScheduling.js').then(m => m.default || m.DesignScheduling)
      },
      {
        path: 'tickets',
        name: 'design-tickets',
        title: 'DESIGN TICKETS',
        component: () => import('./views/DesignTickets.js').then(m => m.default || m.DesignTickets)
      },
      {
        path: 'tickets/:id',
        name: 'design-ticket-studio',
        title: 'CREATIVE DELIVERABLE STUDIO',
        component: () => import('./views/DesignTicketStudio.js').then(m => m.default || m.DesignTicketStudio)
      },
      {
        path: 'version-control',
        name: 'design-version-control',
        title: 'VERSION CONTROL & FEEDBACK',
        component: () => import('./views/DesignVersionControl.js').then(m => m.default || m.DesignVersionControl)
      },
      {
        path: 'approvals',
        name: 'design-approvals',
        title: 'APPROVAL & SIGN-OFF',
        component: () => import('./views/DesignApprovals.js').then(m => m.default || m.DesignApprovals)
      },
      {
        path: 'assets',
        name: 'design-assets',
        title: 'ASSET LIBRARY',
        component: () => import('./views/DesignAssets.js').then(m => m.default || m.DesignAssets)
      },
      {
        path: 'notifications',
        name: 'design-notifications',
        title: 'NOTIFICATIONS',
        component: () => import('./views/DesignNotifications.js').then(m => m.default || m.DesignNotifications)
      },
      {
        path: 'reports',
        name: 'design-reports',
        title: 'REPORTS & METRICS',
        component: () => import('./views/DesignReports.js').then(m => m.default || m.DesignReports)
      },
      {
        path: 'audit-log',
        name: 'design-audit-log',
        title: 'AUDIT LOG',
        component: () => import('./views/DesignAuditLog.js').then(m => m.default || m.DesignAuditLog)
      },
      {
        path: 'profile',
        name: 'design-profile',
        title: 'USER PROFILE & SECURITY',
        component: () => import('@/modules/auth/views/UserProfile.js')
      }
    ]
  }
];

export default routes;
