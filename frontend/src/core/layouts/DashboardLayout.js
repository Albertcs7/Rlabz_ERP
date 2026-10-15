import { useAuthStore } from '../stores/auth.js';
import { modules } from '../../module-manifest.js';
import { API_BASE } from '../config/api.js';
import { profilePhotoUrl, applyHeaderAvatar, rememberProfilePhoto } from '../shared/profilePhoto.js';

// Primary profile page per role; roles without their own page use the shared /profile.
const ROLE_PROFILE_ROUTES = {
  coordinator: '/coordinator/profile',
  faculty: '/faculty/profile',
  student: '/student/profile',
};

const BELL_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;

function formatNotificationTime(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

async function fetchNotifications() {
  const token = localStorage.getItem('token');
  if (!token) return [];
  try {
    const resp = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return [];
    const body = await resp.json().catch(() => ({}));
    return Array.isArray(body?.data) ? body.data : [];
  } catch (e) {
    return [];
  }
}

function renderNotificationList(notifications) {
  if (!notifications.length) {
    return `<p class="noti-empty">No notifications.</p>`;
  }

  return notifications.map((n) => {
    const unread = !n.is_read;
    return `
      <div class="noti-item" data-id="${n.id}" data-unread="${unread ? '1' : '0'}" data-urgency="${n.urgency || ''}">
        <span class="noti-item-dot"></span>
        <span>
          <span class="noti-item-message">${n.message}</span>
          <span class="noti-item-meta">${n.project?.title ? `${n.project.title} &bull; ` : ''}${formatNotificationTime(n.created_at)}</span>
        </span>
      </div>
    `;
  }).join('');
}

function populateSidebarNav(sidebarNav, currentPath, authStore) {
  if (!sidebarNav) return;

  const isStudent = authStore.role === 'student' || currentPath.startsWith('/student');
  const isDeveloper = authStore.role === 'developer' || currentPath.startsWith('/developer');
  const isDirector = authStore.role === 'director' || currentPath.startsWith('/director');
  const isDesignHead = authStore.role === 'design_head' || currentPath.startsWith('/design');
  const isAdmin = authStore.role === 'admin' || currentPath.startsWith('/admin');

  let targetPortal = 'default';
  if (isStudent) {
    targetPortal = 'student';
  } else if (isAdmin) {
    targetPortal = 'admin';
  } else if (isDeveloper) {
    targetPortal = 'developer';
  } else if (isDirector) {
    targetPortal = 'director';
  } else if (isDesignHead) {
    targetPortal = 'design';
  }

  if (sidebarNav.dataset.portal !== targetPortal || (targetPortal === 'student' && !sidebarNav.querySelector('a[href="/student/work-logs"]'))) {
    sidebarNav.dataset.portal = targetPortal;
    if (targetPortal === 'student') {
      sidebarNav.innerHTML = `
        <ul>
          <li>
            <a href="/student">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              </svg>
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a href="/student/projects">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>My Projects</span>
            </a>
          </li>
          <li>
            <a href="/student/reports">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="9" y1="18" x2="15" y2="18"></line>
                <line x1="10" y1="14" x2="14" y2="14"></line>
                <path d="M21 16V8a2 2 0 0 0-1.95-2H20a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2h.05A2 2 0 0 0 2 8v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2z"></path>
              </svg>
              <span>Progress Reports</span>
            </a>
          </li>
          <li>
            <a href="/student/work-logs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Work Logs</span>
            </a>
          </li>
          <li>
            <a href="/student/certificates">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
              <span>Certificates</span>
            </a>
          </li>
          <li>
            <a href="/student/meetings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Meetings</span>
            </a>
          </li>
          <li>
            <a href="/student/github">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
              <span>GitHub</span>
            </a>
          </li>
          <li>
            <a href="/student/chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Chat</span>
            </a>
          </li>
        </ul>
      `;
    } else if (targetPortal === 'developer') {
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

      sidebarNav.innerHTML = `
        <div class="sidebar-section-title" style="padding: 0.75rem 1.25rem 0.25rem; font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">
          Developer Operations
        </div>
        <ul>
          ${navItems.map(item => `
            <li>
              <a href="${item.path}">
                ${item.icon}
                <span>${item.title}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      `;
    } else if (targetPortal === 'director') {
      const iconOverview = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>`;
      const iconProjects = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
      const iconStudents = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
      const iconClients = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
      const iconFinance = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
      const iconAudit = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;

      const navItems = [
        { title: 'Executive Overview', path: '/director', icon: iconOverview },
        { title: 'Projects & Proposals', path: '/director/projects', icon: iconProjects },
        { title: 'Student Track Roster', path: '/director/students', icon: iconStudents },
        { title: 'Client Requirements', path: '/director/clients', icon: iconClients },
        { title: 'Finance & Payroll (Read-Only)', path: '/director/finance', icon: iconFinance },
        { title: 'System Audit Log', path: '/director/audit', icon: iconAudit }
      ];

      sidebarNav.innerHTML = `
        <div class="sidebar-section-title" style="padding: 0.75rem 1.25rem 0.25rem; font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">
          Director Workspace
        </div>
        <ul>
          ${navItems.map(item => `
            <li>
              <a href="${item.path}">
                ${item.icon}
                <span>${item.title}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      `;
    } else if (targetPortal === 'design') {
      const iconStudio = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`;
      const iconProjects = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
      const iconProfile = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      const iconCommunication = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

      const navItems = [
        { title: 'Design Studio', path: '/design', icon: iconStudio },
        { title: 'Projects & Prototypes', path: '/projects', icon: iconProjects },
        { title: 'Team Communication', path: '/communication', icon: iconCommunication },
        { title: 'My Profile & Security', path: '/profile', icon: iconProfile }
      ];

      sidebarNav.innerHTML = `
        <div class="sidebar-section-title" style="padding: 0.75rem 1.25rem 0.25rem; font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">
          Design Department
        </div>
        <ul>
          ${navItems.map(item => `
            <li>
              <a href="${item.path}">
                ${item.icon}
                <span>${item.title}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      `;
    } else if (targetPortal === 'admin') {
      const iconUsers = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
      const iconProjects = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
      const iconStudents = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>`;

      const navItems = [
        { title: 'User Management', path: '/admin', icon: iconUsers },
        { title: 'Projects', path: '/projects', icon: iconProjects },
        { title: 'Students', path: '/admin/students', icon: iconStudents }
      ];

      sidebarNav.innerHTML = `
        <div class="sidebar-section-title" style="padding: 0.75rem 1.25rem 0.25rem; font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">
          System Administration
        </div>
        <ul>
          ${navItems.map(item => `
            <li>
              <a href="${item.path}">
                ${item.icon}
                <span>${item.title}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      const iconsMap = {
        IconAdmin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
        IconDashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>`,
        IconCoordinator: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
        IconFaculty: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
        IconFinance: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
        IconStudent: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>`,
        IconProjects: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
        IconCommunication: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
        IconGithub: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>`,
        IconCertificates: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`,
        IconAudit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
        IconDesign: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`
      };

      const userAllowedModules = authStore.modules || [];
      const availableModules = modules.filter(m => {
        if (!m.sidebar) return false;
        if (!userAllowedModules.includes(m.name)) return false;
        if (m.allowedRoles && !m.allowedRoles.includes(authStore.role)) return false;
        return true;
      });

      const navLinksHTML = availableModules.map(mod => {
        const isActive = currentPath.startsWith(mod.path);
        const iconSvg = iconsMap[mod.icon] || iconsMap.IconDashboard;
        return `
          <li>
            <a href="${mod.path}" class="${isActive ? 'active' : ''}">
              ${iconSvg}
              <span>${mod.title}</span>
            </a>
          </li>
        `;
      }).join('');

      sidebarNav.innerHTML = `<ul>${navLinksHTML}</ul>`;
    }
  }

  // Update active css classes on matching sidebar link
  sidebarNav.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    if (href) {
      let isActive = false;
      if (href === '/admin' || href === '/developer' || href === '/director' || href === '/student' || href === '/' || href === '/dashboard') {
        isActive = currentPath === href || currentPath === href + '/';
      } else {
        isActive = currentPath === href || currentPath.startsWith(href + '/') ||
          (href === '/projects' && (currentPath.startsWith('/projects') || currentPath.startsWith('/admin/projects'))) ||
          (href === '/admin/students' && (currentPath.startsWith('/admin/students') || currentPath.startsWith('/director/students'))) ||
          (href.startsWith('/developer/') && currentPath.startsWith(href.replace('/developer', '/dashboard'))) ||
          (href.startsWith('/director/') && currentPath.startsWith(href.replace('/director', '/dashboard')));
      }
      if (isActive) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    }
  });
}

export function updateSidebar(currentPath) {
  const sidebarNav = document.querySelector('.sidebar-nav');
  if (!sidebarNav) return;
  const authStore = useAuthStore();
  populateSidebarNav(sidebarNav, currentPath, authStore);
}

// Kept for existing callers (StudentSidebar, UserProfile); the implementation
// lives in core/shared/profilePhoto.js so there is one header-avatar code path.
export function updateTopBarAvatar(photoUrl, name) {
  const authStore = useAuthStore();
  const displayName = name || authStore.user?.name || authStore.user?.username || 'User';
  applyHeaderAvatar(document, photoUrl || null, displayName);
}

export async function DashboardLayout(contentChild, route, router) {
  const authStore = useAuthStore();
  const currentPath = window.location.pathname;

  const user = authStore.user;
  const isStudent = authStore.role === 'student';
  const isStudentPortal = isStudent || currentPath.startsWith('/student');
  const wrapper = document.createElement('div');
  wrapper.className = `dashboard-layout animate-fade-in${isStudentPortal ? ' student-layout' : ''}`;
  const studentIdentifier = user ? (user.id || user.email || user.username || user.name) : null;
  const studentPhoto = (isStudent && studentIdentifier)
    ? (localStorage.getItem(`student_profile_photo_${String(studentIdentifier).toLowerCase().trim()}`) || user?.avatar || null)
    : null;
  const displayName = user?.name || user?.username || 'User';
  const roleName = authStore.role ? authStore.role.replace('_', ' ').toUpperCase() : 'MEMBER';
  const initial = displayName.charAt(0).toUpperCase();
  // Other roles use the server-side profile photo (users.profile_photo_path):
  // render the cached URL immediately, then refresh it from the API below.
  const headerPhoto = isStudent ? studentPhoto : (user?.profile_photo_url || null);

  const designation = user?.designation || (isStudent ? 'Nova' : roleName);
  const email = user?.email || 'student@rajagiri.edu';
  const department = user?.department || 'Computer Applications';
  const course = user?.course || (isStudent ? 'MCA' : null);
  const semester = user?.semester_text || (user?.semester ? `${user.semester}th Semester` : (isStudent ? '2nd Year / 3rd Semester' : null));

  const isDeveloperUser = authStore.role === 'developer' || currentPath.startsWith('/developer') || (route.name && route.name.includes('developer'));
  const isDirectorUser = authStore.role === 'director' || currentPath.startsWith('/director') || (route.name && route.name.includes('director'));
  const isDesignUser = authStore.role === 'design_head' || currentPath.startsWith('/design') || (route.name && route.name.includes('design'));
  const isProfilePage = currentPath.startsWith('/profile') || route.name === 'user-profile';

  let topbarTitle = 'RLABZ ERP';
  if (isDeveloperUser) {
    topbarTitle = 'DEVELOPER DASHBOARD';
  } else if (isDirectorUser) {
    topbarTitle = 'DIRECTOR DASHBOARD';
  } else if (isDesignUser && !isProfilePage) {
    topbarTitle = 'DESIGN STUDIO & ASSETS';
  } else if (isProfilePage) {
    topbarTitle = 'MY PROFILE & SECURITY';
  } else {
    topbarTitle = route.title || (route.name === 'faculty-sprints' ? 'PROJECT MODULES & TASKS' : (route.name ? route.name.toUpperCase().replace(/-/g, ' ') : 'RLABZ ERP'));
  }

  wrapper.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo" id="sidebar-logo-link" role="link" tabindex="0" title="Go to dashboard" style="cursor: pointer;">
          <img src="/assets/Rlabz_Logo_dark.png" alt="RLabZ ERP" class="sidebar-watermark" style="height: 84px; width: auto;" />
        </div>
      </div>
      <nav class="sidebar-nav">
      </nav>
    </aside>

    <div class="main-wrapper">
      <header class="topbar">
        <div class="topbar-title">${topbarTitle}</div>
        <div style="display:flex; align-items:center; gap:0.85rem;">
          ${!isStudentPortal ? `
          <div class="notification-container">
            <button id="noti-bell-btn" class="noti-bell-btn" title="Notifications" aria-label="Notifications">
              ${BELL_ICON}
              <span id="noti-badge" class="noti-badge"></span>
            </button>

            <div id="noti-dropdown" class="noti-dropdown">
              <div class="noti-dropdown-header">
                <h4>Notifications</h4>
              </div>
              <div id="noti-list-container" class="noti-list-container"><p class="noti-empty">Loading...</p></div>
            </div>
          </div>
          ` : ''}

        <div class="user-profile" id="user-profile-header">
          <div class="avatar" style="${headerPhoto ? 'padding: 0; overflow: hidden;' : ''}">
            ${headerPhoto ? `<img src="${headerPhoto}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" />` : initial}
          </div>
          <div class="user-details">
            <span class="user-name">${displayName}</span>
            <span class="user-role" style="color: var(--primary-accent); font-weight: 600;">${roleName}</span>
          </div>
          
          <!-- Floating Profile Popover -->
          <div class="profile-popover" id="profile-popover">
            <div class="profile-popover-header">
              <div class="profile-popover-avatar" id="popover-avatar" style="${headerPhoto ? 'padding: 0; overflow: hidden;' : ''}">
                ${headerPhoto ? `<img src="${headerPhoto}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" />` : initial}
              </div>
              <div class="profile-popover-meta">
                <span class="profile-popover-name" id="popover-name">${displayName}</span>
                <span class="profile-popover-role" id="popover-role">${roleName}</span>
              </div>
            </div>
            <div class="profile-popover-body">
              <div class="profile-popover-row">
                <span class="profile-popover-label">Designation:</span>
                <span class="profile-popover-value" id="popover-designation" style="font-weight: 700;">${designation}</span>
              </div>
              <div class="profile-popover-row">
                <span class="profile-popover-label">Email:</span>
                <span class="profile-popover-value" id="popover-email">${email}</span>
              </div>
              <div class="profile-popover-row">
                <span class="profile-popover-label">Department:</span>
                <span class="profile-popover-value" id="popover-department">${department}</span>
              </div>
              ${course ? `
              <div class="profile-popover-row">
                <span class="profile-popover-label">Course:</span>
                <span class="profile-popover-value" id="popover-course">${course}</span>
              </div>` : ''}
              ${semester ? `
              <div class="profile-popover-row">
                <span class="profile-popover-label">Semester:</span>
                <span class="profile-popover-value" id="popover-semester">${semester}</span>
              </div>` : ''}
            </div>
            <div class="profile-popover-footer" style="padding: 10px 14px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end;">
              <a href="/profile" id="popover-profile-link" style="font-size: 0.8rem; font-weight: 600; color: #059669; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                Profile Settings & Change Password &rarr;
              </a>
            </div>
          </div>
        </div>
        
        <button id="logout-btn" class="logout-icon-btn" title="Logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
        </div>
      </header>

      <main class="content-outlet${isStudentPortal ? ' student-content-outlet' : ''}" id="layout-outlet"></main>
    </div>
  `;

  // Populate sidebar navigation
  const sidebarNav = wrapper.querySelector('.sidebar-nav');
  populateSidebarNav(sidebarNav, currentPath, authStore);

  // Notification bell — role-agnostic, reused across every dashboard layout.
  const bellBtn = wrapper.querySelector('#noti-bell-btn');
  const notiDropdown = wrapper.querySelector('#noti-dropdown');
  const notiListContainer = wrapper.querySelector('#noti-list-container');
  const notiBadge = wrapper.querySelector('#noti-badge');

  function updateBadge(notifications) {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    if (unreadCount > 0) {
      notiBadge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
      notiBadge.style.display = 'flex';
    } else {
      notiBadge.style.display = 'none';
    }
  }

  function positionDropdown() {
    const rect = bellBtn.getBoundingClientRect();
    const dropdownWidth = notiDropdown.offsetWidth || 360;
    // Anchor under the bell, right-aligned to it, clamped so it never runs off
    // either edge of the viewport (important on narrow screens).
    let left = rect.right - dropdownWidth;
    left = Math.max(12, Math.min(left, window.innerWidth - dropdownWidth - 12));
    notiDropdown.style.top = `${rect.bottom + 8}px`;
    notiDropdown.style.left = `${left}px`;
  }

  function closeDropdown() {
    notiDropdown.style.display = 'none';
  }

  function bindNotificationItems(notifications) {
    notiListContainer.querySelectorAll('.noti-item[data-unread="1"]').forEach((item) => {
      item.addEventListener('click', async () => {
        const id = item.dataset.id;
        const token = localStorage.getItem('token');
        try {
          await fetch(`${API_BASE}/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
          });
        } catch (e) {
          // ignore — visual state still updates locally below
        }
        const notification = notifications.find((n) => String(n.id) === String(id));
        if (notification) notification.is_read = true;
        notiListContainer.innerHTML = renderNotificationList(notifications);
        bindNotificationItems(notifications);
        updateBadge(notifications);
      });
    });
  }

  if (bellBtn && notiDropdown) {
    fetchNotifications().then((notifications) => {
      updateBadge(notifications);
      notiListContainer.innerHTML = renderNotificationList(notifications);
      bindNotificationItems(notifications);
    });

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      closeDropdown();
      const notiRoute = (currentPath.startsWith('/faculty') || authStore.role === 'faculty')
        ? '/faculty/notifications'
        : `/${authStore.role || 'faculty'}/notifications`;
      if (router && typeof router.push === 'function') {
        router.push(notiRoute);
      } else {
        window.location.href = notiRoute;
      }
    });

    notiDropdown.addEventListener('click', (e) => e.stopPropagation());

    // Bell position is static while the dropdown is open (the app shell doesn't
    // scroll as a whole — only #layout-outlet does), so closing on resize avoids
    // a stale, misplaced dropdown rather than needing continuous repositioning.
    window.addEventListener('resize', closeDropdown);

    document.addEventListener('click', (e) => {
      if (notiDropdown.style.display === 'block' && !notiDropdown.contains(e.target) && e.target !== bellBtn) {
        closeDropdown();
      }
    });
  }

  // Attach Content Child
  const outlet = wrapper.querySelector('#layout-outlet');
  if (contentChild) {
    if (typeof contentChild === 'function') {
      const childEl = await contentChild(route, router);
      outlet.appendChild(childEl);
    } else {
      outlet.appendChild(contentChild);
    }
  }

  // Bind Logout
  const logoutBtn = wrapper.querySelector('#logout-btn');
  logoutBtn?.addEventListener('click', () => {
    authStore.logout();
    router.push('/auth/login');
  });

  // Bind sidebar logo click — goes to the current role's own dashboard
  // (same role→route mapping AuthController::respondWithToken() already
  // sends down as `user.defaultRoute`), never a generic/other-role page.
  const ROLE_HOME_ROUTES = {
    director: '/dashboard',
    coordinator: '/coordinator',
    finance: '/finance',
    faculty: '/faculty',
    student: '/student',
  };
  const sidebarLogoLink = wrapper.querySelector('#sidebar-logo-link');
  const goToDashboard = () => {
    const target = authStore.user?.defaultRoute || ROLE_HOME_ROUTES[authStore.role] || '/';
    router.push(target);
  };
  sidebarLogoLink?.addEventListener('click', goToDashboard);
  sidebarLogoLink?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToDashboard();
    }
  });

  // Bind User Profile Header Click
  const userProfileHeader = wrapper.querySelector('#user-profile-header');
  const profilePopover = wrapper.querySelector('#profile-popover');
  if (userProfileHeader && profilePopover) {
    userProfileHeader.style.cursor = 'pointer';
    userProfileHeader.title = 'View Profile & Settings';

    userProfileHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = window.getComputedStyle(profilePopover).display === 'block';
      profilePopover.style.display = isVisible ? 'none' : 'block';
    });

    // Close popover when clicking anywhere else
    document.addEventListener('click', () => {
      profilePopover.style.display = 'none';
    });

    // Prevent popover inside click from closing it
    profilePopover.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const popoverProfileLink = profilePopover.querySelector('#popover-profile-link');
    if (popoverProfileLink) {
      popoverProfileLink.addEventListener('click', (e) => {
        e.preventDefault();
        profilePopover.style.display = 'none';
        const profileRoute = ROLE_PROFILE_ROUTES[authStore.role] || '/profile';
        if (router && typeof router.push === 'function') {
          router.push(profileRoute);
        } else {
          window.location.href = profileRoute;
        }
      });
    }

    // Sync live profile from database
    const token = localStorage.getItem('token');
    if (token) {
      const endpoint = authStore.role === 'student' ? `${API_BASE}/student/profile` : `${API_BASE}/auth/profile`;
      fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (!res) return;
        const p = res.user || res;
        const desEl = wrapper.querySelector('#popover-designation');
        const emailEl = wrapper.querySelector('#popover-email');
        const deptEl = wrapper.querySelector('#popover-department');
        const courseEl = wrapper.querySelector('#popover-course');
        const semEl = wrapper.querySelector('#popover-semester');
        const nameEl = wrapper.querySelector('#popover-name');
        
        if (desEl && (p.designation || p.role)) desEl.textContent = p.designation || (p.role ? p.role.replace('_', ' ').toUpperCase() : 'MEMBER');
        if (emailEl && p.email) emailEl.textContent = p.email;
        if (deptEl && p.department) deptEl.textContent = p.department;
        if (courseEl && p.course) courseEl.textContent = p.course;
        if (semEl && (p.semester_text || p.semester)) {
          semEl.textContent = p.semester_text || `${p.semester}th Semester`;
        }
        if (nameEl && p.name) nameEl.textContent = p.name;

        if (user) {
          user.name = p.name || user.name;
          user.department = p.department || user.department;
          if (p.designation) user.designation = p.designation;
          localStorage.setItem('user', JSON.stringify(user));
        }

        // Non-student roles: the header photo comes only from profile_photo_path
        // (returned by /auth/profile). Students keep their existing photo source.
        if (!isStudent && 'profile_photo_path' in p) {
          const photoUrl = profilePhotoUrl(p.profile_photo_path);
          rememberProfilePhoto(photoUrl);
          applyHeaderAvatar(wrapper, photoUrl, p.name || displayName);
        }
      })
      .catch(() => {});
    }
  }

  return wrapper;
}
