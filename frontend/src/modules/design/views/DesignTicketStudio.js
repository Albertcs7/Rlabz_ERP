import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import { getStatusBadge, getPriorityBadge, getBallBadge } from '../utils/ticketModal.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignTicketStudio(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in design-studio-fullpage';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Extract ticket ID from route params or URL
  const pathParts = window.location.pathname.split('/');
  const ticketId = route?.params?.id || pathParts[pathParts.length - 1];

  let ticketDetail = null;
  let selectedVersionId = null;
  let teamMembers = [];

  async function loadData() {
    try {
      const [ticketRes, teamRes] = await Promise.all([
        fetch(`${API_BASE}/design/tickets/${ticketId}`, { headers }),
        fetch(`${API_BASE}/design/team-capacity`, { headers }).catch(() => null)
      ]);

      if (!ticketRes.ok) {
        renderError('Could not load creative studio ticket details.');
        return;
      }

      const tData = await ticketRes.json();
      if (tData.status !== 'success' || !tData.ticket) {
        renderError(tData.message || 'Ticket not found.');
        return;
      }

      ticketDetail = tData;

      if (teamRes && teamRes.ok) {
        const teamData = await teamRes.json();
        teamMembers = teamData.team || teamData.candidates || [];
      }

      render();
    } catch (err) {
      console.error('Error loading design ticket studio:', err);
      renderError('An unexpected network error occurred while loading ticket.');
    }
  }

  function renderError(msg) {
    container.innerHTML = `
      <div style="padding: 2.5rem; text-align: center; max-width: 600px; margin: 3rem auto; background: #fff; border-radius: 12px; border: 1px solid #fee2e2;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🎨⚠️</div>
        <h3 style="color: #991b1b; margin-bottom: 0.5rem;">Creative Studio Unavailable</h3>
        <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 1.5rem;">${msg}</p>
        <button class="design-btn design-btn-secondary" id="btn-err-back">← Return to Tickets</button>
      </div>
    `;
    container.querySelector('#btn-err-back')?.addEventListener('click', () => {
      if (router && typeof router.push === 'function') router.push('/design/tickets');
      else window.location.href = '/design/tickets';
    });
  }

  // Helper: Resolve media URL cleanly without hardcoded localhost
  function resolveMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
    if (url.startsWith('/storage/')) {
      const origin = API_BASE.replace(/\/api\/?$/, '');
      return `${origin}${url}`;
    }
    return url;
  }

  // Helper: Render Brand Colors without overflowing
  function renderBrandColors(palette) {
    if (!palette || !Array.isArray(palette) || palette.length === 0) return '';
    return `
      <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
        ${palette.map(item => {
          let hex = '#009688';
          let name = '';
          if (typeof item === 'string') {
            hex = item;
            name = item;
          } else if (typeof item === 'object' && item !== null) {
            hex = item.hex || item.value || '#009688';
            name = item.name ? `${item.name} (${hex})` : hex;
          }
          return `
            <div style="display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-family: monospace; max-width: 100%; box-sizing: border-box;" title="${typeof item === 'object' && item.usage ? item.usage : ''}">
              <span style="width: 12px; height: 12px; border-radius: 3px; background: ${hex}; border: 1px solid rgba(0,0,0,0.15); flex-shrink: 0;"></span>
              <span style="font-weight: 600; color: #1e293b; word-break: break-word;">${name}</span>
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

  // Helper: Render Brand Logos without overflowing
  function renderBrandLogos(logos) {
    if (!logos || !Array.isArray(logos) || logos.length === 0) return '';
    return `
      <div style="margin-top: 10px; width: 100%; box-sizing: border-box;">
        <div style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Brand Logos &amp; Assets</div>
        <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; box-sizing: border-box;">
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
                <div style="font-size: 0.72rem; background: #f1f5f9; color: #475569; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; line-height: 1.35; word-break: break-word; overflow-wrap: anywhere; width: 100%; max-width: 100%; box-sizing: border-box;">
                  ⏳ <strong>${title}${format}</strong><span style="color: #64748b; font-size: 0.7rem; display: block; margin-top: 2px;">${logo.note || 'Available Soon / Pending Division Upload'}</span>
                </div>
              `;
            }
            return `
              <a href="${url}" target="_blank" download class="design-btn design-btn-secondary design-btn-sm" style="font-size: 0.73rem; padding: 6px 10px; text-decoration: none; display: flex; align-items: flex-start; gap: 6px; width: 100%; max-width: 100%; box-sizing: border-box; white-space: normal !important; word-break: break-word; overflow-wrap: anywhere; text-align: left; line-height: 1.35; border-radius: 6px;">
                <span style="flex-shrink: 0; font-size: 0.85rem; line-height: 1.2;">📥</span>
                <span style="flex: 1; min-width: 0; word-break: break-word; overflow-wrap: anywhere; white-space: normal !important;">${title}${format}</span>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function render() {
    const t = ticketDetail.ticket;
    const versions = ticketDetail.versions || [];
    const comments = ticketDetail.comments || [];
    const auditLogs = ticketDetail.auditLogs || [];
    const brandKit = ticketDetail.brand_kit || ticketDetail.brandKit || null;

    const currentVersion = selectedVersionId
      ? (versions.find(v => v.id === selectedVersionId) || versions[versions.length - 1])
      : (versions.find(v => v.is_current) || versions[versions.length - 1]);

    const versionComments = currentVersion 
      ? comments.filter(c => c.version_id == currentVersion.id)
      : comments;

    const isSelfAssigned = storedUser && storedUser.id && (t.assigned_to == storedUser.id);
    const isStudent = storedUser && storedUser.role === 'student';
    const isDesignHead = storedUser && (storedUser.role === 'design_head' || storedUser.role === 'admin' || storedUser.role === 'developer');

    // Extract revision comments if applicable
    const revComments = comments.filter(c => (c.comment && c.comment.startsWith('REVISION REQUESTED:')) || c.is_revision_note);
    const latestRevComment = revComments.length > 0 ? revComments[revComments.length - 1] : null;
    const latestRevisionFeedback = latestRevComment ? latestRevComment.comment.replace('REVISION REQUESTED:', '').trim() : null;

    container.innerHTML = `
      <!-- Top Navigation & Header Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; background: #ffffff; padding: 1rem 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <button class="design-btn design-btn-secondary design-btn-sm" id="btn-back-tickets" style="display: flex; align-items: center; gap: 6px;">
            <span>←</span> ${isStudent ? 'My Design Workspace' : 'All Tickets'}
          </button>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-family: monospace; font-size: 1.25rem; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 3px 10px; border-radius: 6px;">
              ${t.ticket_number}
            </span>
            ${getStatusBadge(t.status)}
            ${getPriorityBadge(t.priority)}
            <span class="fin-badge neutral" style="text-transform: capitalize;">${(t.work_type || 'design').replace('_', ' ')}</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          ${!isStudent ? `
            <button class="design-btn design-btn-secondary design-btn-sm" id="btn-reassign-ticket" title="Reassign ticket to another designer">
              👤 Reassign Designer
            </button>
            <button class="design-btn design-btn-secondary design-btn-sm" id="btn-edit-deadline" title="Manage committed delivery date">
              📅 Manage Deadline
            </button>
          ` : `
            <span class="fin-badge neutral" style="font-size: 0.8rem; padding: 5px 12px;">
              🎨 Assigned Designer Workspace
            </span>
          `}
          ${(isStudent || isSelfAssigned) ? `
            <button class="design-btn design-btn-secondary design-btn-sm" id="btn-log-time" title="Log time against this design deliverable">
              ⏱️ Log Time (${parseFloat(t.actual_hours_logged || 0).toFixed(1)}h logged)
            </button>
          ` : `
            <span class="fin-badge neutral" style="font-size: 0.8rem; padding: 5px 12px;" title="Total creative hours logged by assigned designer">
              ⏱️ ${parseFloat(t.actual_hours_logged || 0).toFixed(1)}h logged
            </span>
          `}
        </div>
      </div>

      <!-- Main Studio 2-Column Split Workspace -->
      <div class="design-studio-grid" style="display: grid; grid-template-columns: minmax(280px, 340px) minmax(0, 1fr); gap: 1.25rem; align-items: start; width: 100%; max-width: 100%; box-sizing: border-box;">
        
        <!-- LEFT COLUMN: Workflow & Responsibility, Brief, Brand Kit & Activity History -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; max-width: 100%; box-sizing: border-box;">
          
          <!-- Workflow & Responsibility Card -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem;">
              <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">
                Workflow &amp; Responsibility
              </h4>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Current Ball:</span>
                ${getBallBadge(t.ball_is_with)}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Assigned Designer:</span>
                <strong style="color: #047857;">${t.assigned_to_name || 'Unassigned'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Requester:</span>
                <strong>${t.requester_name} (${t.requesting_division})</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Requested Deadline:</span>
                <strong>
                  ${t.required_by ? new Date(t.required_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible'}
                </strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Committed Delivery:</span>
                <strong style="color: #0284c7;">
                  ${t.committed_delivery_date ? new Date(t.committed_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending Confirmation'}
                </strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Logged Work Time:</span>
                <strong>${parseFloat(t.actual_hours_logged || 0).toFixed(1)} hrs</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Revisions Count:</span>
                <span class="fin-badge neutral">${t.revision_count || 0} rounds</span>
              </div>
            </div>
          </div>

          <!-- Creative Brief & Specifications (Rendered once per page) -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">
              Creative Brief &amp; Specifications
            </h4>
            
            <h5 style="margin: 0 0 6px 0; font-size: 1rem; color: #1e293b; font-weight: 700;">${t.title}</h5>
            ${t.description ? `
              <p style="margin: 0 0 1rem 0; font-size: 0.85rem; color: #475569; line-height: 1.5; white-space: pre-wrap;">${t.description}</p>
            ` : ''}

            ${t.final_copy ? `
              <div style="margin-bottom: 1rem; background: #f8fafc; border-left: 4px solid #0284c7; padding: 10px 12px; border-radius: 0 8px 8px 0;">
                <div style="font-size: 0.72rem; font-weight: 700; color: #0369a1; text-transform: uppercase; margin-bottom: 4px;">
                  Mandatory Copy / Headline Text:
                </div>
                <div style="font-size: 0.84rem; color: #1e293b; font-style: italic; white-space: pre-wrap;">${t.final_copy}</div>
              </div>
            ` : ''}

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; color: #475569; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #f1f5f9;">
              ${t.target_audience ? `
                <div>
                  <span style="color: #64748b; font-size: 0.72rem; display: block; font-weight: 600;">TARGET AUDIENCE</span>
                  <strong>${t.target_audience}</strong>
                </div>
              ` : ''}
              ${t.publishing_channel ? `
                <div>
                  <span style="color: #64748b; font-size: 0.72rem; display: block; font-weight: 600;">PUBLISHING CHANNEL</span>
                  <strong>${t.publishing_channel}</strong>
                </div>
              ` : ''}
              ${t.required_by ? `
                <div>
                  <span style="color: #64748b; font-size: 0.72rem; display: block; font-weight: 600;">REQUESTED DEADLINE</span>
                  <strong>${new Date(t.required_by).toLocaleDateString()}</strong>
                </div>
              ` : ''}
              <div>
                <span style="color: #64748b; font-size: 0.72rem; display: block; font-weight: 600;">COMMITTED DELIVERY</span>
                <strong style="color: #0284c7;">${t.committed_delivery_date ? new Date(t.committed_delivery_date).toLocaleDateString() : 'Pending'}</strong>
              </div>
              <div>
                <span style="color: #64748b; font-size: 0.72rem; display: block; font-weight: 600;">ESTIMATED EFFORT</span>
                <strong>${t.estimated_hours || 0} hrs</strong>
              </div>
            </div>

            ${(t.reference_link || t.reference_links) ? `
              <div style="margin-top: 1rem; font-size: 0.82rem;">
                <span style="color: #64748b; font-weight: 600;">Reference Link:</span>
                <a href="${t.reference_link || t.reference_links}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; word-break: break-all; margin-left: 4px;">
                  ${t.reference_link || t.reference_links} ↗
                </a>
              </div>
            ` : ''}
          </div>

          <!-- Compact Brand Kit Card (Rendered once per page) -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow: hidden; max-width: 100%; box-sizing: border-box;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">Brand Kit</h4>
              <span class="asset-brand-badge" style="font-size: 0.75rem; padding: 2px 8px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 4px; font-weight: 600;">
                🎨 ${t.brand_kit_name || 'RLabZ Core Brand'}
              </span>
            </div>

            <!-- Brand Kit Colors & Typography -->
            ${brandKit ? `
              <div style="margin-bottom: 0.75rem;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Color Swatches</div>
                ${renderBrandColors(brandKit.color_palette || brandKit.brand_colors)}
              </div>

              <div style="margin-bottom: 0.75rem;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Typography Rules</div>
                <div style="font-size: 0.78rem; color: #334155; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; margin-top: 3px;">
                  ${renderBrandTypography(brandKit.typography_rules || brandKit.typography)}
                </div>
              </div>

              ${renderBrandLogos(brandKit.logo_assets || brandKit.downloadable_kits)}
            ` : ''}

            ${t.project_title ? `
              <div style="margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid #f1f5f9;">
                <div style="font-size: 0.72rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Associated Project</div>
                <div style="font-size: 0.85rem; font-weight: 600; color: #1e293b; margin-top: 2px;">
                  📁 ${t.project_title}
                </div>
              </div>
            ` : ''}

            ${t.brand_constraints ? `
              <div style="margin-top: 0.75rem; background: #f0fdf4; border-left: 3px solid #10b981; padding: 8px 12px; border-radius: 0 6px 6px 0; font-size: 0.8rem; color: #065f46;">
                <strong>Brand Constraints:</strong> ${t.brand_constraints}
              </div>
            ` : ''}
          </div>

          <!-- Compact Activity History Timeline -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">
              Activity History
            </h4>
            <div style="max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
              ${auditLogs.length === 0 ? `
                <div style="color: #94a3b8; font-size: 0.8rem; text-align: center; padding: 1rem;">No activity recorded yet.</div>
              ` : auditLogs.map(log => `
                <div style="font-size: 0.78rem; padding: 6px 8px; background: #f8fafc; border-radius: 6px; border-left: 2px solid #94a3b8;">
                  <div style="display: flex; justify-content: space-between; color: #64748b;">
                    <strong>${log.actor_name || 'System'}</strong>
                    <span>${new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style="color: #1e293b; margin-top: 2px;">${log.action_details || log.action_type || 'Status updated'}</div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN: Single Consolidated Deliverable Review Section -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; max-width: 100%; box-sizing: border-box;">
          
          <!-- ONE Deliverable Review Section -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            
            <!-- Review Section Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a;">
                  Deliverable Review
                </h3>
                ${currentVersion?.is_approved ? '<span class="fin-badge success">✓ Approved Final</span>' : (currentVersion?.is_current ? '<span class="fin-badge blue">Current Review</span>' : '')}
                <span class="fin-badge neutral" style="font-size: 0.75rem;">${versions.length} Version${versions.length === 1 ? '' : 's'}</span>
              </div>

              <div style="display: flex; align-items: center; gap: 8px;">
                ${versions.length >= 2 ? `
                  <button class="design-btn design-btn-secondary design-btn-sm" id="btn-compare-versions">
                    📊 Side-by-Side Compare
                  </button>
                ` : ''}
                ${currentVersion?.file_url ? `
                  <a href="${resolveMediaUrl(currentVersion.file_url)}" target="_blank" download class="design-btn design-btn-secondary design-btn-sm" style="text-decoration: none;">
                    ⬇ Download Active
                  </a>
                ` : ''}
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
                  <span class="fin-badge danger">Target: V${currentVersion?.version_number || 1}</span>
                </div>
                <div style="font-size: 0.84rem; color: #7f1d1d; background: #fff5f5; border: 1px dashed #fca5a5; padding: 8px 12px; border-radius: 6px; line-height: 1.45; white-space: pre-wrap;">
                  ${latestRevisionFeedback || 'Please address reviewer feedback, adjust the creative deliverable, and upload the next version.'}
                </div>
              </div>
            ` : ''}

            <!-- Sequential Version Switcher Pills -->
            <div class="version-tabs-row" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 0.75rem;">
              ${versions.length === 0 ? `
                <span style="font-size: 0.85rem; color: #94a3b8; font-style: italic;">No deliverable versions submitted yet. Waiting for assigned designer to upload V1.</span>
              ` : versions.map(v => `
                <button class="version-chip-btn ${(currentVersion && currentVersion.id === v.id) ? 'active' : ''} ${v.is_approved ? 'approved' : ''}" data-version-id="${v.id}" style="padding: 6px 14px; font-weight: 700; border-radius: 8px; cursor: pointer;">
                  V${v.version_number} ${v.is_approved ? '✓ Approved' : (v.is_current ? '(Current)' : '')}
                </button>
              `).join('')}
            </div>

            <!-- Current Version Notes Bar -->
            ${currentVersion ? `
              <div style="background: #f1f5f9; border-radius: 8px; padding: 10px 14px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem;">
                <div>
                  <strong style="color: #0f172a;">Version V${currentVersion.version_number}</strong>
                  <span style="color: #64748b;"> · Uploaded by <strong>${currentVersion.uploader_name || 'Designer'}</strong> on ${new Date(currentVersion.created_at).toLocaleString()}</span>
                </div>
                <div style="color: #334155; font-style: italic;">
                  "${currentVersion.change_notes || 'Deliverable submission'}"
                </div>
              </div>
            ` : ''}

            <!-- Visual Preview & Version Feedback Split Grid -->
            <div style="display: grid; grid-template-columns: 1fr 340px; gap: 1.25rem; align-items: stretch; min-height: 480px; margin-bottom: 1.25rem;">
              
              <!-- Visual Media Preview Canvas -->
              <div style="display: flex; flex-direction: column; background: #0f172a; border-radius: 10px; overflow: hidden; position: relative; min-height: 460px; align-items: center; justify-content: center;">
                ${currentVersion ? (
                  (currentVersion.file_type === 'video' || (currentVersion.file_type && currentVersion.file_type.includes('video')) || (currentVersion.file_url && currentVersion.file_url.match(/\.(mp4|webm|mov|ogg|m4v)$/i))) ? `
                    <video src="${resolveMediaUrl(currentVersion.file_url)}" controls style="max-width: 100%; max-height: 500px; object-fit: contain;"></video>
                  ` : (currentVersion.file_type === 'pdf' || (currentVersion.file_url && currentVersion.file_url.match(/\.pdf$/i))) ? `
                    <div style="text-align: center; padding: 30px; color: #e2e8f0;">
                      <div style="font-size: 3rem; margin-bottom: 8px;">📄</div>
                      <div style="font-weight: 700; font-size: 1rem;">PDF Deliverable Document</div>
                      <div style="font-size: 0.8rem; color: #94a3b8; margin: 4px 0 14px 0;">${currentVersion.file_name || 'Document.pdf'}</div>
                      <a href="${resolveMediaUrl(currentVersion.file_url)}" target="_blank" download class="design-btn design-btn-primary design-btn-sm" style="text-decoration: none;">
                        Open / Download PDF ↗
                      </a>
                    </div>
                  ` : `
                    <img src="${resolveMediaUrl(currentVersion.file_url)}" alt="Version Preview" id="studio-preview-image" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';" style="max-width: 100%; max-height: 500px; object-fit: contain; cursor: zoom-in;" title="Click to view full size">
                  `
                ) : `
                  <div style="color: #94a3b8; text-align: center; padding: 3rem;">
                    <div style="font-size: 3rem; margin-bottom: 0.5rem;">🖼️</div>
                    <strong style="font-size: 1rem; color: #cbd5e1;">Awaiting Deliverable Submission</strong>
                    <p style="font-size: 0.85rem; margin-top: 4px; color: #64748b;">The assigned designer has not yet uploaded a deliverable version for this ticket.</p>
                  </div>
                `}

                ${currentVersion ? `
                  <div style="position: absolute; bottom: 12px; right: 12px; display: flex; gap: 6px; background: rgba(0,0,0,0.65); padding: 4px 8px; border-radius: 6px; backdrop-filter: blur(4px);">
                    <a href="${resolveMediaUrl(currentVersion.file_url)}" target="_blank" download class="design-btn design-btn-sm" style="background: rgba(255,255,255,0.2); color: #fff; font-size: 0.75rem; text-decoration: none;">
                      ⬇ Download
                    </a>
                    <button class="design-btn design-btn-sm" id="btn-fullscreen-preview" style="background: rgba(255,255,255,0.2); color: #fff; font-size: 0.75rem;">
                      🔍 Zoom
                    </button>
                  </div>
                ` : ''}
              </div>

              <!-- Threaded Version Comments & Feedback Panel -->
              <div style="display: flex; flex-direction: column; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; justify-content: space-between;">
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">
                    <h5 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">Version Feedback</h5>
                    <span style="font-size: 0.75rem; color: #0284c7; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
                      V${currentVersion ? currentVersion.version_number : 1}
                    </span>
                  </div>

                  <div class="comments-thread-list" style="max-height: 340px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
                    ${versionComments.length === 0 ? `
                      <div style="color: #94a3b8; font-size: 0.82rem; text-align: center; padding: 2.5rem 0;">
                        No feedback comments on this version yet. Add review notes below.
                      </div>
                    ` : versionComments.map(c => `
                      <div class="comment-card-item ${c.status === 'resolved' ? 'resolved' : ''}" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;">
                        <div class="comment-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                          <strong style="font-size: 0.8rem; color: #0f172a;">${c.author_name}</strong>
                          <button class="design-btn design-btn-sm btn-resolve-comment" data-id="${c.id}" style="padding: 1px 6px; font-size: 0.7rem; border-radius: 4px; border: 1px solid #cbd5e1; background: ${c.status === 'resolved' ? '#dcfce7' : '#ffffff'}; color: ${c.status === 'resolved' ? '#166534' : '#475569'};">
                            ${c.status === 'resolved' ? '✓ Resolved' : 'Mark Resolved'}
                          </button>
                        </div>
                        <div class="comment-body" style="font-size: 0.82rem; color: #334155; line-height: 1.4;">${c.comment}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Post Feedback Input Box -->
                <div style="margin-top: 0.75rem; border-top: 1px solid #e2e8f0; padding-top: 0.75rem;">
                  <textarea id="studio-input-comment" class="design-input" rows="2" placeholder="Type design review comment or feedback..." style="width: 100%; font-size: 0.82rem; margin-bottom: 6px; box-sizing: border-box; resize: vertical;"></textarea>
                  <button class="design-btn design-btn-primary design-btn-sm" id="btn-post-comment" data-version-id="${currentVersion ? currentVersion.id : ''}" style="width: 100%;">
                    Post Feedback
                  </button>
                </div>
              </div>

            </div>

            <!-- Review Actions & Sign-Off Footer -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
              <div>
                <strong style="color: #0f172a; font-size: 0.95rem;">Review &amp; Sign-Off Actions</strong>
                <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #64748b;">
                  ${t.status === 'Approved' ? 'This deliverable is signed off and archived into the Asset Library.' : 'Evaluate the deliverable against the creative brief, request revisions, or grant sign-off.'}
                </p>
              </div>

              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                ${isSelfAssigned ? `
                  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 12px; font-size: 0.8rem; color: #991b1b;">
                    🚫 <strong>Self-Approval Prevented:</strong> You are the assigned designer on this ticket.
                  </div>
                ` : (t.status !== 'Approved' && t.status !== 'Closed' && t.status !== 'Cancelled') ? `
                  <button class="design-btn design-btn-danger" id="btn-studio-reject" title="Request revision round from designer">
                    Request Revision Round
                  </button>
                  <button class="design-btn design-btn-success" id="btn-studio-approve" title="Sign off and archive to Asset Library">
                    ✓ Approve Deliverable
                  </button>
                  <button class="design-btn design-btn-secondary design-btn-sm" id="btn-studio-hold" title="Place ticket on hold">
                    ⏸️ On Hold
                  </button>
                  <button class="design-btn design-btn-secondary design-btn-sm" id="btn-studio-cancel" style="color: #dc2626; border-color: #fecaca;" title="Cancel ticket">
                    ❌ Cancel
                  </button>
                ` : `
                  <span class="fin-badge ${t.status === 'Approved' ? 'success' : 'neutral'}" style="font-size: 0.85rem; padding: 6px 14px;">
                    ${t.status === 'Approved' ? '✓ Officially Approved' : `Status: ${t.status}`}
                  </span>
                `}
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    // Wire Interactive Actions
    wireActions(t, versions, currentVersion, isStudent);
  }

  function wireActions(t, versions, currentVersion, isStudent) {
    // Back navigation
    container.querySelector('#btn-back-tickets')?.addEventListener('click', () => {
      if (isStudent) {
        if (router && typeof router.push === 'function') router.push('/student/design');
        else window.location.href = '/student/design';
      } else {
        if (router && typeof router.push === 'function') router.push('/design/tickets');
        else window.location.href = '/design/tickets';
      }
    });

    // Version switcher pills
    container.querySelectorAll('.version-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedVersionId = parseInt(btn.dataset.versionId);
        render();
      });
    });

    // Post feedback comment
    container.querySelector('#btn-post-comment')?.addEventListener('click', async () => {
      const inp = container.querySelector('#studio-input-comment');
      const val = inp?.value.trim();
      const verId = currentVersion?.id;
      if (!val) {
        Swal.fire('Empty Comment', 'Please write a comment before posting.', 'warning');
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/design/tickets/${t.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ version_id: verId, comment: val })
        });
        const cData = await res.json();
        if (cData.status === 'success') {
          const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers });
          ticketDetail = await refreshRes.json();
          render();
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Resolve comment
    container.querySelectorAll('.btn-resolve-comment').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cId = btn.dataset.id;
        try {
          await fetch(`${API_BASE}/design/comments/${cId}/resolve`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
          });
          const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers });
          ticketDetail = await refreshRes.json();
          render();
        } catch (err) {
          console.error(err);
        }
      });
    });

    // Side-by-Side Compare
    container.querySelector('#btn-compare-versions')?.addEventListener('click', () => {
      if (versions.length < 2) {
        Swal.fire('Comparison Requires Multiple Versions', 'At least 2 versions are needed to run a side-by-side comparison.', 'info');
        return;
      }
      const vA = versions[0];
      const vB = versions[versions.length - 1];

      Swal.fire({
        title: `Side-by-Side Comparison: V${vA.version_number} vs V${vB.version_number}`,
        width: '960px',
        html: `
          <div class="compare-container-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:16px; text-align:center;">
            <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0;">
              <span style="font-weight:700; color:#0f172a; display:block; margin-bottom:8px;">Version V${vA.version_number} (Initial)</span>
              <img src="${resolveMediaUrl(vA.file_url)}" alt="Version A" style="max-width:100%; max-height:360px; object-fit:contain; border-radius:6px;">
              <div style="font-size:0.8rem; color:#64748b; margin-top:8px;">${vA.change_notes || 'Initial draft'}</div>
            </div>
            <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0;">
              <span style="font-weight:700; color:#0f172a; display:block; margin-bottom:8px;">Version V${vB.version_number} (Current)</span>
              <img src="${resolveMediaUrl(vB.file_url)}" alt="Version B" style="max-width:100%; max-height:360px; object-fit:contain; border-radius:6px;">
              <div style="font-size:0.8rem; color:#64748b; margin-top:8px;">${vB.change_notes || 'Revision draft'}</div>
            </div>
          </div>
        `,
        confirmButtonColor: '#059669',
        confirmButtonText: 'Done Comparing'
      });
    });

    // Zoom Preview
    const zoomImg = container.querySelector('#studio-preview-image');
    const zoomBtn = container.querySelector('#btn-fullscreen-preview');
    const triggerZoom = () => {
      if (!currentVersion || !currentVersion.file_url) return;
      Swal.fire({
        imageUrl: resolveMediaUrl(currentVersion.file_url),
        imageAlt: 'Deliverable High Resolution',
        width: '90vw',
        padding: '1rem',
        showConfirmButton: false,
        showCloseButton: true
      });
    };
    zoomImg?.addEventListener('click', triggerZoom);
    zoomBtn?.addEventListener('click', triggerZoom);

    // Reassign Designer
    container.querySelector('#btn-reassign-ticket')?.addEventListener('click', async () => {
      let optionsHtml = '<option value="">-- Select Team Member --</option>';
      teamMembers.forEach(m => {
        const uid = m.user_id || m.id;
        optionsHtml += `<option value="${uid}" ${uid == t.assigned_to ? 'selected' : ''}>${m.name} (${m.role || m.email || ''})</option>`;
      });

      const { value: formValues } = await Swal.fire({
        title: 'Reassign Creative Ticket',
        html: `
          <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Select Assigned Designer</label>
              <select id="swal-reassign-user" class="swal2-select" style="margin:0; width:100%;">
                ${optionsHtml}
              </select>
            </div>
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Mandatory Reassignment Reason</label>
              <textarea id="swal-reassign-reason" class="swal2-textarea" placeholder="Reason for reallocating ticket (e.g. Skill alignment, bandwidth)..." style="margin:0; width:100%; box-sizing:border-box;"></textarea>
            </div>
          </div>
        `,
        focusConfirm: false,
        preConfirm: () => {
          const assigned_to = document.getElementById('swal-reassign-user').value;
          const reason = document.getElementById('swal-reassign-reason').value.trim();
          if (!assigned_to) {
            Swal.showValidationMessage('Please select a designer');
            return false;
          }
          if (!reason || reason.length < 5) {
            Swal.showValidationMessage('A clear reassignment reason is required');
            return false;
          }
          return { assigned_to, reason };
        },
        showCancelButton: true,
        confirmButtonText: 'Confirm Reassignment',
        confirmButtonColor: '#0284c7'
      });

      if (formValues) {
        try {
          const res = await fetch(`${API_BASE}/design/tickets/${t.id}/reassign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(formValues)
          });
          const data = await res.json();
          if (data.status === 'success') {
            Swal.fire('Reassigned', data.message, 'success');
            const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers });
            ticketDetail = await refreshRes.json();
            render();
          } else {
            Swal.fire('Error', data.message || 'Failed to reassign ticket', 'error');
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    // Manage Committed Deadline
    container.querySelector('#btn-edit-deadline')?.addEventListener('click', async () => {
      const defaultDate = t.committed_delivery_date ? t.committed_delivery_date.substring(0, 10) : '';

      const { value: formValues } = await Swal.fire({
        title: 'Manage Committed Delivery Date',
        html: `
          <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Committed Delivery Date</label>
              <input type="date" id="swal-deadline-date" class="swal2-input" value="${defaultDate}" style="margin:0; width:100%; box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Reason for Deadline Adjustment (Optional)</label>
              <textarea id="swal-deadline-reason" class="swal2-textarea" placeholder="Reason for adjusting delivery schedule..." style="margin:0; width:100%; box-sizing:border-box;"></textarea>
            </div>
          </div>
        `,
        focusConfirm: false,
        preConfirm: () => {
          const dateVal = document.getElementById('swal-deadline-date').value;
          const reason = document.getElementById('swal-deadline-reason').value.trim();
          if (!dateVal) {
            Swal.showValidationMessage('Please pick a valid delivery date');
            return false;
          }
          return { committed_delivery_date: dateVal, reason };
        },
        showCancelButton: true,
        confirmButtonText: 'Update Deadline',
        confirmButtonColor: '#0284c7'
      });

      if (formValues) {
        try {
          const res = await fetch(`${API_BASE}/design/tickets/${t.id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              assigned_to: t.assigned_to,
              committed_delivery_date: formValues.committed_delivery_date,
              estimated_hours: t.estimated_hours,
              reason: formValues.reason || 'Committed delivery date updated by Design Head'
            })
          });
          const data = await res.json();
          if (res.ok && data.status === 'success') {
            Swal.fire('Deadline Updated', data.message || 'Committed delivery date updated.', 'success');
            const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers });
            ticketDetail = await refreshRes.json();
            render();
          } else {
            Swal.fire('Error', data.message || 'Failed to update delivery date', 'error');
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    // Log Time
    container.querySelector('#btn-log-time')?.addEventListener('click', async () => {
      const { value: formValues } = await Swal.fire({
        title: 'Log Design Work Time',
        html: `
          <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Hours Spent</label>
              <input id="swal-hours" type="number" step="0.25" min="0.25" max="24" class="swal2-input" placeholder="e.g. 2.5" style="margin:0; width:100%; box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Activity Description</label>
              <textarea id="swal-desc" class="swal2-textarea" placeholder="Detailed creative activity performed..." style="margin:0; width:100%; box-sizing:border-box;"></textarea>
            </div>
          </div>
        `,
        focusConfirm: false,
        preConfirm: () => {
          const hours = document.getElementById('swal-hours').value;
          const description = document.getElementById('swal-desc').value.trim();
          if (!hours || parseFloat(hours) <= 0) {
            Swal.showValidationMessage('Please enter valid hours spent');
            return false;
          }
          if (!description) {
            Swal.showValidationMessage('Please describe work performed');
            return false;
          }
          return { hours, description };
        },
        showCancelButton: true,
        confirmButtonText: 'Record Time Log',
        confirmButtonColor: '#059669'
      });

      if (formValues) {
        try {
          const res = await fetch(`${API_BASE}/design/tickets/${t.id}/time-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(formValues)
          });
          const data = await res.json();
          if (data.status === 'success') {
            Swal.fire('Time Logged', data.message, 'success');
            const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers });
            ticketDetail = await refreshRes.json();
            render();
          } else {
            Swal.fire('Error', data.message || 'Failed to record time', 'error');
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    // Approve Deliverable
    container.querySelector('#btn-studio-approve')?.addEventListener('click', async () => {
      const confirm = await Swal.fire({
        title: 'Approve & Archive Deliverable?',
        text: 'This will approve the current design deliverable, auto-package export formats, and archive into the official Asset Library.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        confirmButtonText: 'Yes, Sign Off Deliverable'
      });

      if (confirm.isConfirmed) {
        try {
          const aRes = await fetch(`${API_BASE}/design/tickets/${t.id}/approve`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
          const aData = await aRes.json();
          if (aData.status === 'success') {
            Swal.fire('Approved', aData.message, 'success');
            const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers });
            ticketDetail = await refreshRes.json();
            render();
          } else {
            Swal.fire('Policy Block', aData.message || 'Deliverable approval rejected by policy', 'error');
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    // Request Revision
    container.querySelector('#btn-studio-reject')?.addEventListener('click', async () => {
      const { value: reason } = await Swal.fire({
        title: 'Open Revision Round',
        input: 'textarea',
        inputLabel: 'Mandatory Feedback & Changes Requested',
        inputPlaceholder: 'Detail specifically what needs to be changed in the next version...',
        inputValidator: (val) => {
          if (!val || val.length < 5) return 'Written reason is mandatory to request revision!';
        },
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Request Revision Round'
      });

      if (reason) {
        try {
          const rRes = await fetch(`${API_BASE}/design/tickets/${t.id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ rejection_reason: reason })
          });
          const rData = await rRes.json();
          if (rData.status === 'success') {
            Swal.fire('Revision Requested', rData.message, 'success');
            const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers });
            ticketDetail = await refreshRes.json();
            render();
          } else {
            Swal.fire('Error', rData.message || 'Failed to request revision', 'error');
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    // On Hold
    container.querySelector('#btn-studio-hold')?.addEventListener('click', async () => {
      const { value: reason } = await Swal.fire({
        title: 'Place Ticket On Hold',
        input: 'textarea',
        inputLabel: 'Mandatory Reason for Hold',
        inputPlaceholder: 'State reason (e.g. Awaiting client assets, event postponed)...',
        inputValidator: (val) => {
          if (!val || val.trim().length < 5) return 'Reason is mandatory to place ticket on hold.';
        },
        showCancelButton: true,
        confirmButtonText: 'Confirm Hold',
        confirmButtonColor: '#d97706'
      });

      if (reason) {
        try {
          const res = await fetch(`${API_BASE}/design/tickets/${t.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: 'On Hold', reason })
          });
          const data = await res.json();
          if (data.status === 'success') {
            Swal.fire('On Hold', 'Ticket placed on hold.', 'success');
            const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers });
            ticketDetail = await refreshRes.json();
            render();
          } else {
            Swal.fire('Error', data.message || 'Failed to update status', 'error');
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    // Cancel Ticket
    container.querySelector('#btn-studio-cancel')?.addEventListener('click', async () => {
      const { value: reason } = await Swal.fire({
        title: 'Cancel Creative Request',
        input: 'textarea',
        inputLabel: 'Mandatory Cancellation Reason',
        inputPlaceholder: 'State cancellation reason (e.g. Event cancelled by organizer)...',
        inputValidator: (val) => {
          if (!val || val.trim().length < 5) return 'Reason is mandatory to cancel ticket.';
        },
        showCancelButton: true,
        confirmButtonText: 'Confirm Cancellation',
        confirmButtonColor: '#dc2626'
      });

      if (reason) {
        try {
          const res = await fetch(`${API_BASE}/design/tickets/${t.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: 'Cancelled', reason })
          });
          const data = await res.json();
          if (data.status === 'success') {
            Swal.fire('Cancelled', 'Ticket has been cancelled.', 'info');
            const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers });
            ticketDetail = await refreshRes.json();
            render();
          } else {
            Swal.fire('Error', data.message || 'Failed to cancel ticket', 'error');
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  loadData();
  return container;
}

export default DesignTicketStudio;
