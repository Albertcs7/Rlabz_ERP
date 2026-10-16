import { renderStudentSidebar } from './StudentSidebar.js';
import {
  fetchLiveNotifications,
  getNotifications,
  markStudentNotificationRead,
  markAllStudentNotificationsRead
} from './studentStore.js';
import { useAuthStore } from '@/core/stores/auth.js';
import { StudentSwal } from '../studentAlerts.js';
import '../student.css';

export async function StudentNotifications(route, router) {
  renderStudentSidebar();

  const container = document.createElement('div');
  container.className = 'student-portal-container animate-fade-in student-notifications-full-page';

  // Load fresh notifications
  await fetchLiveNotifications();

  // Local state
  let searchQuery = '';
  let activeFilter = 'all'; // 'all' | 'unread' | 'action' | 'meeting' | 'task' | 'general'

  function getCategoryInfo(n) {
    const isUnread = !n.is_read && !n.isRead;
    const isUrgent = (n.urgency === 'high' || n.urgency === 'urgent' || (n.type && (n.type.includes('rework') || n.type.includes('rejected'))) || (n.message && n.message.toLowerCase().includes('overdue')));

    let typeNorm = (n.type || 'general').toLowerCase().replace(/_/g, '-');
    if (typeNorm.includes('meeting')) typeNorm = 'meeting';
    else if (typeNorm.includes('task')) typeNorm = 'task';
    else if (typeNorm.includes('module') || typeNorm.includes('sprint')) typeNorm = 'sprint';
    else if (typeNorm.includes('work-log') || typeNorm.includes('worklog')) typeNorm = 'work-log';
    else if (typeNorm.includes('github')) typeNorm = 'github';
    else if (typeNorm.includes('security') || typeNorm.includes('password')) typeNorm = 'security';
    else if (typeNorm.includes('design')) typeNorm = 'design';

    let category = n.category;
    if (!category) {
      if (typeNorm === 'meeting') category = 'Meeting';
      else if (typeNorm === 'task') category = 'Task';
      else if (typeNorm === 'sprint') category = 'Sprint';
      else if (typeNorm === 'work-log') category = 'Work Log';
      else if (typeNorm === 'github') category = 'GitHub';
      else if (typeNorm === 'security') category = 'Security';
      else if (typeNorm === 'design') category = 'Design Studio';
      else category = 'General';
    }

    return { isUnread, isUrgent, typeNorm, category };
  }

  function renderCard(n) {
    const { isUnread, isUrgent, typeNorm, category } = getCategoryInfo(n);

    const urgencyTag = isUrgent
      ? '<span class="student-countdown-tag tag-red">Urgent Action</span>'
      : (isUnread ? '<span class="student-countdown-tag tag-amber">Unread</span>' : '<span class="student-countdown-tag tag-slate">Info</span>');

    const cardClass = isUrgent ? 'card-overdue' : (isUnread ? 'card-upcoming' : 'card-info');

    return `
      <div class="student-action-card ${cardClass} ${isUnread ? 'is-unread' : ''}" data-id="${n.id}" data-unread="${isUnread ? '1' : '0'}" style="cursor: pointer; padding: 16px 18px; margin-bottom: 12px; transition: all 0.2s ease; border-radius: 12px;" title="${isUnread ? 'Click to mark as read' : ''}">
        <div class="student-card-header-row" style="margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="student-cat-badge student-cat-${typeNorm}" style="font-weight: 700; font-size: 0.76rem; padding: 3px 10px; border-radius: 6px;">${category}</span>
            ${isUnread ? '<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #059669; font-weight: 700; background: #ecfdf5; padding: 2px 8px; border-radius: 12px; border: 1px solid #a7f3d0;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #059669;"></span>New</span>' : ''}
          </div>
          ${urgencyTag}
        </div>
        <div class="student-card-msg" style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); line-height: 1.45; margin-bottom: 8px;">
          ${n.message || n.title || ''}
        </div>
        <div class="student-card-meta" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--text-muted); border-top: 1px solid var(--border-subtle, #f1f5f9); padding-top: 8px; margin-top: 4px;">
          <span class="student-project-name" style="font-weight: 600; color: #00796B;">
            ${n.projectName || (n.project ? `Project: ${n.project}` : 'Academic ERP')}
          </span>
          <span class="student-card-time" style="display: flex; align-items: center; gap: 5px; color: #64748b;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${n.time || n.created_at || 'Recently'}
          </span>
        </div>
      </div>
    `;
  }

  function render() {
    const notifications = getNotifications() || [];
    const unreadCount = notifications.filter(n => !n.is_read && !n.isRead).length;

    // Filter by search query and category
    const filtered = notifications.filter(n => {
      const { isUnread, typeNorm, category } = getCategoryInfo(n);

      if (activeFilter === 'unread' && !isUnread) return false;
      if (activeFilter === 'action' && typeNorm !== 'task' && typeNorm !== 'design') return false;
      if (activeFilter === 'meeting' && typeNorm !== 'meeting') return false;
      if (activeFilter === 'general' && ['task', 'meeting', 'design'].includes(typeNorm)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const msg = (n.message || n.title || '').toLowerCase();
        const proj = (n.projectName || n.project || '').toLowerCase();
        const cat = category.toLowerCase();
        return msg.includes(q) || proj.includes(q) || cat.includes(q);
      }

      return true;
    });

    container.innerHTML = `
      <!-- Header Banner -->
      <div class="student-proj-header-wrapper" style="margin-bottom: 24px;">
        <div class="student-proj-header-left">
          <div class="student-proj-brand-icon" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <div>
            <h1 class="student-proj-title" style="margin: 0; font-size: 1.45rem; font-weight: 800; color: var(--text-primary);">
              Action Items &amp; Notifications
            </h1>
            <p class="student-proj-subtitle" style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--text-muted);">
              All your assignments, upcoming reviews, deadline alerts, and system notices in one place.
            </p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          ${unreadCount > 0 ? `
            <button type="button" id="btn-fullpage-mark-all" class="student-btn student-btn-outline student-btn-sm" style="font-weight: 700; color: #059669; border-color: #059669; background: #ffffff;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Mark all as read (${unreadCount})</span>
            </button>
          ` : `
            <span style="font-size: 0.82rem; color: #059669; font-weight: 700; background: #ecfdf5; padding: 6px 14px; border-radius: 20px; border: 1px solid #a7f3d0; display: inline-flex; align-items: center; gap: 6px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              All Caught Up
            </span>
          `}
          <a href="/student" class="student-btn student-btn-outline student-btn-sm" style="text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
            <span>&larr; Back to Dashboard</span>
          </a>
        </div>
      </div>

      <!-- Modern Filter & Search Bar -->
      <div class="student-proj-filter-bar" style="margin-bottom: 20px; background: #ffffff; border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
        <div class="student-proj-search-wrap">
          <svg class="student-proj-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="notif-search-input" class="student-proj-search-input" placeholder="Search notifications by message, project, category..." value="${searchQuery}">
        </div>

        <div class="student-proj-filter-pills" style="margin-left: auto;">
          <button type="button" class="student-proj-filter-pill ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">All (${notifications.length})</button>
          <button type="button" class="student-proj-filter-pill ${activeFilter === 'unread' ? 'active' : ''}" data-filter="unread" style="${unreadCount > 0 ? 'color: #059669; font-weight: 700;' : ''}">
            Unread (${unreadCount})
          </button>
          <button type="button" class="student-proj-filter-pill ${activeFilter === 'action' ? 'active' : ''}" data-filter="action">Action Items</button>
          <button type="button" class="student-proj-filter-pill ${activeFilter === 'meeting' ? 'active' : ''}" data-filter="meeting">Meetings</button>
          <button type="button" class="student-proj-filter-pill ${activeFilter === 'general' ? 'active' : ''}" data-filter="general">General</button>
        </div>

        ${searchQuery.trim() || activeFilter !== 'all' ? `
          <button type="button" id="btn-reset-notif-filters" class="student-filter-btn-clear" title="Reset filters">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Reset
          </button>
        ` : ''}
      </div>

      <!-- Notification List Stream -->
      <div class="student-notifications-list-wrap" style="max-width: 900px; margin: 0 auto;">
        ${filtered.length > 0 ? `
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em;">
            Showing ${filtered.length} notification${filtered.length === 1 ? '' : 's'}
          </div>
          <div id="notif-cards-container">
            ${filtered.map(n => renderCard(n)).join('')}
          </div>
        ` : `
          <div class="student-card" style="padding: 60px 24px; text-align: center; border-radius: 16px; background: #ffffff;">
            <div style="font-size: 2.8rem; margin-bottom: 10px;">🔔</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-bottom: 6px;">No Notifications Found</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); max-width: 420px; margin: 0 auto;">
              ${searchQuery ? 'No alerts match your search keywords. Try adjusting your query.' : 'You have no notifications in this filter category.'}
            </div>
            ${searchQuery || activeFilter !== 'all' ? `
              <button type="button" id="btn-empty-reset" class="student-btn student-btn-outline student-btn-sm" style="margin-top: 16px;">
                Reset Search &amp; Filters
              </button>
            ` : ''}
          </div>
        `}
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Search input
    const searchInput = container.querySelector('#notif-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
      const nextInput = container.querySelector('#notif-search-input');
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
      }
    });

    // Filter pills
    container.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        render();
      });
    });

    // Reset filters
    const handleReset = () => {
      searchQuery = '';
      activeFilter = 'all';
      render();
    };
    container.querySelector('#btn-reset-notif-filters')?.addEventListener('click', handleReset);
    container.querySelector('#btn-empty-reset')?.addEventListener('click', handleReset);

    // Mark single as read
    container.querySelectorAll('.student-action-card[data-unread="1"]').forEach(card => {
      card.addEventListener('click', async () => {
        const id = card.dataset.id;
        await markStudentNotificationRead(id);
        render();
      });
    });

    // Mark all as read
    container.querySelector('#btn-fullpage-mark-all')?.addEventListener('click', async () => {
      await markAllStudentNotificationsRead();
      StudentSwal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'All notifications marked as read',
        showConfirmButton: false,
        timer: 1800
      });
      render();
    });
  }

  // Real-time synchronization: listen for notification read events from drawer
  const onSync = () => {
    render();
  };
  window.addEventListener('student-notifications-updated', onSync);

  // Initial render
  render();

  return container;
}
export default StudentNotifications;
