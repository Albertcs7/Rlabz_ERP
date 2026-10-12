import { DashboardLayout } from '@/core/layouts/DashboardLayout.js';
import { useAuthStore } from '@/core/stores/auth.js';
import '../dashboard/dashboard.css';

export async function DeveloperLayout(contentChild, route, router) {
  // Render global layout first
  const layoutElement = await DashboardLayout(contentChild, route, router);

  const authStore = useAuthStore();

  // Set topbar user profile display to say "Developer"
  const userNameEl = layoutElement.querySelector('.topbar .user-name');
  if (userNameEl) {
    if (userNameEl.textContent.includes('Director & Co-ordinator') || userNameEl.textContent.trim() === 'Director') {
      userNameEl.textContent = 'Developer';
    }
  }

  // Ensure topbar title is always DEVELOPER DASHBOARD
  const topbarTitleEl = layoutElement.querySelector('.topbar-title');
  if (topbarTitleEl) {
    topbarTitleEl.textContent = 'DEVELOPER DASHBOARD';
  }

  const sidebarNav = layoutElement.querySelector('.sidebar-nav');
  if (sidebarNav) {
    const iconOverview = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>`;
    const iconProjects = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    const iconStudents = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
    const iconClients = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
    const iconFinance = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
    const iconAudit = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;

    const navItems = [
      { title: 'Developer Overview', path: '/developer', icon: iconOverview },
      { title: 'Projects & Proposals', path: '/developer/projects', icon: iconProjects },
      { title: 'Student Track Roster', path: '/developer/students', icon: iconStudents },
      { title: 'Client Requirements', path: '/developer/clients', icon: iconClients },
      { title: 'Finance & Payroll (Read-Only)', path: '/developer/finance', icon: iconFinance },
      { title: 'System Audit Log', path: '/developer/audit', icon: iconAudit }
    ];

    const currentPath = window.location.pathname;

    const navHTML = `
      <div class="sidebar-section-title" style="padding: 0.75rem 1.25rem 0.25rem; font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">
        Developer Operations
      </div>
      <ul>
        ${navItems.map(item => {
          const isActive = (item.path === '/developer' && (currentPath === '/developer' || currentPath === '/developer/' || currentPath === '/dashboard' || currentPath === '/dashboard/')) || 
                           (item.path !== '/developer' && (currentPath.startsWith(item.path) || currentPath.startsWith(item.path.replace('/developer', '/dashboard'))));
          return `
            <li>
              <a href="${item.path}" class="${isActive ? 'active' : ''}">
                ${item.icon}
                <span>${item.title}</span>
              </a>
            </li>
          `;
        }).join('')}
      </ul>
    `;

    sidebarNav.innerHTML = navHTML;
    sidebarNav.dataset.portal = 'developer';
  }

  return layoutElement;
}
