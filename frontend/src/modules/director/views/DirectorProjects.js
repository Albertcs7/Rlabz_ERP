import { DirectorService } from '../services/DirectorService.js';
import { useAuthStore } from '@/core/stores/auth.js';

function formatMoney(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '0';
  return Number(amount).toLocaleString();
}

export function DirectorProjects(route, router) {
  const authStore = useAuthStore();
  const isDirector = authStore.role === 'director';
  const container = document.createElement('div');
  container.className = 'director-dashboard';

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = (route && route.query && route.query.tab) || urlParams.get('tab') || 'all';
  let currentTab = ['proposals', 'active', 'all'].includes(initialTab.toLowerCase()) ? initialTab.toLowerCase() : 'all';
  let searchQuery = (route && route.query && route.query.search) || urlParams.get('search') || '';
  let selectedProposal = null;

  // proposals/projects can be passed in directly (fresh from a just-completed API fetch)
  // to avoid re-reading DirectorService's shared localStorage cache, which is written by
  // three independent, concurrently-running fetches (see loadAllData below) and can briefly
  // reflect a stale snapshot for whichever of the three loses that race.
  function render(faculties = DirectorService.getFaculties(), proposals = DirectorService.getProposals() || [], projects = DirectorService.getProjects() || []) {
    // The real database status is 'proposed', never the literal string 'pending' —
    // 'pending' only ever appeared as a query-filter fallback value, not real data.
    const pendingProposals = proposals.filter(p => p.status === 'proposed' || p.status === 'pending');
    // Include 'accepted' alongside 'in_progress' — an accepted proposal is now its own
    // workflow step (not yet started) rather than jumping straight to in_progress.
    const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'accepted' || p.status === 'active');

    const q = searchQuery.trim().toLowerCase();
    const filterList = (list) => {
      if (!q) return list;
      return list.filter(item => {
        const title = (item.title || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        const client = (item.clientName || item.client_name || '').toLowerCase();
        const faculty = (item.facultyName || item.faculty_name || '').toLowerCase();
        const type = (item.type || item.project_type || '').toLowerCase();
        const status = (item.status || '').toLowerCase();
        return title.includes(q) || id.includes(q) || client.includes(q) || faculty.includes(q) || type.includes(q) || status.includes(q);
      });
    };

    const filteredPendingProposals = filterList(pendingProposals);
    const filteredActiveProjects = filterList(activeProjects);
    const filteredProjects = filterList(projects);

    container.innerHTML = `
      <div class="director-header" style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:1rem;">
        <div>
          <h1>Project Oversight & Proposal Reviews</h1>
          <p>Review project proposals, accept/reject submissions, monitor project progress, and assign faculty leads.</p>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
          <div style="position:relative; width:260px;">
            <input 
              type="text" 
              id="input-search-director-projects" 
              class="director-search-input" 
              placeholder="Search projects..." 
              value="${searchQuery}" 
            />
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:11px; top:11px; color:#9ca3af; pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            ${searchQuery ? `<button id="btn-clear-search-projects" style="position:absolute; right:8px; top:9px; background:none; border:none; cursor:pointer; color:#9ca3af; font-size:13px;" title="Clear search">✕</button>` : ''}
          </div>
          <button class="btn-director ${currentTab === 'proposals' ? 'btn-director-primary' : 'btn-director-outline'}" id="tab-proposals">
            Pending Proposals (${pendingProposals.length})
          </button>
          <button class="btn-director ${currentTab === 'active' ? 'btn-director-primary' : 'btn-director-outline'}" id="tab-active">
            Active Projects (${activeProjects.length})
          </button>
          <button class="btn-director ${currentTab === 'all' ? 'btn-director-primary' : 'btn-director-outline'}" id="tab-all">
            All Projects (${projects.length})
          </button>
        </div>
      </div>

      ${currentTab === 'proposals' ? renderProposalsTab(filteredPendingProposals, proposals) : ''}
      ${currentTab === 'active' ? renderActiveProjectsTab(filteredActiveProjects, faculties) : ''}
      ${currentTab === 'all' ? renderAllProjectsTab(filteredProjects, faculties) : ''}

      <!-- Project Details Modal -->
      <div id="project-modal-container"></div>
      <!-- Proposal Review Modal -->
      <div id="proposal-modal-container"></div>
      <!-- Assign Faculty Modal -->
      <div id="faculty-modal-container"></div>
    `;

    // Attach Tab Events
    const syncUrl = () => {
      const url = new URL(window.location);
      url.searchParams.set('tab', currentTab);
      if (searchQuery) url.searchParams.set('search', searchQuery);
      else url.searchParams.delete('search');
      window.history.replaceState({}, '', url.toString());
    };

    container.querySelector('#tab-proposals')?.addEventListener('click', async () => { 
      currentTab = 'proposals'; 
      syncUrl();
      await render(); 
    });
    container.querySelector('#tab-active')?.addEventListener('click', async () => { 
      currentTab = 'active'; 
      syncUrl();
      await render(); 
    });
    container.querySelector('#tab-all')?.addEventListener('click', async () => { 
      currentTab = 'all'; 
      syncUrl();
      await render(); 
    });

    attachActionEvents(faculties);
  }

  function renderProposalsTab(pendingProposals, allProposals) {
    return `
      <div class="director-panel">
        <div class="director-panel-header">
          <h2>Pending Project Proposals</h2>
          <span style="font-size:0.85rem; color:#6b7280;">${isDirector ? 'Proposals overview (Read-only for Director)' : 'Review and decide on project proposals'}</span>
        </div>

        ${pendingProposals.length === 0 ? `
          <div style="text-align:center; padding:2.5rem; color:#6b7280;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.5rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <p style="margin:0; font-weight:600;">No pending proposals!</p>
            <small>All project proposals have been reviewed.</small>
          </div>
        ` : `
          <div class="director-table-responsive">
            <table class="director-table">
              <thead>
                <tr>
                  <th>Proposal Title</th>
                  <th>Source / Client</th>
                  <th>Submitted</th>
                  <th>Est. Budget</th>
                  <th>Timeline</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${pendingProposals.map(p => `
                  <tr>
                    <td>
                      <strong>${p.title || 'Untitled Proposal'}</strong><br>
                      <small style="color:#6b7280">${p.type || 'General'}</small>
                    </td>
                    <td>
                      ${p.clientName || 'Client'}<br>
                      <small style="color:#6b7280">${p.source || 'Direct'} (${p.sourceName || 'Submission'})</small>
                    </td>
                    <td>${p.submittedDate || 'Recent'}</td>
                    <td>₹${formatMoney(p.estimatedBudget)}</td>
                    <td>${p.expectedTimeline || 'Flexible'}</td>
                    <td>
                      <span class="status-badge ${p.priority === 'urgent' ? 'rejected' : 'in_progress'}">
                        ${(p.priority || 'NORMAL').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <button class="btn-director btn-director-primary btn-open-review" data-id="${p.id}">
                        ${isDirector ? 'View Details' : 'Review & Decide'}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  function renderActiveProjectsTab(activeProjects, faculties) {
    return `
      <div class="director-panel">
        <div class="director-panel-header">
          <h2>Active Projects (${activeProjects.length})</h2>
          <span style="font-size:0.85rem; color:#6b7280;">Monitor progress & manage lead faculty</span>
        </div>

        <div class="director-table-responsive">
          <table class="director-table">
            <thead>
              <tr>
                <th>Project ID & Title</th>
                <th>Client</th>
                <th>Status</th>
                <th>Faculty Lead</th>
                <th>Assigned Students</th>
                <th>Progress</th>
                <th>Budget / Spent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${activeProjects.map(p => `
                <tr class="director-project-row" data-project-id="${p.id}" title="Click to view details for ${p.title}">
                  <td>
                    <strong>${p.title || 'Untitled Project'}</strong><br>
                    <small style="color:#6b7280">${p.id} • ${p.type || 'Web'}</small>
                  </td>
                  <td>${p.clientName || 'N/A'}</td>
                  <td>
                    <span class="status-badge ${p.status === 'accepted' ? 'accepted' : 'in_progress'}">
                      ${p.status === 'accepted' ? 'Accepted' : 'In Progress'}
                    </span>
                  </td>
                  <td><strong>${p.facultyName || 'Unassigned'}</strong></td>
                  <td>
                    ${(!p.assignedStudents || p.assignedStudents.length === 0) ? '<small style="color:#9ca3af">None</small>' :
                      p.assignedStudents.map(s => `<span class="track-badge ${(s.track || 'nova').toLowerCase()}" style="margin:2px;">${s.name} (${s.track || 'Nova'})</span>`).join('')}
                  </td>
                  <td>
                    <div class="director-progress-bar-bg">
                      <div class="director-progress-bar-fill" style="width: ${p.progress ?? 0}%"></div>
                    </div>
                    <strong>${p.progress ?? 0}%</strong>
                  </td>
                  <td>
                    ₹${formatMoney(p.spent)} / ₹${formatMoney(p.budget)}
                  </td>
                  <td>
                    <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                      ${p.drive_link || p.driveLink ? `
                        <a href="${p.drive_link || p.driveLink}" target="_blank" rel="noopener noreferrer" class="btn-director btn-director-outline" style="text-decoration:none; display:inline-flex; align-items:center; gap:0.3rem; padding:0.35rem 0.65rem; color:#2563eb; border-color:#93c5fd;" title="Open Project Drive" onclick="event.stopPropagation();">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                          <span>Drive</span>
                        </a>
                      ` : ''}
                      ${isDirector ? `
                        <button class="btn-director btn-director-outline" disabled style="opacity:0.5; cursor:not-allowed;" title="Director has read-only access to faculty assignment">
                          Reassign Faculty
                        </button>
                      ` : `
                        <button class="btn-director btn-director-outline btn-assign-faculty" data-id="${p.id}">
                          Reassign Faculty
                        </button>
                      `}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderAllProjectsTab(projects, faculties) {
    return `
      <div class="director-panel">
        <div class="director-panel-header">
          <h2>All System Projects (${projects.length})</h2>
        </div>
        ${projects.length === 0 ? `
          <div style="text-align:center; padding:2.5rem; color:#6b7280;">
            <p style="margin:0; font-weight:600;">No projects found.</p>
            ${searchQuery ? `<small>No projects match "${searchQuery}". Clear search to view all.</small>` : ''}
          </div>
        ` : `
          <div class="director-table-responsive">
            <table class="director-table">
              <thead>
                <tr>
                  <th>ID & Title</th>
                  <th>Status</th>
                  <th>Client</th>
                  <th>Faculty Lead</th>
                  <th>Progress</th>
                  <th>Budget</th>
                  <th>Drive</th>
                </tr>
              </thead>
              <tbody>
                ${projects.map(p => `
                  <tr class="director-project-row" data-project-id="${p.id}" title="Click to view details for ${p.title}">
                    <td><strong>${p.title || 'Untitled'}</strong><br><small style="color:#6b7280">${p.id}</small></td>
                    <td><span class="status-badge ${p.status || 'pending'}">${(p.status || 'pending').replace('_', ' ')}</span></td>
                    <td>${p.clientName || 'N/A'}</td>
                    <td>${p.facultyName || 'Unassigned'}</td>
                    <td>${p.progress ?? 0}%</td>
                    <td>₹${formatMoney(p.budget)}</td>
                    <td>
                      ${p.drive_link || p.driveLink ? `
                        <a href="${p.drive_link || p.driveLink}" target="_blank" rel="noopener noreferrer" class="btn-director btn-director-outline" style="text-decoration:none; display:inline-flex; align-items:center; gap:0.3rem; padding:0.25rem 0.6rem; font-size:0.75rem; color:#2563eb; border-color:#93c5fd;" title="Open Project Drive" onclick="event.stopPropagation();">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                          <span>Drive</span>
                        </a>
                      ` : '<span style="color:#9ca3af; font-size:0.78rem;">—</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  function showProjectDetailsModal(project, faculties) {
    const modalHost = container.querySelector('#project-modal-container') || container.querySelector('#proposal-modal-container');
    if (!modalHost) return;

    modalHost.innerHTML = `
      <div class="director-modal-overlay">
        <div class="director-modal" style="max-width:580px;">
          <div class="director-modal-header">
            <div>
              <span style="font-size:0.75rem; color:#6b7280; font-weight:700;">${project.id}</span>
              <h3 style="margin:0.25rem 0 0;">${project.title || 'Untitled Project'}</h3>
            </div>
            <button class="btn-director btn-director-outline btn-close-modal">✕</button>
          </div>
          <div class="director-modal-body" style="display:flex; flex-direction:column; gap:1rem;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; background:#f9fafb; padding:0.85rem; border-radius:8px; border:1px solid #e5e7eb;">
              <div>
                <small style="color:#6b7280; display:block;">Status</small>
                <span class="status-badge ${project.status || 'in_progress'}" style="margin-top:4px;">${(project.status || 'in_progress').replace('_', ' ').toUpperCase()}</span>
              </div>
              <div>
                <small style="color:#6b7280; display:block;">Project Type</small>
                <strong style="color:#111827;">${project.type || 'Web Application'}</strong>
              </div>
              <div>
                <small style="color:#6b7280; display:block;">Client / Sponsor</small>
                <strong style="color:#111827;">${project.clientName || 'N/A'}</strong>
              </div>
              <div>
                <small style="color:#6b7280; display:block;">Faculty Lead</small>
                <strong style="color:#111827;">${project.facultyName || 'Unassigned'}</strong>
              </div>
              <div>
                <small style="color:#6b7280; display:block;">Sanctioned Budget</small>
                <strong style="color:#111827;">₹${formatMoney(project.budget)}</strong>
              </div>
              <div>
                <small style="color:#6b7280; display:block;">Expenditure Spent</small>
                <strong style="color:#111827;">₹${formatMoney(project.spent || 0)}</strong>
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
                <span style="font-size:0.85rem; font-weight:600; color:#374151;">Overall Progress</span>
                <strong style="color:var(--primary); font-size:0.9rem;">${project.progress ?? 0}%</strong>
              </div>
              <div class="director-progress-bar-bg" style="height:8px;">
                <div class="director-progress-bar-fill" style="width: ${project.progress ?? 0}%"></div>
              </div>
            </div>

            <div style="background:${project.drive_link || project.driveLink ? '#eff6ff' : '#f9fafb'}; border:1px solid ${project.drive_link || project.driveLink ? '#bfdbfe' : '#e5e7eb'}; border-radius:8px; padding:0.75rem 0.9rem; display:flex; align-items:center; justify-content:space-between; gap:0.75rem;">
              <div style="display:flex; align-items:center; gap:0.6rem; min-width:0;">
                <div style="width:32px; height:32px; border-radius:6px; background:${project.drive_link || project.driveLink ? '#dbeafe' : '#f3f4f6'}; display:flex; align-items:center; justify-content:center; color:${project.drive_link || project.driveLink ? '#1d4ed8' : '#9ca3af'}; flex-shrink:0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <div style="min-width:0;">
                  <strong style="color:${project.drive_link || project.driveLink ? '#1e40af' : '#4b5563'}; font-size:0.85rem; display:block;">Project Drive Folder</strong>
                  <span style="color:${project.drive_link || project.driveLink ? '#3b82f6' : '#9ca3af'}; font-size:0.75rem; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:280px;">
                    ${project.drive_link || project.driveLink || 'No drive or cloud folder linked to this project'}
                  </span>
                </div>
              </div>
              ${project.drive_link || project.driveLink ? `
                <a href="${project.drive_link || project.driveLink}" target="_blank" rel="noopener noreferrer" class="btn-director" style="background:#2563eb; color:#ffffff; padding:0.4rem 0.85rem; font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:0.35rem; border-radius:6px; font-weight:600; white-space:nowrap;">
                  <span>Open Drive</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              ` : `
                <span style="font-size:0.75rem; color:#9ca3af; font-weight:500; background:#f3f4f6; padding:0.3rem 0.65rem; border-radius:5px; border:1px solid #e5e7eb; white-space:nowrap;">Not Linked</span>
              `}
            </div>

            ${project.description ? `
              <div>
                <span style="font-size:0.85rem; font-weight:600; color:#374151; display:block; margin-bottom:0.25rem;">Description</span>
                <p style="margin:0; font-size:0.85rem; color:#4b5563; line-height:1.5; background:#ffffff; padding:0.6rem; border:1px solid #e5e7eb; border-radius:6px;">${project.description}</p>
              </div>
            ` : ''}

            <div>
              <span style="font-size:0.85rem; font-weight:600; color:#374151; display:block; margin-bottom:0.35rem;">Assigned Students</span>
              <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                ${(!project.assignedStudents || project.assignedStudents.length === 0) 
                  ? '<span style="color:#9ca3af; font-size:0.85rem;">No students assigned to this project yet.</span>'
                  : project.assignedStudents.map(s => `
                    <span class="track-badge ${(s.track || 'nova').toLowerCase()}" style="padding:0.25rem 0.6rem; font-size:0.75rem;">
                      ${s.name} (${s.track || 'Nova'})
                    </span>
                  `).join('')}
              </div>
            </div>
          </div>
          <div class="director-modal-footer">
            <button class="btn-director btn-director-primary btn-close-modal">Close</button>
          </div>
        </div>
      </div>
    `;

    modalHost.querySelectorAll('.btn-close-modal').forEach(b => b.addEventListener('click', () => { modalHost.innerHTML = ''; }));
  }

  function attachActionEvents(faculties) {
    // Project row click -> details modal
    container.querySelectorAll('.director-project-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
        const id = row.getAttribute('data-project-id');
        const allProjs = DirectorService.getProjects() || [];
        const project = allProjs.find(p => String(p.id) === String(id));
        if (project) showProjectDetailsModal(project, faculties);
      });
    });

    // Search events
    const searchInput = container.querySelector('#input-search-director-projects');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        const url = new URL(window.location);
        if (searchQuery) url.searchParams.set('search', searchQuery);
        else url.searchParams.delete('search');
        window.history.replaceState({}, '', url.toString());
        render();
        const reInput = container.querySelector('#input-search-director-projects');
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(reInput.value.length, reInput.value.length);
        }
      });
    }

    container.querySelector('#btn-clear-search-projects')?.addEventListener('click', () => {
      searchQuery = '';
      const url = new URL(window.location);
      url.searchParams.delete('search');
      window.history.replaceState({}, '', url.toString());
      render();
    });
    // Open Proposal Review Modal
    container.querySelectorAll('.btn-open-review').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const proposal = DirectorService.getProposals().find(p => p.id === id);
        if (proposal) showProposalModal(proposal, faculties);
      });
    });


    // Open Assign Faculty Modal
    container.querySelectorAll('.btn-assign-faculty').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const project = DirectorService.getProjects().find(p => p.id === id);
        if (project) showFacultyModal(project, faculties);
      });
    });
  }

  function showFacultyProjectsPopup(parentHost, faculty) {
    const projectsList = faculty.activeProjects || [];
    const popupOverlay = document.createElement('div');
    popupOverlay.className = 'director-modal-overlay';
    popupOverlay.style.zIndex = '1050';
    popupOverlay.innerHTML = `
      <div class="director-modal" style="max-width: 440px; border-top: 4px solid var(--primary-accent);">
        <div class="director-modal-header">
          <h3 style="margin:0; font-size:1.1rem; color:#111827;">Active Projects — ${faculty.name}</h3>
          <button class="btn-director btn-director-outline btn-close-popup">✕</button>
        </div>
        <div class="director-modal-body" style="max-height:280px; overflow-y:auto; margin-bottom:1rem;">
          <div style="font-size:0.8rem; color:#6b7280; margin-bottom:0.75rem;">
            Email: <strong>${faculty.email || 'faculty@rajagiri.edu'}</strong> | Department: <strong>${faculty.department || 'Computer Applications'}</strong>
          </div>
          ${projectsList.length === 0 ? `
            <div style="text-align:center; padding:1.5rem; color:#9ca3af; background:#f9fafb; border-radius:8px;">
              No active projects currently assigned to this faculty member.
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:0.6rem;">
              ${projectsList.map((p, idx) => `
                <div style="padding:0.65rem 0.85rem; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;">
                  <div style="font-weight:700; color:#111827; font-size:0.875rem;">${idx + 1}. ${p.title}</div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.25rem;">
                    <span style="font-size:0.75rem; color:#6b7280;">Type: ${p.type || 'Web Application'}</span>
                    <span class="status-badge ${p.status === 'completed' ? 'completed' : 'in_progress'}" style="font-size:0.65rem; padding:1px 6px;">
                      ${(p.status || 'in_progress').replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
        <div class="director-modal-footer">
          <button class="btn-director btn-director-primary btn-close-popup">Close</button>
        </div>
      </div>
    `;

    popupOverlay.querySelectorAll('.btn-close-popup').forEach(b => b.addEventListener('click', () => popupOverlay.remove()));
    parentHost.appendChild(popupOverlay);
  }

  function setupFacultySearch(modalHost) {
    const searchInput = modalHost.querySelector('.faculty-search-input');
    const searchBtn = modalHost.querySelector('.btn-search-faculty');
    const clearBtn = modalHost.querySelector('.btn-clear-faculty-search');
    const countEl = modalHost.querySelector('.faculty-search-count');
    const items = modalHost.querySelectorAll('.faculty-item');
    const noResultsEl = modalHost.querySelector('.faculty-no-results');
    const noResultsQuery = modalHost.querySelector('.faculty-no-results-query');

    if (!searchInput) return;

    const doSearch = () => {
      const q = (searchInput.value || '').trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
      let visible = 0;
      items.forEach(item => {
        const text = item.getAttribute('data-search-text') || '';
        const match = !q || text.includes(q);
        item.style.display = match ? 'flex' : 'none';
        if (match) visible++;
      });

      if (noResultsEl) {
        if (visible === 0 && q) {
          noResultsEl.style.display = 'block';
          if (noResultsQuery) noResultsQuery.textContent = searchInput.value.trim();
        } else {
          noResultsEl.style.display = 'none';
        }
      }

      if (countEl) {
        countEl.textContent = q ? `${visible} of ${items.length} faculty` : '';
      }
    };

    searchInput.addEventListener('input', doSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch();
      }
    });
    searchBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      doSearch();
      searchInput.focus();
    });
    clearBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      searchInput.value = '';
      doSearch();
      searchInput.focus();
    });
  }

  function showProposalModal(proposal, faculties) {
    const modalHost = container.querySelector('#proposal-modal-container');
    const defaultFacId = proposal.suggestedFaculty || (faculties[0] ? faculties[0].id : '');
    modalHost.innerHTML = `
      <div class="director-modal-overlay">
        <div class="director-modal" style="max-width:540px;">
          <div class="director-modal-header">
            <h3>Review Proposal: ${proposal.title}</h3>
            <button class="btn-director btn-director-outline btn-close-modal">✕</button>
          </div>
          <div class="director-modal-body">
            <p style="margin-bottom:0.5rem;"><strong>Description:</strong> ${proposal.description}</p>
            <p style="margin-bottom:1rem;"><strong>Source:</strong> ${proposal.source} (${proposal.sourceName}) | <strong>Client:</strong> ${proposal.clientName} | <strong>Est. Budget:</strong> ₹${proposal.estimatedBudget.toLocaleString()}</p>
            
            ${proposal.drive_link || proposal.driveLink ? `
              <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:0.6rem 0.85rem; margin-bottom:1rem; display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
                <div style="display:flex; align-items:center; gap:0.5rem; min-width:0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  <span style="font-size:0.82rem; color:#1e40af; font-weight:600;">Proposal Documents / Drive Folder</span>
                </div>
                <a href="${proposal.drive_link || proposal.driveLink}" target="_blank" rel="noopener noreferrer" class="btn-director" style="background:#2563eb; color:#ffffff; padding:0.3rem 0.75rem; font-size:0.78rem; text-decoration:none; display:inline-flex; align-items:center; gap:0.3rem; border-radius:5px; font-weight:600;">
                  <span>Open Drive</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              </div>
            ` : ''}
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
              <label style="font-weight:600; font-size:0.875rem; margin:0; display:block;">Assign Lead Faculty:</label>
              <span class="faculty-search-count" style="font-size:0.75rem; color:#6b7280; font-weight:500;"></span>
            </div>
            <div class="faculty-search-bar" style="display:flex; gap:0.4rem; margin-bottom:0.5rem;">
              <div style="position:relative; flex:1;">
                <svg style="position:absolute; left:0.65rem; top:50%; transform:translateY(-50%); color:#9ca3af; pointer-events:none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  type="text" 
                  class="faculty-search-input" 
                  placeholder="Search faculty by name or department..." 
                  style="width:100%; box-sizing:border-box; padding:0.45rem 1.8rem 0.45rem 2.1rem; font-size:0.82rem; border:1px solid #d1d5db; border-radius:6px; outline:none; font-family:inherit; background:#ffffff;"
                />
                <button type="button" class="btn-clear-faculty-search" style="display:none; position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; color:#9ca3af; cursor:pointer; font-size:0.85rem; padding:2px;" title="Clear search">✕</button>
              </div>
              <button type="button" class="btn-director btn-director-outline btn-search-faculty" style="padding:0.45rem 0.85rem; font-size:0.82rem; display:inline-flex; align-items:center; gap:0.35rem; white-space:nowrap; cursor:pointer; font-weight:600;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>Search</span>
              </button>
            </div>
            <div class="faculty-selection-list" style="display:flex; flex-direction:column; gap:0.5rem; max-height:220px; overflow-y:auto; padding:0.25rem; border:1px solid #d1d5db; border-radius:8px; background:#f9fafb;">
              <div class="faculty-no-results" style="display:none; text-align:center; padding:1.25rem 0.5rem; color:#6b7280; font-size:0.82rem; background:#ffffff; border-radius:6px; border:1px dashed #d1d5db;">
                No faculty members found matching "<span class="faculty-no-results-query"></span>"
              </div>
              ${faculties.map(f => {
                const projectsList = f.activeProjects || [];
                const count = f.activeProjectsCount !== undefined ? f.activeProjectsCount : projectsList.length;
                const isSelected = String(f.id) === String(defaultFacId);
                const searchText = `${f.name || ''} ${f.department || ''} ${f.email || ''}`.toLowerCase();
                return `
                  <div class="faculty-item" data-search-text="${searchText}" style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.75rem; background:var(--surface-card); border:1px solid ${isSelected ? 'var(--primary-accent)' : '#e5e7eb'}; border-radius:6px;">
                    <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; flex:1; margin:0;">
                      <input type="radio" name="proposal_faculty_choice" value="${f.id}" ${isSelected ? 'checked' : ''} ${isDirector ? 'disabled' : ''} />
                      <div>
                        <div style="font-weight:600; color:#111827; font-size:0.85rem;">${f.name}</div>
                        <div style="font-size:0.75rem; color:#6b7280;">${f.department || 'Computer Applications'}</div>
                      </div>
                    </label>
                    <button type="button" class="btn-director btn-director-outline btn-view-faculty-projects" data-id="${f.id}" title="Click to view assigned project names" style="font-size:0.75rem; padding:0.25rem 0.6rem; color:var(--primary-hover); border-color:var(--border-color); background:var(--primary-light); border-radius:6px; cursor:pointer;">
                      📊 ${count} Active Project${count === 1 ? '' : 's'}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>

            <label style="font-weight:600; font-size:0.875rem; margin-top:0.5rem; display:block;">Director Review Notes / Remarks:</label>
            <textarea id="modal-review-notes" rows="2" placeholder="${isDirector ? 'Read-only mode' : 'Enter optional notes for the client and team...'}" ${isDirector ? 'disabled' : ''} style="padding:0.5rem; border-radius:6px; border:1px solid #d1d5db; font-family:inherit; ${isDirector ? 'background:#f3f4f6; cursor:not-allowed;' : ''}"></textarea>
          </div>
          <div class="director-modal-footer">
            ${isDirector ? `
              <span style="font-size: 0.85rem; color: #6b7280; margin-right: auto;">Read-only view</span>
              <button class="btn-director btn-director-outline btn-close-modal">Close</button>
            ` : `
              <button class="btn-director btn-director-danger btn-reject-prop">Reject Proposal</button>
              <button class="btn-director btn-director-success btn-accept-prop">Accept & Approve</button>
            `}
          </div>
        </div>
      </div>
    `;

    setupFacultySearch(modalHost);

    modalHost.querySelector('.btn-close-modal').addEventListener('click', () => { modalHost.innerHTML = ''; });
    modalHost.querySelectorAll('.btn-view-faculty-projects').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const facId = e.currentTarget.getAttribute('data-id');
        const faculty = faculties.find(f => String(f.id) === String(facId));
        if (faculty) showFacultyProjectsPopup(modalHost, faculty);
      });
    });

    modalHost.querySelector('.btn-accept-prop')?.addEventListener('click', async () => {
      const selectedRadio = modalHost.querySelector('input[name="proposal_faculty_choice"]:checked');
      const facId = selectedRadio ? selectedRadio.value : (faculties[0] ? faculties[0].id : null);
      const notes = modalHost.querySelector('#modal-review-notes').value;
      try {
        await DirectorService.updateProposalStatusAsync(proposal.raw_id, 'accepted', notes, facId);
        modalHost.innerHTML = '';
        await render();
      } catch (err) {
        alert(err.message || 'Failed to accept proposal');
      }
    });

    modalHost.querySelector('.btn-reject-prop')?.addEventListener('click', async () => {
      const notes = modalHost.querySelector('#modal-review-notes').value;
      try {
        await DirectorService.updateProposalStatusAsync(proposal.raw_id, 'rejected', notes);
        modalHost.innerHTML = '';
        await render();
      } catch (err) {
        alert(err.message || 'Failed to reject proposal');
      }
    });
  }

  function showFacultyModal(project, faculties) {
    const modalHost = container.querySelector('#faculty-modal-container');
    const defaultFacId = project.facultyId || (faculties[0] ? faculties[0].id : '');
    modalHost.innerHTML = `
      <div class="director-modal-overlay">
        <div class="director-modal" style="max-width:520px;">
          <div class="director-modal-header">
            <h3>Assign Faculty to ${project.title}</h3>
            <button class="btn-director btn-director-outline btn-close-modal">✕</button>
          </div>
          <div class="director-modal-body">
            <p style="margin-bottom:0.75rem;">Current Lead Faculty: <strong>${project.facultyName || 'Unassigned'}</strong></p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
              <label style="font-weight:600; font-size:0.875rem; margin:0; display:block;">Select New Lead Faculty:</label>
              <span class="faculty-search-count" style="font-size:0.75rem; color:#6b7280; font-weight:500;"></span>
            </div>
            <div class="faculty-search-bar" style="display:flex; gap:0.4rem; margin-bottom:0.5rem;">
              <div style="position:relative; flex:1;">
                <svg style="position:absolute; left:0.65rem; top:50%; transform:translateY(-50%); color:#9ca3af; pointer-events:none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  type="text" 
                  class="faculty-search-input" 
                  placeholder="Search faculty by name or department..." 
                  style="width:100%; box-sizing:border-box; padding:0.45rem 1.8rem 0.45rem 2.1rem; font-size:0.82rem; border:1px solid #d1d5db; border-radius:6px; outline:none; font-family:inherit; background:#ffffff;"
                />
                <button type="button" class="btn-clear-faculty-search" style="display:none; position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; color:#9ca3af; cursor:pointer; font-size:0.85rem; padding:2px;" title="Clear search">✕</button>
              </div>
              <button type="button" class="btn-director btn-director-outline btn-search-faculty" style="padding:0.45rem 0.85rem; font-size:0.82rem; display:inline-flex; align-items:center; gap:0.35rem; white-space:nowrap; cursor:pointer; font-weight:600;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>Search</span>
              </button>
            </div>
            
            <div class="faculty-selection-list" style="display:flex; flex-direction:column; gap:0.5rem; max-height:220px; overflow-y:auto; padding:0.25rem; border:1px solid #d1d5db; border-radius:8px; background:#f9fafb;">
              <div class="faculty-no-results" style="display:none; text-align:center; padding:1.25rem 0.5rem; color:#6b7280; font-size:0.82rem; background:#ffffff; border-radius:6px; border:1px dashed #d1d5db;">
                No faculty members found matching "<span class="faculty-no-results-query"></span>"
              </div>
              ${faculties.map(f => {
                const projectsList = f.activeProjects || [];
                const count = f.activeProjectsCount !== undefined ? f.activeProjectsCount : projectsList.length;
                const isSelected = String(f.id) === String(defaultFacId);
                const searchText = `${f.name || ''} ${f.department || ''} ${f.email || ''}`.toLowerCase();
                return `
                  <div class="faculty-item" data-search-text="${searchText}" style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.75rem; background:var(--surface-card); border:1px solid ${isSelected ? 'var(--primary-accent)' : '#e5e7eb'}; border-radius:6px;">
                    <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; flex:1; margin:0;">
                      <input type="radio" name="project_faculty_choice" value="${f.id}" ${isSelected ? 'checked' : ''} ${isDirector ? 'disabled' : ''} />
                      <div>
                        <div style="font-weight:600; color:#111827; font-size:0.85rem;">${f.name}</div>
                        <div style="font-size:0.75rem; color:#6b7280;">${f.department || 'Computer Applications'}</div>
                      </div>
                    </label>
                    <button type="button" class="btn-director btn-director-outline btn-view-faculty-projects" data-id="${f.id}" title="Click to view assigned project names" style="font-size:0.75rem; padding:0.25rem 0.6rem; color:var(--primary-hover); border-color:var(--border-color); background:var(--primary-light); border-radius:6px; cursor:pointer;">
                      📊 ${count} Active Project${count === 1 ? '' : 's'}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          <div class="director-modal-footer">
            ${isDirector ? `
              <span style="font-size: 0.85rem; color: #6b7280; margin-right: auto;">Read-only view</span>
              <button class="btn-director btn-director-outline btn-close-modal">Close</button>
            ` : `
              <button class="btn-director btn-director-outline btn-close-modal">Cancel</button>
              <button class="btn-director btn-director-primary btn-save-faculty">Save Assignment</button>
            `}
          </div>
        </div>
      </div>
    `;

    setupFacultySearch(modalHost);

    modalHost.querySelectorAll('.btn-close-modal').forEach(b => b.addEventListener('click', () => { modalHost.innerHTML = ''; }));
    modalHost.querySelectorAll('.btn-view-faculty-projects').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const facId = e.currentTarget.getAttribute('data-id');
        const faculty = faculties.find(f => String(f.id) === String(facId));
        if (faculty) showFacultyProjectsPopup(modalHost, faculty);
      });
    });

    modalHost.querySelector('.btn-save-faculty')?.addEventListener('click', async () => {
      const selectedRadio = modalHost.querySelector('input[name="project_faculty_choice"]:checked');
      const facId = selectedRadio ? selectedRadio.value : (faculties[0] ? faculties[0].id : null);
      try {
        await DirectorService.assignFacultyAsync(project.raw_id, facId);
        modalHost.innerHTML = '';
        await render();
      } catch (err) {
        alert(err.message || 'Failed to assign faculty');
      }
    });
  }

  const loadAllData = async () => {
    // Sequential, not Promise.all: DirectorService caches each of these in the same
    // shared localStorage blob via an independent load/modify/save cycle, so running
    // them concurrently would let whichever finishes last discard the others' writes.
    // Click handlers below (Reassign Faculty) read that cache directly
    // at click time, so it must end up fully consistent, not just this render() call.
    const projects = await DirectorService.getProjectsAsync();
    const proposals = await DirectorService.getProposalsAsync();
    const faculties = await DirectorService.getFacultiesAsync();
    render(faculties || [], proposals || [], projects || []);
  };

  render();
  loadAllData();
  return container;
}

export default DirectorProjects;
