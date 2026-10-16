import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import { openTicketStudioModal, getStatusBadge, getPriorityBadge, getBallBadge } from '../utils/ticketModal.js';
import '../design.css';

export async function DesignDashboard(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch Dashboard Summary Data & Notifications
  let stats = null;
  let recentTickets = [];
  let urgentDeadlines = [];
  let teamCapacity = [];
  let recentAudit = [];
  let designAlerts = [];
  let unreadNotifCount = 0;

  try {
    const [dashRes, tickRes, capRes, auditRes, notifRes] = await Promise.all([
      fetch(`${API_BASE}/design/dashboard`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/design/tickets`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/design/team-capacity`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/design/audit-logs`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/design/notifications`, { headers }).then(r => r.ok ? r.json() : null)
    ]);

    if (dashRes && dashRes.status === 'success') {
      stats = dashRes.stats;
      urgentDeadlines = dashRes.urgentDeadlines || [];
    }
    if (tickRes && tickRes.status === 'success') {
      recentTickets = (tickRes.data || []).slice(0, 5);
    }
    if (capRes && capRes.status === 'success') {
      teamCapacity = capRes.team || [];
    }
    if (auditRes && auditRes.status === 'success') {
      recentAudit = (auditRes.data || []).slice(0, 6);
    }
    if (notifRes && notifRes.status === 'success') {
      designAlerts = notifRes.alerts || [];
      unreadNotifCount = notifRes.unreadCount || designAlerts.length;
    }
  } catch (e) {
    console.error('Error loading design dashboard:', e);
  }

  const s = stats || {
    totalTickets: 0,
    openTickets: 0,
    unassignedQueue: 0,
    approvalsPending: 0,
    revisionsActive: 0,
    overdueCount: 0,
    assetCount: 0
  };

  container.innerHTML = `
    <!-- Top Header & Quick Actions (Finance Styled) -->

    <!-- Top Header & Quick Actions -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <div>
        <h2 style="font-size: 1.6rem; font-weight: 800; margin: 0; color: #0f172a;">Design Studio Dashboard</h2>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.9rem;">
          Executive oversight for creative intake, workload balancing, deliverables, and brand assets.
        </p>
      </div>

      <div style="display: flex; gap: 0.75rem; align-items: center;">
        <a href="/design/scheduling" class="fin-btn outline" id="btn-dash-calendar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          14-Day Calendar
        </a>
        <a href="/design/requests" class="fin-btn primary" id="btn-dash-raise">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Raise New Request
        </a>
      </div>
    </div>

    <!-- KPI Metrics Strip (Finance Styled) -->
    <div class="fin-kpi-strip">
      <div class="fin-kpi-card blue">
        <div class="kpi-label">Active Tickets</div>
        <div class="kpi-value">${s.openTickets}</div>
        <div class="kpi-sub">${s.totalTickets} total lifetime jobs</div>
      </div>
      <div class="fin-kpi-card dark-green">
        <div class="kpi-label">Archived Assets</div>
        <div class="kpi-value">${s.assetCount}</div>
        <div class="kpi-sub">Reusable deliverables in library</div>
      </div>
      <div class="fin-kpi-card warning">
        <div class="kpi-label">Unassigned Queue</div>
        <div class="kpi-value">${s.unassignedQueue}</div>
        <div class="kpi-sub">Awaiting Lead allocation</div>
      </div>
      <div class="fin-kpi-card ${s.overdueCount > 0 ? 'danger' : 'purple'}">
        <div class="kpi-label">${s.overdueCount > 0 ? 'Overdue Requests' : 'Pending Review'}</div>
        <div class="kpi-value">${s.overdueCount > 0 ? s.overdueCount : s.approvalsPending}</div>
        <div class="kpi-sub">${s.overdueCount > 0 ? 'Past required delivery date' : `${s.revisionsActive} active revision rounds`}</div>
      </div>
    </div>

    <!-- 2-Column Summary Section -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
      <!-- Recent Tickets Summary Table -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: #0f172a;">Recent Design Jobs</h3>
            <p style="margin: 2px 0 0 0; color: #64748b; font-size: 0.8rem;">Active deliverables across divisions and projects.</p>
          </div>
          <a href="/design/tickets" style="font-size: 0.82rem; font-weight: 600; color: #059669; text-decoration: none;">
            View All Tickets &rarr;
          </a>
        </div>

        <table class="design-data-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Title & Project</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${recentTickets.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 2rem;">No recent tickets found.</td></tr>
            ` : recentTickets.map(t => `
              <tr>
                <td>
                  <span class="design-ticket-id-link btn-view-ticket" data-id="${t.id}">
                    ${t.ticket_number}
                  </span>
                </td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${t.title}</div>
                  <div style="font-size: 0.72rem; color: #64748b; display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                    ${t.project_title ? `<span class="asset-project-badge">📁 ${t.project_title}</span>` : ''}
                    ${t.brand_kit_name ? `<span class="asset-brand-badge">🎨 ${t.brand_kit_name}</span>` : ''}
                  </div>
                </td>
                <td>${getStatusBadge(t.status)}</td>
                <td>
                  ${t.assigned_to_name ? `
                    <div style="font-weight: 600; font-size: 0.82rem;">${t.assigned_to_name}</div>
                  ` : `
                    <span style="color: #d97706; font-weight: 600; font-size: 0.78rem;">● Unassigned</span>
                  `}
                </td>
                <td>
                  <button class="design-btn design-btn-secondary design-btn-sm btn-open-studio" data-id="${t.id}">
                    Open Studio
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Right Column: Urgent Deadlines & Capacity Snapshot -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Overdue & Upcoming Deadlines Card -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">SLA &amp; Deadline Radar</h4>
            <span class="fin-badge ${urgentDeadlines.length > 0 ? 'danger' : 'success'}">${urgentDeadlines.length} Active</span>
          </div>

          ${urgentDeadlines.length === 0 ? `
            <div style="font-size: 0.82rem; color: #059669; text-align: center; padding: 1rem 0;">
              ✓ All active deliverables are within committed SLAs.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${urgentDeadlines.slice(0, 4).map(u => `
                <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 8px 12px; font-size: 0.78rem;">
                  <div style="display: flex; justify-content: space-between; font-weight: 700; color: #991b1b;">
                    <span>${u.ticket_number}</span>
                    <span>Req: ${new Date(u.required_by).toLocaleDateString()}</span>
                  </div>
                  <div style="color: #450a0a; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${u.title}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Designer Workload Summary -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">Team Availability</h4>
            <a href="/design/users" style="font-size: 0.78rem; font-weight: 600; color: #059669; text-decoration: none;">
              Manage &rarr;
            </a>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${teamCapacity.slice(0, 4).map(m => `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 3px;">
                  <span style="font-weight: 600; color: #1e293b;">${m.name}</span>
                  <span style="color: #64748b;">${m.hours_committed_this_week}h committed</span>
                </div>
                <div style="height: 6px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
                  <div style="height: 100%; width: ${Math.min((m.hours_committed_this_week / 40) * 100, 100)}%; background: ${m.hours_committed_this_week > 35 ? '#dc2626' : '#059669'}; border-radius: 9999px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Audit History Strip -->
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0; color: #0f172a;">Recent Audit Events</h3>
          <p style="margin: 2px 0 0 0; color: #64748b; font-size: 0.8rem;">Chronological trail of recent assignments, version uploads, and approvals.</p>
        </div>
        <a href="/design/audit-log" style="font-size: 0.82rem; font-weight: 600; color: #059669; text-decoration: none;">
          View Full Audit Log &rarr;
        </a>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 10px;">
        ${recentAudit.map(a => `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 0.78rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <strong style="color: #0f172a;">${a.actor_name || 'System User'}</strong>
              <span style="color: #94a3b8;">${new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style="color: #334155;">
              <span style="color: #059669; font-weight: 700; text-transform: uppercase;">${a.action}</span>
              ${a.ticket_number ? ` on <strong>${a.ticket_number}</strong>` : ''}
            </div>
            ${a.reason ? `<div style="font-style: italic; color: #64748b; margin-top: 3px;">"${a.reason}"</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Attach Studio Modal events
  container.querySelectorAll('.btn-open-studio, .btn-view-ticket').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openTicketStudioModal(id, () => {
        // Refresh page after approval/rejection
        router.push('/design');
      });
    });
  });

  return container;
}

export default DesignDashboard;
