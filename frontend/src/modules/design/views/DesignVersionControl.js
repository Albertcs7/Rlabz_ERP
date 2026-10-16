import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import { openTicketStudioModal, getStatusBadge } from '../utils/ticketModal.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignVersionControl(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let tickets = [];
  let selectedTicketId = null;
  let activeDetail = null;

  async function loadData() {
    try {
      const res = await fetch(`${API_BASE}/design/tickets`, { headers });
      if (res.ok) {
        const data = await res.json();
        tickets = data.data || [];
        if (tickets.length > 0 && !selectedTicketId) {
          selectedTicketId = tickets[0].id;
        }
      }
      if (selectedTicketId) {
        const detRes = await fetch(`${API_BASE}/design/tickets/${selectedTicketId}`, { headers });
        if (detRes.ok) activeDetail = await detRes.json();
      }
    } catch (e) {
      console.error('Error loading version control:', e);
    }
    render();
  }

  function resolveMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
    if (url.startsWith('/storage/')) {
      const origin = API_BASE.replace(/\/api\/?$/, '');
      return `${origin}${url}`;
    }
    return url;
  }

  function render() {
    const t = activeDetail?.ticket;
    const versions = activeDetail?.versions || [];
    const comments = activeDetail?.comments || [];
    const storedUser = JSON.parse(localStorage.getItem('rlabz_user') || '{}');
    const isStudent = storedUser && storedUser.role === 'student';
    const isAssignedDesigner = storedUser && storedUser.id && t && (t.assigned_to == storedUser.id);

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Version Control &amp; Deliverable Feedback</h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">
              Sequential V1, V2, V3 deliverables, browser previews, revision history, and version-specific feedback.
            </p>
          </div>

          <div style="display: flex; gap: 0.75rem; align-items: center;">
            <label style="font-weight: 700; font-size: 0.85rem; color: #334155;">Select Job:</label>
            <select id="select-active-ticket" class="design-select" style="min-width: 250px;">
              ${tickets.map(item => `
                <option value="${item.id}" ${item.id == selectedTicketId ? 'selected' : ''}>
                  ${item.ticket_number} - ${item.title.slice(0, 32)}...
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        ${!t ? `
          <div style="text-align: center; padding: 4rem; color: #94a3b8;">Select a creative ticket to inspect deliverable versions.</div>
        ` : `
          <!-- Active Ticket Banner -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; font-weight: 800; font-size: 1.05rem; color: #2563eb;">${t.ticket_number}</span>
                ${getStatusBadge(t.status)}
                ${t.brand_kit_name ? `<span class="asset-brand-badge">🎨 ${t.brand_kit_name}</span>` : ''}
                ${t.project_title ? `<span class="asset-project-badge">📁 ${t.project_title}</span>` : ''}
              </div>
              <h3 style="margin: 4px 0 0 0; font-size: 1.15rem; color: #0f172a;">${t.title}</h3>
              <div style="font-size: 0.78rem; color: #64748b; margin-top: 4px;">
                Requester: <strong>${t.requester_name}</strong> · Designer: <strong>${t.assigned_to_name || 'Unassigned'}</strong>
              </div>
            </div>

            <div style="display: flex; gap: 8px;">
              <button class="design-btn design-btn-secondary design-btn-sm" id="btn-side-compare">
                Side-by-Side Compare
              </button>
              ${(isStudent || isAssignedDesigner) ? `
                <button class="design-btn design-btn-primary design-btn-sm" id="btn-upload-version">
                  + Upload New Version
                </button>
              ` : ''}
              <button class="design-btn design-btn-secondary design-btn-sm" id="btn-open-full-studio" data-id="${t.id}">
                Open Full Studio
              </button>
            </div>
          </div>

          <!-- Sequential Versions List -->
          <div style="margin-bottom: 1.5rem;">
            <h4 style="margin: 0 0 0.85rem 0; font-size: 1.05rem; font-weight: 700;">
              Sequential Deliverable Versions (${versions.length})
            </h4>

            ${versions.length === 0 ? `
              <div style="text-align: center; padding: 3rem; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b;">
                No versions have been uploaded for this job yet.<br>
                ${(isStudent || isAssignedDesigner) ? 'Click "+ Upload New Version" to submit initial deliverable draft.' : 'Awaiting deliverable submission by assigned designer.'}
              </div>
            ` : `
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.25rem;">
                ${versions.map(v => {
                  const verComments = comments.filter(c => c.version_id == v.id);
                  return `
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.03); display: flex; flex-direction: column;">
                      <div style="height: 200px; background: #0f172a; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                        ${(v.file_type === 'video' || (v.file_type && v.file_type.includes('video')) || (v.file_url && v.file_url.match(/\.(mp4|webm|mov|ogg|m4v)$/i))) ? `
                          <video src="${resolveMediaUrl(v.file_url)}" controls style="max-height: 100%; max-width: 100%; object-fit: contain;"></video>
                        ` : `
                          <img src="${resolveMediaUrl(v.file_url)}" alt="Version ${v.version_number}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';" style="width: 100%; height: 100%; object-fit: cover;">
                        `}
                        <span style="position: absolute; top: 10px; left: 10px; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 0.8rem;">
                          V${v.version_number}
                        </span>
                        ${v.is_approved ? `
                          <span style="position: absolute; top: 10px; right: 10px; background: #059669; color: #ffffff; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 0.75rem;">
                            ✓ Final Approved
                          </span>
                        ` : (v.is_current ? `
                          <span style="position: absolute; top: 10px; right: 10px; background: #2563eb; color: #ffffff; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 0.75rem;">
                            Current Review
                          </span>
                        ` : '')}
                      </div>

                      <div style="padding: 1.2rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #64748b; margin-bottom: 6px;">
                            <span>By <strong>${v.uploader_name || 'Designer'}</strong></span>
                            <span>${new Date(v.created_at).toLocaleString()}</span>
                          </div>
                          <div style="background: #f8fafc; border-radius: 6px; padding: 8px 10px; font-size: 0.8rem; color: #334155; margin-bottom: 10px; font-style: italic;">
                            "${v.change_notes || 'Initial deliverable submission'}"
                          </div>
                        </div>

                        <div>
                          <div style="font-size: 0.8rem; font-weight: 700; color: #0f172a; margin-bottom: 6px; display: flex; justify-content: space-between;">
                            <span>Feedback (${verComments.length})</span>
                            <span style="font-weight: normal; color: #64748b;">${verComments.filter(c => c.status === 'resolved').length} resolved</span>
                          </div>
                          <div style="display: flex; flex-direction: column; gap: 4px; max-height: 120px; overflow-y: auto;">
                            ${verComments.length === 0 ? `
                              <div style="font-size: 0.75rem; color: #94a3b8;">No feedback comments on this version.</div>
                            ` : verComments.map(c => `
                              <div style="background: ${c.status === 'resolved' ? '#f0fdf4' : '#fffbeb'}; border: 1px solid ${c.status === 'resolved' ? '#bbf7d0' : '#fef08a'}; border-radius: 6px; padding: 4px 8px; font-size: 0.74rem;">
                                <strong style="color: #0f172a;">${c.author_name}:</strong> ${c.comment}
                              </div>
                            `).join('')}
                          </div>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        `}
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    const sel = container.querySelector('#select-active-ticket');
    if (sel) {
      sel.addEventListener('change', async (e) => {
        selectedTicketId = e.target.value;
        await loadData();
      });
    }

    container.querySelector('#btn-open-full-studio')?.addEventListener('click', () => {
      if (selectedTicketId) openTicketStudioModal(selectedTicketId, loadData);
    });

    // Upload sequential version
    container.querySelector('#btn-upload-version')?.addEventListener('click', async () => {
      if (!selectedTicketId) return;

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
          const res = await fetch(`${API_BASE}/design/tickets/${selectedTicketId}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(formValues)
          });
          const data = await res.json();
          if (data.status === 'success') {
            Swal.fire('Uploaded', data.message, 'success');
            await loadData();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    // Side-by-side compare
    container.querySelector('#btn-side-compare')?.addEventListener('click', () => {
      const versions = activeDetail?.versions || [];
      if (versions.length < 2) {
        Swal.fire('Info', 'At least 2 versions are needed for side-by-side comparison.', 'info');
        return;
      }
      const vA = versions[0];
      const vB = versions[versions.length - 1];

      Swal.fire({
        title: `Comparison: V${vA.version_number} vs V${vB.version_number}`,
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

  await loadData();
  return container;
}

export default DesignVersionControl;
