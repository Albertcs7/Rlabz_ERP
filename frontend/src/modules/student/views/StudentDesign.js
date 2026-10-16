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

  // Helper: Resolve media URL cleanly without hardcoding localhost
  function resolveMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
    if (url.startsWith('/storage/')) {
      const origin = API_BASE.replace(/\/api\/?$/, '');
      return `${origin}${url}`;
    }
    return url;
  }

  // Helper: Render Brand Colors without [object Object]
  function renderBrandColors(palette) {
    if (!palette || !Array.isArray(palette) || palette.length === 0) {
      return `
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-family: monospace;">
            <span style="width: 14px; height: 14px; border-radius: 4px; background: #009688; border: 1px solid rgba(0,0,0,0.15);"></span>
            <span>#009688 (Primary Teal)</span>
          </div>
        </div>
      `;
    }
    return `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${palette.map(item => {
          let hex = '#009688';
          let name = '';
          let usage = '';
          if (typeof item === 'string') {
            hex = item;
            name = item;
          } else if (typeof item === 'object' && item !== null) {
            hex = item.hex || item.value || '#009688';
            name = item.name ? `${item.name} (${hex})` : hex;
            usage = item.usage || item.token || '';
          }
          return `
            <div style="display: flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-family: monospace;" title="${usage}">
              <span style="width: 14px; height: 14px; border-radius: 4px; background: ${hex}; border: 1px solid rgba(0,0,0,0.15);"></span>
              <span style="font-weight: 600; color: #1e293b;">${name}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Helper: Render Typography without [object Object]
  function renderBrandTypography(rules) {
    if (!rules) return 'Plus Jakarta Sans, Inter (Display: 700/800, Body: 400/500)';
    if (Array.isArray(rules)) {
      return rules.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          const lbl = item.label ? `<strong>${item.label}:</strong> ` : '';
          const fam = item.family || 'Sans-serif';
          const w = item.weights ? ` (${item.weights})` : '';
          return `${lbl}${fam}${w}`;
        }
        return String(item);
      }).join(' &nbsp;•&nbsp; ');
    }
    if (typeof rules === 'object') {
      return rules.font_family || JSON.stringify(rules);
    }
    return String(rules);
  }

  // Helper: Render Brand Logos without [object Object]
  function renderBrandLogos(logos) {
    if (!logos || !Array.isArray(logos) || logos.length === 0) return '';
    return `
      <div>
        <label style="font-size: 0.76rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Official Logos &amp; Assets</label>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${logos.map(logo => {
            let title = 'Download Logo';
            let url = '#';
            let format = '';
            if (typeof logo === 'string') {
              url = resolveMediaUrl(logo);
              title = logo.split('/').pop() || 'Logo Asset';
            } else if (typeof logo === 'object' && logo !== null) {
              title = logo.title || logo.name || 'Logo Asset';
              url = resolveMediaUrl(logo.url);
              format = logo.format ? ` (${logo.format})` : '';
            }
            if (!url || url === '#' || logo.is_available === false) {
              return `
                <span class="fin-badge neutral" style="font-size: 0.74rem;">
                  ⏳ ${title}${format} - ${logo.note || 'Available Soon'}
                </span>
              `;
            }
            return `
              <a href="${url}" target="_blank" download class="fin-btn outline sm" style="font-size: 0.74rem; text-decoration: none;">
                📥 ${title}${format}
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // State for upload file selection
  let selectedUploadFile = null;

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
    const brandKit = activeTicketDetail.brand_kit || activeTicketDetail.brandKit || null;

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
    const latestVersion = versions.length > 0 ? versions[0] : null;
    const isApproved = t.status === 'Approved';
    const isClosed = t.status === 'Closed';
    const canSubmitDeliverable = !isApproved && !isClosed;

    // Extract latest revision feedback if in revision status
    const revComments = comments.filter(c => (c.comment && c.comment.startsWith('REVISION REQUESTED:')) || c.is_revision_note);
    const latestRevComment = revComments.length > 0 ? revComments[revComments.length - 1] : null;
    const latestRevisionFeedback = latestRevComment ? latestRevComment.comment.replace('REVISION REQUESTED:', '').trim() : null;

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
              <h1 style="font-size: 1.4rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">
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
              ${canSubmitDeliverable ? `
                <button type="button" id="btn-scroll-to-upload" class="fin-btn primary sm" style="background: #2563eb; border-color: #2563eb;">
                  ⬆ ${t.status === 'Revision' ? 'Submit Revision' : 'Upload Deliverable'} (V${(latestVersion?.version_number || 0) + 1})
                </button>
              ` : ''}
              ${isApproved ? `
                <span class="fin-badge fin-badge-success" style="font-size: 0.82rem; padding: 6px 14px; font-weight: 700;">
                  ✓ Approved Final Deliverable
                </span>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- 2-Column Grid: Left (Brief, Brand Kit, Work Log & Timeline), Right (My Deliverables & Feedback) -->
        <div style="display: grid; grid-template-columns: minmax(320px, 400px) 1fr; gap: 1.5rem; align-items: start;">
          
          <!-- LEFT COLUMN: Brief, Compact Brand Kit, Work Log & Timeline -->
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">

            <!-- Creative Brief & Specifications (Rendered once per page) -->
            <div class="fin-panel" style="margin-bottom: 0;">
              <div class="fin-panel-header">
                <div>
                  <div class="fin-panel-title">Creative Brief &amp; Specifications</div>
                  <div class="fin-panel-subtitle">Requester guidance and output requirements</div>
                </div>
              </div>

              <!-- Key Deadlines & Specs Grid -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.82rem;">
                <div>
                  <span style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.72rem;">Committed Deadline</span>
                  <div style="font-weight: 800; color: #0f172a; margin-top: 2px;">
                    📅 ${t.committed_delivery_date ? new Date(t.committed_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (t.required_by ? new Date(t.required_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible Allocation')}
                  </div>
                </div>
                ${t.publishing_channel ? `
                  <div>
                    <span style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.72rem;">Publishing Channel</span>
                    <div style="font-weight: 800; color: #0f172a; margin-top: 2px;">
                      🌐 ${t.publishing_channel}
                    </div>
                  </div>
                ` : ''}
                ${t.target_audience ? `
                  <div>
                    <span style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.72rem;">Target Audience</span>
                    <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">
                      🎯 ${t.target_audience}
                    </div>
                  </div>
                ` : ''}
                <div>
                  <span style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.72rem;">Work Type</span>
                  <div style="font-weight: 700; color: #0f172a; margin-top: 2px; text-transform: capitalize;">
                    🎨 ${(t.work_type || 'design').replace('_', ' ')}
                  </div>
                </div>
              </div>

              <!-- Full Description (Hidden if empty) -->
              ${t.description ? `
                <div style="margin-bottom: 14px;">
                  <label style="font-size: 0.76rem; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Brief Description</label>
                  <div style="font-size: 0.88rem; color: #1e293b; line-height: 1.5; white-space: pre-wrap; background: #fafafa; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    ${t.description}
                  </div>
                </div>
              ` : ''}

              <!-- Final Copy / Mandatory Text -->
              ${t.final_copy ? `
                <div style="margin-bottom: 14px;">
                  <label style="font-size: 0.76rem; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Mandatory Headline / Copy Text</label>
                  <div style="font-size: 0.85rem; color: #047857; background: #f0fdf4; border-left: 3px solid #10b981; padding: 10px 14px; border-radius: 0 8px 8px 0; font-family: monospace; white-space: pre-wrap;">
                    ${t.final_copy}
                  </div>
                </div>
              ` : ''}

              <!-- Output Specifications -->
              ${Object.keys(typeFields).length > 0 ? `
                <div style="margin-bottom: 14px;">
                  <label style="font-size: 0.76rem; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">Output Specifications</label>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    ${Object.entries(typeFields).map(([k, v]) => `
                      <div><strong style="text-transform: capitalize;">${k.replace(/_/g, ' ')}:</strong> ${v}</div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Reference Links / Attachments -->
              ${(t.reference_link || t.reference_links || (t.attachments && t.attachments.length > 0)) ? `
                <div>
                  <label style="font-size: 0.76rem; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">References &amp; Attachments</label>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${(t.reference_link || t.reference_links) ? `
                      <a href="${t.reference_link || t.reference_links}" target="_blank" rel="noopener noreferrer" class="fin-btn outline sm" style="font-size: 0.76rem;">
                        🔗 Reference Link ↗
                      </a>
                    ` : ''}
                    ${(t.attachments || []).map((att, idx) => `
                      <a href="${resolveMediaUrl(att.url || att)}" target="_blank" download class="fin-btn outline sm" style="font-size: 0.76rem;">
                        📎 Attachment #${idx + 1}
                      </a>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Compact Brand Kit Section (Rendered once per page) -->
            <div class="fin-panel" style="margin-bottom: 0;">
              <div class="fin-panel-header">
                <div>
                  <div class="fin-panel-title">Brand Kit &amp; Identity</div>
                  <div class="fin-panel-subtitle">Official colors, typography, and logos</div>
                </div>
                <span class="fin-badge fin-badge-primary" style="font-size: 0.78rem;">
                  🎨 ${t.brand_kit_name || 'RLabZ Core Brand'}
                </span>
              </div>

              ${brandKit ? `
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  <div>
                    <label style="font-size: 0.74rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Color Palette</label>
                    ${renderBrandColors(brandKit.color_palette || brandKit.brand_colors)}
                  </div>

                  <div>
                    <label style="font-size: 0.74rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Typography</label>
                    <div style="font-size: 0.8rem; color: #334155; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; line-height: 1.4;">
                      ${renderBrandTypography(brandKit.typography_rules || brandKit.typography)}
                    </div>
                  </div>

                  ${renderBrandLogos(brandKit.logo_assets || brandKit.downloadable_kits)}

                  ${t.brand_constraints ? `
                    <div style="background: #f0fdf4; border-left: 3px solid #10b981; padding: 6px 10px; border-radius: 0 6px 6px 0; font-size: 0.78rem; color: #065f46;">
                      <strong>Constraints:</strong> ${t.brand_constraints}
                    </div>
                  ` : ''}
                </div>
              ` : `
                <div style="font-size: 0.82rem; color: #64748b; background: #fafafa; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px; text-align: center;">
                  Standard RLabZ brand palette (#009688 Primary Teal) and Sans-serif typography apply.
                </div>
              `}
            </div>

            <!-- Compact Work Log Section (Single place for logged hours) -->
            <div class="fin-panel" style="margin-bottom: 0;">
              <div class="fin-panel-header">
                <div>
                  <div class="fin-panel-title">Work Log &amp; Effort</div>
                  <div class="fin-panel-subtitle">Recorded creative time</div>
                </div>
                <button type="button" id="btn-quick-log-hours" class="fin-btn outline sm" style="font-size: 0.76rem;">
                  + Log Hours
                </button>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 0.84rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 0.74rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Hours Logged</div>
                  <div style="font-size: 1.25rem; font-weight: 800; color: #009688;">
                    ${parseFloat(t.actual_hours_logged || 0).toFixed(1)} hrs
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

            <!-- Compact Activity Timeline (Audit events only, no duplicate versions) -->
            <div class="fin-panel" style="margin-bottom: 0;">
              <div class="fin-panel-header">
                <div>
                  <div class="fin-panel-title">Activity Timeline</div>
                  <div class="fin-panel-subtitle">Lifecycle events &amp; audit history</div>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">
                ${history.length > 0 ? history.map(h => `
                  <div style="display: flex; gap: 8px; font-size: 0.78rem; border-left: 2px solid #009688; padding-left: 8px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 700; color: #0f172a;">
                        ${(h.action || 'Event').replace(/_/g, ' ').toUpperCase()} 
                        <span style="font-weight: 400; color: #64748b;">by ${h.actor_name || 'System'}</span>
                      </div>
                      ${h.reason ? `<div style="color: #475569; margin-top: 1px;">${h.reason}</div>` : ''}
                      <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 1px;">
                        ${new Date(h.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                `).join('') : `
                  <div style="font-size: 0.8rem; color: #94a3b8; font-style: italic; text-align: center; padding: 10px;">
                    Ticket created and assigned.
                  </div>
                `}
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: One "My Deliverables" Section & One "Feedback & Revisions" Section -->
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            
            <!-- ONE "My Deliverables" Section -->
            <div class="fin-panel" id="section-deliverable-submission" style="margin-bottom: 0;">
              <div class="fin-panel-header" style="flex-wrap: wrap; gap: 10px;">
                <div>
                  <div class="fin-panel-title">My Deliverables</div>
                  <div class="fin-panel-subtitle">File upload, sequential version history &amp; review preview</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span class="fin-badge ${statusBadgeClass}" style="font-size: 0.76rem;">
                    ${t.status}
                  </span>
                  <span class="fin-badge neutral" style="font-size: 0.76rem;">
                    ${versions.length} Version${versions.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              ${t.status === 'Revision' ? `
                <!-- Revision Instructions Banner -->
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="font-size: 1.1rem;">⚠️</span>
                      <strong style="color: #991b1b; font-size: 0.9rem;">Reviewer Requested Revisions (Round ${t.revision_count || 1})</strong>
                    </div>
                    <span class="fin-badge danger" style="font-size: 0.72rem;">Target: V${latestVersion?.version_number || 1}</span>
                  </div>
                  <div style="font-size: 0.84rem; color: #7f1d1d; background: #fff5f5; border: 1px dashed #fca5a5; padding: 8px 12px; border-radius: 6px; line-height: 1.45; white-space: pre-wrap;">
                    ${latestRevisionFeedback || 'Please address reviewer feedback, adjust the creative deliverable, and upload the next version below.'}
                  </div>
                </div>
              ` : ''}

              ${isApproved ? `
                <!-- Approved Read-Only Notice Banner -->
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #10b981; border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
                  <span style="font-size: 1.4rem;">✅</span>
                  <div>
                    <div style="font-weight: 800; color: #166534; font-size: 0.92rem;">Deliverable Approved &amp; Signed Off</div>
                    <div style="font-size: 0.8rem; color: #15803d; margin-top: 1px;">
                      The final version is archived below in read-only mode. New uploads are disabled.
                    </div>
                  </div>
                </div>
              ` : ''}

              <!-- Upload Deliverable Box (Active when not approved/closed) -->
              ${canSubmitDeliverable ? `
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="font-size: 0.95rem; color: #0f172a;">
                      Upload Deliverable Version V${(latestVersion?.version_number || 0) + 1}
                    </strong>
                    <span class="fin-badge fin-badge-primary" style="font-size: 0.72rem;">
                      Sequential V${(latestVersion?.version_number || 0) + 1}
                    </span>
                  </div>

                  <!-- Drag & Drop Zone -->
                  <div id="deliverable-dropzone" style="border: 2px dashed #009688; border-radius: 8px; padding: 18px 14px; text-align: center; background: #f0fdf9; cursor: pointer; transition: all 0.2s ease;">
                    <input type="file" id="deliverable-file-input" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,video/mp4,video/webm" style="display: none;" />
                    <div style="font-size: 1.6rem; margin-bottom: 2px;">📁</div>
                    <div style="font-weight: 700; color: #004d40; font-size: 0.9rem;">Drag &amp; drop design file here, or click to browse</div>
                    <div style="font-size: 0.75rem; color: #00796b; margin-top: 2px;">Supports PNG, JPG, WEBP, SVG, PDF, MP4, WEBM (Max 50MB)</div>
                    
                    <div id="dropzone-file-display" style="display: none; margin-top: 10px; padding: 6px 12px; background: #ffffff; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 0.8rem; color: #065f46; font-weight: 600; align-items: center; justify-content: space-between;">
                      <span id="dropzone-file-name">Selected File</span>
                      <button type="button" id="btn-remove-selected-file" style="background: none; border: none; color: #dc2626; font-weight: 700; cursor: pointer; padding: 2px 6px;">✕ Remove</button>
                    </div>
                  </div>

                  <!-- Optional External Cloud / Figma Link -->
                  <div style="margin-top: 10px;">
                    <label style="font-size: 0.74rem; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">
                      External Cloud Link / Figma (Optional if file uploaded)
                    </label>
                    <input type="url" id="deliverable-external-url" class="fin-input" placeholder="https://drive.google.com/... or Figma presentation link" style="width: 100%; font-size: 0.82rem;" />
                  </div>

                  <!-- Change Notes Field -->
                  <div style="margin-top: 10px;">
                    <label style="font-size: 0.74rem; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 4px;">
                      Change Notes &amp; Version Summary *
                    </label>
                    <textarea id="deliverable-change-notes" class="fin-input" rows="2" placeholder="Detail what was created or adjusted in this version..." style="width: 100%; font-size: 0.82rem; resize: vertical;" required></textarea>
                  </div>

                  <!-- Submit Action Button -->
                  <div style="margin-top: 12px; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
                    <span style="font-size: 0.76rem; color: #64748b;">Advances ticket to <strong>Submitted</strong> for review</span>
                    <button type="button" id="btn-submit-deliverable" class="fin-btn primary" style="background: #009688; border-color: #009688; font-weight: 700; padding: 7px 16px; font-size: 0.84rem;">
                      🚀 Submit for Review (V${(latestVersion?.version_number || 0) + 1})
                    </button>
                  </div>
                </div>
              ` : ''}

              <!-- Visual Deliverable Preview Inspector -->
              <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="font-size: 0.9rem; color: #0f172a;">
                    ${currentVersion ? `Previewing Deliverable V${currentVersion.version_number}` : 'Deliverable Preview'}
                  </strong>
                  ${currentVersion?.is_approved ? '<span class="fin-badge success">✓ Approved Deliverable</span>' : ''}
                </div>

                <!-- Media Canvas -->
                <div style="background: #0f172a; border-radius: 8px; min-height: 260px; max-height: 440px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; margin-bottom: 8px;">
                  ${currentVersion ? (
                    (currentVersion.file_type === 'video' || (currentVersion.file_url && currentVersion.file_url.match(/\.(mp4|webm)$/i))) ? `
                      <video src="${resolveMediaUrl(currentVersion.file_url)}" controls style="max-width: 100%; max-height: 420px; object-fit: contain;"></video>
                    ` : (currentVersion.file_type === 'pdf' || (currentVersion.file_url && currentVersion.file_url.match(/\.pdf$/i))) ? `
                      <div style="text-align: center; padding: 30px; color: #e2e8f0;">
                        <div style="font-size: 3rem; margin-bottom: 8px;">📄</div>
                        <div style="font-weight: 700; font-size: 1rem;">PDF Deliverable Document</div>
                        <div style="font-size: 0.8rem; color: #94a3b8; margin: 4px 0 14px 0;">${currentVersion.file_name || 'Document.pdf'}</div>
                        <a href="${resolveMediaUrl(currentVersion.file_url)}" target="_blank" download class="fin-btn primary sm" style="text-decoration: none;">
                          Open / Download PDF ↗
                        </a>
                      </div>
                    ` : currentVersion.file_url ? `
                      <img src="${resolveMediaUrl(currentVersion.file_url)}" alt="Version V${currentVersion.version_number}" id="student-preview-img" style="max-width: 100%; max-height: 420px; object-fit: contain; cursor: zoom-in;" title="Click to zoom preview" />
                      <button type="button" id="btn-zoom-preview" class="fin-btn sm" style="position: absolute; bottom: 8px; right: 8px; background: rgba(15, 23, 42, 0.85); color: #fff; font-size: 0.72rem; backdrop-filter: blur(4px);">
                        🔍 Zoom
                      </button>
                    ` : `
                      <div style="color: #94a3b8; font-size: 0.85rem; padding: 24px; text-align: center;">
                        External cloud link deliverable submission
                      </div>
                    `
                  ) : `
                    <div style="text-align: center; padding: 36px 20px; color: #94a3b8;">
                      <div style="font-size: 2.8rem; margin-bottom: 6px;">🎨</div>
                      <div style="font-weight: 700; color: #cbd5e1; font-size: 0.95rem;">No Deliverable Draft Yet</div>
                      <p style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Use the upload box above to submit Version V1.</p>
                    </div>
                  `}
                </div>

                <!-- Active Version Metadata -->
                ${currentVersion ? `
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 0.82rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                    <div>
                      <strong style="color: #0f172a;">V${currentVersion.version_number} by ${currentVersion.uploader_name || 'Designer'}</strong>
                      <span style="color: #64748b; font-size: 0.74rem;"> · ${new Date(currentVersion.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style="color: #334155; font-style: italic;">
                      "${currentVersion.change_notes || 'Deliverable submission'}"
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- Sequential Version History List -->
              <div>
                <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; justify-content: space-between;">
                  <span>Sequential Versions (${versions.length})</span>
                  <span style="font-size: 0.74rem; color: #64748b; font-weight: 400;">All submissions preserved</span>
                </h4>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${versions.length > 0 ? versions.map((v) => {
                    const isSelected = currentVersion && currentVersion.id === v.id;
                    const vComments = comments.filter(c => c.version_id == v.id);
                    
                    let reviewBadge = '<span class="fin-badge neutral">Superseded</span>';
                    if (v.is_approved) {
                      reviewBadge = '<span class="fin-badge success">✓ Approved Final</span>';
                    } else if (v.is_current) {
                      if (t.status === 'Revision') reviewBadge = '<span class="fin-badge danger">⚠️ Revision Requested</span>';
                      else if (t.status === 'Submitted' || t.status === 'In Review') reviewBadge = '<span class="fin-badge warning">⏳ In Review</span>';
                      else reviewBadge = '<span class="fin-badge info">Current</span>';
                    }

                    return `
                      <div class="version-history-item ${isSelected ? 'selected' : ''}" style="background: ${isSelected ? '#f0fdf4' : '#ffffff'}; border: 1px solid ${isSelected ? '#86efac' : '#e2e8f0'}; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-weight: 800; font-family: monospace; font-size: 0.88rem; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px;">
                              V${v.version_number}
                            </span>
                            ${reviewBadge}
                            <span style="font-size: 0.74rem; color: #64748b;">
                              ${new Date(v.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div style="display: flex; align-items: center; gap: 6px;">
                            ${v.file_url ? `
                              <a href="${resolveMediaUrl(v.file_url)}" target="_blank" download class="fin-btn outline sm" style="font-size: 0.72rem; padding: 2px 8px;" title="Download deliverable file">
                                ⬇ Download
                              </a>
                            ` : ''}
                            <button type="button" class="fin-btn ${isSelected ? 'primary' : 'outline'} sm btn-inspect-version" data-version-id="${v.id}" style="font-size: 0.72rem; padding: 2px 8px;">
                              ${isSelected ? '👁 Inspecting' : '👁 Inspect'}
                            </button>
                          </div>
                        </div>

                        <div style="font-size: 0.8rem; color: #334155; line-height: 1.4; background: #f8fafc; padding: 4px 8px; border-radius: 4px;">
                          <span style="font-weight: 600; color: #475569;">Notes:</span> ${v.change_notes || 'Deliverable submission'}
                        </div>
                      </div>
                    `;
                  }).join('') : `
                    <div style="font-size: 0.82rem; color: #94a3b8; font-style: italic; text-align: center; padding: 16px; background: #f8fafc; border-radius: 6px;">
                      No deliverable versions submitted yet. Upload V1 above.
                    </div>
                  `}
                </div>
              </div>

            </div>

            <!-- ONE "Feedback & Revisions" Section -->
            <div class="fin-panel" style="margin-bottom: 0;">
              <div class="fin-panel-header">
                <div>
                  <div class="fin-panel-title">Feedback &amp; Revisions</div>
                  <div class="fin-panel-subtitle">Reviewer discussion and revision instructions</div>
                </div>
                <span class="fin-badge fin-badge-info" style="font-size: 0.74rem;">
                  ${versionComments.length} note${versionComments.length === 1 ? '' : 's'} on V${currentVersion ? currentVersion.version_number : 1}
                </span>
              </div>

              <!-- Comments Thread -->
              <div style="display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; margin-bottom: 12px;">
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
                  <div style="font-size: 0.82rem; color: #94a3b8; font-style: italic; text-align: center; padding: 20px;">
                    No feedback comments on Version V${currentVersion ? currentVersion.version_number : 1}.
                  </div>
                `}
              </div>

              <!-- Reply / Work Note Form -->
              <form id="form-add-comment" style="display: flex; gap: 8px;">
                <input type="text" id="input-new-comment" class="fin-input" placeholder="Add reply or clarification on this version..." style="flex: 1; font-size: 0.82rem;" required />
                <button type="submit" class="fin-btn primary sm" style="white-space: nowrap;">Send</button>
              </form>
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
      selectedUploadFile = null;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Scroll to upload section
    container.querySelector('#btn-scroll-to-upload')?.addEventListener('click', () => {
      const uploadSec = container.querySelector('#section-deliverable-submission');
      if (uploadSec) {
        uploadSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const dropzone = container.querySelector('#deliverable-dropzone');
        if (dropzone) {
          dropzone.style.borderColor = '#2563eb';
          dropzone.style.background = '#eff6ff';
          setTimeout(() => {
            dropzone.style.borderColor = '#009688';
            dropzone.style.background = '#f0fdf9';
          }, 1500);
        }
      }
    });

    // Inspect / Select version from history list
    container.querySelectorAll('.btn-inspect-version').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedVersionId = parseInt(btn.getAttribute('data-version-id'), 10);
        render();
      });
    });

    // Zoom preview image
    const triggerZoom = () => {
      const img = container.querySelector('#student-preview-img');
      if (img && img.src) {
        Swal.fire({
          imageUrl: img.src,
          imageAlt: 'Deliverable Preview',
          width: '90vw',
          padding: '1em',
          showConfirmButton: false,
          showCloseButton: true,
          background: '#0f172a'
        });
      }
    };
    container.querySelector('#btn-zoom-preview')?.addEventListener('click', triggerZoom);
    container.querySelector('#student-preview-img')?.addEventListener('click', triggerZoom);

    // Dropzone & File Input Handling
    const dropzone = container.querySelector('#deliverable-dropzone');
    const fileInput = container.querySelector('#deliverable-file-input');
    const fileDisplay = container.querySelector('#dropzone-file-display');
    const fileNameSpan = container.querySelector('#dropzone-file-name');
    const removeFileBtn = container.querySelector('#btn-remove-selected-file');

    const updateFileSelection = (file) => {
      if (!file) {
        selectedUploadFile = null;
        if (fileInput) fileInput.value = '';
        if (fileDisplay) fileDisplay.style.display = 'none';
        return;
      }

      // Validate size (max 50MB)
      if (file.size > 52428800) {
        showStudentError('File Too Large', 'Maximum deliverable file size is 50MB.');
        return;
      }

      selectedUploadFile = file;
      const sizeDisplay = file.size > 1048576 
        ? `${(file.size / 1048576).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      if (fileNameSpan) fileNameSpan.textContent = `📄 ${file.name} (${sizeDisplay})`;
      if (fileDisplay) fileDisplay.style.display = 'flex';
    };

    dropzone?.addEventListener('click', (e) => {
      if (e.target !== removeFileBtn) {
        fileInput?.click();
      }
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        updateFileSelection(e.target.files[0]);
      }
    });

    removeFileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      updateFileSelection(null);
    });

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#047857';
      dropzone.style.background = '#d1fae5';
    });

    dropzone?.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#009688';
      dropzone.style.background = '#f0fdf9';
    });

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#009688';
      dropzone.style.background = '#f0fdf9';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        updateFileSelection(e.dataTransfer.files[0]);
      }
    });

    // Submit Deliverable Version Handler
    container.querySelector('#btn-submit-deliverable')?.addEventListener('click', async () => {
      const urlInput = container.querySelector('#deliverable-external-url');
      const notesInput = container.querySelector('#deliverable-change-notes');
      const submitBtn = container.querySelector('#btn-submit-deliverable');

      const fileUrl = urlInput?.value.trim() || '';
      const notes = notesInput?.value.trim() || '';

      if (!selectedUploadFile && !fileUrl) {
        showStudentError('Deliverable Required', 'Please drag-and-drop a deliverable file or enter an external URL link.');
        return;
      }

      if (!notes || notes.length < 5) {
        showStudentError('Change Notes Required', 'Please provide at least 5 characters detailing what was created or changed in this version.');
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '⏳ Uploading &amp; Submitting...';
        }

        const formData = new FormData();
        if (selectedUploadFile) {
          formData.append('file', selectedUploadFile);
        }
        if (fileUrl) {
          formData.append('file_url', fileUrl);
        }
        formData.append('change_notes', notes);

        const res = await fetch(`${API_BASE}/student/design-tickets/${selectedTicketId}/versions`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: formData
        });

        const data = await res.json();
        if (!res.ok || data.status === 'error') {
          throw new Error(data.message || data.error || 'Failed to submit deliverable version.');
        }

        showStudentSuccess('Deliverable Submitted!', `Version V${data.version_number} has been submitted for review.`);
        selectedUploadFile = null;
        await loadDashboardKPIs();
        await loadTicketDetail(selectedTicketId);
        await loadTickets(pagination.current_page);
      } catch (err) {
        showStudentError('Submission Failed', err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      }
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
