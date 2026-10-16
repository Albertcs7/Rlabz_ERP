import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import { renderPagination, setupPaginationListeners } from '../utils/pagination.js';
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
  let roleFilter = 'all';
  let statusFilter = 'all';
  let currentPage = 1;
  const itemsPerPage = 8;

  const availableSkillOptions = [
    'poster',
    'illustration',
    'UI',
    'video editing',
    'motion graphics',
    'social creative',
    'presentation',
    'brand identity',
    'typography'
  ];

  const approvedDivisions = [
    'Design & Branding',
    'Creative Studio',
    'Teaching & Academics',
    'Training & Placement',
    'AI-Ops Division'
  ];

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
      console.error('Error loading design team members:', e);
    }
    render();
  }

  function render() {
    const filteredUsers = usersList.filter(u => {
      if (roleFilter !== 'all' && u.design_role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;

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
      <!-- Finance-Aligned Page Header -->
      <div class="fin-page-header">
        <div>
          <h1>Design Users &amp; Roles</h1>
          <p>Manage design team profiles, weekly capacity, and workspace permissions</p>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <button class="fin-btn outline sm" id="btn-add-existing-user">
            <span>👥</span> Add Existing User
          </button>
          <button class="fin-btn primary sm" id="btn-create-new-designer">
            <span>+</span> Create New Designer
          </button>
        </div>
      </div>

      <!-- Filter & Search Bar in Columns (Matching Finance Layout) -->
      <div class="fin-filter-bar" style="display: flex; align-items: flex-end; gap: 12px; margin-bottom: 1.5rem; flex-wrap: wrap; background: #ffffff; padding: 1rem 1.25rem; border-radius: 10px; border: 1px solid var(--border-color, #e2e8f0);">
        <div class="fin-filter-group" style="flex: 2; min-width: 220px;">
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase; margin-bottom: 4px;">Search Roster</label>
          <div class="fin-search-wrap" style="position: relative; width: 100%;">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="user-search-input" class="fin-input" placeholder="Search by name, email, skills, division..." value="${searchQuery}" style="padding-left: 32px; width: 100%;">
          </div>
        </div>

        <div class="fin-filter-group" style="flex: 1; min-width: 140px; max-width: 200px;">
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase; margin-bottom: 4px;">Role</label>
          <div class="fin-select-wrap">
            <select id="user-role-filter" class="fin-input" style="width: 100%;">
              <option value="all" ${roleFilter === 'all' ? 'selected' : ''}>All Roles</option>
              <option value="Student Designer" ${roleFilter === 'Student Designer' ? 'selected' : ''}>Student Designer</option>
              <option value="Designer" ${roleFilter === 'Designer' ? 'selected' : ''}>Designer</option>
              <option value="Design Lead" ${roleFilter === 'Design Lead' ? 'selected' : ''}>Design Lead</option>
            </select>
          </div>
        </div>

        <div class="fin-filter-group" style="flex: 1; min-width: 130px; max-width: 180px;">
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase; margin-bottom: 4px;">Design Access</label>
          <div class="fin-select-wrap">
            <select id="user-status-filter" class="fin-input" style="width: 100%;">
              <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Members</option>
              <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active Only</option>
              <option value="inactive" ${statusFilter === 'inactive' ? 'selected' : ''}>Deactivated Only</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Main Table Container -->
      <div style="background: #ffffff; border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div class="fin-table-wrap" style="overflow-x: auto; width: 100%;">
          <table class="fin-table" style="width: 100%; min-width: 900px; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="padding: 10px 14px; font-size: 0.74rem;">Designer</th>
                <th style="padding: 10px 14px; font-size: 0.74rem;">Division &amp; Role</th>
                <th style="padding: 10px 14px; font-size: 0.74rem;">Skills &amp; Specialties</th>
                <th style="padding: 10px 14px; font-size: 0.74rem;">Workload &amp; Availability</th>
                <th style="padding: 10px 14px; font-size: 0.74rem;">Weekly Capacity</th>
                <th style="padding: 10px 14px; font-size: 0.74rem;">Design Access</th>
                <th style="padding: 10px 18px 10px 14px; font-size: 0.74rem; text-align: right; white-space: nowrap; min-width: 185px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredUsers.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; padding: 3rem 1rem; color: #94a3b8;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                    <strong>No design team members match your filter criteria.</strong>
                  </td>
                </tr>
              ` : filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(u => {
                const cap = teamCapacity?.team?.find(m => m.user_id === u.id);
                const rawSkills = Array.isArray(u.skill_tags)
                  ? u.skill_tags
                  : (typeof u.skill_tags === 'string' ? u.skill_tags.replace(/[\[\]"]/g, '').split(',') : []);
                const cleanSkills = rawSkills.map(s => s.trim()).filter(Boolean);
                const openCount = u.open_tickets_count || 0;
                const committedHrs = parseFloat(u.hours_committed_this_week || 0).toFixed(1);
                const nextSlot = cap?.next_free_slot;
                const showNextSlot = openCount > 0 && nextSlot && nextSlot !== 'Immediate availability';

                return `
                  <tr>
                    <td style="padding: 12px 14px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${u.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.name) + '&background=009688&color=fff'}" alt="${u.name}" style="width: 38px; height: 38px; border-radius: 9999px; object-fit: cover; border: 1px solid #e2e8f0;">
                        <div>
                          <div style="font-weight: 700; color: #0f172a; font-size: 0.88rem;">${u.name}</div>
                          <div style="font-size: 0.74rem; color: #64748b;">${u.email}${u.phone ? ` · ${u.phone}` : ''}</div>
                          <div style="font-size: 0.7rem; color: #94a3b8;">Joined: ${u.joining_date || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="font-weight: 600; color: #334155; font-size: 0.84rem;">${u.division}</div>
                      <span class="fin-badge ${u.system_role === 'student' ? 'purple' : 'info'}" style="font-size: 0.7rem; margin-top: 2px;">
                        ${u.design_role || (u.system_role === 'student' ? 'Student Designer' : 'Design Lead')}
                      </span>
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="display: flex; flex-wrap: wrap; gap: 4px; max-width: 220px;">
                        ${cleanSkills.length === 0 ? '<span style="color:#94a3b8; font-size:0.75rem;">No skill tags</span>' : cleanSkills.map(s => `<span class="fin-badge neutral" style="font-size: 0.7rem; padding: 2px 6px;">${s}</span>`).join('')}
                      </div>
                    </td>
                    <td style="padding: 12px 14px;">
                      <div style="font-size: 0.82rem; font-weight: 700; color: #0f172a;">
                        ${openCount} active task${openCount === 1 ? '' : 's'} · ${committedHrs}h committed
                      </div>
                      ${showNextSlot ? `
                        <div style="font-size: 0.74rem; color: #0284c7; font-weight: 600; margin-top: 2px;">
                          Next free: ${nextSlot}
                        </div>
                      ` : ''}
                    </td>
                    <td style="padding: 12px 14px;">
                      <strong style="color: #0f172a;">${u.weekly_capacity_hours || 20} hrs</strong><span style="font-size: 0.75rem; color: #64748b;">/week</span>
                    </td>
                    <td style="padding: 12px 14px;">
                      <span class="fin-badge ${u.is_active ? 'success' : 'danger'}" style="font-size: 0.75rem;">
                        ${u.is_active ? '● Active' : '○ Deactivated'}
                      </span>
                    </td>
                    <td style="padding: 12px 18px 12px 14px; text-align: right; white-space: nowrap; min-width: 185px;">
                      <div style="display: inline-flex; gap: 6px; align-items: center; justify-content: flex-end;">
                        <button class="fin-btn outline sm btn-manage-user" data-id="${u.id}" data-user='${JSON.stringify(u).replace(/'/g, "&apos;")}' style="padding: 4px 10px; font-size: 0.75rem;">
                          Manage
                        </button>
                        <button class="fin-btn outline sm btn-toggle-user-active" data-id="${u.id}" data-name="${u.name}" data-active="${u.is_active ? '1' : '0'}" style="padding: 4px 10px; font-size: 0.75rem; color: ${u.is_active ? '#dc2626' : '#009688'}; border-color: ${u.is_active ? '#fca5a5' : '#a7f3d0'};">
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
        <div id="users-pagination-container">
          ${renderPagination(filteredUsers.length, currentPage, itemsPerPage)}
        </div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    // Search input
    container.querySelector('#user-search-input')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      render();
    });

    // Filters
    container.querySelector('#user-role-filter')?.addEventListener('change', (e) => {
      roleFilter = e.target.value;
      currentPage = 1;
      render();
    });

    container.querySelector('#user-status-filter')?.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      currentPage = 1;
      render();
    });

    // Pagination
    setupPaginationListeners(container.querySelector('#users-pagination-container'), (page) => {
      currentPage = page;
      render();
    });

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
            ? `Deactivating ${name} revokes their Student Design Workspace sidebar access and prevents new assignments, while preserving all historical deliverables, versions, and logged hours.`
            : `Activating ${name} restores their Design Workspace access and makes them available for creative ticket allocations.`,
          icon: currentlyActive ? 'warning' : 'question',
          showCancelButton: true,
          confirmButtonColor: currentlyActive ? '#dc2626' : '#009688',
          confirmButtonText: `Yes, ${actionText}`
        });

        if (confirm.isConfirmed) {
          try {
            const res = await fetch(`${API_BASE}/design/users/${userId}/status`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ is_active: !currentlyActive })
            });
            const data = await res.json();
            if (data.status === 'success' || res.ok) {
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

    // 1. ADD EXISTING ERP USER FLOW
    container.querySelector('#btn-add-existing-user')?.addEventListener('click', async () => {
      let selectedCandidateId = null;
      let candidateList = [];

      const renderCandidateList = (candidates) => {
        if (!candidates || candidates.length === 0) {
          return '<div style="color: #94a3b8; text-align: center; padding: 1.5rem 0;">No matching ERP users found.</div>';
        }
        return candidates.map(c => `
          <div class="swal-candidate-item ${c.is_on_design_team ? 'disabled' : ''} ${selectedCandidateId === c.id ? 'selected' : ''}" data-id="${c.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 6px; cursor: ${c.is_on_design_team ? 'not-allowed' : 'pointer'}; background: ${selectedCandidateId === c.id ? '#e0f2fe' : (c.is_on_design_team ? '#f8fafc' : '#ffffff')};">
            <div>
              <strong style="color: #0f172a; font-size: 0.88rem;">${c.name}</strong>
              <div style="font-size: 0.75rem; color: #64748b;">${c.email} · <span style="text-transform: capitalize;">${c.role}</span> (${c.department})</div>
              ${c.academic_summary ? `<div style="font-size: 0.72rem; color: #009688; font-weight: 600;">🎓 ${c.academic_summary}</div>` : ''}
            </div>
            <div>
              ${c.is_on_design_team ? `
                <span class="fin-badge neutral" style="font-size: 0.72rem;">Already on Team</span>
              ` : `
                <button type="button" class="fin-btn outline sm btn-select-candidate" data-id="${c.id}" style="padding: 2px 8px; font-size: 0.75rem;">
                  ${selectedCandidateId === c.id ? '✓ Selected' : 'Select'}
                </button>
              `}
            </div>
          </div>
        `).join('');
      };

      const skillsCheckboxes = availableSkillOptions.map(s => `
        <label style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #334155; cursor: pointer;">
          <input type="checkbox" name="skill-tag" value="${s}" ${['poster', 'UI'].includes(s) ? 'checked' : ''}>
          <span>${s}</span>
        </label>
      `).join('');

      const { value: formValues } = await Swal.fire({
        title: 'Add Existing ERP User to Design Team',
        width: '640px',
        html: `
          <div style="text-align: left; display: flex; flex-direction: column; gap: 14px; font-size: 0.85rem; font-family: inherit;">
            <div>
              <label style="font-weight: 700; color: #0f172a; display: block; margin-bottom: 4px;">
                1. Search Existing Students or Staff <span class="required" style="color: #dc2626; font-weight:800;">*</span>
              </label>
              <input type="text" id="swal-candidate-search" class="swal2-input" placeholder="Type student name or email to search..." style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.85rem;">
              <div id="swal-candidate-results" style="max-height: 160px; overflow-y: auto; margin-top: 8px; border: 1px solid #f1f5f9; padding: 6px; border-radius: 8px;">
                <div style="color: #94a3b8; text-align: center; padding: 1rem 0;">Type to search ERP users.</div>
              </div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px;">
              <strong style="color: #0f172a; font-size: 0.88rem;">2. Configure Creative Role &amp; Capacity</strong>
              
              <div>
                <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Creative Skills &amp; Specialties <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #ffffff; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
                  ${skillsCheckboxes}
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Weekly Capacity (Hours/Week) <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <input type="number" id="swal-candidate-capacity" class="swal2-input" value="20" min="1" max="80" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.85rem;">
                </div>
                <div>
                  <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Division / Unit</label>
                  <select id="swal-candidate-division" class="swal2-select" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.85rem; height: 38px;">
                    ${approvedDivisions.map(d => `<option value="${d}">${d}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div style="font-size: 0.74rem; color: #009688; background: #E0F2F1; padding: 6px 10px; border-radius: 6px;">
                ✓ Existing ERP login, academic profile, and project history are fully preserved without duplicate accounts.
              </div>
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Add to Design Team',
        confirmButtonColor: '#009688',
        didOpen: () => {
          const searchInp = document.getElementById('swal-candidate-search');
          const resultsBox = document.getElementById('swal-candidate-results');

          let searchTimeout = null;
          const performSearch = async (q) => {
            try {
              resultsBox.innerHTML = '<div style="color: #64748b; text-align: center; padding: 1rem;">Searching ERP accounts...</div>';
              const res = await fetch(`${API_BASE}/design/team-candidates?q=${encodeURIComponent(q)}`, { headers });
              const data = await res.json();
              candidateList = data.data || [];
              resultsBox.innerHTML = renderCandidateList(candidateList);

              resultsBox.querySelectorAll('.btn-select-candidate, .swal-candidate-item:not(.disabled)').forEach(el => {
                el.addEventListener('click', () => {
                  const id = parseInt(el.dataset.id);
                  const cand = candidateList.find(c => c.id === id);
                  if (cand && !cand.is_on_design_team) {
                    selectedCandidateId = id;
                    resultsBox.innerHTML = renderCandidateList(candidateList);
                  }
                });
              });
            } catch (err) {
              resultsBox.innerHTML = '<div style="color: #dc2626; text-align: center;">Error searching candidates.</div>';
            }
          };

          searchInp?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const val = e.target.value.trim();
            searchTimeout = setTimeout(() => performSearch(val), 300);
          });

          performSearch('');
        },
        preConfirm: () => {
          if (!selectedCandidateId) {
            Swal.showValidationMessage('Please select an ERP user from the search results.');
            return false;
          }
          const capacity = parseInt(document.getElementById('swal-candidate-capacity').value);
          if (isNaN(capacity) || capacity < 1 || capacity > 80) {
            Swal.showValidationMessage('Weekly capacity must be between 1 and 80 hours.');
            return false;
          }
          const division = document.getElementById('swal-candidate-division').value;
          const selectedSkills = Array.from(document.querySelectorAll('input[name="skill-tag"]:checked')).map(cb => cb.value);
          if (selectedSkills.length === 0) {
            Swal.showValidationMessage('Please select at least one creative skill tag.');
            return false;
          }

          return {
            user_id: selectedCandidateId,
            weekly_capacity_hours: capacity,
            division,
            skill_tags: selectedSkills
          };
        }
      });

      if (formValues) {
        try {
          const res = await fetch(`${API_BASE}/design/team-members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(formValues)
          });
          const data = await res.json();
          if (data.status === 'success' || res.ok) {
            toast(data.message || 'User added to Design Team successfully.', 'success');
            await loadData();
          } else {
            Swal.fire('Cannot Add User', data.message || 'Failed to add user to team', 'error');
          }
        } catch (e) {
          console.error(e);
          toast('Network error adding team member', 'error');
        }
      }
    });

    // 2. CREATE NEW DESIGNER ACCOUNT FLOW (Security: No Plaintext Passwords / No Hardcoded Password)
    container.querySelector('#btn-create-new-designer')?.addEventListener('click', async () => {
      const skillsCheckboxes = availableSkillOptions.map(s => `
        <label style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #334155; cursor: pointer;">
          <input type="checkbox" name="new-skill-tag" value="${s}" ${['poster', 'illustration'].includes(s) ? 'checked' : ''}>
          <span>${s}</span>
        </label>
      `).join('');

      const { value: formValues } = await Swal.fire({
        title: 'Create New Designer Account',
        width: '640px',
        html: `
          <div style="text-align: left; display: flex; flex-direction: column; gap: 12px; font-size: 0.85rem; font-family: inherit;">
            <div>
              <label style="font-weight: 700; color: #0f172a; display: block; margin-bottom: 4px;">Account Type <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
              <div style="display: flex; gap: 16px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                  <input type="radio" name="swal-acc-type" value="student" checked id="radio-acc-student">
                  <strong>Student Designer</strong> (Academic Profile)
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                  <input type="radio" name="swal-acc-type" value="non-student" id="radio-acc-non-student">
                  <strong>Staff / External Designer</strong>
                </label>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 3px;">Full Name <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <input type="text" id="swal-new-name" class="swal2-input" placeholder="e.g. Maya Suresh" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.85rem;">
              </div>
              <div>
                <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 3px;">Email Address <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <input type="email" id="swal-new-email" class="swal2-input" placeholder="e.g. maya@rajagiri.edu" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.85rem;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 3px;">Initial Secure Password <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <input type="password" id="swal-new-password" class="swal2-input" placeholder="Choose a secure password (min 6 chars)" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.85rem;">
              </div>
              <div>
                <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 3px;">Phone Number (Optional)</label>
                <input type="text" id="swal-new-phone" class="swal2-input" placeholder="+91 98470 00000" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.85rem;">
              </div>
            </div>

            <div id="swal-student-fields-box" style="background: #E0F2F1; border: 1px solid #b2dfdb; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
              <strong style="color: #00695C; font-size: 0.82rem;">Academic Student Profile Details</strong>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                <div>
                  <label style="font-size: 0.72rem; font-weight: 700; color: #00695C; display: block;">Course</label>
                  <input type="text" id="swal-new-course" class="swal2-input" value="MCA" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.8rem; padding: 4px 6px;">
                </div>
                <div>
                  <label style="font-size: 0.72rem; font-weight: 700; color: #00695C; display: block;">Batch</label>
                  <input type="text" id="swal-new-batch" class="swal2-input" value="2025-2027" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.8rem; padding: 4px 6px;">
                </div>
                <div>
                  <label style="font-size: 0.72rem; font-weight: 700; color: #00695C; display: block;">Semester</label>
                  <input type="number" id="swal-new-semester" class="swal2-input" value="1" min="1" max="10" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.8rem; padding: 4px 6px;">
                </div>
                <div>
                  <label style="font-size: 0.72rem; font-weight: 700; color: #00695C; display: block;">Designation</label>
                  <select id="swal-new-designation" class="swal2-select" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.8rem; height: 38px;">
                    <option value="nova">Nova</option>
                    <option value="orbit">Orbit</option>
                    <option value="spark">Spark</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Skills &amp; Competencies <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #f8fafc; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
                ${skillsCheckboxes}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 3px;">Weekly Capacity (Hours/Week) <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <input type="number" id="swal-new-capacity" class="swal2-input" value="20" min="1" max="80" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.85rem;">
              </div>
              <div>
                <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 3px;">Division / Unit</label>
                <select id="swal-new-division" class="swal2-select" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 0.85rem; height: 38px;">
                  ${approvedDivisions.map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Create Account',
        confirmButtonColor: '#009688',
        didOpen: () => {
          const studentBox = document.getElementById('swal-student-fields-box');
          const radioStudent = document.getElementById('radio-acc-student');
          const radioNonStudent = document.getElementById('radio-acc-non-student');

          radioStudent?.addEventListener('change', () => {
            if (radioStudent.checked) studentBox.style.display = 'flex';
          });
          radioNonStudent?.addEventListener('change', () => {
            if (radioNonStudent.checked) studentBox.style.display = 'none';
          });
        },
        preConfirm: () => {
          const name = document.getElementById('swal-new-name').value.trim();
          const email = document.getElementById('swal-new-email').value.trim();
          const password = document.getElementById('swal-new-password').value;
          const phone = document.getElementById('swal-new-phone').value.trim();
          const isStudent = document.getElementById('radio-acc-student').checked;
          const capacity = parseInt(document.getElementById('swal-new-capacity').value);
          const division = document.getElementById('swal-new-division').value;
          const selectedSkills = Array.from(document.querySelectorAll('input[name="new-skill-tag"]:checked')).map(cb => cb.value);

          if (!name || name.length < 2) {
            Swal.showValidationMessage('Full name is required.');
            return false;
          }
          if (!email || !email.includes('@')) {
            Swal.showValidationMessage('A valid unique email address is required.');
            return false;
          }
          if (!password || password.length < 6) {
            Swal.showValidationMessage('Password must be at least 6 characters.');
            return false;
          }
          if (isNaN(capacity) || capacity < 1 || capacity > 80) {
            Swal.showValidationMessage('Weekly capacity must be between 1 and 80 hours.');
            return false;
          }
          if (selectedSkills.length === 0) {
            Swal.showValidationMessage('Please select at least one skill tag.');
            return false;
          }

          const payload = {
            name,
            email,
            password,
            phone,
            account_type: isStudent ? 'student' : 'non-student',
            weekly_capacity_hours: capacity,
            division,
            skill_tags: selectedSkills
          };

          if (isStudent) {
            payload.course = document.getElementById('swal-new-course').value.trim() || 'MCA';
            payload.batch = document.getElementById('swal-new-batch').value.trim() || '2025-2027';
            payload.semester = parseInt(document.getElementById('swal-new-semester').value) || 1;
            payload.student_designation = document.getElementById('swal-new-designation').value || 'nova';
          }

          return payload;
        }
      });

      if (formValues) {
        try {
          const res = await fetch(`${API_BASE}/design/create-designer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(formValues)
          });
          const data = await res.json();
          if (data.status === 'success' || res.status === 201) {
            Swal.fire({
              title: 'Designer Created!',
              text: `Account for ${formValues.name} (${formValues.email}) created successfully.`,
              icon: 'success',
              confirmButtonColor: '#009688'
            });
            await loadData();
          } else {
            Swal.fire('Account Creation Failed', data.message || 'Error creating designer account', 'error');
          }
        } catch (e) {
          console.error(e);
          toast('Network error creating designer', 'error');
        }
      }
    });

    // 3. MANAGE DESIGNER PROFILE MODAL
    container.querySelectorAll('.btn-manage-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const u = JSON.parse(btn.dataset.user || '{}');
        const cap = teamCapacity?.team?.find(m => m.user_id === u.id);

        const skillsCheckboxes = availableSkillOptions.map(s => `
          <label style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #334155; cursor: pointer;">
            <input type="checkbox" name="edit-skill-tag" value="${s}" ${(u.skill_tags || []).includes(s) ? 'checked' : ''}>
            <span>${s}</span>
          </label>
        `).join('');

        const { value: formValues } = await Swal.fire({
          title: `Manage Designer: ${u.name}`,
          width: '620px',
          html: `
            <div style="text-align: left; display: flex; flex-direction: column; gap: 14px; font-size: 0.88rem; font-family: inherit;">
              
              <!-- Profile Header Card -->
              <div style="display: flex; align-items: center; gap: 14px; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                <img src="${u.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.name) + '&background=009688&color=fff'}" style="width: 48px; height: 48px; border-radius: 9999px; object-fit: cover;">
                <div style="flex: 1;">
                  <div style="font-weight: 700; font-size: 1rem; color: #0f172a;">${u.name}</div>
                  <div style="color: #64748b; font-size: 0.8rem;">${u.email} · ${u.phone}</div>
                  <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">
                    Role: <strong>${u.system_role}</strong> (${u.design_role}) · Joined: <strong>${u.joining_date || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              <!-- Read-Only Workload & Availability Strip -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #E0F2F1; border: 1px solid #b2dfdb; padding: 10px; border-radius: 8px;">
                <div>
                  <div style="font-size: 0.72rem; color: #00695C; font-weight: 700; text-transform: uppercase;">Open Tasks</div>
                  <div style="font-weight: 800; color: #004D40; font-size: 1.05rem;">${u.open_tickets_count || (cap ? cap.open_tickets_count : 0)}</div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: #00695C; font-weight: 700; text-transform: uppercase;">Committed Hours</div>
                  <div style="font-weight: 800; color: #004D40; font-size: 1.05rem;">${parseFloat(u.hours_committed_this_week || 0).toFixed(1)}h</div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: #00695C; font-weight: 700; text-transform: uppercase;">Availability</div>
                  <div style="font-weight: 700; color: #00695C; font-size: 0.82rem;">${cap ? cap.next_free_slot : 'Immediate'}</div>
                </div>
              </div>

              <!-- Editable Skills -->
              <div>
                <label style="font-size: 0.8rem; font-weight: 700; color: #0f172a; display: block; margin-bottom: 4px;">
                  Design Skills &amp; Specialties
                </label>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #f8fafc; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
                  ${skillsCheckboxes}
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 0.8rem; font-weight: 700; color: #0f172a;">Weekly Capacity (Hours/Week) <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <input id="swal-edit-capacity" type="number" min="0" max="80" class="swal2-input" value="${u.weekly_capacity_hours || 20}" style="margin: 4px 0 0 0; width: 100%; box-sizing: border-box; font-size: 0.85rem;">
                </div>
                <div>
                  <label style="font-size: 0.8rem; font-weight: 700; color: #0f172a;">Division / Unit</label>
                  <select id="swal-edit-division" class="swal2-select" style="margin: 4px 0 0 0; width: 100%; box-sizing: border-box; font-size: 0.85rem; height: 38px;">
                    ${approvedDivisions.map(d => `<option value="${d}" ${u.division === d ? 'selected' : ''}>${d}</option>`).join('')}
                  </select>
                </div>
              </div>

              <!-- Active Status Toggle -->
              <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem; color: #0f172a;">Active Design Membership</div>
                  <div style="font-size: 0.74rem; color: #64748b;">Controls visibility of the Student Design Workspace sidebar and allocation eligibility.</div>
                </div>
                <input type="checkbox" id="swal-edit-active" ${u.is_active ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
              </div>

            </div>
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Save Profile Changes',
          confirmButtonColor: '#009688',
          preConfirm: () => {
            const capVal = parseInt(document.getElementById('swal-edit-capacity').value);
            const activeVal = document.getElementById('swal-edit-active').checked;
            const divisionVal = document.getElementById('swal-edit-division').value;
            const selectedSkills = Array.from(document.querySelectorAll('input[name="edit-skill-tag"]:checked')).map(cb => cb.value);

            if (isNaN(capVal) || capVal < 0 || capVal > 80) {
              Swal.showValidationMessage('Please provide a valid weekly capacity (0 - 80 hours).');
              return false;
            }
            if (selectedSkills.length === 0) {
              Swal.showValidationMessage('Please select at least one skill tag.');
              return false;
            }
            return {
              weekly_capacity_hours: capVal,
              is_active: activeVal,
              division: divisionVal,
              skill_tags: selectedSkills
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
            if (data.status === 'success' || res.ok) {
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
