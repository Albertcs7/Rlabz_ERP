import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignUsers(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let usersList = [];
  let teamCapacity = null;
  let searchQuery = '';

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
      const [userRes, capRes] = await Promise.all([
        fetch(`${API_BASE}/design/users`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/design/team-capacity`, { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (userRes && userRes.status === 'success') usersList = userRes.data || [];
      if (capRes && capRes.status === 'success') teamCapacity = capRes;
    } catch (e) {
      console.error('Error loading users:', e);
    }
    render();
  }

  function render() {
    const filteredUsers = usersList.filter(u => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const skills = (u.skill_tags || []).join(' ').toLowerCase();
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.division || '').toLowerCase().includes(q) ||
        (u.design_role || '').toLowerCase().includes(q) ||
        skills.includes(q)
      );
    });

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <!-- Page Header & Finance-styled Search Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Design Team &amp; Roles Management</h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">
              View designer profiles, skills, and current workload. Manage weekly capacity hours and activate/deactivate members.
            </p>
          </div>

          <div class="fin-search-wrap" style="min-width: 280px;">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="user-search-input" class="fin-input" placeholder="Search designers by name, skills, division..." value="${searchQuery}">
          </div>
        </div>

        <table class="design-data-table">
          <thead>
            <tr>
              <th>Designer</th>
              <th>Division &amp; Role</th>
              <th>Skills (Read-Only)</th>
              <th>Workload &amp; Availability</th>
              <th>Weekly Capacity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredUsers.length === 0 ? `
              <tr>
                <td colspan="7" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
                  No design team members match your search criteria.
                </td>
              </tr>
            ` : filteredUsers.map(u => {
              const cap = teamCapacity?.team?.find(m => m.user_id === u.id);
              return `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <img src="${u.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.name) + '&background=009688&color=fff'}" alt="${u.name}" style="width: 38px; height: 38px; border-radius: 9999px; object-fit: cover; border: 1px solid #e2e8f0;">
                      <div>
                        <div style="font-weight: 700; color: #0f172a;">${u.name}</div>
                        <div style="font-size: 0.74rem; color: #64748b;">${u.email} · ${u.phone}</div>
                        <div style="font-size: 0.7rem; color: #94a3b8;">Joined: ${u.joining_date || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="font-weight: 600; color: #334155;">${u.division}</div>
                    <span class="fin-badge blue" style="font-size: 0.7rem; margin-top: 2px;">${u.design_role}</span>
                  </td>
                  <td>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; max-width: 220px;">
                      ${(u.skill_tags || []).map(s => `<span class="skill-tag-pill">${s}</span>`).join('')}
                    </div>
                  </td>
                  <td>
                    <div style="font-size: 0.8rem; font-weight: 600; color: #0f172a;">
                      ${cap ? `${cap.open_tickets_count} tasks · ${cap.hours_committed_this_week}h committed` : '0 tasks'}
                    </div>
                    <div style="font-size: 0.74rem; color: #059669; font-weight: 600; margin-top: 2px;">
                      ${cap ? cap.next_free_slot : 'Immediate availability'}
                    </div>
                  </td>
                  <td>
                    <strong>${u.weekly_capacity_hours} hrs</strong>/week
                  </td>
                  <td>
                    <span class="fin-badge ${u.is_active ? 'success' : 'danger'}" style="font-size: 0.75rem;">
                      ${u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="design-btn design-btn-secondary design-btn-sm btn-manage-user" data-id="${u.id}" data-user='${JSON.stringify(u).replace(/'/g, "&apos;")}'>
                        Manage
                      </button>
                      <button class="design-btn design-btn-sm btn-toggle-user-active" data-id="${u.id}" data-name="${u.name}" data-active="${u.is_active ? '1' : '0'}" style="background: ${u.is_active ? '#fee2e2' : '#ecfdf5'}; color: ${u.is_active ? '#dc2626' : '#059669'}; border: 1px solid ${u.is_active ? '#fca5a5' : '#a7f3d0'};">
                        ${u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    const searchInp = container.querySelector('#user-search-input');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
      });
    }

    // Toggle User Active / Deactivate
    container.querySelectorAll('.btn-toggle-user-active').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.id;
        const name = btn.dataset.name;
        const currentlyActive = btn.dataset.active === '1';
        const actionText = currentlyActive ? 'Deactivate' : 'Activate';

        const confirm = await Swal.fire({
          title: `${actionText} ${name}?`,
          text: currentlyActive
            ? `Deactivating ${name} prevents them from receiving new design ticket assignments while retaining their historical tickets, versions, deliverables, and audit records.`
            : `Activating ${name} allows them to receive new design assignments based on their weekly capacity.`,
          icon: currentlyActive ? 'warning' : 'question',
          showCancelButton: true,
          confirmButtonColor: currentlyActive ? '#dc2626' : '#059669',
          confirmButtonText: `Yes, ${actionText}`
        });

        if (confirm.isConfirmed) {
          try {
            const res = await fetch(`${API_BASE}/design/users/${userId}/profile`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ is_active: !currentlyActive })
            });
            const data = await res.json();
            if (data.status === 'success') {
              toast(`Designer ${name} ${actionText.toLowerCase()}d successfully.`, 'success');
              await loadData();
            } else {
              toast(data.message || 'Operation failed', 'error');
            }
          } catch (e) {
            console.error(e);
            toast('Network error updating user status', 'error');
          }
        }
      });
    });

    // Manage Designer Modal (Details, Read-Only Skills, Weekly Capacity, Workload & Permissions)
    container.querySelectorAll('.btn-manage-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const u = JSON.parse(btn.dataset.user || '{}');
        const cap = teamCapacity?.team?.find(m => m.user_id === u.id);

        const skillsHtml = (u.skill_tags || []).map(s => `
          <span style="background: #f1f5f9; color: #334155; padding: 3px 8px; border-radius: 6px; font-size: 0.76rem; font-weight: 600;">
            ${s}
          </span>
        `).join('');

        const { value: formValues } = await Swal.fire({
          title: `Designer: ${u.name}`,
          width: '650px',
          html: `
            <div style="text-align: left; display: flex; flex-direction: column; gap: 14px; font-size: 0.88rem;">
              <!-- Profile Header -->
              <div style="display: flex; align-items: center; gap: 14px; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                <img src="${u.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.name) + '&background=009688&color=fff'}" style="width: 52px; height: 52px; border-radius: 9999px; object-fit: cover;">
                <div style="flex: 1;">
                  <div style="font-weight: 700; font-size: 1rem; color: #0f172a;">${u.name}</div>
                  <div style="color: #64748b; font-size: 0.8rem;">${u.email} · ${u.phone}</div>
                  <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">
                    Division: <strong>${u.division}</strong> · Joined: <strong>${u.joining_date || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              <!-- Workload & Availability Strip -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px;">
                <div>
                  <div style="font-size: 0.72rem; color: #166534; font-weight: 700; text-transform: uppercase;">Open Tasks</div>
                  <div style="font-weight: 800; color: #14532d; font-size: 1rem;">${cap ? cap.open_tickets_count : 0}</div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: #166534; font-weight: 700; text-transform: uppercase;">Committed Hours</div>
                  <div style="font-weight: 800; color: #14532d; font-size: 1rem;">${cap ? cap.hours_committed_this_week : 0}h</div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: #166534; font-weight: 700; text-transform: uppercase;">Availability</div>
                  <div style="font-weight: 700; color: #15803d; font-size: 0.85rem;">${cap ? cap.next_free_slot : 'Immediate'}</div>
                </div>
              </div>

              <!-- Skills (Read-Only) -->
              <div>
                <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: flex; justify-content: space-between;">
                  <span>Design Skills (Read-Only)</span>
                  <span style="font-size: 0.72rem; color: #94a3b8;">Central Competency Registry</span>
                </label>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px;">
                  ${skillsHtml || '<span style="color: #94a3b8; font-size: 0.78rem;">No skills specified</span>'}
                </div>
              </div>

              <!-- Weekly Capacity (Editable by Design Head) -->
              <div>
                <label style="font-size: 0.8rem; font-weight: 700; color: #0f172a;">
                  Weekly Capacity (Hours/Week) *
                </label>
                <input id="swal-edit-capacity" type="number" min="0" max="80" class="swal2-input" value="${u.weekly_capacity_hours || 20}" style="margin: 6px 0 0 0; width: 100%;">
                <small style="color: #64748b; font-size: 0.74rem;">Capacity hours set realistic planning limits when assigning new design tickets.</small>
              </div>

              <!-- Active Assignment Status (Editable by Design Head) -->
              <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem; color: #0f172a;">Active for New Assignments</div>
                  <div style="font-size: 0.74rem; color: #64748b;">Deactivating halts new assignments while retaining historical tickets and deliverables.</div>
                </div>
                <input type="checkbox" id="swal-edit-active" ${u.is_active ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
              </div>

              <!-- Roles & Permissions Governance Notice -->
              <div style="background: #fefce8; border: 1px dashed #ca8a04; border-radius: 8px; padding: 8px 12px; font-size: 0.74rem; color: #854d0e;">
                🔒 <strong>Roles & Permissions:</strong> System role is <strong>${u.system_role}</strong> (${u.design_role}). System-wide permissions are governed exclusively by Admin. Design Head cannot alter system-wide access.
              </div>

              <!-- Notification Preferences Info -->
              <div style="font-size: 0.74rem; color: #64748b;">
                🔔 <strong>Notification Preferences:</strong> Ticket alerts, assignments, and review reminders route through the standard ERP notification drawer.
              </div>
            </div>
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Save Changes',
          confirmButtonColor: '#059669',
          preConfirm: () => {
            const capVal = parseInt(document.getElementById('swal-edit-capacity').value);
            const activeVal = document.getElementById('swal-edit-active').checked;
            if (isNaN(capVal) || capVal < 0) {
              Swal.showValidationMessage('Please provide a valid weekly capacity number (0 - 80).');
              return false;
            }
            return {
              weekly_capacity_hours: capVal,
              is_active: activeVal
            };
          }
        });

        if (formValues) {
          try {
            const res = await fetch(`${API_BASE}/design/users/${u.id}/profile`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(formValues)
            });
            const data = await res.json();
            if (data.status === 'success') {
              toast(`Profile for ${u.name} updated.`, 'success');
              await loadData();
            } else {
              toast(data.message || 'Error updating profile', 'error');
            }
          } catch (e) {
            console.error(e);
            toast('Network error updating user', 'error');
          }
        }
      });
    });
  }

  await loadData();
  return container;
}

export default DesignUsers;
