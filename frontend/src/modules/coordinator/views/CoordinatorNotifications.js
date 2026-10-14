import { authStore } from '@/core/stores/auth.js';
import { API_BASE } from '@/core/config/api.js';

function getAuthToken() {
  return authStore?.token || localStorage.getItem('token') || localStorage.getItem('access_token') || null;
}

export function CoordinatorNotifications(route, router) {
  const container = document.createElement('div');
  container.className = 'coordinator-dashboard coordinator-notifications-page';

  let notifications = [];
  let currentFilter = 'all'; // 'all' | 'unread' | 'alerts'
  let isLoading = true;

  async function loadNotifications() {
    isLoading = true;
    render();
    const token = getAuthToken();

    try {
      // Try coordinator endpoint first, fallback to general notifications endpoint
      let res = await fetch(`${API_BASE}/coordinator/notifications`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        res = await fetch(`${API_BASE}/notifications`, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
      }

      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        const raw = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []);
        notifications = raw.map(n => ({
          id: n.id,
          user_id: n.user_id,
          project_id: n.project_id || n.project?.id || null,
          project_title: n.project_title || n.project?.title || '',
          type: n.type || 'notification',
          urgency: n.urgency || (n.type === 'task_time_exceeded' ? 'high' : 'normal'),
          title: n.title || (n.type === 'task_time_exceeded' ? 'Task Time Exceeded' : (n.type ? n.type.replace(/_/g, ' ').toUpperCase() : 'Notification')),
          description: n.message || n.description || '',
          is_read: Boolean(n.is_read),
          unread: !Boolean(n.is_read),
          time: n.time || (n.created_at ? new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'),
          created_at: n.created_at
        }));
      }
    } catch (err) {
      console.error('Error fetching coordinator notifications:', err);
    } finally {
      isLoading = false;
      render();
    }
  }

  async function markAsRead(id) {
    const token = getAuthToken();
    try {
      await fetch(`${API_BASE}/coordinator/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      }).catch(() => {});
    } catch (e) {}

    const item = notifications.find(n => n.id === id);
    if (item) {
      item.is_read = true;
      item.unread = false;
      renderList();
      updateBadge();
    }
  }

  async function markAllAsRead() {
    const token = getAuthToken();
    try {
      await fetch(`${API_BASE}/coordinator/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      }).catch(() => {});
    } catch (e) {}

    notifications.forEach(n => {
      n.is_read = true;
      n.unread = false;
    });
    renderList();
    updateBadge();
  }

  function updateBadge() {
    const badge = document.querySelector('#noti-badge, .noti-badge');
    if (badge) {
      const unreadCount = notifications.filter(n => n.unread).length;
      if (unreadCount === 0) {
        badge.style.display = 'none';
      } else {
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        badge.style.display = 'flex';
      }
    }
  }

  function getFilteredNotifications() {
    if (currentFilter === 'unread') {
      return notifications.filter(n => n.unread);
    }
    if (currentFilter === 'alerts') {
      return notifications.filter(n => n.type === 'task_time_exceeded' || n.urgency === 'high');
    }
    return notifications;
  }

  function renderList() {
    const listEl = container.querySelector('#notifications-list');
    if (!listEl) return;

    if (isLoading) {
      listEl.innerHTML = `
        <div style="background: white; border: 1px solid var(--border-subtle, #e5e7eb); border-radius: 12px; padding: 40px; text-align: center;">
          <div class="spinner" style="margin: 0 auto 0.75rem; width: 28px; height: 28px; border: 3px solid #f3f3f3; border-top: 3px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="margin: 0; color: var(--text-muted, #6b7280); font-size: 14px;">Loading notifications...</p>
        </div>
      `;
      return;
    }

    const filtered = getFilteredNotifications();

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="background: white; border: 1px solid var(--border-subtle, #e5e7eb); border-radius: 12px; padding: 45px; text-align: center;">
          <div style="width: 48px; height: 48px; margin: 0 auto 12px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #16a34a;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 style="margin: 0 0 6px; color: var(--text-primary, #111827); font-size: 16px; font-weight: 600;">No notifications found</h3>
          <p style="margin: 0; color: var(--text-muted, #6b7280); font-size: 13px;">${currentFilter === 'unread' ? 'You have caught up with all alerts!' : 'No notifications match this filter.'}</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(n => {
      const isExceeded = n.type === 'task_time_exceeded';
      const borderLeft = isExceeded
        ? 'border-left: 4px solid #ef4444;'
        : (n.unread ? 'border-left: 4px solid #3b82f6;' : 'border-left: 4px solid #e5e7eb;');
      const bg = n.unread ? (isExceeded ? '#fff8f8' : '#f8faff') : '#ffffff';

      return `
        <div class="coord-notification-item" data-id="${n.id}" style="background: ${bg}; ${borderLeft} border-top: 1px solid var(--border-subtle, #e5e7eb); border-right: 1px solid var(--border-subtle, #e5e7eb); border-bottom: 1px solid var(--border-subtle, #e5e7eb); border-radius: 10px; padding: 18px 20px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.15s ease;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px;">
              ${isExceeded ? `
                <span style="background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 9999px; letter-spacing: 0.04em; display: inline-flex; align-items: center; gap: 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  Time Exceeded
                </span>
              ` : `
                <span style="background: #e0f2fe; color: #0284c7; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 9999px; letter-spacing: 0.04em;">
                  ${n.title}
                </span>
              `}
              ${n.project_title ? `
                <span style="font-size: 12px; font-weight: 600; color: #4b5563; background: #f3f4f6; padding: 2px 8px; border-radius: 4px;">
                  ${n.project_title}
                </span>
              ` : ''}
              ${n.unread ? `
                <span style="display: inline-block; width: 8px; height: 8px; background: #ef4444; border-radius: 50%;" title="Unread"></span>
              ` : ''}
            </div>
            
            <p style="margin: 0 0 8px; color: ${isExceeded ? '#7f1d1d' : 'var(--text-primary, #111827)'}; font-size: 14px; line-height: 1.5; font-weight: ${n.unread ? '600' : '400'};">
              ${n.description}
            </p>

            <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
              <span style="font-size: 12px; color: var(--text-muted, #6b7280); display: inline-flex; align-items: center; gap: 4px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                ${n.time}
              </span>
              ${n.project_id ? `
                <a href="/coordinator/projects/${n.project_id}" class="coord-view-project-link" data-project-id="${n.project_id}" style="font-size: 12px; color: #2563eb; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 3px;">
                  View Project &rarr;
                </a>
              ` : ''}
            </div>
          </div>

          <div style="flex-shrink: 0; margin-left: 8px;">
            ${n.unread ? `
              <button class="coord-btn coord-btn-secondary mark-read-btn" data-id="${n.id}" style="padding: 6px 12px; font-size: 12px; border-radius: 6px;">
                Mark as Read
              </button>
            ` : `
              <span style="font-size: 12px; color: #9ca3af; font-weight: 500; padding: 6px 10px; display: inline-block;">
                Read
              </span>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Bind mark single read buttons
    listEl.querySelectorAll('.mark-read-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'), 10);
        markAsRead(id);
      });
    });

    // Bind project links to SPA router
    listEl.querySelectorAll('.coord-view-project-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const projId = link.getAttribute('data-project-id');
        if (router && typeof router.push === 'function') {
          router.push(`/coordinator/projects/${projId}`);
        } else {
          window.location.href = `/coordinator/projects/${projId}`;
        }
      });
    });
  }

  function render() {
    const unreadCount = notifications.filter(n => n.unread).length;
    const alertCount = notifications.filter(n => n.type === 'task_time_exceeded').length;

    container.innerHTML = `
      <div class="coordinator-panel-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 24px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 700; color: var(--text-primary, #111827); margin: 0 0 4px;">Notifications & Alerts</h1>
          <p style="margin: 0; color: var(--text-muted, #6b7280); font-size: 14px;">Monitor project milestones, student submissions, and task time overrun alerts.</p>
        </div>
        <div>
          <button id="coord-mark-all-read-btn" class="coord-btn coord-btn-secondary" style="font-size: 13px; font-weight: 600; padding: 8px 16px;">
            Mark All as Read
          </button>
        </div>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle, #e5e7eb); padding-bottom: 12px; flex-wrap: wrap;">
        <button class="filter-tab ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" style="padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid ${currentFilter === 'all' ? '#2563eb' : 'transparent'}; background: ${currentFilter === 'all' ? '#eff6ff' : 'transparent'}; color: ${currentFilter === 'all' ? '#2563eb' : '#4b5563'};">
          All Notifications (${notifications.length})
        </button>
        <button class="filter-tab ${currentFilter === 'unread' ? 'active' : ''}" data-filter="unread" style="padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid ${currentFilter === 'unread' ? '#2563eb' : 'transparent'}; background: ${currentFilter === 'unread' ? '#eff6ff' : 'transparent'}; color: ${currentFilter === 'unread' ? '#2563eb' : '#4b5563'};">
          Unread (${unreadCount})
        </button>
        <button class="filter-tab ${currentFilter === 'alerts' ? 'active' : ''}" data-filter="alerts" style="padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid ${currentFilter === 'alerts' ? '#dc2626' : 'transparent'}; background: ${currentFilter === 'alerts' ? '#fef2f2' : 'transparent'}; color: ${currentFilter === 'alerts' ? '#dc2626' : '#4b5563'};">
          Time Overruns (${alertCount})
        </button>
      </div>

      <div id="notifications-list"></div>
    `;

    // Bind tabs
    container.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentFilter = tab.getAttribute('data-filter');
        container.querySelectorAll('.filter-tab').forEach(t => {
          const isSelected = t.getAttribute('data-filter') === currentFilter;
          t.style.border = `1px solid ${isSelected ? (currentFilter === 'alerts' ? '#dc2626' : '#2563eb') : 'transparent'}`;
          t.style.background = isSelected ? (currentFilter === 'alerts' ? '#fef2f2' : '#eff6ff') : 'transparent';
          t.style.color = isSelected ? (currentFilter === 'alerts' ? '#dc2626' : '#2563eb') : '#4b5563';
        });
        renderList();
      });
    });

    // Bind mark all read
    container.querySelector('#coord-mark-all-read-btn')?.addEventListener('click', () => {
      markAllAsRead();
    });

    renderList();
  }

  loadNotifications();
  return container;
}
