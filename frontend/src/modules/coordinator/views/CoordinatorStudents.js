import { authStore } from '@/core/stores/auth.js';
import { API_BASE } from '@/core/config/api.js';

function getAuthToken() {
  return authStore?.token || localStorage.getItem('token') || localStorage.getItem('access_token') || null;
}

async function fetchStudents() {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required. Please log in again.');

  const resp = await fetch(`${API_BASE}/coordinator/students`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || body.message || 'Failed to load students');
  }

  const body = await resp.json();
  return Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
}

export async function CoordinatorStudents(route, router) {
  const container = document.createElement('div');
  container.className = 'coordinator-dashboard';

  let students = [];

  try {
    students = await fetchStudents();
  } catch (err) {
    console.error('Failed to load students from API:', err);
    students = [];
  }

  // Nova/Orbit/Spark are the roles offered by Assign Student; the older values
  // stay listed so existing assignment records still display and filter correctly.
  const ROLE_LABELS = {
    nova: 'Nova',
    orbit: 'Orbit',
    spark: 'Spark',
    project_lead: 'Project Lead',
    developer: 'Developer',
    designer: 'Designer',
    tester: 'Tester',
    other: 'Other',
  };

  function roleKey(designation) {
    const label = String(designation || '').toLowerCase().replace(/\s+/g, '_');
    return Object.keys(ROLE_LABELS).includes(label) ? label : 'other';
  }

  function assignmentsOf(student) {
    return Array.isArray(student.assignments) ? student.assignments : [];
  }

  function getUniqueProjects(data) {
    const map = new Map();
    data.forEach((s) => {
      assignmentsOf(s).forEach((a) => {
        if (a.project_id && !map.has(a.project_id)) map.set(a.project_id, a.project_title);
      });
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }

  // A student may belong to multiple projects at once — render one row per student
  // (never duplicate rows), listing every assignment within that row's cells.
  function renderTableRows(data, emptyMessage = 'No students found.') {
    if (!data.length) {
      return `<tr><td colspan="7" style="text-align:center; padding:2rem;">${emptyMessage}</td></tr>`;
    }
    return data.map(student => {
      const assignments = assignmentsOf(student);
      const roleAttr = assignments.map(a => roleKey(a.designation)).join(' ');
      const projectIdAttr = assignments.map(a => a.project_id).join(' ');

      const designationCell = assignments.length
        ? assignments.map(a => `<span class="student-track ${roleKey(a.designation)}">${ROLE_LABELS[roleKey(a.designation)] || a.designation}</span>`).join('<br>')
        : '—';
      const projectCell = assignments.length
        ? assignments.map(a => a.project_title).join('<br>')
        : 'Unassigned';
      const dateCell = assignments.length
        ? assignments.map(a => a.assigned_date || '—').join('<br>')
        : '—';

      return `
      <tr class="coordinator-row-clickable" data-student-id="${student.id}" data-roles="${roleAttr}" data-project-ids="${projectIdAttr}" tabindex="0">
        <td><strong>${student.name}</strong></td>
        <td>${student.email}</td>
        <td>${student.phone || '—'}</td>
        <td>${designationCell}</td>
        <td>${projectCell}</td>
        <td>${dateCell}</td>
        <td>
          <span class="project-status ${String(student.status || 'unassigned').toLowerCase()}">
            ${student.status}
          </span>
        </td>
      </tr>
    `;
    }).join('');
  }

  function sortStudents(data, sortBy) {
    const copy = [...data];
    copy.sort((a, b) => {
      if (sortBy === 'email') return String(a.email).localeCompare(String(b.email));
      if (sortBy === 'status') return String(a.status).localeCompare(String(b.status));
      if (sortBy === 'project') {
        const pa = assignmentsOf(a)[0]?.project_title || '';
        const pb = assignmentsOf(b)[0]?.project_title || '';
        return pa.localeCompare(pb) || a.name.localeCompare(b.name);
      }
      if (sortBy === 'designation') {
        const da = assignmentsOf(a)[0]?.designation || '';
        const db = assignmentsOf(b)[0]?.designation || '';
        return da.localeCompare(db) || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
    return copy;
  }

  function render() {
    const unassignedCount = students.filter(s => s.status === 'Unassigned').length;
    const assignedCount = students.length - unassignedCount;
    const projects = getUniqueProjects(students);

    container.innerHTML = `
      <div class="coordinator-header">
        <div>
          <h1>Students</h1>
          <p>Manage student accounts and view project assignments.</p>
        </div>

        <button class="coordinator-primary-btn" id="add-student-btn">
          + Add Student
        </button>
      </div>

      <!-- Student KPI Cards — each one is also a filter for the roster below -->
      <div class="coordinator-kpi-grid">
        <div class="coordinator-kpi-card kpi-primary" data-filter="all" role="button" tabindex="0" title="Show all students">
          <span>Total Students</span>
          <strong id="kpi-total">${students.length}</strong>
          <small>Registered in RLabZ</small>
        </div>

        <div class="coordinator-kpi-card kpi-teal" data-filter="assigned" role="button" tabindex="0" title="Show students on a current project">
          <span>Assigned</span>
          <strong id="kpi-assigned">${assignedCount}</strong>
          <small>Currently on a project</small>
        </div>

        <div class="coordinator-kpi-card kpi-amber" data-filter="unassigned" role="button" tabindex="0" title="Show students not on a current project">
          <span>Unassigned</span>
          <strong id="kpi-unassigned">${unassignedCount}</strong>
          <small>Not yet on a project</small>
        </div>
      </div>

      <!-- Student Table -->
      <div class="coordinator-panel">
        <div class="coordinator-panel-header">
          <div>
            <h2>Student Roster</h2>
            <p>View students and their current project assignments.</p>
          </div>
        </div>

        <div class="app-list-toolbar">
          <input type="search" id="student-search" class="app-search-input" placeholder="Search students by name or email..." aria-label="Search students by name or email" autocomplete="off" />

          <select id="designation-filter" class="app-select" aria-label="Filter by designation">
            <option value="all">All</option>
            <option value="unassigned">Unassigned</option>
            <option value="nova">Nova</option>
            <option value="orbit">Orbit</option>
            <option value="spark">Spark</option>
            <option value="project_lead">Project Lead</option>
            <option value="developer">Developer</option>
            <option value="designer">Designer</option>
            <option value="tester">Tester</option>
            <option value="other">Other</option>
          </select>

          <select id="project-filter" class="app-select" aria-label="Filter by project">
            <option value="all">All Projects</option>
            ${projects.map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
          </select>

          <select id="sort-by" class="app-select" aria-label="Sort students">
            <option value="name">Sort: Name</option>
            <option value="email">Sort: Email</option>
            <option value="project">Sort: Project</option>
            <option value="designation">Sort: Designation</option>
            <option value="status">Sort: Status</option>
          </select>

          <span class="app-list-toolbar-count" id="student-result-count" aria-live="polite"></span>
        </div>

        <div class="coordinator-table-wrapper">
          <table class="coordinator-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Designation</th>
                <th>Project</th>
                <th>Assigned Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="students-table-body">
              ${renderTableRows(students)}
            </tbody>
          </table>
        </div>
      </div>

      <div id="student-modal-root"></div>
    `;

    container.querySelector('#designation-filter')?.addEventListener('change', applyFiltersAndSort);
    container.querySelector('#project-filter')?.addEventListener('change', applyFiltersAndSort);
    container.querySelector('#sort-by')?.addEventListener('change', applyFiltersAndSort);
    container.querySelector('#student-search')?.addEventListener('input', applyFiltersAndSort);
    container.querySelector('#add-student-btn')?.addEventListener('click', showAddStudentModal);

    container.querySelectorAll('.coordinator-kpi-card[data-filter]').forEach((card) => {
      const select = () => setStatusFilter(card.dataset.filter);
      card.addEventListener('click', select);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      });
    });

    // Re-apply the selected card filter (e.g. after render() following Add Student).
    applyFiltersAndSort();
  }

  // Summary-card filter: 'all' | 'assigned' | 'unassigned'. Uses student.status,
  // which the backend derives from current assignments only (project status
  // proposed/accepted/in_progress), so it always agrees with the card counts.
  let statusFilter = 'all';

  function setStatusFilter(value) {
    statusFilter = value;
    // Switching cards clears the search so e.g. Total Students never shows a
    // list still narrowed by a query typed under Unassigned.
    const searchInput = container.querySelector('#student-search');
    if (searchInput) searchInput.value = '';
    applyFiltersAndSort();
  }

  function applyFiltersAndSort() {
    const roleFilter = container.querySelector('#designation-filter')?.value || 'all';
    const projectFilter = container.querySelector('#project-filter')?.value || 'all';
    const sortBy = container.querySelector('#sort-by')?.value || 'name';
    const searchInput = container.querySelector('#student-search');
    const query = (searchInput?.value || '').trim().toLowerCase();

    container.querySelectorAll('.coordinator-kpi-card[data-filter]').forEach((card) => {
      const active = card.dataset.filter === statusFilter;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', String(active));
    });
    if (searchInput) {
      searchInput.placeholder = statusFilter === 'unassigned'
        ? 'Search unassigned students by name or email...'
        : 'Search students by name or email...';
    }

    const visible = students.filter((student) => {
      if (statusFilter === 'assigned' && student.status !== 'Active') return false;
      if (statusFilter === 'unassigned' && student.status !== 'Unassigned') return false;

      const assignments = assignmentsOf(student);
      if (roleFilter === 'unassigned') {
        if (student.status !== 'Unassigned') return false;
      } else if (roleFilter !== 'all' && !assignments.some((a) => roleKey(a.designation) === roleFilter)) {
        return false;
      }

      if (projectFilter !== 'all' && !assignments.some((a) => String(a.project_id) === projectFilter)) return false;

      if (query) {
        const name = String(student.name || '').toLowerCase();
        const email = String(student.email || '').toLowerCase();
        if (!name.includes(query) && !email.includes(query)) return false;
      }
      return true;
    });

    const isNarrowed = statusFilter !== 'all' || roleFilter !== 'all' || projectFilter !== 'all' || query;
    const tbody = container.querySelector('#students-table-body');
    if (tbody) {
      tbody.innerHTML = renderTableRows(
        sortStudents(visible, sortBy),
        isNarrowed ? 'No students match the current filters.' : 'No students found.'
      );
    }

    const countEl = container.querySelector('#student-result-count');
    if (countEl) countEl.textContent = `Showing ${visible.length} of ${students.length} students`;

    bindRowClicks();
  }

  // Row is clickable anywhere, opens a detail view of that student using data
  // already loaded on this page (assignments/projects) — no new fetch, no new
  // page/route. Does not fire when the click lands on an interactive element
  // inside the row (none exist today, but guarded in case one is added later).
  function bindRowClicks() {
    container.querySelectorAll('#students-table-body tr[data-student-id]').forEach((row) => {
      const open = (e) => {
        if (e.target.closest('button, a, input, select, textarea')) return;
        const student = students.find((s) => String(s.id) === row.dataset.studentId);
        if (student) showStudentDetailModal(student);
      };
      row.addEventListener('click', open);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(e);
        }
      });
    });
  }

  function showStudentDetailModal(student) {
    const modalRoot = container.querySelector('#student-modal-root');
    const assignments = assignmentsOf(student);

    modalRoot.innerHTML = `
      <div class="coordinator-modal-overlay">
        <div class="coordinator-modal">
          <div class="coordinator-modal-header">
            <div>
              <h2>${student.name}</h2>
              <p>${student.email}${student.phone ? ` • ${student.phone}` : ''}</p>
            </div>
            <button id="close-student-detail-modal" class="coordinator-close-btn">×</button>
          </div>

          <div style="padding: 0 1.5rem 1.5rem;">
            <h4 style="margin: 0 0 0.6rem; font-size: 0.85rem; color: #111827;">Project Assignments</h4>
            ${assignments.length ? `
              <div class="coordinator-table-wrapper">
                <table class="coordinator-table">
                  <thead>
                    <tr><th>Project</th><th>Role</th><th>Assigned Since</th></tr>
                  </thead>
                  <tbody>
                    ${assignments.map((a) => `
                      <tr>
                        <td>${a.project_title || '—'}</td>
                        <td><span class="student-track ${roleKey(a.designation)}">${ROLE_LABELS[roleKey(a.designation)] || a.designation}</span></td>
                        <td>${a.assigned_date || '—'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p class="coordinator-empty-copy">Not currently assigned to any project.</p>'}
          </div>

          <div class="coordinator-modal-footer">
            <button class="coordinator-secondary-btn" id="close-student-detail-footer">Close</button>
          </div>
        </div>
      </div>
    `;

    const close = () => { modalRoot.innerHTML = ''; };
    modalRoot.querySelector('#close-student-detail-modal')?.addEventListener('click', close);
    modalRoot.querySelector('#close-student-detail-footer')?.addEventListener('click', close);
    modalRoot.querySelector('.coordinator-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });
  }

  async function showAddStudentModal() {
    const modalRoot = container.querySelector('#student-modal-root');

    modalRoot.innerHTML = `
      <div class="coordinator-modal-overlay">
        <div class="coordinator-modal">
          <div class="coordinator-modal-header">
            <div>
              <h2>Add Student</h2>
              <p>Create a new student account.</p>
            </div>
            <button id="close-student-modal" class="coordinator-close-btn">×</button>
          </div>

          <form id="new-student-form">
            <div class="coordinator-form-grid">
              <div class="coordinator-form-group full-width">
                <label>Name *</label>
                <input type="text" name="name" placeholder="Enter student name" required>
              </div>

              <div class="coordinator-form-group full-width">
                <label>Email *</label>
                <input type="email" name="email" placeholder="name@rajagiri.edu" required>
              </div>

              <div class="coordinator-form-group">
                <label>Password *</label>
                <input type="password" name="password" placeholder="Minimum 6 characters" minlength="6" required>
              </div>

              <div class="coordinator-form-group">
                <label>Phone</label>
                <input type="text" name="phone" placeholder="Optional">
              </div>

              <div class="coordinator-form-group">
                <label>Role</label>
                <input type="text" value="Student" disabled>
              </div>
            </div>

            <div id="student-form-error" style="color:#b91c1c; margin: 0 1rem 0.5rem;"></div>

            <div class="coordinator-modal-footer">
              <button type="button" id="cancel-student" class="coordinator-secondary-btn">Cancel</button>
              <button type="submit" class="coordinator-primary-btn">Add Student</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modalRoot.querySelector('#close-student-modal')?.addEventListener('click', closeModal);
    modalRoot.querySelector('#cancel-student')?.addEventListener('click', closeModal);

    modalRoot.querySelector('#new-student-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorEl = modalRoot.querySelector('#student-form-error');
      errorEl.textContent = '';

      const form = event.target;
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      if (!payload.phone) delete payload.phone;

      const token = getAuthToken();
      if (!token) {
        errorEl.textContent = 'Authentication required. Please log in.';
        return;
      }

      try {
        const resp = await fetch(`${API_BASE}/coordinator/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const body = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          const message = body.errors
            ? Object.values(body.errors).flat().join(', ')
            : (body.error || body.message || 'Failed to add student');
          throw new Error(message);
        }

        alert('Student added successfully!');
        closeModal();

        // Refresh full view from backend (also refreshes the project filter dropdown)
        students = await fetchStudents();
        render();

      } catch (err) {
        console.error(err);
        errorEl.textContent = err.message;
      }
    });
  }

  function closeModal() {
    const modalRoot = container.querySelector('#student-modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
  }

  render();

  return container;
}

export default CoordinatorStudents;