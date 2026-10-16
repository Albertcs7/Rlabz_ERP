import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import { renderPagination, setupPaginationListeners } from '../utils/pagination.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignAuditLog(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let logs = [];
  let searchQuery = '';
  let actionFilter = 'all';
  let currentPage = 1;
  const itemsPerPage = 12;

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
      const res = await fetch(`${API_BASE}/design/audit-logs`, { headers }).then(r => r.ok ? r.json() : null);
      if (res && res.status === 'success') {
        logs = res.data || [];
      }
    } catch (e) {
      console.error('Error loading audit logs:', e);
    }
    render();
  }

  function render() {
    const filtered = logs.filter(log => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery ||
        (log.actor_name || '').toLowerCase().includes(q) ||
        (log.actor_email || '').toLowerCase().includes(q) ||
        (log.ticket_number || '').toLowerCase().includes(q) ||
        (log.ticket_title || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.reason || '').toLowerCase().includes(q);

      const matchAction = actionFilter === 'all' || (log.action || '').toLowerCase().includes(actionFilter.toLowerCase());

      return matchSearch && matchAction;
    });

    const totalLogs = filtered.length;
    const maxPages = Math.ceil(totalLogs / itemsPerPage) || 1;
    if (currentPage > maxPages) currentPage = maxPages;
    const paginatedLogs = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <!-- Page Header & Immutability Callout -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Design Studio Audit Trail</h2>
              <span style="background: #f1f5f9; color: #475569; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #e2e8f0;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Immutable Ledger
              </span>
            </div>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">
              Chronological, permanent audit record of all ticket actions, assignments, deliverable versions, and approvals.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button id="refresh-audit-btn" class="fin-btn" style="padding: 0.45rem 0.85rem; font-size: 0.8rem; background: #f8fafc; border: 1px solid #cbd5e1; color: #334155;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Refresh Logs
            </button>
          </div>
        </div>

        <!-- Filter & Search Toolbar (Finance Style) -->
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.25rem; background: #f8fafc; padding: 0.85rem; border-radius: 8px; border: 1px solid #f1f5f9;">
          <div class="fin-search-wrap" style="flex: 1; min-width: 280px;">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="audit-search-input" class="fin-input" placeholder="Search by actor, ticket #, action, or note..." value="${searchQuery}">
          </div>

          <div class="fin-filter-group" style="min-width: 180px;">
            <label style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Action Type</label>
            <div class="fin-select-wrap">
              <select id="audit-action-filter" class="fin-input" style="padding: 0.35rem 0.5rem; font-size: 0.82rem;">
                <option value="all" ${actionFilter === 'all' ? 'selected' : ''}>All Actions</option>
                <option value="created" ${actionFilter === 'created' ? 'selected' : ''}>Ticket Created</option>
                <option value="assigned" ${actionFilter === 'assigned' ? 'selected' : ''}>Assignment</option>
                <option value="status" ${actionFilter === 'status' ? 'selected' : ''}>Status Change</option>
                <option value="version" ${actionFilter === 'version' ? 'selected' : ''}>Version Uploaded</option>
                <option value="comment" ${actionFilter === 'comment' ? 'selected' : ''}>Feedback Comment</option>
                <option value="approved" ${actionFilter === 'approved' ? 'selected' : ''}>Approval Sign-Off</option>
                <option value="rejected" ${actionFilter === 'rejected' ? 'selected' : ''}>Revision Rejection</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Audit Log Table -->
        <table class="design-data-table">
          <thead>
            <tr>
              <th style="width: 160px;">Timestamp</th>
              <th>Ticket Reference</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Changes / Transition</th>
              <th>Remarks / Note</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
                  No audit log entries match your search criteria.
                </td>
              </tr>
            ` : paginatedLogs.map(log => {
              const dt = log.created_at ? new Date(log.created_at).toLocaleString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : '-';

              let actionBadge = '<span style="background: #f1f5f9; color: #475569; font-size: 0.72rem; font-weight: 700; padding: 2px 7px; border-radius: 4px;">' + (log.action || 'Action') + '</span>';
              const act = (log.action || '').toLowerCase();
              if (act.includes('approved')) {
                actionBadge = '<span style="background: #dcfce7; color: #16a34a; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">APPROVED</span>';
              } else if (act.includes('rejected') || act.includes('revision')) {
                actionBadge = '<span style="background: #ffe4e6; color: #e11d48; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">REVISION REQUIRED</span>';
              } else if (act.includes('assigned')) {
                actionBadge = '<span style="background: #e0f2fe; color: #0284c7; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">ASSIGNED</span>';
              } else if (act.includes('version')) {
                actionBadge = '<span style="background: #f3e8ff; color: #9333ea; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">VERSION UPLOAD</span>';
              } else if (act.includes('created')) {
                actionBadge = '<span style="background: #ccfbf1; color: #0f766e; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">INTAKE CREATED</span>';
              }

              return `
                <tr>
                  <td style="font-size: 0.78rem; color: #64748b; font-family: monospace;">${dt}</td>
                  <td>
                    ${log.ticket_number ? `
                      <div style="font-weight: 700; color: #00bfa5; font-family: monospace; font-size: 0.85rem;">
                        ${log.ticket_number}
                      </div>
                      <div style="font-size: 0.76rem; color: #64748b; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${log.ticket_title || ''}
                      </div>
                    ` : '<span style="color: #94a3b8;">System Global</span>'}
                  </td>
                  <td>
                    <div style="font-weight: 600; color: #0f172a; font-size: 0.84rem;">${log.actor_name || 'System / Auto'}</div>
                    <div style="font-size: 0.74rem; color: #94a3b8;">${log.actor_email || ''}</div>
                  </td>
                  <td>${actionBadge}</td>
                  <td style="font-size: 0.8rem; color: #334155;">
                    ${log.previous_value || log.new_value ? `
                      <span style="color: #94a3b8;">${log.previous_value || 'None'}</span>
                      <span style="color: #64748b; margin: 0 4px;">&rarr;</span>
                      <strong style="color: #0f172a;">${log.new_value || 'None'}</strong>
                    ` : '<span style="color: #94a3b8;">-</span>'}
                  </td>
                  <td style="font-size: 0.8rem; color: #64748b; max-width: 260px;">
                    ${log.reason ? `
                      <div style="font-style: italic; background: #f8fafc; padding: 4px 8px; border-radius: 4px; border-left: 2px solid #cbd5e1;">
                        "${log.reason}"
                      </div>
                    ` : '<span style="color: #cbd5e1;">-</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div id="audit-pagination-container">
          ${renderPagination(totalLogs, currentPage, itemsPerPage)}
        </div>
      </div>
    `;

    // Bind event listeners
    const searchInput = container.querySelector('#audit-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      render();
      const el = container.querySelector('#audit-search-input');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });

    const actionSel = container.querySelector('#audit-action-filter');
    actionSel?.addEventListener('change', (e) => {
      actionFilter = e.target.value;
      currentPage = 1;
      render();
    });

    setupPaginationListeners(container.querySelector('#audit-pagination-container'), (newPage) => {
      currentPage = newPage;
      render();
    });

    const refreshBtn = container.querySelector('#refresh-audit-btn');
    refreshBtn?.addEventListener('click', () => {
      loadData();
      toast('Audit logs refreshed');
    });
  }

  await loadData();
  return container;
}
