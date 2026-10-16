import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import { renderPagination, setupPaginationListeners } from '../utils/pagination.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignNotifications(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  let notifications = [];
  let unreadCount = 0;
  let searchQuery = '';
  let urgencyFilter = 'all';
  let readFilter = 'all';
  let currentPage = 1;
  const itemsPerPage = 8;

  const toast = (title, icon = 'success') => {
    Swal.fire({
      title,
      icon,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  };

  async function loadData() {
    try {
      const res = await fetch(`${API_BASE}/design/notifications`, { headers }).then(r => r.ok ? r.json() : null);
      if (res && res.status === 'success') {
        const dismissed = JSON.parse(localStorage.getItem('design_dismissed_alerts') || '[]');
        
        const actionItems = (res.alerts || []).map(a => ({
          id: a.id,
          isAlert: true,
          ticketId: a.ticketId,
          ticketNumber: a.ticketNumber,
          category: a.category || 'ACTION',
          urgency: a.isOverdue || (a.daysLeft !== null && a.daysLeft <= 0) ? 'urgent' : (a.daysLeft <= 2 ? 'high' : 'normal'),
          message: a.message,
          is_read: dismissed.includes(a.id) ? 1 : 0,
          created_at: a.dateStr ? new Date(a.dateStr).toISOString() : new Date().toISOString()
        }));

        const dbNotifs = (res.data || []).map(n => ({
          ...n,
          isAlert: false,
          urgency: n.urgency || 'normal'
        }));

        // Merge: action alerts + db notifications (showing all 9+ items exactly as drawer)
        notifications = [...actionItems, ...dbNotifs];
        unreadCount = notifications.filter(n => !n.is_read).length;
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
    }
    render();
  }

  async function markAsRead(id) {
    const item = notifications.find(n => String(n.id) === String(id));
    if (!item) return;

    if (item.isAlert) {
      const dismissed = JSON.parse(localStorage.getItem('design_dismissed_alerts') || '[]');
      const idStr = String(item.id);
      if (!dismissed.includes(idStr)) {
        dismissed.push(idStr);
        localStorage.setItem('design_dismissed_alerts', JSON.stringify(dismissed));
      }
      item.is_read = 1;
      unreadCount = notifications.filter(n => !n.is_read).length;
      render();
      window.dispatchEvent(new CustomEvent('design-notifications-updated'));
      toast('Action item marked as read');
    } else {
      try {
        const dbId = parseInt(id, 10);
        const res = await fetch(`${API_BASE}/design/notifications/${dbId}/read`, {
          method: 'PATCH',
          headers
        }).then(r => r.ok ? r.json() : null);

        if (res && res.status === 'success') {
          item.is_read = 1;
          unreadCount = notifications.filter(n => !n.is_read).length;
          render();
          window.dispatchEvent(new CustomEvent('design-notifications-updated'));
          toast('Notification marked as read');
        }
      } catch (e) {
        toast('Failed to update notification', 'error');
      }
    }
  }

  async function markAllAsRead() {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) {
      toast('All notifications are already read', 'info');
      return;
    }

    const dismissed = JSON.parse(localStorage.getItem('design_dismissed_alerts') || '[]');
    const unreadDb = [];

    unread.forEach(n => {
      n.is_read = 1;
      if (n.isAlert) {
        if (!dismissed.includes(n.id)) dismissed.push(n.id);
      } else {
        unreadDb.push(n.id);
      }
    });

    localStorage.setItem('design_dismissed_alerts', JSON.stringify(dismissed));

    try {
      if (unreadDb.length > 0) {
        await Promise.all(unreadDb.map(id => fetch(`${API_BASE}/design/notifications/${id}/read`, { method: 'PATCH', headers })));
      }
      unreadCount = 0;
      render();
      window.dispatchEvent(new CustomEvent('design-notifications-updated'));
      toast('All notifications marked as read');
    } catch (e) {
      toast('Error updating notifications', 'error');
    }
  }

  function render() {
    const filtered = notifications.filter(n => {
      const msg = (n.message || '').toLowerCase();
      const matchSearch = !searchQuery || msg.includes(searchQuery.toLowerCase());
      const matchUrgency = urgencyFilter === 'all' || (n.urgency || '').toLowerCase() === urgencyFilter;
      const matchRead = readFilter === 'all' || 
        (readFilter === 'unread' && !n.is_read) || 
        (readFilter === 'read' && n.is_read);

      return matchSearch && matchUrgency && matchRead;
    });

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <!-- Page Header & Finance-styled Search / Controls -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Design Studio Notifications</h2>
              ${unreadCount > 0 ? `
                <span style="background: #ef4444; color: #ffffff; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px;">
                  ${unreadCount} Unread
                </span>
              ` : `
                <span style="background: #10b981; color: #ffffff; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">
                  All Caught Up
                </span>
              `}
            </div>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">
              Notifications triggered by ticket assignments, revisions, submissions, and approvals across the ERP.
            </p>
          </div>

          <!-- Actions -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <button id="mark-all-read-btn" class="fin-btn" style="padding: 0.45rem 0.85rem; font-size: 0.8rem; background: #f8fafc; border: 1px solid #cbd5e1; color: #334155;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Mark All as Read
            </button>
            <button id="refresh-notifs-btn" class="fin-btn" style="padding: 0.45rem 0.85rem; font-size: 0.8rem; background: #f8fafc; border: 1px solid #cbd5e1; color: #334155;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Refresh
            </button>
          </div>
        </div>

        <!-- Filter & Search Toolbar (Finance Style) -->
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.25rem; background: #f8fafc; padding: 0.85rem; border-radius: 8px; border: 1px solid #f1f5f9;">
          <div class="fin-search-wrap" style="flex: 1; min-width: 260px;">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="notif-search-input" class="fin-input" placeholder="Search notification content..." value="${searchQuery}">
          </div>

          <div class="fin-filter-group" style="min-width: 140px;">
            <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Urgency</label>
            <div class="fin-select-wrap">
              <select id="notif-urgency-filter" class="fin-input" style="padding: 0.35rem 0.5rem; font-size: 0.82rem;">
                <option value="all" ${urgencyFilter === 'all' ? 'selected' : ''}>All Urgencies</option>
                <option value="urgent" ${urgencyFilter === 'urgent' ? 'selected' : ''}>Urgent</option>
                <option value="high" ${urgencyFilter === 'high' ? 'selected' : ''}>High</option>
                <option value="normal" ${urgencyFilter === 'normal' ? 'selected' : ''}>Normal</option>
              </select>
            </div>
          </div>

          <div class="fin-filter-group" style="min-width: 140px;">
            <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Status</label>
            <div class="fin-select-wrap">
              <select id="notif-status-filter" class="fin-input" style="padding: 0.35rem 0.5rem; font-size: 0.82rem;">
                <option value="all" ${readFilter === 'all' ? 'selected' : ''}>All</option>
                <option value="unread" ${readFilter === 'unread' ? 'selected' : ''}>Unread Only</option>
                <option value="read" ${readFilter === 'read' ? 'selected' : ''}>Read Only</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Notification List -->
        <div id="notif-list" style="display: flex; flex-direction: column; gap: 0.65rem;">
          ${filtered.length === 0 ? `
            <div style="text-align: center; padding: 3rem 1rem; color: #94a3b8; background: #fafafa; border-radius: 8px; border: 1px dashed #e2e8f0;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom: 0.5rem;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              <div style="font-size: 0.95rem; font-weight: 600; color: #64748b;">No notifications found</div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem;">No design notifications match your selected search or filter criteria.</p>
            </div>
          ` : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(n => {
            const isUnread = !n.is_read;
            const urgency = (n.urgency || 'normal').toLowerCase();
            let urgencyBadge = '<span style="background: #e2e8f0; color: #475569; font-size: 0.7rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">Normal</span>';
            if (urgency === 'urgent') {
              urgencyBadge = '<span style="background: #ffe4e6; color: #e11d48; font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">Urgent</span>';
            } else if (urgency === 'high') {
              urgencyBadge = '<span style="background: #fef3c7; color: #d97706; font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">High</span>';
            }

            const dt = n.created_at ? new Date(n.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

            return `
              <div class="notif-card ${isUnread ? 'unread' : ''}" style="
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 1rem;
                padding: 1rem 1.2rem;
                border-radius: 8px;
                border: 1px solid ${isUnread ? '#99f6e4' : '#f1f5f9'};
                background: ${isUnread ? '#f0fdfa' : '#ffffff'};
                transition: background 0.15s ease;
              ">
                <div style="display: flex; align-items: flex-start; gap: 0.85rem; flex: 1;">
                  <div style="margin-top: 3px;">
                    ${isUnread ? `
                      <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #00bfa5;" title="Unread"></span>
                    ` : `
                      <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #cbd5e1;" title="Read"></span>
                    `}
                  </div>

                  <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 4px;">
                      ${urgencyBadge}
                      <span style="font-size: 0.75rem; color: #94a3b8;">${dt}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: #1e293b; font-weight: ${isUnread ? '600' : '400'}; line-height: 1.45;">
                      ${n.message || 'Notification received.'}
                    </div>
                  </div>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  ${n.ticketId ? `
                    <a href="/design/tickets/${n.ticketId}" class="fin-btn outline sm" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; text-decoration: none; font-weight: 600;">
                      Open Studio ↗
                    </a>
                  ` : ''}
                  ${isUnread ? `
                    <button class="mark-single-read-btn fin-btn" data-id="${n.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; background: #ffffff; border: 1px solid #cbd5e1; color: #059669; font-weight: 600;">
                      Mark Read
                    </button>
                  ` : `
                    <span style="font-size: 0.75rem; color: #94a3b8; font-style: italic;">Read</span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div id="notifs-pagination-container" style="margin-top: 1.25rem;">
          ${renderPagination(filtered.length, currentPage, itemsPerPage)}
        </div>
      </div>
    `;

    // Bind event listeners
    const searchInput = container.querySelector('#notif-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      render();
      container.querySelector('#notif-search-input')?.focus();
    });

    const urgencySel = container.querySelector('#notif-urgency-filter');
    urgencySel?.addEventListener('change', (e) => {
      urgencyFilter = e.target.value;
      currentPage = 1;
      render();
    });

    const statusSel = container.querySelector('#notif-status-filter');
    statusSel?.addEventListener('change', (e) => {
      readFilter = e.target.value;
      currentPage = 1;
      render();
    });

    // Pagination
    setupPaginationListeners(container.querySelector('#notifs-pagination-container'), (page) => {
      currentPage = page;
      render();
    });

    const refreshBtn = container.querySelector('#refresh-notifs-btn');
    refreshBtn?.addEventListener('click', () => {
      loadData();
      toast('Notifications refreshed');
    });

    const markAllBtn = container.querySelector('#mark-all-read-btn');
    markAllBtn?.addEventListener('click', () => {
      markAllAsRead();
    });

    container.querySelectorAll('.mark-single-read-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (id) {
          markAsRead(id);
        }
      });
    });
  }

  await loadData();
  return container;
}
