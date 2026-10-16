import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import { openTicketStudioModal, getStatusBadge, getPriorityBadge } from '../utils/ticketModal.js';
import { renderPagination, setupPaginationListeners } from '../utils/pagination.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignApprovals(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  let pendingApprovalTickets = [];
  let currentPage = 1;
  const itemsPerPage = 5;

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
      const res = await fetch(`${API_BASE}/design/tickets`, { headers });
      if (res.ok) {
        const data = await res.json();
        const allTickets = data.data || [];
        // Pending approval = Submitted or In Review or Revision
        pendingApprovalTickets = allTickets.filter(t => ['Submitted', 'In Review', 'Revision'].includes(t.status));
      }
    } catch (e) {
      console.error('Error loading approvals:', e);
    }
    render();
  }

  function render() {
    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Deliverable Approval &amp; Sign-off</h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">
              Formal review queue. Sign off approved deliverables into the Asset Library, or request revision rounds.
            </p>
          </div>
          <span class="fin-badge warning" style="font-size: 0.85rem; padding: 6px 14px;">
            ${pendingApprovalTickets.length} Jobs Awaiting Decision
          </span>
        </div>

        ${pendingApprovalTickets.length === 0 ? `
          <div style="text-align: center; padding: 4rem; color: #059669;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">✓</div>
            <h3 style="margin: 0 0 4px 0;">No Pending Sign-offs</h3>
            <p style="color: #64748b; font-size: 0.88rem; margin: 0;">All submitted deliverables have been reviewed.</p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            ${pendingApprovalTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(t => {
              const isSelfAssigned = storedUser && storedUser.id && (t.assigned_to == storedUser.id);
              return `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 6px rgba(0,0,0,0.02); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem;">
                  <div style="flex: 1; min-width: 300px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                      <span style="font-family: monospace; font-weight: 800; font-size: 1.1rem; color: #2563eb;">${t.ticket_number}</span>
                      ${getStatusBadge(t.status)}
                      ${getPriorityBadge(t.priority)}
                    </div>
                    <h3 style="margin: 0 0 4px 0; font-size: 1.15rem; color: #0f172a;">${t.title}</h3>
                    <div style="display: flex; gap: 8px; font-size: 0.8rem; color: #64748b; margin-bottom: 8px; flex-wrap: wrap;">
                      <span>Requester: <strong>${t.requester_name}</strong> (${t.requesting_division})</span>
                      <span>·</span>
                      <span>Assigned Designer: <strong style="color: #059669;">${t.assigned_to_name || 'Unassigned'}</strong></span>
                      <span>·</span>
                      <span>Committed Date: <strong>${t.committed_delivery_date ? new Date(t.committed_delivery_date).toLocaleDateString() : 'N/A'}</strong></span>
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      ${t.project_title ? `<span class="asset-project-badge">📁 ${t.project_title}</span>` : ''}
                      ${t.brand_kit_name ? `<span class="asset-brand-badge">🎨 ${t.brand_kit_name}</span>` : ''}
                    </div>
                  </div>

                  <!-- Sign-off Action Block -->
                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
                    ${isSelfAssigned ? `
                      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 6px 12px; font-size: 0.76rem; color: #991b1b; display: flex; align-items: center; gap: 6px;">
                        <span>🚫</span>
                        <span><strong>Self-Approval Blocked:</strong> You are assigned to this ticket. Designers cannot approve their own work.</span>
                      </div>
                      <div style="display: flex; gap: 8px;">
                        <button class="design-btn design-btn-secondary design-btn-sm btn-inspect-studio" data-id="${t.id}">
                          Inspect Deliverable
                        </button>
                        <button class="design-btn design-btn-secondary design-btn-sm" disabled style="opacity: 0.5; cursor: not-allowed;">
                          Approve Blocked (Self)
                        </button>
                      </div>
                    ` : `
                      <div style="display: flex; gap: 8px;">
                        <button class="design-btn design-btn-secondary design-btn-sm btn-inspect-studio" data-id="${t.id}">
                          Inspect Deliverable
                        </button>
                        <button class="design-btn design-btn-danger design-btn-sm btn-reject-ticket" data-id="${t.id}">
                          Request Revision
                        </button>
                        <button class="design-btn design-btn-success design-btn-sm btn-approve-ticket" data-id="${t.id}">
                          ✓ Approve Deliverable
                        </button>
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div id="approvals-pagination-container">
            ${renderPagination(pendingApprovalTickets.length, currentPage, itemsPerPage)}
          </div>
        `}
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    setupPaginationListeners(container.querySelector('#approvals-pagination-container'), (page) => {
      currentPage = page;
      render();
    });

    container.querySelectorAll('.btn-inspect-studio').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        openTicketStudioModal(id, loadData);
      });
    });

    container.querySelectorAll('.btn-approve-ticket').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const confirm = await Swal.fire({
          title: 'Sign Off Deliverable?',
          text: 'This approves the deliverable, packages export assets, and automatically archives into the Asset Library.',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#059669',
          confirmButtonText: 'Yes, Sign Off'
        });

        if (confirm.isConfirmed) {
          try {
            const res = await fetch(`${API_BASE}/design/tickets/${id}/approve`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status === 'success') {
              toast(data.message, 'success');
              await loadData();
            } else {
              toast(data.message || 'Approval rejected by policy', 'error');
            }
          } catch (e) {
            console.error(e);
          }
        }
      });
    });

    container.querySelectorAll('.btn-reject-ticket').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
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
            const res = await fetch(`${API_BASE}/design/tickets/${id}/reject`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ rejection_reason: reason })
            });
            const data = await res.json();
            if (data.status === 'success') {
              toast(data.message, 'success');
              await loadData();
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

export default DesignApprovals;
