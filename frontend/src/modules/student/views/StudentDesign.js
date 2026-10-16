import { renderStudentSidebar } from './StudentSidebar.js';
import { useAuthStore } from '@/core/stores/auth.js';
import { API_BASE } from '@/core/config/api.js';
import { StudentSwal, showStudentSuccess, showStudentError } from '../studentAlerts.js';
import Swal from 'sweetalert2';
import '@/modules/finance/finance.css';
import '@/modules/design/design.css';
import '../student.css';

export async function StudentDesign(route, router) {
  renderStudentSidebar();

  const container = document.createElement('div');
  container.className = 'student-portal-container animate-fade-in finance-module';

  const authStore = useAuthStore();
  const token = localStorage.getItem('token');

  // Verify access protection: if user is not authorized, show clean access denied view
  if (!authStore.user?.has_design_access) {
    container.innerHTML = `
      <div class="fin-panel" style="padding: 60px 24px; text-align: center; max-width: 600px; margin: 40px auto;">
        <div style="font-size: 3rem; margin-bottom: 12px;">🎨</div>
        <h2 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">Design Team Membership Required</h2>
        <p style="color: #64748b; font-size: 0.9rem; line-height: 1.5; margin: 0 0 20px 0;">
          The Design Workspace is restricted to students with an active membership in the RLabZ Creative Design Team. Please contact the Design Head to join the team.
        </p>
        <a href="/student" class="fin-btn primary" style="display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; font-weight: 700; text-decoration: none;">
          <span>&larr; Return to Student Dashboard</span>
        </a>
      </div>
    `;
    return container;
  }

  // State
  let kpis = {
    open_tickets: 0,
    in_progress: 0,
    submitted: 0,
    revisions: 0,
    upcoming_deadlines: 0,
    overdue: 0
  };

  let tickets = [];
  let pagination = {
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1
  };

  let searchQuery = '';
  let statusFilter = 'all'; // 'all' | 'Assigned' | 'In Progress' | 'Submitted' | 'In Review' | 'Revision' | 'Approved' | 'Closed'
  let priorityFilter = 'all'; // 'all' | 'urgent' | 'high' | 'normal'
  let workTypeFilter = 'all'; // 'all' | 'poster' | 'social_creative' | 'video_motion' | 'presentation' | 'other'
  let deadlineSort = 'asc'; // 'asc' | 'desc'
  let selectedTicketId = route?.params?.id ? parseInt(route.params.id, 10) : null;
  let activeTicketDetail = null;
  let isLoadingDetail = false;
  let selectedVersionId = null;

  async function apiReq(url, options = {}) {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || `Request failed (${res.status})`);
    }
    return res.json();
  }

  async function loadDashboardKPIs() {
    try {
      const res = await apiReq('/student/design-dashboard');
      if (res.status === 'success') {
        kpis = res.kpis;
      }
    } catch (err) {
      console.warn('Could not load design KPIs:', err);
    }
  }

  async function loadTickets(page = 1) {
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(pagination.per_page),
        search: searchQuery,
        status: statusFilter,
        priority: priorityFilter,
        work_type: workTypeFilter,
        sort_deadline: deadlineSort
      });
      const res = await apiReq(`/student/design-tickets?${params.toString()}`);
      if (res.status === 'success') {
        tickets = res.data || [];
        pagination = res.pagination || { current_page: 1, per_page: 10, total: tickets.length, last_page: 1 };
      }
    } catch (err) {
      console.error('Failed to load design tickets:', err);
      tickets = [];
    }
  }

  async function loadTicketDetail(id) {
    isLoadingDetail = true;
    selectedTicketId = id;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const res = await apiReq(`/student/design-tickets/${id}`);
      if (res.status === 'success') {
        activeTicketDetail = res;
        const versions = res.versions || [];
        selectedVersionId = versions.length > 0 ? (versions.find(v => v.is_current)?.id || versions[0].id) : null;
      }
    } catch (err) {
      showStudentError('Error Loading Ticket', err.message);
      activeTicketDetail = null;
      selectedTicketId = null;
    } finally {
      isLoadingDetail = false;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // 1. Finance-Styled Filter Toolbar
  function renderFilterBar() {
    return `
      <div class="fin-filter-bar" style="display: flex; align-items: flex-end; gap: 12px; margin-bottom: 1.5rem; flex-wrap: wrap; background: #ffffff; padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        
        <!-- Search -->
        <div class="fin-filter-group" style="flex: 2; min-width: 220px;">
          <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase; margin-bottom: 4px;">Search Tasks</label>
          <div class="fin-search-wrap" style="position: relative; width: 100%;">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="student-ticket-search" class="fin-input" placeholder="Search by ID, title, brand kit, work type..." value="${searchQuery}" style="padding-left: 32px; width: 100%;">
          </div>
        </div>

        <!-- Status Filter Dropdown -->
        <div class="fin-filter-group" style="flex: 1; min-width: 140px;">
          <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase; margin-bottom: 4px;">Status</label>
          <div class="fin-select-wrap">
            <select id="filter-status-select" class="fin-input" style="width: 100%;">
              <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Statuses (${pagination.total})</option>
              <option value="Assigned" ${statusFilter === 'Assigned' ? 'selected' : ''}>Assigned</option>
              <option value="In Progress" ${statusFilter === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Submitted" ${statusFilter === 'Submitted' ? 'selected' : ''}>Submitted</option>
              <option value="In Review" ${statusFilter === 'In Review' ? 'selected' : ''}>In Review</option>
              <option value="Revision" ${statusFilter === 'Revision' ? 'selected' : ''}>Revision</option>
              <option value="Approved" ${statusFilter === 'Approved' ? 'selected' : ''}>Approved</option>
              <option value="Closed" ${statusFilter === 'Closed' ? 'selected' : ''}>Closed</option>
            </select>
          </div>
        </div>

        <!-- Priority Filter Dropdown -->
        <div class="fin-filter-group" style="flex: 1; min-width: 130px;">
          <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase; margin-bottom: 4px;">Priority</label>
          <div class="fin-select-wrap">
            <select id="filter-priority-select" class="fin-input" style="width: 100%;">
              <option value="all" ${priorityFilter === 'all' ? 'selected' : ''}>All Priorities</option>
              <option value="urgent" ${priorityFilter === 'urgent' ? 'selected' : ''}>Urgent</option>
              <option value="high" ${priorityFilter === 'high' ? 'selected' : ''}>High</option>
              <option value="normal" ${priorityFilter === 'normal' ? 'selected' : ''}>Normal</option>
            </select>
          </div>
        </div>

        <!-- Work Type Dropdown -->
        <div class="fin-filter-group" style="flex: 1; min-width: 140px;">
          <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase; margin-bottom: 4px;">Work Type</label>
          <div class="fin-select-wrap">
            <select id="filter-work-select" class="fin-input" style="width: 100%;">
              <option value="all" ${workTypeFilter === 'all' ? 'selected' : ''}>All Work Types</option>
              <option value="poster" ${workTypeFilter === 'poster' ? 'selected' : ''}>Poster / Static</option>
              <option value="social_creative" ${workTypeFilter === 'social_creative' ? 'selected' : ''}>Social Creative</option>
              <option value="video_motion" ${workTypeFilter === 'video_motion' ? 'selected' : ''}>Video / Motion</option>
              <option value="presentation" ${workTypeFilter === 'presentation' ? 'selected' : ''}>Presentation</option>
              <option value="other" ${workTypeFilter === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>

        <!-- Deadline Sorting Dropdown -->
        <div class="fin-filter-group" style="flex: 1; min-width: 150px;">
          <label style="display: block; font-size: 0.74rem; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase; margin-bottom: 4px;">Deadline Sort</label>
          <div class="fin-select-wrap">
            <select id="filter-deadline-sort" class="fin-input" style="width: 100%;">
              <option value="asc" ${deadlineSort === 'asc' ? 'selected' : ''}>Earliest Deadline</option>
              <option value="desc" ${deadlineSort === 'desc' ? 'selected' : ''}>Latest Deadline</option>
            </select>
          </div>
        </div>

        <!-- Reset Button -->
        ${(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || workTypeFilter !== 'all') ? `
          <div style="margin-left: auto;">
            <button type="button" id="btn-reset-filters" class="fin-btn outline sm" style="padding: 0.5rem 0.85rem; font-size: 0.78rem;">
              Reset Filters
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  // 3. Dedicated Ticket Workspace View
  function renderTicketStudio() {
    if (isLoadingDetail) {
      return `
        <div class="fin-panel" style="padding: 60px; text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 12px; animation: spin 1s linear infinite;">⏳</div>
          <div style="font-weight: 700; color: var(--text-main); font-size: 1.1rem;">Opening Creative Workspace...</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 6px;">Loading brief specifications, brand kit guidelines, deliverable history, and reviewer notes.</p>
        </div>
      `;
    }

    if (!activeTicketDetail || !activeTicketDetail.ticket) {
      return `
        <div class="fin-panel" style="padding: 40px; text-align: center;">
          <p style="color: var(--text-muted);">Ticket details unavailable or access denied.</p>
          <button type="button" class="fin-btn outline sm" id="btn-back-to-ticket-list">&larr; Back to Design Assignments</button>
        </div>
      `;
    }

    const t = activeTicketDetail.ticket;
    const versions = activeTicketDetail.versions || [];
    const comments = activeTicketDetail.comments || [];
    const history = activeTicketDetail.history || [];
    const brandKit = activeTicketDetail.brand_kit || null;

    const currentVersion = selectedVersionId
      ? (versions.find(v => v.id === selectedVersionId) || versions[0])
      : (versions.find(v => v.is_current) || versions[0]);

    const versionComments = currentVersion
      ? comments.filter(c => c.version_id == currentVersion.id)
      : comments;

    // Badges
    const statusBadgeClass = {
      'New': 'fin-badge-info',
      'Assigned': 'fin-badge-info',
      'In Progress': 'fin-badge-primary',
      'Submitted': 'fin-badge-warning',
      'In Review': 'fin-badge-warning',
      'Revision': 'fin-badge-danger',
      'Approved': 'fin-badge-success',
      'Closed': 'fin-badge-neutral'
    }[t.status] || 'fin-badge-info';

    const priorityBadgeClass = {
      'urgent': 'fin-badge-danger',
      'high': 'fin-badge-warning',
      'normal': 'fin-badge-info'
    }[t.priority] || 'fin-badge-neutral';

    const typeFields = t.type_specific_fields || {};

    return `
      <div class="student-design-studio-view animate-fade-in" style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- Header & Top Action Strip -->
        <div class="fin-panel" style="margin-bottom: 0;">
          <button type="button" id="btn-back-to-ticket-list" class="fin-back-link" style="margin-bottom: 12px;">
            &larr; Back to Design Assignments
          </button>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px;">
                <span style="font-family: monospace; font-size: 1.05rem; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 2px 10px; border-radius: 6px; border: 1px solid #bae6fd;">
                  ${t.ticket_number}
                </span>
                <span class="fin-badge ${statusBadgeClass}" style="font-size: 0.82rem; padding: 4px 12px;">
                  ${t.status}
                </span>
                <span class="fin-badge ${priorityBadgeClass}" style="font-size: 0.82rem; padding: 4px 12px; text-transform: uppercase;">
                  ${t.priority}
                </span>
                <span style="font-size: 0.78rem; font-weight: 700; color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 6px;">
                  Ball: <strong>${t.ball_is_with || 'Designer'}</strong>
                </span>
              </div>
              <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">
                ${t.title}
              </h1>
              <div style="font-size: 0.84rem; color: #64748b; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span>Work Type: <strong style="text-transform: capitalize;">${(t.work_type || 'design').replace('_', ' ')}</strong></span>
                <span>• Requester: <strong>${t.requester_name || 'Design Lead'} (${t.requesting_division || 'General'})</strong></span>
                ${t.project_title ? `<span>• Project: <strong>${t.project_title}</strong></span>` : ''}
              </div>
            </div>

            <!-- Contextual Task Actions -->
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              ${(t.status === 'Assigned' || t.status === 'New') ? `
                <button type="button" id="btn-start-work" class="fin-btn primary sm" style="background: #059669; border-color: #059669;">
                  ▶ Start Task
                </button>
              ` : ''}
              ${(t.status === 'In Progress' || t.status === 'Revision') ? `
                <button type="button" id="btn-upload-new-version" class="fin-btn primary sm" style="background: #2563eb; border-color: #2563eb;">
                  ⬆ ${t.status === 'Revision' ? 'Submit Revision' : 'Upload Deliverable'} (V${versions.length + 1})
                </button>
              ` : ''}
              <button type="button" id="btn-log-design-time" class="fin-btn outline sm" style="color: #0284c7; border-color: #0284c7; background: #f0f9ff;">
                ⏱ Log Hours (${t.actual_hours_logged || 0}h logged)
              </button>
            </div>
          </div>
        </div>

        <!-- 2-Column Grid: Left (Brief & Brand Kit), Right (Versions & Feedback) -->
        <div style="display: grid; grid-template-columns: 1.1fr 1fr; gap: 1.5rem; align-items: start;">
          
          <!-- LEFT COLUMN -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- SECTION A: Brief and Requirements -->
            <div class="fin-panel" style="margin-bottom: 0;">
              <div class="fin-panel-header">
                <div>
                  <div class="fin-panel-title">A. Brief &amp; Requirements</div>
                  <div class="fin-panel-subtitle">Creative specifications and requester guidance</div>
                </div>
              </div>

              <!-- Key Deadlines & Audience Strip -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.82rem;">
                <div>
                  <span style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.72rem;">Committed Deadline</span>
                  <div style="font-weight: 800; color: #0f172a; margin-top: 2px;">
                    📅 ${t.committed_delivery_date ? new Date(t.committed_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (t.required_by ? new Date(t.required_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible Allocation')}
                  </div>
                </div>
                <div>
                  <span style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.72rem;">Publishing Channel</span>
                  <div style="font-weight: 800; color: #0f172a; margin-top: 2px;">
                    🌐 ${t.publishing_channel || 'Instagram / Campus Display'}
                  </div>
                </div>
                <div>
                  <span style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.72rem;">Target Audience</span>
                  <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">
                    🎯 ${t.target_audience || 'Rajagiri Students & Faculty'}
                  </div>
                </div>
                <div>
                  <span style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.72rem;">Effort Estimate</span>
                  <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">
                    ⏳ ${t.estimated_hours ? `${t.estimated_hours} hrs estimated` : 'Open Effort'}
                  </div>
                </div>
              </div>

              <!-- Full Description -->
              <div style="margin-bottom: 14px;">
                <label style="font-size: 0.76rem; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Brief Description</label>
                <div style="font-size: 0.88rem; color: #1e293b; line-height: 1.5; white-space: pre-wrap; background: #fafafa; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
                  ${t.description || 'No detailed brief description provided.'}
                </div>
              </div>

              <!-- Final Copy / Text to Include -->
              ${t.final_copy_text ? `
                <div style="margin-bottom: 14px;">
                  <label style="font-size: 0.76rem; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Mandatory Copy / Headline Text</label>
                  <div style="font-size: 0.85rem; color: #047857; background: #f0fdf4; border-left: 3px solid #10b981; padding: 10px 14px; border-radius: 0 8px 8px 0; font-family: monospace;">
                    ${t.final_copy_text}
                  </div>
                </div>
              ` : ''}

              <!-- Work-type Specific Specifications -->
              ${Object.keys(typeFields).length > 0 ? `
                <div style="margin-bottom: 14px;">
                  <label style="font-size: 0.76rem; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Format &amp; Output Specifications</label>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    ${Object.entries(typeFields).map(([k, v]) => `
                      <div><strong style="text-transform: capitalize;">${k.replace(/_/g, ' ')}:</strong> ${v}</div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Reference Links / Attachments -->
              ${(t.reference_link || (t.attachments && t.attachments.length > 0)) ? `
                <div>
                  <label style="font-size: 0.76rem; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Reference Links &amp; Assets</label>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${t.reference_link ? `
                      <a href="${t.reference_link}" target="_blank" class="fin-btn outline sm" style="font-size: 0.76rem;">
                        🔗 Requester Reference Link ↗
                      </a>
                    ` : ''}
                    ${(t.attachments || []).map((att, idx) => `
                      <a href="${att.url || att}" target="_blank" class="fin-btn outline sm" style="font-size: 0.76rem;">
                        📎 Attachment #${idx + 1}
                      </a>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- SECTION B: Brand Kit and Resources -->
            <div class="fin-panel" style="margin-bottom: 0;">
              <div class="fin-panel-header">
                <div>
                  <div class="fin-panel-title">B. Brand Kit &amp; Resources</div>
                  <div class="fin-panel-subtitle">Official color swatches, typography rules, and logos</div>
                </div>
                <span class="fin-badge fin-badge-primary" style="font-size: 0.78rem;">
                  🎨 ${t.brand_kit_name || 'RLabZ Core Brand'}
                </span>
              </div>

              ${brandKit ? `
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  <!-- Color Palette Swatches -->
                  <div>
                    <label style="font-size: 0.76rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px;">Color Palette</label>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                      ${(brandKit.color_palette || ['#009688', '#00bfa5', '#0f172a', '#f8fafc']).map(color => `
                        <div style="display: flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-family: monospace;">
                          <span style="width: 14px; height: 14px; border-radius: 4px; background: ${color}; border: 1px solid rgba(0,0,0,0.15);"></span>
                          <span>${color}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  <!-- Typography Rules -->
                  <div>
                    <label style="font-size: 0.76rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Typography</label>
                    <div style="font-size: 0.82rem; color: #334155; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                      ${Array.isArray(brandKit.typography_rules) ? brandKit.typography_rules.join(' • ') : (brandKit.typography_rules?.font_family || 'Plus Jakarta Sans, Inter (Display font: 700/800, Body font: 400/500)')}
                    </div>
                  </div>

                  <!-- Logo Assets -->
                  ${(brandKit.logo_assets && brandKit.logo_assets.length > 0) ? `
                    <div>
                      <label style="font-size: 0.76rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Official Logos</label>
                      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${brandKit.logo_assets.map(logo => `
                          <a href="${logo.url || logo}" target="_blank" download class="fin-btn outline sm" style="font-size: 0.74rem;">
                            📥 ${logo.name || 'Download Logo Asset'}
                          </a>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              ` : `
                <div style="font-size: 0.85rem; color: #64748b; background: #fafafa; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px; text-align: center;">
                  No customized brand kit guidelines attached to this ticket. Use official <strong>RLabZ Primary Teal (#009688)</strong> and modern Sans-serif typography.
                </div>
              `}
            </div>

            <!-- SECTION F: Ticket History & Timeline -->
            <div class="fin-panel" style="margin-bottom: 0;">
              <div class="fin-panel-header">
                <div>
                  <div class="fin-panel-title">F. Ticket History &amp; Audit Timeline</div>
                  <div class="fin-panel-subtitle">Lifecycle transitions, reviews, and time logs</div>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px; max-height: 260px; overflow-y: auto;">
                ${history.length > 0 ? history.map(h => `
                  <div style="display: flex; gap: 10px; font-size: 0.8rem; border-left: 2px solid #009688; padding-left: 10px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 700; color: #0f172a;">
                        ${(h.action || 'Event').replace(/_/g, ' ').toUpperCase()} 
                        <span style="font-weight: 400; color: #64748b;">by ${h.actor_name || 'Design System'}</span>
                      </div>
                      ${h.reason ? `<div style="color: #475569; margin-top: 2px;">${h.reason}</div>` : ''}
                      <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">
                        ${new Date(h.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                `).join('') : `
                  <div style="font-size: 0.82rem; color: #94a3b8; font-style: italic; text-align: center; padding: 12px;">
                    Ticket created and assigned to designer.
                  </div>
                `}
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: Deliverables & Feedback -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- SECTION C: Deliverable Versions -->
            <div class="fin-panel" style="margin-bottom: 0;">
              <div class="fin-panel-header">
                <div>
                  <div class="fin-panel-title">C. Deliverable Versions</div>
                  <div class="fin-panel-subtitle">Sequential submissions (V1, V2, V3...)</div>
                </div>
                ${(t.status === 'In Progress' || t.status === 'Revision') ? `
                  <button type="button" id="btn-quick-upload-version" class="fin-btn primary sm" style="font-size: 0.76rem;">
                    + New Version
                  </button>
                ` : ''}
              </div>

              <!-- Version Selector Badges -->
              <div style="display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap;">
                ${versions.length > 0 ? versions.map((v, i) => {
                  const isCurrent = currentVersion && currentVersion.id === v.id;
                  return `
                    <button type="button" class="btn-select-version fin-btn ${isCurrent ? 'primary' : 'outline'} sm" data-version-id="${v.id}" style="font-size: 0.76rem; padding: 4px 10px;">
                      V${v.version_number || (i + 1)} ${v.is_current ? '★ (Latest)' : ''}
                    </button>
                  `;
                }).join('') : `
                  <div style="font-size: 0.82rem; color: #94a3b8; font-style: italic;">No deliverable versions submitted yet.</div>
                `}
              </div>

              <!-- Active Version Preview & Notes -->
              ${currentVersion ? `
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 12px;">
                  <!-- Preview Box -->
                  <div style="background: #0f172a; min-height: 220px; max-height: 380px; display: flex; align-items: center; justify-content: center; position: relative;">
                    ${currentVersion.file_url ? `
                      <img src="${currentVersion.file_url}" alt="Version V${currentVersion.version_number}" style="max-width: 100%; max-height: 360px; object-fit: contain;">
                      <a href="${currentVersion.file_url}" target="_blank" download class="fin-btn sm" style="position: absolute; bottom: 8px; right: 8px; background: rgba(15, 23, 42, 0.85); color: #fff; font-size: 0.72rem; backdrop-filter: blur(4px);">
                        Full Screen ↗
                      </a>
                    ` : `
                      <div style="color: #94a3b8; font-size: 0.85rem; padding: 24px; text-align: center;">
                        External submission / Cloud link deliverable
                      </div>
                    `}
                  </div>

                  <!-- Version Meta Details -->
                  <div style="padding: 12px; background: #ffffff; border-top: 1px solid #e2e8f0; font-size: 0.82rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span style="font-weight: 700; color: #0f172a;">
                        Version ${currentVersion.version_number} by ${currentVersion.uploader_name || 'Designer'}
                      </span>
                      <span style="color: #64748b; font-size: 0.76rem;">
                        ${new Date(currentVersion.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style="color: #334155; line-height: 1.45; background: #f8fafc; padding: 8px 10px; border-radius: 6px;">
                      <strong>Change Notes:</strong> ${currentVersion.change_notes || currentVersion.change_summary || 'Initial creative draft.'}
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- SECTION D: Feedback and Revisions -->
            <div class="fin-panel" style="margin-bottom: 0;">
              <div class="fin-panel-header">
                <div>
                  <div class="fin-panel-title">D. Feedback &amp; Revisions</div>
                  <div class="fin-panel-subtitle">Reviewer discussion and change instructions</div>
                </div>
                <span class="fin-badge fin-badge-info" style="font-size: 0.75rem;">
                  ${versionComments.length} note${versionComments.length === 1 ? '' : 's'}
                </span>
              </div>

              <!-- Comments Thread -->
              <div style="display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; margin-bottom: 12px;">
                ${versionComments.length > 0 ? versionComments.map(c => `
                  <div style="background: ${c.status === 'resolved' ? '#f0fdf4' : '#f8fafc'}; border: 1px solid ${c.status === 'resolved' ? '#bbf7d0' : '#e2e8f0'}; border-radius: 8px; padding: 10px 12px; font-size: 0.82rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <span style="font-weight: 700; color: #0f172a;">${c.author_name || c.user_name || 'Reviewer'} (${c.author_role || 'Lead'})</span>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <button type="button" class="btn-toggle-resolve" data-comment-id="${c.id}" style="background: none; border: 1px solid ${c.status === 'resolved' ? '#10b981' : '#cbd5e1'}; color: ${c.status === 'resolved' ? '#166534' : '#64748b'}; border-radius: 4px; padding: 1px 6px; font-size: 0.68rem; font-weight: 700; cursor: pointer;">
                          ${c.status === 'resolved' ? '✓ Resolved' : 'Mark Resolved'}
                        </button>
                      </div>
                    </div>
                    <div style="color: #334155; line-height: 1.45; white-space: pre-wrap;">${c.comment}</div>
                  </div>
                `).join('') : `
                  <div style="font-size: 0.82rem; color: #94a3b8; font-style: italic; text-align: center; padding: 16px;">
                    No specific feedback comments recorded on this version.
                  </div>
                `}
              </div>

              <!-- Reply / Work Note Form -->
              <form id="form-add-comment" style="display: flex; gap: 8px;">
                <input type="text" id="input-new-comment" class="fin-input" placeholder="Add work note, clarification, or reply..." style="flex: 1; font-size: 0.82rem;" required />
                <button type="submit" class="fin-btn primary sm" style="white-space: nowrap;">Send</button>
              </form>
            </div>

            <!-- SECTION E: Work Log -->
            <div class="fin-panel" style="margin-bottom: 0;">
              <div class="fin-panel-header">
                <div>
                  <div class="fin-panel-title">E. Work Log &amp; Time Tracking</div>
                  <div class="fin-panel-subtitle">Logged design effort</div>
                </div>
                <button type="button" id="btn-quick-log-hours" class="fin-btn outline sm" style="font-size: 0.76rem;">
                  + Log Hours
                </button>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 0.84rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 0.74rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Hours Logged</div>
                  <div style="font-size: 1.25rem; font-weight: 800; color: #009688;">
                    ${t.actual_hours_logged || 0} hrs
                  </div>
                </div>
                <div>
                  <div style="font-size: 0.74rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Estimated Effort</div>
                  <div style="font-size: 1.25rem; font-weight: 800; color: #475569;">
                    ${t.estimated_hours || 0} hrs
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    `;
  }

  // 4. Main Render Function
  function render() {
    // If a ticket is selected, display the full Dedicated Ticket Workspace!
    if (selectedTicketId) {
      container.innerHTML = `
        <div class="student-design-workspace-shell">
          ${renderTicketStudio()}
        </div>
      `;
      bindStudioEvents();
      return;
    }

    // Otherwise, render the Dashboard & Assigned Tasks List
    container.innerHTML = `
      <div class="student-design-workspace-shell">
        
        <!-- Page Header (Matching Finance Layout) -->
        <div class="fin-page-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <h1>Student Design Workspace</h1>
              <span class="role-badge-pill" style="font-size: 0.75rem; padding: 4px 10px;">Active Designer</span>
            </div>
            <p>
              Manage your assigned creative tickets, upload deliverables, log time, and review reviewer feedback.
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <a href="/student" class="fin-btn outline sm" style="text-decoration: none;">
              &larr; Dashboard
            </a>
          </div>
        </div>

        <!-- Filter Toolbar (Finance-Styled Dropdowns) -->
        ${renderFilterBar()}

        <!-- 3. Assigned Tasks Table (Finance-Styled) -->
        <div class="fin-panel" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
          ${tickets.length > 0 ? `
            <div class="fin-table-wrap">
              <table class="fin-table">
                <thead>
                  <tr>
                    <th style="padding-left: 18px;">Ticket ID</th>
                    <th>Title &amp; Work Type</th>
                    <th>Brand Kit</th>
                    <th style="text-align: center;">Priority</th>
                    <th>Committed Deadline</th>
                    <th style="text-align: center;">Status</th>
                    <th style="text-align: right; padding-right: 18px;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${tickets.map((t) => {
                    const statusBadgeClass = {
                      'New': 'fin-badge-info',
                      'Assigned': 'fin-badge-info',
                      'In Progress': 'fin-badge-primary',
                      'Submitted': 'fin-badge-warning',
                      'In Review': 'fin-badge-warning',
                      'Revision': 'fin-badge-danger',
                      'Approved': 'fin-badge-success',
                      'Closed': 'fin-badge-neutral'
                    }[t.status] || 'fin-badge-info';

                    const priorityBadgeClass = {
                      'urgent': 'fin-badge-danger',
                      'high': 'fin-badge-warning',
                      'normal': 'fin-badge-info'
                    }[t.priority] || 'fin-badge-neutral';

                    const dateDisplay = t.committed_delivery_date
                      ? new Date(t.committed_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : (t.required_by ? new Date(t.required_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending Allocation');

                    const isCommitted = Boolean(t.committed_delivery_date);

                    // Contextual action label
                    let actionLabel = 'Open Workspace →';
                    if (t.status === 'Assigned' || t.status === 'New') actionLabel = 'Start Task ▶';
                    else if (t.status === 'In Progress') actionLabel = 'Continue Work ⬆';
                    else if (t.status === 'Revision') actionLabel = 'Submit Revision ⚠';
                    else if (t.status === 'Submitted' || t.status === 'In Review') actionLabel = 'View Submission 👁';
                    else if (t.status === 'Approved' || t.status === 'Closed') actionLabel = 'Final Deliverable ✓';

                    return `
                      <tr class="ticket-row" data-id="${t.id}" style="cursor: pointer;">
                        <td style="padding-left: 18px;">
                          <span style="font-family: monospace; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 3px 8px; border-radius: 4px; border: 1px solid #bae6fd;">
                            ${t.ticket_number}
                          </span>
                        </td>
                        <td>
                          <div style="font-weight: 700; color: #0f172a; font-size: 0.9rem;">${t.title}</div>
                          <div style="display: flex; align-items: center; gap: 6px; margin-top: 3px; font-size: 0.74rem; color: #64748b;">
                            <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600; text-transform: capitalize;">${(t.work_type || 'design').replace('_', ' ')}</span>
                            <span>Requester: <strong>${t.requester_name} (${t.requesting_division})</strong></span>
                          </div>
                        </td>
                        <td>
                          <span class="fin-badge fin-badge-primary" style="font-size: 0.72rem; padding: 3px 8px;">
                            🎨 ${t.brand_kit_name || 'RLabZ Brand'}
                          </span>
                        </td>
                        <td style="text-align: center;">
                          <span class="fin-badge ${priorityBadgeClass}" style="text-transform: uppercase; font-size: 0.72rem;">
                            ${t.priority}
                          </span>
                        </td>
                        <td style="font-size: 0.82rem; color: #334155;">
                          <div style="font-weight: 700;">📅 ${dateDisplay}</div>
                          <div style="font-size: 0.7rem; color: #64748b;">${isCommitted ? 'Committed Delivery' : 'Requested Target'}</div>
                        </td>
                        <td style="text-align: center;">
                          <span class="fin-badge ${statusBadgeClass}" style="font-size: 0.74rem;">
                            ${t.status}
                          </span>
                          <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">Ball: ${t.ball_is_with || 'Designer'}</div>
                        </td>
                        <td style="text-align: right; padding-right: 18px;">
                          <button type="button" class="fin-btn outline sm btn-open-ticket" data-id="${t.id}" style="font-size: 0.76rem; font-weight: 700;">
                            ${actionLabel}
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Pagination Bar -->
            <div style="padding: 12px 18px; background: #f8fafc; border-top: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div style="font-size: 0.8rem; color: #64748b;">
                Showing <strong>${(pagination.current_page - 1) * pagination.per_page + (tickets.length > 0 ? 1 : 0)}</strong> to <strong>${Math.min(pagination.current_page * pagination.per_page, pagination.total)}</strong> of <strong>${pagination.total}</strong> assignments
              </div>

              <div style="display: flex; align-items: center; gap: 6px;">
                <button type="button" id="btn-page-prev" class="fin-btn outline sm" ${pagination.current_page <= 1 ? 'disabled style="opacity: 0.5;"' : ''}>
                  &larr; Prev
                </button>
                <span style="font-size: 0.8rem; font-weight: 700; padding: 0 8px; color: #334155;">
                  Page ${pagination.current_page} of ${pagination.last_page}
                </span>
                <button type="button" id="btn-page-next" class="fin-btn outline sm" ${pagination.current_page >= pagination.last_page ? 'disabled style="opacity: 0.5;"' : ''}>
                  Next &rarr;
                </button>
              </div>
            </div>
          ` : `
            <div style="padding: 56px 24px; text-align: center;">
              <div style="font-size: 2.5rem; margin-bottom: 12px;">🎨</div>
              <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">No Design Assignments Found</h3>
              <p style="color: #64748b; font-size: 0.85rem; max-width: 440px; margin: 0 auto;">
                ${searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || workTypeFilter !== 'all'
                  ? 'No tickets match your active filter criteria. Try resetting your search filters.'
                  : 'You have no creative tickets currently assigned. Creative tasks allocated by the Design Head will appear here.'}
              </p>
            </div>
          `}
        </div>

      </div>
    `;

    bindDashboardEvents();
  }

  // Bind Events for Dashboard / List View
  function bindDashboardEvents() {
    // Search
    const searchInput = container.querySelector('#student-ticket-search');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      loadTickets(1).then(() => render());
    });

    // Status select
    container.querySelector('#filter-status-select')?.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      loadTickets(1).then(() => render());
    });

    // Priority select
    container.querySelector('#filter-priority-select')?.addEventListener('change', (e) => {
      priorityFilter = e.target.value;
      loadTickets(1).then(() => render());
    });

    // Work type select
    container.querySelector('#filter-work-select')?.addEventListener('change', (e) => {
      workTypeFilter = e.target.value;
      loadTickets(1).then(() => render());
    });

    // Deadline sort select
    container.querySelector('#filter-deadline-sort')?.addEventListener('change', (e) => {
      deadlineSort = e.target.value;
      loadTickets(pagination.current_page).then(() => render());
    });

    // Reset filters
    container.querySelector('#btn-reset-filters')?.addEventListener('click', () => {
      searchQuery = '';
      statusFilter = 'all';
      priorityFilter = 'all';
      workTypeFilter = 'all';
      deadlineSort = 'asc';
      loadTickets(1).then(() => render());
    });

    // Pagination
    container.querySelector('#btn-page-prev')?.addEventListener('click', () => {
      if (pagination.current_page > 1) {
        loadTickets(pagination.current_page - 1).then(() => render());
      }
    });

    container.querySelector('#btn-page-next')?.addEventListener('click', () => {
      if (pagination.current_page < pagination.last_page) {
        loadTickets(pagination.current_page + 1).then(() => render());
      }
    });

    // Open Ticket Workspace on row or button click
    container.querySelectorAll('.ticket-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const id = parseInt(row.getAttribute('data-id'), 10);
        if (id) {
          loadTicketDetail(id);
        }
      });
    });

    container.querySelectorAll('.btn-open-ticket').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'), 10);
        if (id) {
          loadTicketDetail(id);
        }
      });
    });
  }

  // Bind Events for Dedicated Ticket Workspace View
  function bindStudioEvents() {
    // Back link
    container.querySelector('#btn-back-to-ticket-list')?.addEventListener('click', () => {
      selectedTicketId = null;
      activeTicketDetail = null;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Select version
    container.querySelectorAll('.btn-select-version').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedVersionId = parseInt(btn.getAttribute('data-version-id'), 10);
        render();
      });
    });

    // Start Task
    container.querySelector('#btn-start-work')?.addEventListener('click', async () => {
      try {
        await apiReq(`/student/design-tickets/${selectedTicketId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'In Progress' })
        });
        showStudentSuccess('Task Started', 'Ticket status updated to In Progress.');
        await loadDashboardKPIs();
        await loadTicketDetail(selectedTicketId);
        await loadTickets(pagination.current_page);
      } catch (err) {
        showStudentError('Update Failed', err.message);
      }
    });

    // Upload Deliverable Version Modal
    const openUploadModal = async () => {
      const nextVer = (activeTicketDetail?.versions?.length || 0) + 1;
      const { value: formValues } = await Swal.fire({
        title: `<span style="font-weight: 800; font-size: 1.25rem;">Submit Deliverable Version ${nextVer}</span>`,
        html: `
          <div style="display: flex; flex-direction: column; gap: 14px; text-align: left; margin: 12px 0;">
            <div>
              <label style="font-size: 0.82rem; font-weight: 700; color: #1e293b; display: block; margin-bottom: 4px;">Deliverable Image URL or Cloud Link *</label>
              <input id="swal-file-url" class="swal2-input" placeholder="https://example.com/art.png or Figma link" style="width: 100%; margin: 0; font-size: 0.85rem;" required />
            </div>
            <div>
              <label style="font-size: 0.82rem; font-weight: 700; color: #1e293b; display: block; margin-bottom: 4px;">Change Notes &amp; Version Summary *</label>
              <textarea id="swal-change-notes" class="swal2-textarea" placeholder="Detail changes made in this version (e.g., color tweaks, typography adjustments)..." style="width: 100%; height: 80px; margin: 0; font-size: 0.85rem;" required></textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Submit for Review',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#009688',
        preConfirm: () => {
          const url = document.getElementById('swal-file-url').value.trim();
          const notes = document.getElementById('swal-change-notes').value.trim();
          if (!url) {
            Swal.showValidationMessage('Deliverable URL link is required');
            return false;
          }
          if (!notes || notes.length < 5) {
            Swal.showValidationMessage('Please provide at least 5 characters of change notes');
            return false;
          }
          return { file_url: url, change_notes: notes };
        }
      });

      if (formValues) {
        try {
          await apiReq(`/student/design-tickets/${selectedTicketId}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formValues)
          });
          showStudentSuccess('Deliverable Submitted!', `Version V${nextVer} has been submitted for review.`);
          await loadDashboardKPIs();
          await loadTicketDetail(selectedTicketId);
          await loadTickets(pagination.current_page);
        } catch (err) {
          showStudentError('Upload Failed', err.message);
        }
      }
    };

    container.querySelector('#btn-upload-new-version')?.addEventListener('click', openUploadModal);
    container.querySelector('#btn-quick-upload-version')?.addEventListener('click', openUploadModal);

    // Log Hours Modal
    const openLogHoursModal = async () => {
      const { value: formValues } = await Swal.fire({
        title: '<span style="font-weight: 800; font-size: 1.25rem;">Log Creative Design Time</span>',
        html: `
          <div style="display: flex; flex-direction: column; gap: 14px; text-align: left; margin: 12px 0;">
            <div>
              <label style="font-size: 0.82rem; font-weight: 700; color: #1e293b; display: block; margin-bottom: 4px;">Hours Spent * (0.25 - 24 hrs)</label>
              <input id="swal-hours" type="number" step="0.25" min="0.25" max="24" class="swal2-input" placeholder="e.g. 2.5" style="width: 100%; margin: 0; font-size: 0.85rem;" required />
            </div>
            <div>
              <label style="font-size: 0.82rem; font-weight: 700; color: #1e293b; display: block; margin-bottom: 4px;">Activity Description *</label>
              <textarea id="swal-work-desc" class="swal2-textarea" placeholder="Detail creative tasks completed during these hours..." style="width: 100%; height: 75px; margin: 0; font-size: 0.85rem;" required></textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Record Time',
        confirmButtonColor: '#009688',
        preConfirm: () => {
          const hours = parseFloat(document.getElementById('swal-hours').value);
          const desc = document.getElementById('swal-work-desc').value.trim();
          if (!hours || isNaN(hours) || hours <= 0 || hours > 24) {
            Swal.showValidationMessage('Please enter valid hours between 0.25 and 24');
            return false;
          }
          if (!desc) {
            Swal.showValidationMessage('Activity description is required');
            return false;
          }
          return { hours: hours, notes: desc };
        }
      });

      if (formValues) {
        try {
          await apiReq(`/student/design-tickets/${selectedTicketId}/time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formValues)
          });
          showStudentSuccess('Hours Logged', `${formValues.hours} hours recorded on design ticket.`);
          await loadTicketDetail(selectedTicketId);
        } catch (err) {
          showStudentError('Log Time Failed', err.message);
        }
      }
    };

    container.querySelector('#btn-log-design-time')?.addEventListener('click', openLogHoursModal);
    container.querySelector('#btn-quick-log-hours')?.addEventListener('click', openLogHoursModal);

    // Add Comment / Discussion Thread
    container.querySelector('#form-add-comment')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = container.querySelector('#input-new-comment');
      const commentText = input?.value.trim();
      if (!commentText) return;

      try {
        await apiReq(`/student/design-tickets/${selectedTicketId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comment: commentText,
            version_id: selectedVersionId
          })
        });
        input.value = '';
        await loadTicketDetail(selectedTicketId);
      } catch (err) {
        showStudentError('Comment Failed', err.message);
      }
    });

    // Resolve Comment Toggle
    container.querySelectorAll('.btn-toggle-resolve').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cId = btn.getAttribute('data-comment-id');
        try {
          await apiReq(`/student/design-tickets/${selectedTicketId}/comments/${cId}/resolve`, {
            method: 'PATCH'
          });
          await loadTicketDetail(selectedTicketId);
        } catch (err) {
          showStudentError('Could not resolve item', err.message);
        }
      });
    });
  }

  // Initial load
  await Promise.all([
    loadDashboardKPIs(),
    loadTickets(1)
  ]);

  if (selectedTicketId) {
    await loadTicketDetail(selectedTicketId);
  } else {
    render();
  }

  return container;
}

export default StudentDesign;
