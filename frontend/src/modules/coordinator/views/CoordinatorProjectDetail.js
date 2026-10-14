import { authStore } from '@/core/stores/auth.js';
import { API_BASE } from '@/core/config/api.js';

function getAuthToken() {
  return authStore?.token || localStorage.getItem('token') || localStorage.getItem('access_token') || null;
}

function formatLabel(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function fetchProjectDetail(projectId) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const response = await fetch(`${API_BASE}/coordinator/projects/${projectId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || errorData.status || 'Unable to load project details.');
  }

  const data = await response.json();
  return {
    project: data?.data?.project || data?.project || null,
    // Backend-computed, same formula/data-source as the Faculty module
    // (CoordinatorController::projectProgress() mirrors
    // FacultyController::getDashboardData()'s completed/total task ratio) —
    // use this instead of recomputing progress client-side.
    progress: data?.data?.progress || null,
  };
}

export async function CoordinatorProjectDetail(route, router) {
  const container = document.createElement('div');
  container.className = 'coordinator-dashboard';

  const projectId = route.params?.id;

  if (!projectId) {
    container.innerHTML = `
      <div class="coordinator-panel coordinator-empty-state">
        <h2>Project not found</h2>
        <p>The selected project could not be loaded.</p>
        <button class="coord-btn coord-btn-primary" data-action="back">Back to projects</button>
      </div>
    `;
    container.querySelector('[data-action="back"]')?.addEventListener('click', () => router.push('/coordinator/projects'));
    return container;
  }

  try {
    const { project, progress } = await fetchProjectDetail(projectId);

    if (!project) {
      throw new Error('Project not found.');
    }

    const completion = {
      percent: progress?.completion_percentage ?? 0,
      completed: progress?.completed_task_count ?? 0,
      total: progress?.task_count ?? 0,
    };
    const students = Array.isArray(project.students) ? project.students : [];
    const faculty = Array.isArray(project.faculty) ? project.faculty : [];
    const requirements = Array.isArray(project.requirements) ? project.requirements : [];
    const modules = Array.isArray(project.modules) ? project.modules : [];
    const certificates = Array.isArray(project.certificates) ? project.certificates : [];
    const requirementChanges = Array.isArray(project.requirement_changes) ? project.requirement_changes : [];

    container.innerHTML = `
      <div class="coordinator-header">
        <div>
          <h1>${project.title || 'Project Details'}</h1>
          <p>${project.client_name || project.clientName || 'Client information unavailable'}</p>
        </div>

        <div class="coordinator-header-actions">
          <button class="coord-btn coord-btn-secondary" data-action="back">Back to projects</button>
          <button class="coord-btn coord-btn-primary" id="assign-student-btn">Assign Student</button>
          <button class="coord-btn coord-btn-secondary" id="add-requirement-btn">Add Requirement</button>
          <button class="coord-btn coord-btn-secondary" id="change-requirement-btn">Change Requirement</button>
          <button class="coord-btn coord-btn-danger" id="close-project-btn">Close Project</button>
        </div>
      </div>

      <div class="coordinator-kpi-grid">
        <div class="coordinator-kpi-card">
          <span>Status</span>
          <strong>${formatLabel(project.status || 'In Progress')}</strong>
          <small>Current project phase</small>
        </div>

        <div class="coordinator-kpi-card">
          <span>Progress</span>
          <strong>${completion.percent}%</strong>
          <small>${completion.completed} of ${completion.total} tasks complete</small>
        </div>

        <div class="coordinator-kpi-card">
          <span>Priority</span>
          <strong>${formatLabel(project.priority || 'Normal')}</strong>
          <small>Project urgency</small>
        </div>

        <div class="coordinator-kpi-card">
          <span>Team Size</span>
          <strong>${students.length + faculty.length}</strong>
          <small>Students and faculty</small>
        </div>
      </div>

      <div class="coordinator-panel coordinator-project-detail-grid">
        <div class="coordinator-detail-card">
          <h2>Project overview</h2>

          <div class="coordinator-detail-list">
            <div><span>Project type</span><strong>${formatLabel(project.project_type || project.type || 'General')}</strong></div>
            <div><span>Source</span><strong>${formatLabel(project.source_type || 'External')}</strong></div>
            <div><span>Source by</span><strong>${project.brought_by || 'Not specified'}</strong></div>
            <div><span>Client</span><strong>${project.client_name || 'Not specified'}</strong></div>
            <div><span>Contact email</span><strong>${project.contact_email || 'Not specified'}</strong></div>
            <div><span>Contact phone</span><strong>${project.contact_phone || 'Not specified'}</strong></div>
            <div><span>Budget</span><strong>${project.budget ? `₹${Number(project.budget).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}</strong></div>
            <div><span>Expected timeline</span><strong>${formatDate(project.expected_timeline)}</strong></div>
          </div>
        </div>

        <div class="coordinator-detail-card">
          <h2>Team members</h2>

          <div class="coordinator-member-group">
            <h3>Assigned students</h3>
            ${students.length ? students.map((student) => `
              <div class="coordinator-member-row" data-student-id="${student.id}">
                <span>${student.name || 'Student'}</span>
                <small>${student.email || 'No email provided'}</small>
                <em>${formatLabel(student.pivot?.role || 'Member')}</em>
              </div>
            `).join('') : '<p class="coordinator-empty-copy">No students assigned yet.</p>'}
          </div>

          <div class="coordinator-member-group">
            <h3>Assigned faculty</h3>
            ${faculty.length ? faculty.map((person) => `
              <div class="coordinator-member-row" data-faculty-id="${person.id}">
                <span>${person.name || 'Faculty'}</span>
                <small>${person.email || 'No email provided'}</small>
                <em>${formatLabel((person.role || 'Faculty'))}</em>
              </div>
            `).join('') : '<p class="coordinator-empty-copy">No faculty assigned yet.</p>'}
          </div>
        </div>
      </div>

      <div class="coordinator-panel">
        <div class="coordinator-panel-header">
          <div>
            <h2>Project information</h2>
            <p>Readable summary of the selected project record.</p>
          </div>
        </div>

        <div class="coordinator-project-summary">
          <div>
            <span>Description / requirements</span>
            <p>${project.requirements_text || 'No project requirements have been recorded yet.'}</p>
          </div>
          <div>
            <span>Deliverables</span>
            <p>${project.deliverables || 'No deliverables have been added yet.'}</p>
          </div>
        </div>

      </div>

      <div class="coordinator-panel coordinator-project-detail-grid">
        <div class="coordinator-detail-card">
          <h2>Modules</h2>
          <div id="modules-list">
            ${modules.length ? modules.map((module) => `
              <div class="coordinator-requirement-item" data-module-id="${module.id}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong>${module.module_name}</strong>
                  <span class="project-status ${String(module.status || '').toLowerCase().replace(/_/g, '-')}">${formatLabel(module.status)}</span>
                </div>
                <p>${module.description || 'No description provided.'}</p>
                <div style="margin: 0.5rem 0;">
                  ${Array.isArray(module.tasks) && module.tasks.length
                    ? module.tasks.map((t) => `<span class="priority-badge normal" style="margin-right:4px;">${t.title} (${formatLabel(t.status)})</span>`).join('')
                    : '<em>No tasks yet.</em>'}
                </div>
                <div style="margin-bottom:0.5rem;">
                  <span style="font-size:0.8rem; color: var(--text-muted, #6b7280);">Assigned:</span>
                  ${Array.isArray(module.students) && module.students.length
                    ? module.students.map((s) => `<span class="priority-badge normal" style="margin-right:4px;">${s.name}</span>`).join('')
                    : '<em>No students assigned to this module yet.</em>'}
                </div>
              </div>
            `).join('') : '<p class="coordinator-empty-copy">No modules have been created for this project yet. Modules and tasks are created and assigned by faculty.</p>'}
          </div>
        </div>

        <div class="coordinator-detail-card">
          <h2>Certificates</h2>
          <div id="certificates-list">
            ${certificates.length ? certificates.map((cert) => `
              <div class="coordinator-requirement-item">
                <strong>${cert.student?.name || 'Student'}</strong>
                <p>${cert.description}</p>
                <small>${cert.module?.module_name ? `Module: ${cert.module.module_name} • ` : ''}Certificate No: ${cert.certificate_number} • Issued: ${formatDate(cert.issue_date)}</small>
              </div>
            `).join('') : '<p class="coordinator-empty-copy">No certificates issued for this project yet.</p>'}
          </div>
        </div>
      </div>

      <div class="coordinator-panel">
        <div class="coordinator-panel-header">
          <div>
            <h2>Client requirements</h2>
            <p>Current recorded requirements for this project.</p>
          </div>
        </div>

        <div id="requirements-list">
          ${requirements.length ? requirements.map((item) => `
            <div class="coordinator-requirement-item" data-requirement-id="${item.id}">
              <p>${item.description || 'Requirement details unavailable.'}</p>
              <small>Task: ${item.task?.title || 'N/A'} • Uploaded by ${item.uploader?.name || 'Unknown'} on ${formatDate(item.uploaded_on)}</small>
              <div style="margin-top:0.5rem;">
                <button class="coord-btn coord-btn-secondary btn-log-change" data-requirement-id="${item.id}">Log a change</button>
              </div>
            </div>
          `).join('') : '<p class="coordinator-empty-copy">No client requirements recorded yet.</p>'}
        </div>
      </div>

      <div class="coordinator-panel">
        <div class="coordinator-panel-header">
          <div>
            <h2>Requirement change history</h2>
            <p>Tracked changes made to requirements after they were first recorded.</p>
          </div>
        </div>

        <div id="requirement-changes-list">
          ${requirementChanges.length ? requirementChanges.map((change) => `
            <div class="coordinator-requirement-item">
              <p>${change.change_description}</p>
              <small>Status: ${formatLabel(change.status)} • Requested by ${change.requester?.name || 'Unknown'} on ${formatDate(change.changed_on)}</small>
            </div>
          `).join('') : '<p class="coordinator-empty-copy">No requirement changes recorded yet.</p>'}
        </div>
      </div>
    `;

    container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      router.push('/coordinator/projects');
    });

    // Modal helpers
    function openModal(html) {
      const overlay = document.createElement('div');
      overlay.className = 'coordinator-modal-overlay';
      overlay.innerHTML = `<div class="coordinator-modal">${html}</div>`;
      document.body.appendChild(overlay);
      // Both the header "×" and the footer "Cancel" carry .coordinator-close-btn.
      overlay.querySelectorAll('.coordinator-close-btn').forEach((btn) => btn.addEventListener('click', () => overlay.remove()));
      return overlay;
    }

    async function postJson(url, body) {
      const token = getAuthToken();
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || data.message || 'Request failed');
      return data;
    }

    async function fetchEligibleStudents() {
      const token = getAuthToken();
      const resp = await fetch(`${API_BASE}/coordinator/students/eligible?project_id=${projectId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) return [];
      const data = await resp.json().catch(() => ({}));
      return Array.isArray(data?.data) ? data.data : [];
    }

    async function fetchStudentCurrentProjects(studentId) {
      const token = getAuthToken();
      const resp = await fetch(`${API_BASE}/coordinator/students/${studentId}/current-projects`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) return [];
      const data = await resp.json().catch(() => ({}));
      return Array.isArray(data?.data) ? data.data : [];
    }

    // Assign student — searchable list populated from students not already assigned
    // to THIS project (a student may already be on a different project — that's
    // allowed, and is exactly what the current-project side panel surfaces).
    container.querySelector('#assign-student-btn')?.addEventListener('click', async () => {
      const html = `
        <div class="coordinator-modal-header">
          <h2>Assign Student</h2>
          <p>Search for a student, review their current project, and set their role on this project.</p>
          <button class="coordinator-close-btn">×</button>
        </div>
        <div class="coordinator-assign-student-layout">
          <div class="coordinator-form-grid" style="flex:1; min-width:260px;">
            <div class="coordinator-form-group full-width">
              <label>Student *</label>
              <input type="text" id="assign-student-search" class="app-search-input" placeholder="Search by name or email..." autocomplete="off" />
              <input type="hidden" id="assign-student-id" />
              <div id="assign-student-results" class="coordinator-student-search-results"></div>
            </div>
            <div class="coordinator-form-group"><label>Role</label>
              <select id="assign-student-role">
                <option value="nova">Nova</option>
                <option value="orbit">Orbit</option>
                <option value="spark">Spark</option>
              </select>
              <small id="assign-role-note" style="display:none; color:#6b7280; margin-top:0.25rem;">This student already has a role set — it applies to every project and can't be changed here.</small>
            </div>
            <div class="coordinator-form-group"><label>Assigned date (optional)</label><input type="date" id="assign-student-date" /></div>
          </div>
          <div class="coordinator-current-project-panel" id="current-project-panel">
            <h4>Current Project</h4>
            <p class="coordinator-empty-copy">Select a student to see their current project.</p>
          </div>
        </div>
        <div class="coordinator-modal-footer">
          <button class="coordinator-secondary-btn coordinator-close-btn">Cancel</button>
          <button class="coordinator-primary-btn" id="assign-student-submit">Assign</button>
        </div>
      `;

      const overlay = openModal(html);

      const searchInput = overlay.querySelector('#assign-student-search');
      const hiddenId = overlay.querySelector('#assign-student-id');
      const resultsBox = overlay.querySelector('#assign-student-results');
      const roleSel = overlay.querySelector('#assign-student-role');
      const roleNote = overlay.querySelector('#assign-role-note');
      const currentProjectPanel = overlay.querySelector('#current-project-panel');

      // Fetched once when the modal opens — all filtering as the coordinator
      // types happens client-side against this already-loaded list, so no
      // repeated network request is made per keystroke.
      searchInput.placeholder = 'Loading students...';
      const available = await fetchEligibleStudents();
      searchInput.placeholder = 'Search by name or email...';
      const studentsById = new Map(available.map((s) => [String(s.id), s]));

      function renderResults(query) {
        const q = query.trim().toLowerCase();
        const matches = q
          ? available.filter((s) => (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q))
          : available;

        if (!available.length) {
          resultsBox.innerHTML = `<div class="coordinator-student-result-empty">No unassigned students available</div>`;
          return;
        }
        if (!matches.length) {
          resultsBox.innerHTML = `<div class="coordinator-student-result-empty">No students match "${query}"</div>`;
          return;
        }
        resultsBox.innerHTML = matches.slice(0, 50).map((s) => `
          <div class="coordinator-student-result" data-student-id="${s.id}">
            <strong>${s.name}</strong>
            <small>${s.email || ''}</small>
          </div>
        `).join('');
      }

      async function selectStudent(studentId) {
        const student = studentsById.get(String(studentId));
        if (!student) return;

        hiddenId.value = student.id;
        searchInput.value = student.name + (student.email ? ` (${student.email})` : '');
        resultsBox.innerHTML = '';
        resultsBox.style.display = 'none';

        // Only a Nova/Orbit/Spark global role locks the picker. A legacy role
        // (project_lead, developer, ...) isn't offered any more, so the coordinator
        // picks a new one and the backend replaces the legacy global role.
        const existingRole = student.existing_role;
        if (existingRole && Array.from(roleSel.options).some((o) => o.value === existingRole)) {
          roleSel.value = existingRole;
          roleSel.disabled = true;
          roleNote.style.display = 'block';
        } else {
          roleSel.disabled = false;
          roleNote.style.display = 'none';
        }

        currentProjectPanel.innerHTML = `<h4>Current Project</h4><p class="coordinator-empty-copy">Loading…</p>`;
        const currentProjects = await fetchStudentCurrentProjects(student.id);
        if (!currentProjects.length) {
          currentProjectPanel.innerHTML = `<h4>Current Project</h4><p class="coordinator-empty-copy">No current project assigned.</p>`;
          return;
        }
        currentProjectPanel.innerHTML = `
          <h4>Current Project${currentProjects.length > 1 ? 's' : ''}</h4>
          ${currentProjects.map((p) => `
            <div class="coordinator-current-project-card">
              <strong>${p.title || 'Untitled project'}</strong>
              ${p.client_name ? `<div class="coordinator-current-project-row"><span>Client</span><span>${p.client_name}</span></div>` : ''}
              <div class="coordinator-current-project-row"><span>Role</span><span>${formatLabel(p.role)}</span></div>
              <div class="coordinator-current-project-row"><span>Status</span><span>${formatLabel(p.status)}</span></div>
              ${p.assigned_date ? `<div class="coordinator-current-project-row"><span>Since</span><span>${formatDate(p.assigned_date)}</span></div>` : ''}
            </div>
          `).join('')}
        `;
      }

      searchInput.addEventListener('input', () => {
        hiddenId.value = '';
        resultsBox.style.display = 'block';
        renderResults(searchInput.value);
        currentProjectPanel.innerHTML = `<h4>Current Project</h4><p class="coordinator-empty-copy">Select a student to see their current project.</p>`;
      });
      searchInput.addEventListener('focus', () => {
        resultsBox.style.display = 'block';
        renderResults(searchInput.value);
      });

      resultsBox.addEventListener('click', (e) => {
        const row = e.target.closest('.coordinator-student-result');
        if (row?.dataset.studentId) selectStudent(row.dataset.studentId);
      });

      overlay.querySelector('#assign-student-submit').addEventListener('click', async () => {
        const studentId = Number(hiddenId.value || 0);
        const role = roleSel.value;
        const assigned_date = overlay.querySelector('#assign-student-date').value || undefined;
        if (!studentId) return alert('Please search for and select a student');
        try {
          await postJson(`${API_BASE}/coordinator/projects/${projectId}/students`, { student_id: studentId, role, assigned_date });
          alert('Student assigned');
          overlay.remove();
          window.location.reload();
        } catch (err) {
          alert(err.message || 'Failed to assign student');
        }
      });
    });

    // Remove student buttons next to each student row — use data-student-id attribute (do not guess)
    Array.from(container.querySelectorAll('.coordinator-member-row[data-student-id]')).forEach((row) => {
      const name = row.querySelector('span')?.textContent || '';
      const studentId = row.dataset.studentId;
      const btn = document.createElement('button');
      btn.className = 'coordinator-secondary-btn';
      btn.textContent = 'Remove';
      btn.style.marginLeft = '8px';
      row.appendChild(btn);
      btn.addEventListener('click', async () => {
        if (!confirm(`Remove ${name} from project?`)) return;
        if (!studentId) return alert('Student id not available for removal.');
        try {
          const token = getAuthToken();
          const resp = await fetch(`${API_BASE}/coordinator/projects/${projectId}/students/${studentId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) throw new Error(data.error || data.message || 'Failed to remove student');
          alert('Student removed');
          window.location.reload();
        } catch (err) {
          alert(err.message || 'Failed to remove student');
        }
      });
    });

    // Faculty assignment is handled by the Director module — Coordinator only views assigned faculty (above).

    // Add requirement — task_id is a mandatory FK (client_requirements.task_id is NOT NULL),
    // so the coordinator must pick a real task belonging to one of this project's modules.
    container.querySelector('#add-requirement-btn')?.addEventListener('click', () => {
      const taskOptions = modules.flatMap((module) =>
        (Array.isArray(module.tasks) ? module.tasks : []).map((task) =>
          `<option value="${task.id}">${module.module_name} — ${task.title}</option>`
        )
      ).join('');

      let emptyTaskLabel = 'Select a task';
      if (!taskOptions) {
        emptyTaskLabel = modules.length
          ? 'No tasks yet — click "Add task" on a module below, then try again.'
          : 'No tasks available. Create a module and task first.';
      }

      const html = `
        <div class="coordinator-modal-header">
          <h2>Add Requirement</h2>
          <p>Provide requirement description.</p>
          <button class="coordinator-close-btn">×</button>
        </div>
        <div class="coordinator-form-grid">
          <div class="coordinator-form-group full-width"><label>Description *</label><textarea id="req-desc"></textarea></div>
          <div class="coordinator-form-group full-width">
            <label>Related task *</label>
            <select id="req-task">
              <option value="">${emptyTaskLabel}</option>
              ${taskOptions}
            </select>
          </div>
        </div>
        <div class="coordinator-modal-footer">
          <button class="coordinator-secondary-btn coordinator-close-btn">Cancel</button>
          <button class="coordinator-primary-btn" id="req-submit">Save</button>
        </div>
      `;

      const overlay = openModal(html);
      overlay.querySelector('#req-submit').addEventListener('click', async () => {
        const description = overlay.querySelector('#req-desc').value || '';
        const task_id = Number(overlay.querySelector('#req-task').value || 0);
        if (!description) return alert('Please provide a description');
        if (!task_id) return alert('Please select the task this requirement relates to');
        try {
          await postJson(`${API_BASE}/coordinator/projects/${projectId}/requirements`, { description, task_id });
          alert('Requirement saved');
          overlay.remove();
          window.location.reload();
        } catch (err) {
          alert(err.message || 'Failed to save requirement');
        }
      });
    });


    // Log a change against an existing requirement (does not overwrite the original record)
    container.querySelectorAll('.btn-log-change').forEach((btn) => {
      btn.addEventListener('click', () => {
        const requirementId = btn.dataset.requirementId;

        const html = `
          <div class="coordinator-modal-header">
            <h2>Log Requirement Change</h2>
            <p>Records a change without altering the original requirement.</p>
            <button class="coordinator-close-btn">×</button>
          </div>
          <div class="coordinator-form-grid">
            <div class="coordinator-form-group full-width"><label>Change description *</label><textarea id="change-desc"></textarea></div>
            <div class="coordinator-form-group full-width"><label>New description (optional)</label><textarea id="change-new-desc"></textarea></div>
            <div class="coordinator-form-group full-width"><label>Reason (optional)</label><textarea id="change-reason"></textarea></div>
          </div>
          <div class="coordinator-modal-footer">
            <button class="coordinator-secondary-btn coordinator-close-btn">Cancel</button>
            <button class="coordinator-primary-btn" id="change-submit">Save</button>
          </div>
        `;

        const overlay = openModal(html);
        overlay.querySelector('#change-submit').addEventListener('click', async () => {
          const change_description = overlay.querySelector('#change-desc').value || '';
          const new_description = overlay.querySelector('#change-new-desc').value || undefined;
          const reason = overlay.querySelector('#change-reason').value || undefined;
          if (!change_description) return alert('Please describe the change');
          try {
            await postJson(`${API_BASE}/coordinator/projects/${projectId}/requirement-changes`, {
              client_requirement_id: Number(requirementId),
              change_description,
              new_description,
              reason,
            });
            alert('Requirement change logged');
            overlay.remove();
            window.location.reload();
          } catch (err) {
            alert(err.message || 'Failed to log requirement change');
          }
        });
      });
    });

    // Change Requirement — top-level entry point beside "Add Requirement". Lets the
    // coordinator pick which existing requirement to change first, then records the
    // change via the same requirement-changes endpoint/flow as "Log a change" above.
    // Never overwrites or deletes the original client_requirements record.
    container.querySelector('#change-requirement-btn')?.addEventListener('click', () => {
      if (!requirements.length) {
        alert('There are no existing requirements to change yet. Use "Add Requirement" first.');
        return;
      }

      const html = `
        <div class="coordinator-modal-header">
          <h2>Change Requirement</h2>
          <p>Records a change against an existing requirement without altering its original record.</p>
          <button class="coordinator-close-btn">×</button>
        </div>
        <div class="coordinator-form-grid">
          <div class="coordinator-form-group full-width">
            <label>Requirement to change *</label>
            <select id="change-requirement-id">
              <option value="">Select a requirement</option>
              ${requirements.map((r) => `<option value="${r.id}">${(r.description || 'Requirement').slice(0, 80)}</option>`).join('')}
            </select>
          </div>
          <div class="coordinator-form-group full-width"><label>Change description *</label><textarea id="change-requirement-desc"></textarea></div>
          <div class="coordinator-form-group full-width"><label>New description (optional)</label><textarea id="change-requirement-new-desc"></textarea></div>
          <div class="coordinator-form-group full-width"><label>Reason (optional)</label><textarea id="change-requirement-reason"></textarea></div>
          <div class="coordinator-form-group full-width"><label>New document path (optional)</label><input type="text" id="change-requirement-new-doc" placeholder="Path/URL to updated document, if any" /></div>
        </div>
        <div id="change-requirement-error" style="color:#b91c1c; margin: 0 1rem 0.5rem;"></div>
        <div class="coordinator-modal-footer">
          <button class="coordinator-secondary-btn coordinator-close-btn">Cancel</button>
          <button class="coordinator-primary-btn" id="change-requirement-submit">Save Change</button>
        </div>
      `;

      const overlay = openModal(html);
      overlay.querySelector('#change-requirement-submit').addEventListener('click', async () => {
        const errorEl = overlay.querySelector('#change-requirement-error');
        const client_requirement_id = Number(overlay.querySelector('#change-requirement-id').value || 0);
        const change_description = overlay.querySelector('#change-requirement-desc').value.trim();
        const new_description = overlay.querySelector('#change-requirement-new-desc').value.trim() || undefined;
        const reason = overlay.querySelector('#change-requirement-reason').value.trim() || undefined;
        const new_document_path = overlay.querySelector('#change-requirement-new-doc').value.trim() || undefined;

        if (!client_requirement_id) { errorEl.textContent = 'Please select which requirement is changing.'; return; }
        if (!change_description) { errorEl.textContent = 'Please describe the change.'; return; }

        try {
          await postJson(`${API_BASE}/coordinator/projects/${projectId}/requirement-changes`, {
            client_requirement_id,
            change_description,
            new_description,
            reason,
            new_document_path,
          });
          alert('Requirement change recorded successfully');
          overlay.remove();
          window.location.reload();
        } catch (err) {
          errorEl.textContent = err.message || 'Failed to record requirement change';
        }
      });
    });

    // Close project
    container.querySelector('#close-project-btn')?.addEventListener('click', () => {
      const html = `
        <div class="coordinator-modal-header">
          <h2>Close Project</h2>
          <p>Provide final status and optional remarks.</p>
          <button class="coordinator-close-btn">×</button>
        </div>
        <div class="coordinator-form-grid">
          <div class="coordinator-form-group"><label>Final status</label><input id="close-final-status" placeholder="e.g. completed" /></div>
          <div class="coordinator-form-group full-width"><label>Remarks</label><textarea id="close-remarks"></textarea></div>
        </div>
        <div class="coordinator-modal-footer">
          <button class="coordinator-secondary-btn coordinator-close-btn">Cancel</button>
          <button class="coordinator-primary-btn" id="close-submit">Close Project</button>
        </div>
      `;

      const overlay = openModal(html);
      overlay.querySelector('#close-submit').addEventListener('click', async () => {
        const final_status = overlay.querySelector('#close-final-status').value || '';
        const remarks = overlay.querySelector('#close-remarks').value || undefined;
        if (!final_status) return alert('Please provide final status');
        try {
          await postJson(`${API_BASE}/coordinator/projects/${projectId}/close`, { final_status, remarks });
          alert('Project closed');
          overlay.remove();
          window.location.reload();
        } catch (err) {
          alert(err.message || 'Failed to close project');
        }
      });
    });

    return container;
  } catch (error) {
    container.innerHTML = `
      <div class="coordinator-panel coordinator-empty-state">
        <h2>Unable to load project details</h2>
        <p>${error.message || 'Something went wrong while retrieving the project.'}</p>
        <button class="coord-btn coord-btn-primary" data-action="back">Back to projects</button>
      </div>
    `;
    container.querySelector('[data-action="back"]')?.addEventListener('click', () => router.push('/coordinator/projects'));
    return container;
  }
}

export default CoordinatorProjectDetail;
