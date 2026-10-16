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
        fetch(`${API_BASE}/design/team-candidates`, { headers }).catch(() => null)
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
        teamMembers = teamData.candidates || [];
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

  function render() {
    const t = ticketDetail.ticket;
    const versions = ticketDetail.versions || [];
    const comments = ticketDetail.comments || [];
    const auditLogs = ticketDetail.auditLogs || [];

    const currentVersion = selectedVersionId
      ? (versions.find(v => v.id === selectedVersionId) || versions[versions.length - 1])
      : (versions.find(v => v.is_current) || versions[versions.length - 1]);

    const versionComments = currentVersion 
      ? comments.filter(c => c.version_id == currentVersion.id)
      : comments;

    const isSelfAssigned = storedUser && storedUser.id && (t.assigned_to == storedUser.id);

    container.innerHTML = `
      <!-- Top Navigation & Header Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; background: #ffffff; padding: 1rem 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <button class="design-btn design-btn-secondary design-btn-sm" id="btn-back-tickets" style="display: flex; align-items: center; gap: 6px;">
            <span>←</span> All Tickets
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
          <button class="design-btn design-btn-secondary design-btn-sm" id="btn-reassign-ticket" title="Reassign ticket to another designer">
            👤 Reassign Designer
          </button>
          <button class="design-btn design-btn-secondary design-btn-sm" id="btn-log-time" title="Log time against this design deliverable">
            ⏱️ Log Time (${parseFloat(t.actual_hours_logged || 0).toFixed(1)}h logged)
          </button>
        </div>
      </div>

      <!-- Main Studio 2-Column Split Workspace -->
      <div style="display: grid; grid-template-columns: minmax(320px, 380px) 1fr; gap: 1.5rem; align-items: start;">
        
        <!-- LEFT COLUMN: Comprehensive Creative Brief, Specs, Brand Kit & Activity -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Quick Status & Ball Card -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <h4 style="margin: 0 0 1rem 0; font-size: 0.95rem; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem;">
              Workflow &amp; Responsibility
            </h4>
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
                <span style="color: #64748b;">Committed Delivery:</span>
                <strong>${t.committed_delivery_date ? new Date(t.committed_delivery_date).toLocaleDateString() : 'Pending'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Revisions Count:</span>
                <span class="fin-badge neutral">${t.revision_count || 0} rounds</span>
              </div>
            </div>
          </div>

          <!-- Project & Brand Guidelines Card -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">Brand &amp; Project Context</h4>
              <a href="/design/brand-kit" class="design-btn design-btn-secondary design-btn-sm" style="font-size: 0.72rem; padding: 2px 8px;">
                Tokens ↗
              </a>
            </div>
            
            <div style="margin-bottom: 0.75rem;">
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Applicable Brand Kit</div>
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                <span class="asset-brand-badge" style="font-size: 0.85rem; padding: 3px 10px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 6px; font-weight: 600;">
                  🎨 ${t.brand_kit_name || 'RLabZ Core Platform'}
                </span>
              </div>
            </div>

            ${t.project_title ? `
              <div style="margin-bottom: 0.75rem;">
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Associated Project</div>
                <div style="font-size: 0.88rem; font-weight: 600; color: #1e293b; margin-top: 2px;">
                  📁 ${t.project_title}
                </div>
              </div>
            ` : ''}

            ${t.brand_constraints ? `
              <div style="background: #f0fdf4; border-left: 3px solid #10b981; padding: 8px 12px; border-radius: 0 6px 6px 0; font-size: 0.8rem; color: #065f46;">
                <strong>Brand Constraints:</strong> ${t.brand_constraints}
              </div>
            ` : ''}
          </div>

          <!-- Full Creative Brief & Copy -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">
              Creative Brief &amp; Specifications
            </h4>
            
            <h5 style="margin: 0 0 6px 0; font-size: 1rem; color: #1e293b;">${t.title}</h5>
            <p style="margin: 0 0 1rem 0; font-size: 0.85rem; color: #475569; line-height: 1.5; white-space: pre-wrap;">${t.description || 'No description provided.'}</p>

            ${t.final_copy ? `
              <div style="margin-bottom: 1rem; background: #f8fafc; border-left: 4px solid #0284c7; padding: 10px 12px; border-radius: 0 8px 8px 0;">
                <div style="font-size: 0.75rem; font-weight: 700; color: #0369a1; text-transform: uppercase; margin-bottom: 4px;">
                  Mandatory Copy / Text to Include:
                </div>
                <div style="font-size: 0.85rem; color: #1e293b; font-style: italic; white-space: pre-wrap;">${t.final_copy}</div>
              </div>
            ` : ''}

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; color: #475569; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #f1f5f9;">
              <div>
                <span style="color: #64748b; font-size: 0.72rem; display: block;">TARGET AUDIENCE</span>
                <strong>${t.target_audience || 'General public'}</strong>
              </div>
              <div>
                <span style="color: #64748b; font-size: 0.72rem; display: block;">PUBLISHING CHANNEL</span>
                <strong>${t.publishing_channel || 'Digital / Print'}</strong>
              </div>
              <div>
                <span style="color: #64748b; font-size: 0.72rem; display: block;">REQUIRED BY</span>
                <strong>${t.required_by ? new Date(t.required_by).toLocaleDateString() : 'N/A'}</strong>
              </div>
              <div>
                <span style="color: #64748b; font-size: 0.72rem; display: block;">ESTIMATED HOURS</span>
                <strong>${t.estimated_hours || 0} hrs</strong>
              </div>
            </div>

            ${t.reference_links ? `
              <div style="margin-top: 1rem; font-size: 0.82rem;">
                <span style="color: #64748b; font-weight: 600;">Reference Link:</span>
                <a href="${t.reference_links}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; word-break: break-all; margin-left: 4px;">
                  ${t.reference_links} ↗
                </a>
              </div>
            ` : ''}
          </div>

          <!-- Chronological Audit Log Strip -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">
              Activity &amp; Audit Trail
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

        <!-- RIGHT COLUMN: Expansive Deliverable Versions, Full Preview, Feedback & Lifecycle Bar -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Versions & Upload Bar -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <h4 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: #0f172a;">
                  Deliverable Versions (${versions.length})
                </h4>
                ${currentVersion?.is_approved ? '<span class="fin-badge success">✓ Final Approved</span>' : (currentVersion?.is_current ? '<span class="fin-badge blue">Current Review</span>' : '')}
              </div>

              <div style="display: flex; align-items: center; gap: 8px;">
                <button class="design-btn design-btn-secondary design-btn-sm" id="btn-compare-versions">
                  📊 Side-by-Side Compare
                </button>
                <button class="design-btn design-btn-primary design-btn-sm" id="btn-upload-version">
                  + Upload New Version
                </button>
              </div>
            </div>

            <!-- Version Switcher Pills -->
            <div class="version-tabs-row" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 0.75rem;">
              ${versions.length === 0 ? `
                <span style="font-size: 0.85rem; color: #94a3b8; font-style: italic;">No deliverable versions submitted yet. Click "+ Upload New Version" to upload V1.</span>
              ` : versions.map(v => `
                <button class="version-chip-btn ${(currentVersion && currentVersion.id === v.id) ? 'active' : ''} ${v.is_approved ? 'approved' : ''}" data-version-id="${v.id}" style="padding: 6px 14px; font-weight: 700; border-radius: 8px; cursor: pointer;">
                  V${v.version_number} ${v.is_approved ? '✓ Approved' : (v.is_current ? '(Current)' : '')}
                </button>
              `).join('')}
            </div>

            <!-- Current Version Notes Bar -->
            ${currentVersion ? `
              <div style="background: #f1f5f9; border-radius: 8px; padding: 10px 14px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                  <strong style="color: #0f172a;">Version V${currentVersion.version_number}</strong>
                  <span style="color: #64748b;"> · Uploaded by <strong>${currentVersion.uploader_name || 'Designer'}</strong> on ${new Date(currentVersion.created_at).toLocaleString()}</span>
                </div>
                <div style="color: #334155; font-style: italic;">
                  "${currentVersion.change_notes || 'Deliverable submission'}"
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Full Screen Deliverable Preview & Feedback Grid -->
          <div style="display: grid; grid-template-columns: 1fr 340px; gap: 1.25rem; align-items: stretch; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03); min-height: 520px;">
            
            <!-- Visual Media Preview Container -->
            <div style="display: flex; flex-direction: column; background: #0f172a; border-radius: 10px; overflow: hidden; position: relative; min-height: 480px; align-items: center; justify-content: center;">
              ${currentVersion ? (
                currentVersion.file_type === 'video' ? `
                  <video src="${currentVersion.file_url}" controls style="max-width: 100%; max-height: 520px; object-fit: contain;"></video>
                ` : `
                  <img src="${currentVersion.file_url}" alt="Version Preview" id="studio-preview-image" style="max-width: 100%; max-height: 520px; object-fit: contain; cursor: zoom-in;" title="Click to view full size">
                `
              ) : `
                <div style="color: #94a3b8; text-align: center; padding: 3rem;">
                  <div style="font-size: 3rem; margin-bottom: 0.5rem;">🖼️</div>
                  <strong style="font-size: 1rem; color: #cbd5e1;">Awaiting Deliverable Draft</strong>
                  <p style="font-size: 0.85rem; margin-top: 4px; color: #64748b;">Upload a graphic deliverable draft to preview and review feedback.</p>
                </div>
              `}

              ${currentVersion ? `
                <div style="position: absolute; bottom: 12px; right: 12px; display: flex; gap: 6px; background: rgba(0,0,0,0.65); padding: 4px 8px; border-radius: 6px; backdrop-filter: blur(4px);">
                  <a href="${currentVersion.file_url}" target="_blank" download class="design-btn design-btn-sm" style="background: rgba(255,255,255,0.2); color: #fff; font-size: 0.75rem; text-decoration: none;">
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
                  <h5 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">Feedback Thread</h5>
                  <span style="font-size: 0.75rem; color: #0284c7; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
                    V${currentVersion ? currentVersion.version_number : 1}
                  </span>
                </div>

                <div class="comments-thread-list" style="max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
                  ${versionComments.length === 0 ? `
                    <div style="color: #94a3b8; font-size: 0.82rem; text-align: center; padding: 2.5rem 0;">
                      No feedback comments on this version yet. Add precise feedback below.
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

          <!-- Lifecycle, Approval, Revisions & Sign-Off Actions Bar -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div>
              <h4 style="margin: 0 0 4px 0; font-size: 1rem; font-weight: 700; color: #0f172a;">
                Lifecycle, Approval &amp; Sign-Off
              </h4>
              <p style="margin: 0; font-size: 0.82rem; color: #64748b;">
                Approving the deliverable archives it into the official Asset Library with auto-generated packaged formats.
              </p>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              ${isSelfAssigned ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 14px; font-size: 0.82rem; color: #991b1b; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.2rem;">🚫</span>
                  <span><strong>Self-Approval Prevented:</strong> You are the assigned designer on this ticket. Another lead or requester must approve.</span>
                </div>
              ` : `
                <button class="design-btn design-btn-danger" id="btn-studio-reject" title="Request revision round from designer">
                  Request Revision Round
                </button>
                <button class="design-btn design-btn-success" id="btn-studio-approve" title="Sign off and archive to Asset Library">
                  ✓ Approve Deliverable
                </button>
              `}

              ${!['Approved', 'Closed', 'Cancelled'].includes(t.status) ? `
                <button class="design-btn design-btn-secondary design-btn-sm" id="btn-studio-hold" title="Place ticket on hold">
                  ⏸️ On Hold
                </button>
                <button class="design-btn design-btn-secondary design-btn-sm" id="btn-studio-cancel" style="color: #dc2626; border-color: #fecaca;" title="Cancel ticket">
                  ❌ Cancel Ticket
                </button>
              ` : ''}
            </div>
          </div>

        </div>

      </div>
    `;

    // Wire Interactive Actions
    wireActions(t, versions, currentVersion);
  }

  function wireActions(t, versions, currentVersion) {
    // Back to Tickets
    container.querySelector('#btn-back-tickets')?.addEventListener('click', () => {
      if (router && typeof router.push === 'function') router.push('/design/tickets');
      else window.location.href = '/design/tickets';
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

    // Upload sequential version
    container.querySelector('#btn-upload-version')?.addEventListener('click', async () => {
      const { value: formValues } = await Swal.fire({
        title: 'Upload Sequential Deliverable Version',
        html: `
          <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Deliverable Image / Cloud URL *</label>
              <input id="swal-file-url" class="swal2-input" placeholder="https://drive.google.com/... or cloud deliverable URL" value="" style="margin:0; width:100%; box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Change Notes (What was updated?)</label>
              <textarea id="swal-notes" class="swal2-textarea" placeholder="Detail changes made in this revision..." style="margin:0; width:100%; box-sizing:border-box;"></textarea>
            </div>
          </div>
        `,
        focusConfirm: false,
        preConfirm: () => {
          const file_url = document.getElementById('swal-file-url').value.trim();
          const change_notes = document.getElementById('swal-notes').value.trim();
          if (!file_url || !change_notes) {
            Swal.showValidationMessage('Both deliverable URL and change notes are required');
          }
          return { file_url, change_notes };
        },
        showCancelButton: true,
        confirmButtonText: 'Upload Version',
        confirmButtonColor: '#059669'
      });

      if (formValues) {
        try {
          const uRes = await fetch(`${API_BASE}/design/tickets/${t.id}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(formValues)
          });
          const uData = await uRes.json();
          if (uData.status === 'success') {
            Swal.fire('Success', uData.message, 'success');
            const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers });
            ticketDetail = await refreshRes.json();
            render();
          } else {
            Swal.fire('Upload Error', uData.message || 'Failed to upload version', 'error');
          }
        } catch (e) {
          console.error(e);
        }
      }
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
              <img src="${vA.file_url}" alt="Version A" style="max-width:100%; max-height:360px; object-fit:contain; border-radius:6px;">
              <div style="font-size:0.8rem; color:#64748b; margin-top:8px;">${vA.change_notes || 'Initial draft'}</div>
            </div>
            <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0;">
              <span style="font-weight:700; color:#0f172a; display:block; margin-bottom:8px;">Version V${vB.version_number} (Current)</span>
              <img src="${vB.file_url}" alt="Version B" style="max-width:100%; max-height:360px; object-fit:contain; border-radius:6px;">
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
      if (!currentVersion) return;
      Swal.fire({
        imageUrl: currentVersion.file_url,
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
        optionsHtml += `<option value="${m.id}" ${m.id == t.assigned_to ? 'selected' : ''}>${m.name} (${m.email})</option>`;
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
