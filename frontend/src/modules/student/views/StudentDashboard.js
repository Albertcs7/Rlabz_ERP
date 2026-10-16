import { renderStudentSidebar } from './StudentSidebar.js';
import {
  fetchLiveDashboard,
  getDashboardData,
  getProjects,
  getMeetings,
  getNotifications,
  getStudentProfile,
  fetchLiveStudentProfile,
  updateStudentTaskStatus,
  markStudentNotificationRead,
  markAllStudentNotificationsRead,
  getStudentProfilePhoto
} from './studentStore.js';
import { useAuthStore } from '@/core/stores/auth.js';
import { StudentSwal, showStudentSuccess, showStudentError } from '../studentAlerts.js';
import '../student.css';

export async function StudentDashboard(route, router) {
  renderStudentSidebar();

  const container = document.createElement('div');
  container.className = 'student-portal-container animate-fade-in student-dashboard-view';

  const authStore = useAuthStore();
  const currentUser = authStore.user;

  // Local state
  let taskFilter = 'all'; // 'all' | 'pending' | 'completed'
  let isSyncing = false;

  // Initial fresh fetch from backend
  await Promise.all([
    fetchLiveDashboard(true),
    fetchLiveStudentProfile().catch(() => null)
  ]);
  renderStudentSidebar();

  function renderNotificationCard(n) {
    const isUnread = !n.is_read && !n.isRead;
    const isUrgent = (n.urgency === 'high' || n.urgency === 'urgent' || (n.type && (n.type.includes('rework') || n.type.includes('rejected'))) || (n.message && n.message.toLowerCase().includes('overdue')));

    let typeNorm = (n.type || 'general').toLowerCase().replace(/_/g, '-');
    if (typeNorm.includes('meeting')) typeNorm = 'meeting';
    else if (typeNorm.includes('task')) typeNorm = 'task';
    else if (typeNorm.includes('module') || typeNorm.includes('sprint')) typeNorm = 'sprint';
    else if (typeNorm.includes('work-log') || typeNorm.includes('worklog')) typeNorm = 'work-log';
    else if (typeNorm.includes('github')) typeNorm = 'github';
    else if (typeNorm.includes('password') || typeNorm.includes('security')) typeNorm = 'security';

    let category = n.category;
    if (!category) {
      if (typeNorm === 'meeting') category = 'Meeting';
      else if (typeNorm === 'task') category = 'Task';
      else if (typeNorm === 'sprint') category = 'Sprint';
      else if (typeNorm === 'work-log') category = 'Work Log';
      else if (typeNorm === 'github') category = 'GitHub';
      else if (typeNorm === 'security') category = 'Security';
      else category = 'General';
    }

    const urgencyTag = isUrgent
      ? '<span class="student-countdown-tag tag-red">Urgent Action</span>'
      : (isUnread ? '<span class="student-countdown-tag tag-amber">Unread</span>' : '<span class="student-countdown-tag tag-slate">Info</span>');

    const cardClass = isUrgent ? 'card-overdue' : (isUnread ? 'card-upcoming' : 'card-info');

    return `
      <div class="student-action-card ${cardClass} ${isUnread ? 'is-unread' : ''}" data-id="${n.id}" data-unread="${isUnread ? '1' : '0'}" title="${isUnread ? 'Click to mark as read' : ''}">
        <div class="student-card-header-row">
          <span class="student-cat-badge student-cat-${typeNorm}">${category}</span>
          ${urgencyTag}
        </div>
        <div class="student-card-msg">${n.message || n.title || ''}</div>
        <div class="student-card-meta">
          <span class="student-project-name">${n.projectName || (n.project ? `Project: ${n.project}` : 'Academic ERP')}</span>
          <span class="student-card-time" style="display: flex; align-items: center; gap: 5px;">
            ${isUnread ? '<span style="width: 7px; height: 7px; border-radius: 50%; background: #059669; display: inline-block;"></span>' : ''}
            ${n.time || 'Recently'}
          </span>
        </div>
      </div>
    `;
  }

  function render() {
    const dashboard = getDashboardData() || {};
    const projects = dashboard.projects || getProjects() || [];
    const tasks = dashboard.tasks || [];
    const modules = dashboard.modules || [];
    const notifications = dashboard.notifications || getNotifications() || [];
    const stats = dashboard.stats || {};
    const unreadCount = notifications.filter(n => !n.is_read && !n.isRead).length;

    const allMeetings = (dashboard.meetings && dashboard.meetings.length > 0)
      ? dashboard.meetings
      : (getMeetings() || []);

    // Filter strictly for UPCOMING meetings from today onwards
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    function getMeetingTime(m) {
      if (!m) return 0;
      if (m.scheduled_at) {
        const t = new Date(m.scheduled_at).getTime();
        if (!isNaN(t)) return t;
      }
      if (m.date) {
        const s = String(m.date).trim();
        const parts = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (parts) {
          const d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), 23, 59, 59);
          return d.getTime();
        }
        const parsed = new Date(s).getTime();
        if (!isNaN(parsed)) return parsed;
      }
      return 0;
    }

    const upcomingMeetings = allMeetings.filter(m => {
      const rawStatus = (m.raw_status || m.status || '').toLowerCase().trim();
      if (rawStatus === 'completed' || rawStatus === 'cancelled' || m.is_completed || m.is_cancelled) {
        return false;
      }
      const mTime = getMeetingTime(m);
      return mTime >= todayStart;
    }).sort((a, b) => getMeetingTime(a) - getMeetingTime(b));

    // Next 3 upcoming meetings and top 2 alerts
    const displayedMeetings = upcomingMeetings.slice(0, 3);
    const displayedNotifications = notifications.slice(0, 2);

    // KPIs
    const activeProjectsCount = stats.activeProjectsCount ?? projects.filter(p => p.status === 'In Progress').length;
    const pendingTasksCount = stats.pendingTasksCount ?? tasks.filter(t => t.rawStatus !== 'completed').length;
    const completedTasksCount = stats.completedTasksCount ?? tasks.filter(t => t.rawStatus === 'completed').length;
    const assignedModulesCount = stats.assignedModulesCount ?? modules.length;
    const upcomingMeetingsCount = upcomingMeetings.length;

    // Display only the latest 3 tasks in the dashboard
    const displayedTasks = tasks.slice(0, 3);

    // Student Designation / Role / Profile Picture (Dashboard only)
    const profile = getStudentProfile() || {};
    const studentName = profile.name || currentUser?.name || currentUser?.username || 'Student';
    const studentEmail = profile.email || currentUser?.email || 'student@rajagiri.edu';
    const studentDesignation = profile.designation || currentUser?.designation || 'Nova';
    const studentCourse = profile.course || currentUser?.course || 'MCA';
    const studentSemester = profile.semester_text || currentUser?.semester_text || '3rd Semester';
    const studentPhoto = getStudentProfilePhoto(currentUser) || profile.avatar || currentUser?.avatar || null;

    const studentInitials = (studentName || 'Student')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'ST';

    // 1. Build Task Rows (Latest 3)
    const taskRows = displayedTasks.map(t => {
      return `
        <tr>
          <td style="max-width: 320px;">
            <div class="student-dash-task-title">${t.title}</div>
            ${t.description ? `<div class="student-dash-task-sub" title="${t.description}">${t.description}</div>` : ''}
            <div class="student-dash-task-pills">
              <span class="student-dash-tag ${t.type === 'module' ? 'module' : 'task'}">
                ${t.type === 'module' ? 'Module / Sprint' : 'Sub-Task'}
              </span>
              <span class="student-dash-tag project">${t.project}</span>
              <span class="student-dash-tag" style="background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0;">${t.module}</span>
            </div>
          </td>
          <td>
            <div style="font-size: 0.825rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              ${t.assignedBy || 'Supervisor'}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // 2. Identify Genuine Bug Fixes & Rework Assigned by Faculty or Coordinator
    const completedProjects = projects.filter(p => (p.status || '').toLowerCase() === 'completed' || p.progress === 100);
    const completedProjectsCount = completedProjects.length;

    const bugFixList = [];
    const seenTaskIds = new Set();

    const allProjectTasks = projects.flatMap(p => {
      const pModules = p.modulesList || p.modules || [];
      return pModules.flatMap(m => (m.tasks || []).map(t => ({
        ...t,
        project: p.title,
        projectId: p.id
      })));
    });

    const combinedStudentTasks = [...allProjectTasks, ...tasks];

    combinedStudentTasks.forEach(t => {
      if (!t.id || seenTaskIds.has(String(t.id))) return;
      
      const isReworkByFaculty = t.isRework === true || (t.reviewStatus && t.reviewStatus.toLowerCase() === 'rejected');

      if (isReworkByFaculty) {
        seenTaskIds.add(String(t.id));
        bugFixList.push({
          id: String(t.id),
          title: t.title,
          project: t.project || 'Academic Project',
          isRework: true,
          status: 'Rework / Fix Required',
          assignedBy: t.assignedBy || 'Faculty / Coordinator'
        });
      }
    });

    const bugFixesCount = bugFixList.length;

    // 3. Build Meeting Items (Next 2 Upcoming Meetings)
    const meetingItems = displayedMeetings.map(m => {
      let day = '—';
      let month = 'MTG';
      if (m.date) {
        const dStr = String(m.date).trim();
        const parts = dStr.split('-');
        if (parts.length === 3 && !isNaN(Number(parts[0]))) {
          const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          day = dObj.getDate();
          month = dObj.toLocaleString('default', { month: 'short' });
        } else {
          const dObj = new Date(dStr);
          if (!isNaN(dObj.getTime())) {
            day = dObj.getDate();
            month = dObj.toLocaleString('default', { month: 'short' });
          } else {
            const spaceParts = dStr.split(' ');
            if (spaceParts.length >= 2) {
              month = spaceParts[0];
              day = spaceParts[1].replace(',', '');
            }
          }
        }
      }

      const linkUrl = m.meetingLink || m.meeting_link;
      const hasLink = Boolean(linkUrl && String(linkUrl).startsWith('http'));

      return `
        <div class="student-dash-meeting-item">
          <div class="student-dash-meeting-datebox">
            <span class="student-dash-meeting-day">${day}</span>
            <span class="student-dash-meeting-month">${month}</span>
          </div>
          <div class="student-dash-meeting-info">
            <div class="student-dash-meeting-title" title="${m.title}">${m.title}</div>
            <div class="student-dash-meeting-meta">
              <span>⏰ ${m.time || '10:00 AM'}</span>
              <span>•</span>
              <span style="color: #00796B; font-weight: 700;">${m.project || 'Project Review'}</span>
            </div>
          </div>
          ${hasLink ? `
            <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="student-dash-meeting-btn" title="Join Video Session">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l5-5v14l-5-5"></path><rect x="2" y="6" width="13" height="12" rx="2"></rect></svg>
              <span>Join</span>
            </a>
          ` : `
            <span class="student-badge student-badge-info" style="font-size: 0.7rem; flex-shrink: 0;">${m.status || 'Scheduled'}</span>
          `}
        </div>
      `;
    }).join('');

    // 4. Build Native Notification Drawer HTML (Identical to Finance Dashboard)
    const drawerHtml = `
      <!-- Floating Bell Button -->
      <button class="student-bell-trigger ${unreadCount > 0 ? 'student-bell-shake' : ''}" id="student-bell-btn" title="View Action Items & Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        ${unreadCount > 0 ? `<span class="student-bell-badge">${unreadCount}</span>` : ''}
      </button>

      <!-- Drawer Backdrop -->
      <div class="student-drawer-backdrop" id="student-drawer-backdrop"></div>

      <!-- Notification Drawer -->
      <div class="student-notification-drawer" id="student-notification-drawer">
        <div class="student-drawer-header">
          <div class="student-drawer-title-wrap">
            <span class="student-drawer-title">Action Items &amp; Alerts</span>
            ${unreadCount > 0 ? `<span class="student-drawer-count">${unreadCount} Unread</span>` : `<span class="student-drawer-count">${notifications.length} Total</span>`}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${unreadCount > 0 ? `
              <button type="button" id="student-btn-mark-all-read" style="background: none; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; font-weight: 600; color: #059669; cursor: pointer; transition: all 0.2s ease;">
                Mark all read
              </button>
            ` : ''}
            <button class="student-drawer-close" id="student-drawer-close" title="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="student-drawer-body">
          ${notifications.length > 0
            ? notifications.map(n => renderNotificationCard(n)).join('')
            : `<div style="text-align:center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.9rem;">
                <div style="font-size: 1.8rem; margin-bottom: 6px;">🔔</div>
                <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">No notifications</div>
                <div style="font-size: 0.78rem;">All your project updates and supervisor alerts will appear here.</div>
              </div>`
          }
        </div>
        <div class="student-drawer-footer" style="padding: 12px 18px; background: #f8fafc; border-top: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; color: var(--text-muted);">${notifications.length} total notifications</span>
          <a href="/student/notifications" class="student-btn student-btn-primary student-btn-sm" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.78rem; text-decoration: none;">
            <span>View All Notifications →</span>
          </a>
        </div>
      </div>
    `;

    // 5. Render HTML Output
    container.innerHTML = `
      <!-- Native Notification Drawer & Floating Bell -->
      ${drawerHtml}


      <!-- Advanced 6-Card KPI Grid (Director Executive Color Palette) -->
      <div class="student-dash-kpi-grid">
        <!-- 1. Active Projects (Director Sidebar Primary Green / Emerald) -->
        <div class="student-dash-kpi-card kpi-sidebar-primary" id="kpi-projects" title="Click to view active projects">
          <div class="student-dash-kpi-top">
            <div class="student-dash-kpi-icon blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div class="student-dash-kpi-arrow">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
          <div class="student-dash-kpi-info">
            <span class="student-dash-kpi-val">${activeProjectsCount}</span>
            <span class="student-dash-kpi-lbl">Active Projects</span>
          </div>
        </div>

        <!-- 2. Completed Projects (Director Talent Track Purple) -->
        <div class="student-dash-kpi-card kpi-purple" id="kpi-completed-projects" title="Click to view completed projects">
          <div class="student-dash-kpi-top">
            <div class="student-dash-kpi-icon purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div class="student-dash-kpi-arrow">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
          <div class="student-dash-kpi-info">
            <span class="student-dash-kpi-val">${completedProjectsCount}</span>
            <span class="student-dash-kpi-lbl">Completed Projects</span>
          </div>
        </div>

        <!-- 3. Pending Tasks (Director Royal Indigo) -->
        <div class="student-dash-kpi-card kpi-indigo" id="kpi-tasks" title="Click to filter pending tasks">
          <div class="student-dash-kpi-top">
            <div class="student-dash-kpi-icon indigo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
            <div class="student-dash-kpi-arrow">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
          <div class="student-dash-kpi-info">
            <span class="student-dash-kpi-val">${pendingTasksCount}</span>
            <span class="student-dash-kpi-lbl">Pending Tasks</span>
          </div>
        </div>

        <!-- 4. Bug Fixes / Rework Required (Director Crimson Red) -->
        <div class="student-dash-kpi-card kpi-crimson" id="kpi-bug-fixes" title="Click to view bug fixes / rework required">
          <div class="student-dash-kpi-top">
            <div class="student-dash-kpi-icon crimson">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
            </div>
            <div class="student-dash-kpi-arrow">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
          <div class="student-dash-kpi-info">
            <span class="student-dash-kpi-val">${bugFixesCount}</span>
            <span class="student-dash-kpi-lbl">${bugFixesCount > 0 ? 'Rework / Fixes' : 'Zero Bug Fixes'}</span>
          </div>
        </div>

        <!-- 5. Assigned Modules (Director Material Teal) -->
        <div class="student-dash-kpi-card kpi-teal" id="kpi-modules" title="Click to view assigned modules">
          <div class="student-dash-kpi-top">
            <div class="student-dash-kpi-icon emerald">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>
            <div class="student-dash-kpi-arrow">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
          <div class="student-dash-kpi-info">
            <span class="student-dash-kpi-val">${assignedModulesCount}</span>
            <span class="student-dash-kpi-lbl">Assigned Modules</span>
          </div>
        </div>

        <!-- 6. Upcoming Meetings (Director Capital Amber / Warm Orange) -->
        <div class="student-dash-kpi-card kpi-amber" id="kpi-meetings" title="Click to view scheduled meetings">
          <div class="student-dash-kpi-top">
            <div class="student-dash-kpi-icon amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div class="student-dash-kpi-arrow">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
          <div class="student-dash-kpi-info">
            <span class="student-dash-kpi-val">${upcomingMeetingsCount}</span>
            <span class="student-dash-kpi-lbl">Upcoming Meetings</span>
          </div>
        </div>
      </div>

      <!-- Main 2-Column Split Grid -->
      <div class="student-dash-grid">
        
        <!-- Left Column: Tasks -->
        <div class="student-dash-col-left">

          <!-- SECTION 1: My Assigned Tasks & Deliverables -->
          <div class="student-dash-card" id="card-assigned-tasks">
            <div class="student-dash-card-header">
              <div class="student-dash-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00796B" stroke-width="2">
                  <path d="M9 11l3 3L22 4"></path>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span>My Assigned Tasks </span>
                <span class="student-dash-card-badge" style="background: #E0F2F1; color: #00796B; border: 1px solid #B2DFDB;">
                  ${tasks.length} Assigned
                </span>
                <span class="student-dash-card-badge" style="background: #F0FAF9; color: #004D40; border: 1px solid #B2DFDB;">
                  Latest 3
                </span>
              </div>
            </div>

            <!-- Tasks Table -->
            <div class="student-dash-table-wrap">
              <table class="student-dash-table">
                <thead>
                  <tr>
                    <th style="width: 65%;">Task &amp; Scope</th>
                    <th style="width: 35%;">Assigned By</th>
                  </tr>
                </thead>
                <tbody>
                  ${taskRows || `
                    <tr>
                      <td colspan="2" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
                        <div style="font-size: 1.75rem; margin-bottom: 6px;">📋</div>
                        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">No tasks assigned</div>
                        <div style="font-size: 0.78rem;">Your supervisor will assign project modules and deliverable tickets.</div>
                      </td>
                    </tr>
                  `}
                </tbody>
              </table>

              ${tasks.length > 0 ? `
                <div class="student-dash-table-footer" style="margin-top: 12px;">
                  <span>
                    Showing <strong>${displayedTasks.length}</strong> of <strong>${tasks.length}</strong> tasks (Latest 3)
                  </span>
                  <button type="button" class="student-btn student-btn-outline student-btn-sm btn-view-all-tasks" style="font-size: 0.75rem; padding: 4px 12px; font-weight: 700;">
                    View Projects &amp; All Tasks (${tasks.length}) →
                  </button>
                </div>
              ` : ''}
            </div>
          </div>

        </div>

        <!-- Right Column: Upcoming Meetings & Action Items (Finance UI & UX) -->
        <div class="student-dash-col-right">

          <!-- SECTION 2: Upcoming Meetings & Sessions -->
          <div class="student-dash-card student-dash-card-compact" id="card-upcoming-meetings">
            <div class="student-dash-card-header">
              <div class="student-dash-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00796B" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Upcoming Meetings</span>
                <span class="student-dash-card-badge" style="background: #E0F2F1; color: #00796B; border: 1px solid #B2DFDB;">
                  ${upcomingMeetings.length > 0 ? `Next ${displayedMeetings.length} of ${upcomingMeetings.length}` : '0 Upcoming'}
                </span>
              </div>

              <button type="button" class="student-btn student-btn-outline student-btn-sm btn-nav-meetings" style="font-size: 0.75rem; padding: 4px 10px;">
                Calendar (${allMeetings.length}) →
              </button>
            </div>

            <div class="student-dash-meetings-list">
              ${meetingItems || `
                <div style="text-align: center; padding: 28px 16px; color: var(--text-muted); background: var(--bg-canvas-light); border-radius: 12px;">
                  <div style="font-size: 1.5rem; margin-bottom: 6px;">📅</div>
                  <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">No upcoming meetings</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">No reviews scheduled from today onwards.</div>
                </div>
              `}
            </div>
          </div>

          <!-- SECTION 3: Action Items & Alerts (Matching Finance Dashboard UI) -->
          <div class="student-dash-card student-dash-card-compact" id="card-dashboard-alerts">
            <div class="student-dash-card-header" style="display: flex; justify-content: space-between; align-items: center;">
              <div class="student-dash-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00796B" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span>Alerts</span>
                <span class="student-dash-card-badge" style="background: #E0F2F1; color: #00796B; border: 1px solid #B2DFDB;">
                  ${unreadCount > 0 ? `${unreadCount} Unread` : `${notifications.length} Total`}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
                <button type="button" class="student-btn student-btn-outline student-btn-sm" id="btn-open-notif-drawer" style="font-size: 0.75rem; padding: 4px 10px;">
                  Open Drawer
                </button>
                <a href="/student/notifications" class="student-btn student-btn-primary student-btn-sm" style="font-size: 0.75rem; padding: 4px 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                  <span>View All (${notifications.length}) →</span>
                </a>
              </div>
            </div>

            <div class="student-dash-notif-list" style="display: flex; flex-direction: column; gap: 10px;">
              ${displayedNotifications.length > 0
                ? displayedNotifications.map(n => renderNotificationCard(n)).join('')
                : `
                  <div style="text-align: center; padding: 28px 16px; color: var(--text-muted); background: var(--bg-canvas-light); border-radius: 12px;">
                    <div style="font-size: 1.5rem; margin-bottom: 6px;">🔔</div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">No recent notifications</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">New task and meeting alerts will appear here.</div>
                  </div>
                `
              }
            </div>
          </div>

        </div>
      </div>
    `;

    // -------------------------------------------------------------------------
    // EVENT BINDINGS
    // -------------------------------------------------------------------------

    // 1. Notification Drawer Interactive Controls (Matching Finance Dashboard)
    const bellBtn = container.querySelector('#student-bell-btn');
    const drawer = container.querySelector('#student-notification-drawer');
    const backdrop = container.querySelector('#student-drawer-backdrop');
    const closeBtn = container.querySelector('#student-drawer-close');
    const btnOpenDrawer = container.querySelector('#btn-open-notif-drawer');
    const btnMarkAll = container.querySelector('#student-btn-mark-all-read');

    const openDrawer = () => {
      if (drawer) drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
      if (bellBtn) bellBtn.classList.add('drawer-open');
    };

    const closeDrawer = () => {
      if (drawer) drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
      if (bellBtn) bellBtn.classList.remove('drawer-open');
    };

    if (bellBtn) bellBtn.addEventListener('click', openDrawer);
    if (btnOpenDrawer) btnOpenDrawer.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    if (btnMarkAll) {
      btnMarkAll.addEventListener('click', async () => {
        btnMarkAll.disabled = true;
        btnMarkAll.textContent = 'Marking...';
        await markAllStudentNotificationsRead();
        await fetchLiveDashboard(true);
        render();
      });
    }

    // Bind Mark as Read on clicking notification action cards
    container.querySelectorAll('.student-action-card[data-unread="1"]').forEach(card => {
      card.addEventListener('click', async () => {
        const id = card.getAttribute('data-id');
        if (id) {
          await markStudentNotificationRead(id);
          card.classList.remove('is-unread', 'card-upcoming');
          card.classList.add('card-info');
          card.setAttribute('data-unread', '0');
          const unreadDot = card.querySelector('.student-card-time span');
          if (unreadDot) unreadDot.remove();
          const unreadTag = card.querySelector('.student-countdown-tag.tag-amber');
          if (unreadTag) {
            unreadTag.className = 'student-countdown-tag tag-slate';
            unreadTag.textContent = 'Info';
          }
          await fetchLiveDashboard(false);
          render();
        }
      });
    });

    // 2. Task status changes
    container.querySelectorAll('.student-task-status-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const taskId = select.getAttribute('data-task-id');
        const taskType = select.getAttribute('data-task-type') || 'task';
        const newStatus = e.target.value;
        select.disabled = true;

        try {
          await updateStudentTaskStatus(taskId, newStatus, taskType);
          StudentSwal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: taskType === 'module' ? 'Module Status Updated' : 'Task Status Updated',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
          });
          render();
        } catch (err) {
          select.disabled = false;
          showStudentError('Update Failed', err.message || 'Could not update task status.');
        }
      });
    });

    // 3. Task filter pills
    container.querySelectorAll('#card-assigned-tasks .student-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        taskFilter = pill.getAttribute('data-filter');
        render();
      });
    });

    // 4. KPI card clicks
    container.querySelector('#kpi-projects')?.addEventListener('click', () => {
      router.push('/student/projects');
    });

    container.querySelector('#kpi-completed-projects')?.addEventListener('click', () => {
      router.push('/student/projects');
    });

    container.querySelector('#kpi-tasks')?.addEventListener('click', () => {
      taskFilter = 'pending';
      render();
      container.querySelector('#card-assigned-tasks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    container.querySelector('#kpi-bug-fixes')?.addEventListener('click', () => {
      if (bugFixList.length > 0) {
        const listHtml = bugFixList.map(b => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-canvas-light); border: 1px solid var(--border-subtle); border-radius: 8px; margin-bottom: 8px; text-align: left;">
            <div>
              <div style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">${b.title}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                <span>Project: <strong>${b.project}</strong></span>
              </div>
            </div>
            <span class="student-badge ${b.isRework ? 'student-badge-danger' : 'student-badge-warning'}" style="font-size: 0.72rem; padding: 3px 8px; font-weight: 700;">
              ${b.status}
            </span>
          </div>
        `).join('');

        StudentSwal.fire({
          title: `<span style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">
            <span style="color: #dc2626;">🔧</span> Bug Fixes & Rework (${bugFixList.length})
          </span>`,
          html: `
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px; text-align: center;">
              The following rework or bug fix tickets have been requested by Faculty or Coordinator:
            </div>
            <div style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
              ${listHtml}
            </div>
          `,
          confirmButtonText: 'Go to Projects Workspace →',
          confirmButtonColor: '#0284c7',
          showCancelButton: true,
          cancelButtonText: 'Close'
        }).then((res) => {
          if (res.isConfirmed) {
            router.push('/student/projects');
          }
        });
      } else {
        StudentSwal.fire({
          icon: 'success',
          title: '0 Bug Fixes Pending',
          text: 'No bug fixes or rework tickets have been assigned by Faculty or Coordinator. All your deliverables are in order.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0284c7'
        });
      }
    });

    container.querySelector('#kpi-modules')?.addEventListener('click', () => {
      router.push('/student/projects');
    });

    container.querySelector('#kpi-meetings')?.addEventListener('click', () => {
      router.push('/student/meetings');
    });

    // 5. Navigation buttons
    container.querySelectorAll('.btn-nav-projects').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        router.push('/student/projects');
      });
    });

    container.querySelector('.btn-nav-meetings')?.addEventListener('click', () => {
      router.push('/student/meetings');
    });

    container.querySelectorAll('.btn-view-all-tasks').forEach(btn => {
      btn.addEventListener('click', () => {
        router.push('/student/projects');
      });
    });

    // 6. Navigation to Student Profile & Settings
    container.querySelector('#dash-avatar-wrapper')?.addEventListener('click', () => {
      router.push('/student/profile');
    });

    container.querySelector('#dash-view-profile-btn')?.addEventListener('click', () => {
      router.push('/student/profile');
    });
  }

  // Real-time notification sync with full-page view
  const onSync = () => {
    render();
  };
  window.addEventListener('student-notifications-updated', onSync);

  render();
  return container;
}

export default StudentDashboard;
