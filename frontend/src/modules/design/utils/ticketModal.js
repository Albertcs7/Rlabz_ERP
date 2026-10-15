import { API_BASE } from '@/core/config/api.js';
import Swal from 'sweetalert2';
import '../design.css';

export function getStatusBadge(status) {
  const map = {
    'New': 'blue',
    'Assigned': 'purple',
    'In Progress': 'indigo',
    'Submitted': 'warning',
    'In Review': 'warning',
    'Revision': 'danger',
    'Approved': 'success',
    'Closed': 'neutral',
    'On Hold': 'neutral',
    'Cancelled': 'danger'
  };
  return `<span class="fin-badge ${map[status] || 'neutral'}">${status}</span>`;
}

export function getPriorityBadge(priority) {
  const map = {
    'normal': 'neutral',
    'high': 'warning',
    'urgent': 'danger'
  };
  return `<span class="fin-badge ${map[priority] || 'neutral'}" style="text-transform:uppercase;">${priority}</span>`;
}

export function getBallBadge(ball) {
  const b = ball || 'requester';
  return `<span class="design-ball-pill ${b}">● ${b.replace('_', ' ').toUpperCase()}</span>`;
}

/**
 * Open the complete Ticket Studio Modal (Versions, Previews, Feedback & Sign-off)
 */
export async function openTicketStudioModal(ticketId, onUpdate) {
  const token = localStorage.getItem('token');
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  try {
    const res = await fetch(`${API_BASE}/design/tickets/${ticketId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      Swal.fire('Error', 'Could not load ticket details', 'error');
      return;
    }
    const data = await res.json();
    if (data.status !== 'success') return;

    let ticketDetail = data;
    let selectedVersionId = null;

    const modalHost = document.createElement('div');
    modalHost.id = 'ticket-studio-modal-host';
    document.body.appendChild(modalHost);

    const renderModal = () => {
      const t = ticketDetail.ticket;
      const versions = ticketDetail.versions || [];
      const comments = ticketDetail.comments || [];

      const currentVersion = selectedVersionId
        ? (versions.find(v => v.id === selectedVersionId) || versions[versions.length - 1])
        : (versions.find(v => v.is_current) || versions[versions.length - 1]);

      const versionComments = currentVersion 
        ? comments.filter(c => c.version_id == currentVersion.id)
        : comments;

      // Strict self-approval rule: Designers cannot approve their own work
      const isSelfAssigned = storedUser && storedUser.id && (t.assigned_to == storedUser.id);

      modalHost.innerHTML = `
        <div class="design-modal-overlay" id="ticket-modal-overlay">
          <div class="design-modal-box">
            <!-- Modal Header -->
            <div class="design-modal-header">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-family: monospace; font-size: 1.1rem; font-weight: 800; color: #2563eb;">${t.ticket_number}</span>
                  ${getStatusBadge(t.status)}
                  ${getPriorityBadge(t.priority)}
                </div>
                <h3 style="margin-top: 4px;">${t.title}</h3>
              </div>
              <button class="design-btn design-btn-secondary design-btn-sm" id="btn-modal-close-x">✕ Close</button>
            </div>

            <!-- Modal Body -->
            <div class="design-modal-body">
              <!-- Metadata Strip -->
              <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0; flex-wrap: wrap; gap: 10px;">
                <div>
                  <small style="color: #64748b;">Requester:</small>
                  <strong style="color: #1e293b;">${t.requester_name} (${t.requesting_division})</strong>
                </div>
                <div>
                  <small style="color: #64748b;">Assigned Designer:</small>
                  <strong style="color: #059669;">${t.assigned_to_name || 'Unassigned'}</strong>
                </div>
                <div>
                  <small style="color: #64748b;">Ball is with:</small>
                  ${getBallBadge(t.ball_is_with)}
                </div>
                <div>
                  <small style="color: #64748b;">Committed Date:</small>
                  <strong>${t.committed_delivery_date ? new Date(t.committed_delivery_date).toLocaleDateString() : 'Not committed'}</strong>
                </div>
              </div>

              <!-- Project & Brand Kit Association Strip -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div>
                  <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Associated Project & Applicable Brand Kit</div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-top: 3px; flex-wrap: wrap;">
                    <span class="asset-brand-badge" style="font-size: 0.82rem; padding: 2px 8px;">🎨 ${t.brand_kit_name || 'RLabZ Core Platform'}</span>
                    ${t.project_title ? `<span class="asset-project-badge" style="font-size: 0.82rem; padding: 2px 8px;">📁 Project: ${t.project_title}</span>` : '<span style="font-size: 0.8rem; color: #64748b;">(General Brief)</span>'}
                  </div>
                  ${t.brand_constraints ? `<div style="font-size: 0.76rem; color: #047857; margin-top: 4px;"><strong>Brand Constraints:</strong> ${t.brand_constraints}</div>` : ''}
                </div>
                <a href="/design/brand-kit" class="design-btn design-btn-secondary design-btn-sm" id="btn-modal-go-brand">
                  View Brand Kit & Tokens ↗
                </a>
              </div>

              <!-- Requester Reference Attachments & Brief Specs -->
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem 1rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 0.85rem; color: #0f172a;">📁 Requester Reference Attachments &amp; Input Materials</strong>
                  <span style="font-size: 0.72rem; color: #64748b;">Provided at intake (Reference only)</span>
                </div>
                <div style="font-size: 0.8rem; color: #475569; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px;">
                  <div>
                    <span style="color: #64748b;">Target Audience:</span>
                    <strong>${t.target_audience || 'General public'}</strong>
                  </div>
                  <div>
                    <span style="color: #64748b;">Publication Channel:</span>
                    <strong>${t.publishing_channel || 'Digital / Print'}</strong>
                  </div>
                  <div>
                    <span style="color: #64748b;">Required-by Date:</span>
                    <strong>${t.required_by ? new Date(t.required_by).toLocaleDateString() : 'N/A'}</strong>
                  </div>
                </div>

                ${t.final_copy ? `
                  <div style="margin-top: 8px; background: #f8fafc; border-left: 3px solid #059669; padding: 6px 10px; font-size: 0.78rem;">
                    <div style="font-weight: 700; color: #065f46; margin-bottom: 2px;">Design Copy / Text to Include:</div>
                    <div style="color: #1e293b; font-style: italic; white-space: pre-wrap;">${t.final_copy}</div>
                  </div>
                ` : ''}

                <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                  <div style="font-size: 0.75rem; color: #64748b;">
                    ${t.reference_links ? `<span>🔗 Reference: <a href="${t.reference_links}" target="_blank" style="color: #2563eb;">${t.reference_links}</a></span>` : ''}
                  </div>
                  <div style="font-size: 0.72rem; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 4px; font-weight: 600;">
                    ✓ Requester Inputs are read-only for designers. Deliverables below are submitted by assigned designers.
                  </div>
                </div>
              </div>

              <!-- Version Switcher Tabs (Sequential V1, V2, V3) -->
              <div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.95rem; font-weight: 700; color: #0f172a;">Deliverable Versions (${versions.length})</span>
                    ${currentVersion?.is_approved ? '<span class="fin-badge success">✓ Final Approved</span>' : (currentVersion?.is_current ? '<span class="fin-badge blue">Current Review</span>' : '')}
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <button class="design-btn design-btn-secondary design-btn-sm" id="btn-modal-compare">
                      Side-by-Side Compare
                    </button>
                    <button class="design-btn design-btn-primary design-btn-sm" id="btn-modal-upload-ver">
                      + Upload New Version
                    </button>
                  </div>
                </div>

                <div class="version-tabs-row">
                  ${versions.map(v => `
                    <button class="version-chip-btn ${(currentVersion && currentVersion.id === v.id) ? 'active' : ''} ${v.is_approved ? 'approved' : ''}" data-version-id="${v.id}">
                      V${v.version_number} ${v.is_approved ? '✓ Approved' : (v.is_current ? '(Current)' : '')}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Current Version Details & Notes Bar -->
              ${currentVersion ? `
                <div style="background: #f1f5f9; border-radius: 6px; padding: 8px 12px; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                  <div>
                    <strong>Version V${currentVersion.version_number}</strong>
                    <span style="color: #64748b;"> · Uploaded by <strong>${currentVersion.uploader_name || 'Designer'}</strong> on ${new Date(currentVersion.created_at).toLocaleString()}</span>
                  </div>
                  <div style="color: #334155; font-style: italic;">
                    Notes: "${currentVersion.change_notes || 'Initial deliverable submission'}"
                  </div>
                </div>
              ` : ''}

              <!-- Previews & Feedback Container -->
              <div class="version-preview-container">
                <!-- Browser Preview Media Box -->
                <div class="version-media-box">
                  ${currentVersion ? (
                    currentVersion.file_type === 'video' ? `
                      <video src="${currentVersion.file_url}" controls></video>
                    ` : `
                      <img src="${currentVersion.file_url}" alt="Version Preview">
                    `
                  ) : `
                    <div style="color: #94a3b8; text-align: center; padding: 2rem;">
                      No deliverable uploaded yet.<br>Click "+ Upload New Version" to submit draft.
                    </div>
                  `}
                </div>

                <!-- Threaded Comments attached to specific version -->
                <div class="version-feedback-box">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700;">Threaded Feedback</h4>
                    <small style="color: #64748b;">Attached to V${currentVersion ? currentVersion.version_number : 1}</small>
                  </div>

                  <div class="comments-thread-list">
                    ${versionComments.length === 0 ? `
                      <div style="color: #94a3b8; font-size: 0.82rem; text-align: center; padding: 1.5rem 0;">
                        No feedback comments on this version yet.
                      </div>
                    ` : versionComments.map(c => `
                      <div class="comment-card-item ${c.status === 'resolved' ? 'resolved' : ''}">
                        <div class="comment-header">
                          <strong>${c.author_name}</strong>
                          <button class="design-btn design-btn-sm btn-modal-resolve-comment" data-id="${c.id}" style="padding: 1px 6px; font-size: 0.7rem;">
                            ${c.status === 'resolved' ? '✓ Resolved' : 'Mark Resolved'}
                          </button>
                        </div>
                        <div class="comment-body">${c.comment}</div>
                      </div>
                    `).join('')}
                  </div>

                  <!-- Add Comment Input -->
                  <div style="display: flex; gap: 6px; margin-top: auto;">
                    <input type="text" id="modal-input-comment" class="design-input" placeholder="Type precise feedback on this version..." style="flex: 1; font-size: 0.8rem;">
                    <button class="design-btn design-btn-primary design-btn-sm" id="btn-modal-post-comment" data-version-id="${currentVersion ? currentVersion.id : ''}">
                      Post
                    </button>
                  </div>
                </div>
              </div>

              <!-- Approval, Lifecycle & Sign-Off Actions Bar (Self-Approval Prevention Rule) -->
              <div style="background: #fafafa; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div>
                  <h4 style="margin: 0 0 2px 0; font-size: 0.95rem;">Lifecycle, Approval &amp; Sign-off</h4>
                  <p style="margin: 0; font-size: 0.78rem; color: #64748b;">
                    Requester sign-off auto-packages delivery formats and archives into Asset Library.
                  </p>
                </div>

                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  ${isSelfAssigned ? `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 6px 12px; font-size: 0.78rem; color: #991b1b; display: flex; align-items: center; gap: 6px;">
                      <span style="font-size: 1.1rem;">🚫</span>
                      <span><strong>Self-Approval Blocked:</strong> You are the assigned designer on this ticket. Designers cannot approve their own deliverables.</span>
                    </div>
                  ` : `
                    <button class="design-btn design-btn-danger" id="btn-modal-reject" data-id="${t.id}" title="Open Revision Round">
                      Request Revision
                    </button>
                    <button class="design-btn design-btn-success" id="btn-modal-approve" data-id="${t.id}" title="Approve and Archive Deliverable">
                      ✓ Approve Deliverable
                    </button>
                  `}

                  <!-- Lifecycle Controls: On Hold & Cancel -->
                  ${!['Approved', 'Closed', 'Cancelled'].includes(t.status) ? `
                    <button class="fin-btn outline sm" id="btn-modal-hold" data-id="${t.id}" title="Put ticket On Hold with reason">
                      Pause / On Hold
                    </button>
                    <button class="fin-btn outline sm" id="btn-modal-cancel" data-id="${t.id}" style="color: #dc2626; border-color: #fecaca;" title="Cancel ticket with reason">
                      Cancel Ticket
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Wire modal events
      const closeModal = () => {
        modalHost.remove();
        if (typeof onUpdate === 'function') onUpdate();
      };

      modalHost.querySelector('#btn-modal-close-x')?.addEventListener('click', closeModal);
      modalHost.querySelector('#ticket-modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'ticket-modal-overlay') closeModal();
      });

      // Switch version tab
      modalHost.querySelectorAll('.version-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedVersionId = parseInt(btn.dataset.versionId);
          renderModal();
        });
      });

      // Post comment
      const postBtn = modalHost.querySelector('#btn-modal-post-comment');
      if (postBtn) {
        postBtn.addEventListener('click', async () => {
          const inp = modalHost.querySelector('#modal-input-comment');
          const val = inp?.value.trim();
          const verId = postBtn.dataset.versionId;
          if (!val) return;
          try {
            await fetch(`${API_BASE}/design/tickets/${t.id}/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ version_id: verId, comment: val })
            });
            const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers: { Authorization: `Bearer ${token}` } });
            ticketDetail = await refreshRes.json();
            renderModal();
          } catch (e) {
            console.error(e);
          }
        });
      }

      // Resolve comment
      modalHost.querySelectorAll('.btn-modal-resolve-comment').forEach(btn => {
        btn.addEventListener('click', async () => {
          const cId = btn.dataset.id;
          try {
            await fetch(`${API_BASE}/design/comments/${cId}/resolve`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}` }
            });
            const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers: { Authorization: `Bearer ${token}` } });
            ticketDetail = await refreshRes.json();
            renderModal();
          } catch (e) {
            console.error(e);
          }
        });
      });

      // Upload sequential version
      const uploadVerBtn = modalHost.querySelector('#btn-modal-upload-ver');
      if (uploadVerBtn) {
        uploadVerBtn.addEventListener('click', async () => {
          const { value: formValues } = await Swal.fire({
            title: 'Upload Sequential Version',
            html: `
              <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
                <label style="font-size:0.8rem; font-weight:700;">Deliverable Image / Media URL</label>
                <input id="swal-file-url" class="swal2-input" placeholder="https://...image or cloud link" value="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200" style="margin:0;">
                <label style="font-size:0.8rem; font-weight:700;">Change Notes (What was modified?)</label>
                <textarea id="swal-notes" class="swal2-textarea" placeholder="Detail changes made in this version..." style="margin:0;"></textarea>
              </div>
            `,
            focusConfirm: false,
            preConfirm: () => {
              const file_url = document.getElementById('swal-file-url').value;
              const change_notes = document.getElementById('swal-notes').value;
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
                const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers: { Authorization: `Bearer ${token}` } });
                ticketDetail = await refreshRes.json();
                renderModal();
              }
            } catch (e) {
              console.error(e);
            }
          }
        });
      }

      // Compare versions
      const compareBtn = modalHost.querySelector('#btn-modal-compare');
      if (compareBtn) {
        compareBtn.addEventListener('click', () => {
          if (versions.length < 2) {
            Swal.fire('Info', 'At least 2 versions are needed for side-by-side comparison.', 'info');
            return;
          }
          const vA = versions[0];
          const vB = versions[versions.length - 1];

          Swal.fire({
            title: `Side-by-Side Comparison: V${vA.version_number} vs V${vB.version_number}`,
            width: '900px',
            html: `
              <div class="compare-container-grid">
                <div class="compare-pane">
                  <span style="font-weight:700;">Version V${vA.version_number} (Initial)</span>
                  <img src="${vA.file_url}" alt="Version A">
                  <small style="opacity:0.8;">${vA.change_notes || 'Initial draft'}</small>
                </div>
                <div class="compare-pane">
                  <span style="font-weight:700;">Version V${vB.version_number} (Current)</span>
                  <img src="${vB.file_url}" alt="Version B">
                  <small style="opacity:0.8;">${vB.change_notes || 'Revision draft'}</small>
                </div>
              </div>
            `,
            confirmButtonColor: '#059669',
            confirmButtonText: 'Done Comparing'
          });
        });
      }

      // Approve deliverable
      const approveBtn = modalHost.querySelector('#btn-modal-approve');
      if (approveBtn) {
        approveBtn.addEventListener('click', async () => {
          const confirm = await Swal.fire({
            title: 'Sign Off Deliverable?',
            text: 'This will approve the current design deliverable, auto-package export formats, and archive into the Asset Library.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            confirmButtonText: 'Yes, Sign Off'
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
                closeModal();
              } else {
                Swal.fire('Policy Rejection', aData.message || 'Approval rejected by policy', 'error');
              }
            } catch (e) {
              console.error(e);
            }
          }
        });
      }

      // Reject deliverable / Request revision
      const rejectBtn = modalHost.querySelector('#btn-modal-reject');
      if (rejectBtn) {
        rejectBtn.addEventListener('click', async () => {
          const { value: reason } = await Swal.fire({
            title: 'Request Revision Round',
            input: 'textarea',
            inputLabel: 'Mandatory Feedback & Changes Requested',
            inputPlaceholder: 'Detail specifically what needs to be changed in the next version...',
            inputValidator: (val) => {
              if (!val || val.length < 5) return 'Written reason is mandatory to open a revision round!';
            },
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Open Revision Round'
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
                const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers: { Authorization: `Bearer ${token}` } });
                ticketDetail = await refreshRes.json();
                renderModal();
              }
            } catch (e) {
              console.error(e);
            }
          }
        });
      }

      // Put ticket On Hold
      const holdBtn = modalHost.querySelector('#btn-modal-hold');
      if (holdBtn) {
        holdBtn.addEventListener('click', async () => {
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
                const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers: { Authorization: `Bearer ${token}` } });
                ticketDetail = await refreshRes.json();
                renderModal();
              } else {
                Swal.fire('Error', data.message || 'Failed to update status', 'error');
              }
            } catch (e) {
              console.error(e);
            }
          }
        });
      }

      // Cancel Ticket
      const cancelBtn = modalHost.querySelector('#btn-modal-cancel');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
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
                const refreshRes = await fetch(`${API_BASE}/design/tickets/${t.id}`, { headers: { Authorization: `Bearer ${token}` } });
                ticketDetail = await refreshRes.json();
                renderModal();
              } else {
                Swal.fire('Error', data.message || 'Failed to cancel ticket', 'error');
              }
            } catch (e) {
              console.error(e);
            }
          }
        });
      }
    };

    renderModal();

  } catch (err) {
    console.error('Error opening ticket studio modal:', err);
  }
}
