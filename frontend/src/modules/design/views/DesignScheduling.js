import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import { openTicketStudioModal, getStatusBadge, getPriorityBadge } from '../utils/ticketModal.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignScheduling(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let capacityData = null;
  let rawCalendarDeliveries = [];
  let overdueTickets = [];
  let uncommittedTickets = [];
  let unassignedTickets = [];
  let calendarStartDate = new Date();
  calendarStartDate.setHours(0, 0, 0, 0);

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

  const formatDateYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  async function loadData() {
    const startDateStr = formatDateYMD(calendarStartDate);
    try {
      const [capRes, calRes, tickRes] = await Promise.all([
        fetch(`${API_BASE}/design/team-capacity`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/design/schedule/calendar?start_date=${startDateStr}&days=14`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/design/tickets`, { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (capRes && capRes.status === 'success') capacityData = capRes;
      if (calRes && calRes.status === 'success') {
        rawCalendarDeliveries = calRes.fortnightDeliveries || [];
        overdueTickets = calRes.overdueTickets || [];
        uncommittedTickets = calRes.uncommittedTickets || [];
      }
      if (tickRes && tickRes.status === 'success') {
        unassignedTickets = (tickRes.data || []).filter(t => !t.assigned_to && !['Approved', 'Closed', 'Cancelled'].includes(t.status));
      }
    } catch (e) {
      console.error('Error loading scheduling data:', e);
    }
    render();
  }

  function render() {
    const team = (capacityData && Array.isArray(capacityData.team)) ? capacityData.team : [];

    // Construct 14 calendar day slots starting from calendarStartDate
    const calendarDays = [];
    const todayStr = formatDateYMD(new Date());

    for (let i = 0; i < 14; i++) {
      const d = new Date(calendarStartDate);
      d.setDate(calendarStartDate.getDate() + i);
      const dateStr = formatDateYMD(d);
      const dayOfWeek = d.getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      const isToday = (dateStr === todayStr);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Match deliveries by committed delivery date (ignoring time)
      const deliveries = rawCalendarDeliveries.filter(item => {
        if (!item.committed_delivery_date) return false;
        return item.committed_delivery_date.startsWith(dateStr);
      });

      calendarDays.push({
        dateStr,
        dayName,
        monthDay,
        isWeekend,
        isToday,
        deliveries
      });
    }

    const startDisplayStr = calendarStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endWindowDate = new Date(calendarStartDate);
    endWindowDate.setDate(calendarStartDate.getDate() + 13);
    const endDisplayStr = endWindowDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 2rem;">
        <!-- Header -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Workload Allocation &amp; Capacity Scheduling</h2>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">
                Distribute incoming briefs realistically based on weekly capacity, skill sets, and committed dates.
              </p>
            </div>
            <div style="display: flex; gap: 8px;">
              <span class="fin-badge warning" style="font-size: 0.82rem; padding: 6px 12px;">
                Unassigned Queue: <strong>${unassignedTickets.length} Briefs</strong>
              </span>
            </div>
          </div>
        </div>

        <!-- Unassigned Requests Queue -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <h3 style="margin: 0 0 1rem 0; font-size: 1.15rem; font-weight: 700; color: #0f172a;">
            Unassigned Requests Queue (${unassignedTickets.length})
          </h3>

          ${unassignedTickets.length === 0 ? `
            <div style="text-align: center; padding: 2rem; color: #059669; font-size: 0.9rem;">
              ✓ All active creative briefs are currently assigned to designers.
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem;">
              ${unassignedTickets.map(t => `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.2rem; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span style="font-family: monospace; font-weight: 800; color: #2563eb;">${t.ticket_number}</span>
                      ${getPriorityBadge(t.priority)}
                    </div>
                    <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 700;">${t.title}</h4>
                    <div style="font-size: 0.78rem; color: #64748b; margin-bottom: 6px;">
                      ${t.requesting_division} · Req: ${new Date(t.required_by).toLocaleDateString()}
                    </div>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                      ${t.project_title ? `<span class="asset-project-badge">📁 ${t.project_title}</span>` : ''}
                      ${t.brand_kit_name ? `<span class="asset-brand-badge">🎨 ${t.brand_kit_name}</span>` : ''}
                    </div>
                  </div>
                  <div style="margin-top: 1rem; display: flex; gap: 8px;">
                    <button class="fin-btn primary sm btn-assign-ticket" data-id="${t.id}" data-number="${t.ticket_number}" data-title="${t.title}" data-required="${t.required_by || ''}" data-hours="${t.estimated_hours || 8}" style="flex: 1; justify-content: center;">
                      Assign Designer
                    </button>
                    <button class="fin-btn outline sm btn-view-ticket" data-id="${t.id}">
                      View
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Designer Workload & Capacity Grid -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <h3 style="margin: 0 0 1.25rem 0; font-size: 1.15rem; font-weight: 700; color: #0f172a;">
            Designer Workload &amp; Availability
          </h3>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
            ${team.length === 0 ? `
              <div style="color: #94a3b8; font-size: 0.88rem; padding: 1rem;">No designer records available.</div>
            ` : team.map(m => {
              const maxHours = m.weekly_capacity_hours || 40;
              const committed = m.hours_committed_this_week || 0;
              const pct = Math.min((committed / maxHours) * 100, 100);
              const isOverloaded = committed >= maxHours;
              return `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #0f172a; font-size: 1rem;">${m.name}</strong>
                    <span class="fin-badge ${isOverloaded ? 'danger' : 'success'}">${isOverloaded ? 'Fully Booked' : 'Available'}</span>
                  </div>
                  <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 8px;">
                    ${m.open_tickets_count || 0} active tasks · Next slot: <strong>${m.next_free_slot || 'Immediate'}</strong>
                  </div>
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">
                      <span>Committed Hours</span>
                      <span>${committed} / ${maxHours} hrs</span>
                    </div>
                    <div style="height: 8px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
                      <div style="height: 100%; width: ${pct}%; background: ${isOverloaded ? '#dc2626' : '#059669'}; border-radius: 9999px;"></div>
                    </div>
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px;">
                    ${(m.skill_tags || []).map(s => `<span class="skill-tag-pill">${s}</span>`).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 14-Day Rolling Delivery Calendar Forecast -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <!-- Calendar Top Header & Fortnight Navigation -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #0f172a;">14-Day Delivery Calendar</h3>
                <span class="fin-badge blue" style="font-size: 0.76rem;">Fortnight Production Horizon</span>
              </div>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.84rem;">
                Showing delivery window: <strong>${startDisplayStr} &ndash; ${endDisplayStr}</strong>.
                <span style="color: #059669; font-weight: 600; margin-left: 6px;">(Two-week rolling sprint)</span>
              </p>
            </div>

            <!-- Fortnight Navigation Buttons -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="fin-btn outline sm" id="btn-cal-prev" title="View Previous 14 Days">
                &larr; Prev 14 Days
              </button>
              <button class="fin-btn outline sm" id="btn-cal-today" title="Jump to Today's Fortnight">
                Today
              </button>
              <button class="fin-btn outline sm" id="btn-cal-next" title="View Next 14 Days">
                Next 14 Days &rarr;
              </button>
            </div>
          </div>

          <!-- Overdue & Uncommitted Alerts Banners -->
          ${overdueTickets.length > 0 ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1rem;">⚠️</span>
                <span style="font-size: 0.82rem; color: #991b1b; font-weight: 600;">
                  <strong>${overdueTickets.length} Overdue Deliverable(s):</strong> Deliverables past committed deadline. Immediate review required.
                </span>
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${overdueTickets.slice(0, 3).map(ot => `
                  <span class="btn-view-ticket" data-id="${ot.id}" style="background: #ffffff; border: 1px solid #f87171; color: #b91c1c; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-weight: 700;">
                    ${ot.ticket_number} (Due: ${new Date(ot.committed_delivery_date).toLocaleDateString()})
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${uncommittedTickets.length > 0 ? `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1rem;">ℹ️</span>
                <span style="font-size: 0.82rem; color: #92400e;">
                  <strong>${uncommittedTickets.length} Assigned Ticket(s)</strong> do not have a committed delivery date set yet.
                </span>
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${uncommittedTickets.slice(0, 2).map(ut => `
                  <span class="btn-view-ticket" data-id="${ut.id}" style="background: #ffffff; border: 1px solid #fcd34d; color: #b45309; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-weight: 700;">
                    ${ut.ticket_number} (${ut.assigned_to_name || 'Assigned'})
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- 14-Day Calendar Responsive Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 10px;">
            ${calendarDays.map(d => {
              const hasDeliveries = d.deliveries.length > 0;
              const hasUrgent = d.deliveries.some(item => item.priority === 'urgent');

              let cardBg = '#f8fafc';
              let borderCol = '#e2e8f0';

              if (d.isToday) {
                cardBg = '#eff6ff';
                borderCol = '#93c5fd';
              } else if (hasUrgent) {
                cardBg = '#fef2f2';
                borderCol = '#fca5a5';
              } else if (hasDeliveries) {
                cardBg = '#ecfdf5';
                borderCol = '#a7f3d0';
              } else if (d.isWeekend) {
                cardBg = '#f1f5f9';
                borderCol = '#e2e8f0';
              }

              return `
                <div style="background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 8px; padding: 10px; min-height: 110px; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                      <span style="font-weight: 700; font-size: 0.82rem; color: #1e293b;">${d.dayName}</span>
                      <div style="display: flex; gap: 4px; align-items: center;">
                        ${d.isToday ? `<span style="background: #2563eb; color: #fff; font-size: 0.65rem; font-weight: 700; padding: 1px 5px; border-radius: 4px;">TODAY</span>` : ''}
                        ${d.isWeekend ? `<span style="background: #cbd5e1; color: #475569; font-size: 0.62rem; font-weight: 600; padding: 1px 4px; border-radius: 4px;">WKND</span>` : ''}
                      </div>
                    </div>
                    <div style="font-size: 0.74rem; color: #64748b; margin-bottom: 8px; font-weight: 500;">
                      ${d.monthDay}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 6px;">
                      ${d.deliveries.map(item => `
                        <div class="calendar-chip btn-view-ticket" data-id="${item.id}" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 7px; font-size: 0.72rem; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.03);" title="${item.title}">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                            <strong style="color: #2563eb;">${item.ticket_number}</strong>
                            ${getPriorityBadge(item.priority)}
                          </div>
                          <div style="font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${item.title}
                          </div>
                          <div style="font-size: 0.68rem; color: #059669; font-weight: 600; margin-top: 2px;">
                            👤 ${item.assigned_to_name ? item.assigned_to_name.split(' ')[0] : 'Designer'}
                          </div>
                          <div style="font-size: 0.65rem; color: #64748b; margin-top: 2px;">
                            Req: ${item.required_by ? new Date(item.required_by).toLocaleDateString([], { month: 'numeric', day: 'numeric' }) : 'N/A'}
                          </div>
                        </div>
                      `).join('')}

                      ${d.deliveries.length === 0 ? `
                        <div style="font-size: 0.72rem; color: #94a3b8; font-style: italic; padding: 8px 0; text-align: center;">
                          No deliveries scheduled
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    // Fortnight calendar navigation
    const prevBtn = container.querySelector('#btn-cal-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        calendarStartDate.setDate(calendarStartDate.getDate() - 14);
        loadData();
      });
    }

    const todayBtn = container.querySelector('#btn-cal-today');
    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        calendarStartDate = new Date();
        calendarStartDate.setHours(0, 0, 0, 0);
        loadData();
      });
    }

    const nextBtn = container.querySelector('#btn-cal-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        calendarStartDate.setDate(calendarStartDate.getDate() + 14);
        loadData();
      });
    }

    // Open Studio on ticket view
    container.querySelectorAll('.btn-view-ticket').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        openTicketStudioModal(id, loadData);
      });
    });

    // Assign Designer modal
    container.querySelectorAll('.btn-assign-ticket').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ticketId = btn.dataset.id;
        const number = btn.dataset.number;
        const title = btn.dataset.title;
        const reqDate = btn.dataset.required ? new Date(btn.dataset.required).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not specified';
        const estHours = btn.dataset.hours || 8;

        const designers = (capacityData && Array.isArray(capacityData.team)) ? capacityData.team : [];
        const designerOptions = designers.map(d => `<option value="${d.user_id}">${d.name} (${d.hours_committed_this_week || 0}h committed · ${d.weekly_capacity_hours || 20}h cap)</option>`).join('');

        const defaultCommittedDate = btn.dataset.required ? new Date(btn.dataset.required).toISOString().slice(0, 16) : new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16);

        const { value: formValues } = await Swal.fire({
          title: `Assign Designer: ${number}`,
          width: '560px',
          html: `
            <div style="display:flex; flex-direction:column; gap:12px; text-align:left; font-family: inherit;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
                <strong style="color: #0f172a; font-size: 0.95rem; display: block;">${title}</strong>
                <div style="font-size: 0.8rem; color: #0284c7; font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                  <span>📅 Requester Delivery Deadline:</span>
                  <span style="background: #e0f2fe; padding: 2px 8px; border-radius: 4px;">${reqDate}</span>
                </div>
              </div>

              <div>
                <label style="font-size:0.8rem; font-weight:700; color: #334155; display: block; margin-bottom: 4px;">1. Select Designer *</label>
                <select id="swal-assignee" class="swal2-select" style="margin:0; width:100%; box-sizing: border-box; font-size: 0.88rem; height: 40px;">
                  ${designerOptions}
                </select>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <label style="font-size:0.8rem; font-weight:700; color: #334155;">2. Committed Delivery Date *</label>
                  <span style="font-size: 0.72rem; color: #64748b;">Compare with deadline above</span>
                </div>
                <input type="datetime-local" id="swal-committed-date" class="swal2-input" value="${defaultCommittedDate}" style="margin:0; width:100%; box-sizing: border-box; font-size: 0.88rem;">
              </div>

              <div>
                <label style="font-size:0.8rem; font-weight:700; color: #334155; display: block; margin-bottom: 4px;">3. Estimated Effort (Hours for capacity planning)</label>
                <input type="number" id="swal-effort" class="swal2-input" value="${estHours}" min="1" max="100" style="margin:0; width:100%; box-sizing: border-box; font-size: 0.88rem;">
              </div>
            </div>
          `,
          focusConfirm: false,
          preConfirm: () => {
            const assignee = document.getElementById('swal-assignee').value;
            const committedDate = document.getElementById('swal-committed-date').value;
            const effort = document.getElementById('swal-effort').value;
            if (!assignee) {
              Swal.showValidationMessage('Please select a designer.');
              return false;
            }
            if (!committedDate) {
              Swal.showValidationMessage('Committed delivery date is required.');
              return false;
            }
            return {
              assigned_to: assignee,
              committed_delivery_date: committedDate,
              estimated_hours: effort || 8
            };
          },
          showCancelButton: true,
          confirmButtonText: 'Confirm Assignment',
          confirmButtonColor: '#009688'
        });

        if (formValues) {
          try {
            const res = await fetch(`${API_BASE}/design/tickets/${ticketId}/assign`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(formValues)
            });
            const data = await res.json();
            if (data.status === 'success') {
              toast(data.message, 'success');
              await loadData();
            } else {
              toast(data.message || 'Assignment failed', 'error');
            }
          } catch (e) {
            console.error(e);
          }
        }
      });
    });
  }

  await loadData();
  return container;
}

export default DesignScheduling;
