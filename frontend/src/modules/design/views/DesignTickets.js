import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import { openTicketStudioModal, getStatusBadge, getPriorityBadge, getBallBadge } from '../utils/ticketModal.js';
import '../design.css';

export async function DesignTickets(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let ticketsList = [];
  let availableProjects = [];

  let filterStatus = 'all';
  let filterWorkType = 'all';
  let filterPriority = 'all';
  let filterProject = 'all';
  let searchQuery = '';

  const workTypeLabels = {
    poster: 'Poster / Static Graphic',
    social_creative: 'Social Creative',
    video_motion: 'Video / Motion',
    presentation: 'Presentation / Pitch Deck',
    other: 'Other Deliverable'
  };

  async function loadData() {
    try {
      const [tickRes, brandRes] = await Promise.all([
        fetch(`${API_BASE}/design/tickets`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/design/brand-kit`, { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (tickRes && tickRes.status === 'success') ticketsList = tickRes.data || [];
      if (brandRes && brandRes.status === 'success') availableProjects = brandRes.availableProjects || [];
    } catch (e) {
      console.error('Error loading tickets:', e);
    }
    render();
  }

  function render() {
    let filtered = ticketsList.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterWorkType !== 'all' && t.work_type !== filterWorkType) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterProject !== 'all' && t.project_id != filterProject) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.ticket_number.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.requesting_division.toLowerCase().includes(q) ||
          (t.project_title && t.project_title.toLowerCase().includes(q)) ||
          (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q))
        );
      }
      return true;
    });

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Design Tickets Lifecycle</h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">
              Track creative deliverables through all 10 workflow states from request to archive.
            </p>
          </div>
          <a href="/design/requests" class="fin-btn primary">
            + Raise New Request
          </a>
        </div>

        <!-- Filters & Search Bar (Finance Module Styled) -->
        <div class="design-controls-bar">
          <div class="search-filter-wrap">
            <div class="fin-search-wrap" style="flex: 1; min-width: 260px;">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="ticket-search-input" class="fin-input" placeholder="Search by ID, title, project, division..." value="${searchQuery}">
            </div>

            <select id="filter-project-select" class="design-select">
              <option value="all" ${filterProject === 'all' ? 'selected' : ''}>All Projects</option>
              ${availableProjects.map(p => `<option value="${p.id}" ${filterProject == p.id ? 'selected' : ''}>${p.title}</option>`).join('')}
            </select>
            
            <select id="filter-status-select" class="design-select">
              <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>All States (10)</option>
              <option value="New" ${filterStatus === 'New' ? 'selected' : ''}>New</option>
              <option value="Assigned" ${filterStatus === 'Assigned' ? 'selected' : ''}>Assigned</option>
              <option value="In Progress" ${filterStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Submitted" ${filterStatus === 'Submitted' ? 'selected' : ''}>Submitted</option>
              <option value="In Review" ${filterStatus === 'In Review' ? 'selected' : ''}>In Review</option>
              <option value="Revision" ${filterStatus === 'Revision' ? 'selected' : ''}>Revision</option>
              <option value="Approved" ${filterStatus === 'Approved' ? 'selected' : ''}>Approved</option>
              <option value="Closed" ${filterStatus === 'Closed' ? 'selected' : ''}>Closed</option>
              <option value="On Hold" ${filterStatus === 'On Hold' ? 'selected' : ''}>On Hold</option>
              <option value="Cancelled" ${filterStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>

            <select id="filter-work-select" class="design-select">
              <option value="all" ${filterWorkType === 'all' ? 'selected' : ''}>All Work Types</option>
              <option value="poster" ${filterWorkType === 'poster' ? 'selected' : ''}>Poster / Static</option>
              <option value="social_creative" ${filterWorkType === 'social_creative' ? 'selected' : ''}>Social Creative</option>
              <option value="video_motion" ${filterWorkType === 'video_motion' ? 'selected' : ''}>Video / Motion</option>
              <option value="presentation" ${filterWorkType === 'presentation' ? 'selected' : ''}>Presentation</option>
              <option value="other" ${filterWorkType === 'other' ? 'selected' : ''}>Other</option>
            </select>

            <select id="filter-priority-select" class="design-select">
              <option value="all" ${filterPriority === 'all' ? 'selected' : ''}>All Priorities</option>
              <option value="normal" ${filterPriority === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="high" ${filterPriority === 'high' ? 'selected' : ''}>High</option>
              <option value="urgent" ${filterPriority === 'urgent' ? 'selected' : ''}>Urgent</option>
            </select>
          </div>
        </div>

        <!-- Data Table -->
        <table class="design-data-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Work Type &amp; Title</th>
              <th>Division</th>
              <th>Ball Is With</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assigned To</th>
              <th>Committed Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="9" style="text-align:center; padding: 3rem; color: #94a3b8;">
                  No design tickets match your filter criteria.
                </td>
              </tr>
            ` : filtered.map(t => `
              <tr>
                <td>
                  <span class="design-ticket-id-link btn-view-ticket" data-id="${t.id}">
                    ${t.ticket_number}
                  </span>
                </td>
                <td>
                  <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${t.title}</div>
                  <div style="font-size: 0.74rem; color: #64748b; display: flex; align-items: center; flex-wrap: wrap; gap: 5px;">
                    <span>${workTypeLabels[t.work_type] || t.work_type}</span>
                    ${t.project_title ? `<span class="asset-project-badge" style="font-size:0.68rem; padding:1px 5px;">📁 ${t.project_title}</span>` : ''}
                    ${t.brand_kit_name ? `<span class="asset-brand-badge" style="font-size:0.68rem; padding:1px 5px;">🎨 ${t.brand_kit_name}</span>` : ''}
                  </div>
                </td>
                <td>
                  <span style="text-transform: capitalize; font-weight: 600; color: #475569;">${t.requesting_division}</span>
                </td>
                <td>${getBallBadge(t.ball_is_with)}</td>
                <td>${getStatusBadge(t.status)}</td>
                <td>${getPriorityBadge(t.priority)}</td>
                <td>
                  ${t.assigned_to_name ? `
                    <div style="font-weight: 600; color: #1e293b;">${t.assigned_to_name}</div>
                    <small style="color: #64748b;">${t.estimated_hours}h estimated</small>
                  ` : `
                    <span style="color: #d97706; font-weight: 700; font-size: 0.8rem;">● Unassigned</span>
                  `}
                </td>
                <td>
                  ${t.committed_delivery_date ? `
                    <div style="font-weight: 600; color: #0f172a;">${new Date(t.committed_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <small style="color: #94a3b8;">Req: ${new Date(t.required_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small>
                  ` : `
                    <span style="color: #94a3b8;">Req: ${new Date(t.required_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
    `;

    attachEvents();
  }

  function attachEvents() {
    container.querySelectorAll('.btn-open-studio, .btn-view-ticket').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        openTicketStudioModal(id, loadData);
      });
    });

    const searchInp = container.querySelector('#ticket-search-input');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
      });
    }

    const projectSel = container.querySelector('#filter-project-select');
    if (projectSel) projectSel.addEventListener('change', (e) => { filterProject = e.target.value; render(); });

    const statusSel = container.querySelector('#filter-status-select');
    if (statusSel) statusSel.addEventListener('change', (e) => { filterStatus = e.target.value; render(); });

    const workSel = container.querySelector('#filter-work-select');
    if (workSel) workSel.addEventListener('change', (e) => { filterWorkType = e.target.value; render(); });

    const prioritySel = container.querySelector('#filter-priority-select');
    if (prioritySel) prioritySel.addEventListener('change', (e) => { filterPriority = e.target.value; render(); });
  }

  await loadData();
  return container;
}

export default DesignTickets;
