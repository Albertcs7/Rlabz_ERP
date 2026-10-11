import { renderStudentSidebar } from './StudentSidebar.js';
import { getProjects, getSprints, getGithub, getWorkLogs, getDashboardData, ensureDataLoaded } from './studentStore.js';
import { useAuthStore } from '@/core/stores/auth.js';
import { StudentSwal } from '../studentAlerts.js';
import html2pdf from 'html2pdf.js';
import '../student.css';

export async function StudentProjects(route, router) {
  await ensureDataLoaded();
  renderStudentSidebar();

  const container = document.createElement('div');
  container.className = 'student-portal-container animate-fade-in student-projects-view';

  const authStore = useAuthStore();
  const currentUser = authStore.user;

  // 1. Fetch projects assigned to the student
  const projects = getProjects() || [];
  let assignedProjects = projects.filter(p => 
    p.members && p.members.toLowerCase().includes(currentUser?.name?.toLowerCase() || 'student nova')
  );
  if (assignedProjects.length === 0 && projects.length > 0) {
    assignedProjects = projects;
  }

  assignedProjects.forEach(p => {
    p.designation = currentUser?.designation || p.designation;
  });

  // State
  let viewMode = 'active'; // 'active' | 'history'
  let selectedProjectId = route?.params?.id ? parseInt(route.params.id, 10) : null;
  let isDetailView = Boolean(selectedProjectId);
  let activeTab = 'overview'; // 'overview', 'team', 'modules', 'tasks', 'github'
  let selectedModuleName = null;

  // Active Projects Filter State
  let projectSearch = '';
  let projectStatusFilter = 'all'; // 'all' | 'In Progress' | 'Completed'

  // History Filter State
  let historySearch = '';
  let historyStatusFilter = 'all'; // 'all' | 'Completed' | 'In Progress'
  let historyRoleFilter = 'all'; // 'all' | 'lead' | 'developer'

  // PDF Export Helper for Project History Dossier
  async function exportProjectHistoryToPDF(projectsToExport, scopeTitle = 'Complete Lifetime Project History') {
    if (!projectsToExport || projectsToExport.length === 0) {
      StudentSwal.fire({ icon: 'info', title: 'No Projects Found', text: 'There are no project records in this scope to export.' });
      return;
    }

    const user = currentUser || {};
    const studentName = user.name || user.username || 'Student Nova';
    const designation = user.designation || 'Nova';
    const studentEmail = user.email || 'student@rlabz.com';
    const allWorkLogs = getWorkLogs() || [];
    const allSprints = getSprints() || [];

    const totalEffort = projectsToExport.reduce((acc, p) => {
      const pLogs = allWorkLogs.filter(l => l.project === p.title);
      return acc + pLogs.reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);
    }, 0);

    const completedCount = projectsToExport.filter(p => p.status === 'Completed').length;
    const leadCount = projectsToExport.filter(p => {
      const myMember = (p.membersList || []).find(m => m.isCurrentUser || (m.name && m.name.toLowerCase() === (user.name?.toLowerCase() || '')));
      return myMember ? myMember.isTeamLead : (p.role && p.role.toLowerCase().includes('lead'));
    }).length;

    const totalTasksSum = projectsToExport.reduce((acc, p) => {
      const modulesList = (p.modulesList && p.modulesList.length > 0) ? p.modulesList : allSprints.filter(s => s.projectId === p.id);
      return acc + modulesList.reduce((sum, m) => sum + (m.tasks ? m.tasks.length : 0), 0);
    }, 0);

    const reportContainer = document.createElement('div');
    reportContainer.style.padding = '24px 28px';
    reportContainer.style.background = '#ffffff';
    reportContainer.style.color = '#0f172a';
    reportContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    // Build Projects Sections HTML (Professional Dossier: Name, Project, Role, Module, Worked Under - Task)
    const projectsHtml = projectsToExport.map((p, pIdx) => {
      const teamList = p.membersList || p.team || [];
      const myMember = teamList.find(m => m.isCurrentUser || (m.name && m.name.toLowerCase() === (user.name?.toLowerCase() || '')));
      const myRole = (myMember && myMember.roleDisplay) || (p.isTeamLead ? 'Project Lead' : (p.role || 'Developer'));
      const isLead = myMember ? myMember.isTeamLead : Boolean(p.isTeamLead || (p.role && p.role.toLowerCase().includes('lead')));

      // Modules/Sprints
      const modulesList = (p.modulesList && p.modulesList.length > 0) ? p.modulesList : (allSprints.filter(s => s.projectId === p.id) || []);
      const moduleNames = modulesList.map(m => m.name || m.title).filter(Boolean);
      
      // Tasks collection worked under supervisor
      const allTasks = [];
      modulesList.forEach(s => {
        (s.tasks || []).forEach(t => {
          const isMy = t.isMyTask || (t.assignee && t.assignee.toLowerCase() === (studentName.toLowerCase()));
          allTasks.push({
            code: t.code || t.taskCode || t.id || 'TSK',
            title: t.title || t.name || 'Sprint Component',
            description: t.description || t.desc || 'Assigned milestone deliverable module',
            moduleName: s.name || s.title || 'Sprint Module',
            assignee: t.assignee || studentName,
            status: t.status || 'In Progress',
            priority: t.priority || 'Medium',
            branchName: t.branchName || '',
            isMyTask: isMy
          });
        });
      });

      const dashData = getDashboardData();
      if (dashData && Array.isArray(dashData.tasks)) {
        const matchingDashTasks = dashData.tasks.filter(t => t.projectId === p.id || t.project === p.title);
        matchingDashTasks.forEach(t => {
          if (!allTasks.some(existing => existing.title === t.title)) {
            allTasks.push({
              code: t.id || t.code || 'TSK',
              title: t.title || t.name || 'Project Task',
              description: 'Project deliverable under supervisor oversight',
              moduleName: t.moduleName || t.module || (moduleNames[0] || 'Core Module'),
              assignee: studentName,
              status: t.status || 'In Progress',
              priority: 'Medium',
              branchName: '',
              isMyTask: true
            });
          }
        });
      }

      if (allTasks.length === 0) {
        allTasks.push({
          code: `TSK-${p.id || '01'}`,
          title: p.description && p.description !== 'No description available.'
            ? p.description
            : 'Full-cycle system development, UI views, and backend service integration',
          description: 'Comprehensive software delivery and sprint milestone',
          moduleName: moduleNames[0] || 'Core Sprint Deliverable',
          assignee: studentName,
          status: p.status || 'Completed',
          priority: 'High',
          branchName: '',
          isMyTask: true
        });
      }

      const completedTasksCount = allTasks.filter(t => t.status === 'Completed' || t.status === 'completed' || t.status === 'Closed').length;

      // Work logs for this project
      const pLogs = allWorkLogs.filter(l => l.project === p.title);
      const pLogHours = pLogs.reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);
      const pApprovedHours = pLogs.filter(l => (l.status || '').toLowerCase() === 'approved').reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);

      // PDF Module Badges HTML
      const pdfModulesBadgesHtml = moduleNames.length > 0 ? moduleNames.map((name, mIdx) => {
        const mObj = modulesList[mIdx];
        const isDone = mObj && (mObj.status === 'Completed' || mObj.status === 'completed');
        return `
          <span style="display: inline-flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; color: #1e293b;">
            <span>📦 ${name}</span>
            <span style="font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 3px; ${isDone ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">
              ${isDone ? '✓ Completed' : '● Active'}
            </span>
          </span>
        `;
      }).join(' ') : '<span style="font-size: 9px; color: #64748b; font-style: italic;">No specific sprint modules listed</span>';

      // PDF Task Rows HTML
      const pdfTasksRowsHtml = allTasks.map((t, idx) => {
        const isDone = t.status === 'Completed' || t.status === 'completed' || t.status === 'Closed';
        return `
          <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 5px 8px; font-size: 9px; font-weight: 700; color: #0f172a; width: 44%;">
              <div>▪ ${t.title}</div>
              <div style="font-size: 8px; color: #64748b; font-family: monospace;">${t.code}</div>
            </td>
            <td style="padding: 5px 8px; font-size: 8.5px; color: #0284c7; font-weight: 600; width: 26%;">
              ${t.moduleName}
            </td>
            <td style="padding: 5px 8px; font-size: 8.5px; text-align: center; width: 15%; color: #334155; font-weight: 600;">
              ${t.assignee}
            </td>
            <td style="padding: 5px 8px; font-size: 8px; text-align: center; width: 15%;">
              <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${
                isDone ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'
              }">
                ${isDone ? 'COMPLETED' : 'IN PROGRESS'}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      // PDF Work Logs Rows
      const workLogsRowsHtml = pLogs.map((l, lIdx) => `
        <tr style="background: ${lIdx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 4px 6px; font-size: 8.5px; font-weight: 600; color: #475569; width: 15%;">${l.date || '—'}</td>
          <td style="padding: 4px 6px; font-size: 8.5px; font-weight: 700; color: #0284c7; width: 25%;">${l.taskTitle || l.taskCode || 'Development Task'}</td>
          <td style="padding: 4px 6px; font-size: 8.5px; color: #334155; line-height: 1.2; width: 40%;">${l.description || 'Sprint implementation & module coding'}</td>
          <td style="padding: 4px 6px; font-size: 8.5px; font-weight: 700; text-align: center; width: 10%; color: #059669;">${parseFloat(l.hours || 0).toFixed(1)}h</td>
          <td style="padding: 4px 6px; font-size: 7.5px; text-align: center; width: 10%;">
            <span style="font-weight: 700; color: ${(l.status || '').toLowerCase() === 'approved' ? '#166534' : '#92400e'};">
              ${(l.status || 'PENDING').toUpperCase()}
            </span>
          </td>
        </tr>
      `).join('');

      return `
        <div class="pdf-project-card ${pIdx > 0 ? 'pdf-page-break-before' : ''}" style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; background: #ffffff; ${pIdx > 0 ? 'page-break-before: always; margin-top: 20px;' : ''} page-break-inside: avoid;">
          <!-- Top Bar: Record # & Status -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #0284c7; color: #ffffff; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 4px;">
                PROJECT RECORD #${pIdx + 1}
              </span>
              <span style="font-size: 10.5px; font-weight: 800; color: #0f172a;">
                Academic Track Dossier
              </span>
            </div>
            <div>
              <span style="display: inline-block; font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px; ${p.status === 'Completed' ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'}">
                ${p.status === 'Completed' ? '✓ COMPLETED' : '● IN PROGRESS'} (${p.progress || 0}%)
              </span>
            </div>
          </div>

          <!-- Professional Dossier Ledger (Name -> Project -> Role -> Module -> Worked Under - Task) -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; font-size: 9.5px;">
            <!-- 1. NAME -->
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; align-items: center;">
              <div style="font-weight: 800; color: #475569; text-transform: uppercase; font-size: 8.5px; letter-spacing: 0.05em;">
                👤 Name
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 800; color: #0f172a; font-size: 11px;">${studentName}</span>
                <span style="background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; border: 1px solid #bae6fd;">${designation}</span>
              </div>
            </div>

            <!-- 2. PROJECT -->
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; align-items: center;">
              <div style="font-weight: 800; color: #475569; text-transform: uppercase; font-size: 8.5px; letter-spacing: 0.05em;">
                📦 Project
              </div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-weight: 800; color: #0f172a; font-size: 11.5px;">${p.title}</span>
                <span style="background: #f1f5f9; color: #475569; padding: 1px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; border: 1px solid #e2e8f0;">Track: ${p.designation}</span>
                <span style="color: #0284c7; font-size: 8.5px; font-weight: 700;">⏱ ${p.timeline || 'Academic Session'}</span>
              </div>
            </div>

            <!-- 3. ROLE -->
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; align-items: center;">
              <div style="font-weight: 800; color: #475569; text-transform: uppercase; font-size: 8.5px; letter-spacing: 0.05em;">
                ★ Role
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 800; padding: 2px 7px; border-radius: 4px; font-size: 8.5px; ${isLead ? 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;' : 'background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;'}">
                  ${isLead ? '★ ' : ''}${myRole}
                </span>
                <span style="color: #64748b; font-size: 8.5px; font-weight: 600;">
                  ${isLead ? 'Sprint Lead & Technical Oversight' : 'Core Module Engineer & Development'}
                </span>
              </div>
            </div>

            <!-- 4. MODULE -->
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; align-items: center;">
              <div style="font-weight: 800; color: #475569; text-transform: uppercase; font-size: 8.5px; letter-spacing: 0.05em;">
                🧩 Module
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                ${pdfModulesBadgesHtml}
              </div>
            </div>

            <!-- 5. WORKED UNDER - TASK -->
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; padding: 5px 0; align-items: flex-start;">
              <div style="font-weight: 800; color: #475569; text-transform: uppercase; font-size: 8.5px; letter-spacing: 0.05em; padding-top: 2px;">
                👥 Worked Under - Task
              </div>
              <div>
                <!-- Supervisor Bar -->
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 8px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <span style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">Worked Under:</span>
                    <strong style="color: #0f172a; font-size: 10px; margin-left: 4px;">${p.faculty || 'Faculty Supervisor'}</strong>
                    <span style="font-size: 7.5px; color: #0284c7; background: #e0f2fe; padding: 1px 5px; border-radius: 3px; font-weight: 700; margin-left: 5px;">Faculty Project Guide</span>
                  </div>
                  <span style="font-size: 8px; color: #64748b; font-weight: 700;">
                    ${allTasks.length} Assigned Task${allTasks.length === 1 ? '' : 's'}
                  </span>
                </div>

                <!-- Tasks Table -->
                <table style="width: 100%; border-collapse: collapse; font-size: 8.5px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;">
                  <thead>
                    <tr style="background: #0f172a; color: #ffffff; text-align: left; font-size: 8px; text-transform: uppercase;">
                      <th style="padding: 4px 6px; width: 44%;">Task Title &amp; Scope</th>
                      <th style="padding: 4px 6px; width: 26%;">Assigned Module</th>
                      <th style="padding: 4px 6px; text-align: center; width: 15%;">Assignee</th>
                      <th style="padding: 4px 6px; text-align: center; width: 15%;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pdfTasksRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Project Contribution Metrics -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 5px; padding: 6px 8px; margin-bottom: 8px; font-size: 8.5px;">
            <div>
              <div style="color: #64748b; font-size: 7.5px; text-transform: uppercase; font-weight: 700;">Task Completion</div>
              <div style="font-weight: 800; color: #0284c7; margin-top: 1px;">${completedTasksCount} of ${allTasks.length} Tasks (${p.progress || 0}%)</div>
            </div>
            <div>
              <div style="color: #64748b; font-size: 7.5px; text-transform: uppercase; font-weight: 700;">Effort Logged</div>
              <div style="font-weight: 800; color: #059669; margin-top: 1px;">${pLogHours.toFixed(1)} hrs (${pApprovedHours.toFixed(1)} approved)</div>
            </div>
            <div>
              <div style="color: #64748b; font-size: 7.5px; text-transform: uppercase; font-weight: 700;">Modules Covered</div>
              <div style="font-weight: 800; color: #0f172a; margin-top: 1px;">${modulesList.length} Sprints</div>
            </div>
            <div>
              <div style="color: #64748b; font-size: 7.5px; text-transform: uppercase; font-weight: 700;">Client / Domain</div>
              <div style="font-weight: 800; color: #475569; margin-top: 1px;">${p.clientInfo || 'RLabZ Academic ERP'}</div>
            </div>
          </div>

          <!-- Student Verified Work Logs (if any) -->
          ${pLogs.length > 0 ? `
            <div style="margin-top: 8px;">
              <div style="font-size: 8.5px; font-weight: 800; color: #0f172a; margin-bottom: 3px; text-transform: uppercase;">
                Verified Timesheet Activity (${pLogs.length} Entries • ${pLogHours.toFixed(1)}h)
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
                <thead>
                  <tr style="background: #334155; color: #ffffff; text-align: left; font-size: 7.5px; text-transform: uppercase;">
                    <th style="padding: 3px 5px; width: 15%;">Date</th>
                    <th style="padding: 3px 5px; width: 25%;">Task Reference</th>
                    <th style="padding: 3px 5px; width: 40%;">Activity Description</th>
                    <th style="padding: 3px 5px; text-align: center; width: 10%;">Hours</th>
                    <th style="padding: 3px 5px; text-align: center; width: 10%;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${workLogsRowsHtml}
                </tbody>
              </table>
            </div>
          ` : ''}

          <!-- Project Team Roster -->
          <div style="font-size: 8.5px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 5px; margin-top: 6px;">
            <strong style="color: #0f172a;">Development Team:</strong>
            ${teamList.map(m => `${m.name} (${m.roleDisplay || m.role || 'Member'}${m.isTeamLead ? ' - Lead' : ''})`).join(', ') || 'Solo Assignment'}
          </div>
        </div>
      `;
    }).join('');

    reportContainer.innerHTML = `
      <!-- Top Header -->
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">RLABZ ACADEMIC ERP</h1>
            <span style="background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px;">STUDENT PORTAL</span>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #0284c7; margin-top: 3px;">Comprehensive Project History &amp; Contribution Dossier</div>
        </div>
        <div style="text-align: right; font-size: 10px; color: #64748b;">
          <div><strong>Date Generated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
          <div><strong>Scope:</strong> ${scopeTitle}</div>
          <div><strong>Doc ID:</strong> PRJ-HIST-${Date.now().toString().slice(-6)}</div>
        </div>
      </div>

      <!-- Student Profile & Lifetime KPIs Header Grid -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; font-size: 11px;">
        <div>
          <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 700;">Student Details</div>
          <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-top: 1px;">${studentName}</div>
          <div style="color: #0284c7; font-weight: 600; font-size: 10px;">Track: ${designation} • ${studentEmail}</div>
        </div>
        <div>
          <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 700;">Project Track Record</div>
          <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-top: 1px;">
            ${projectsToExport.length} Projects (${completedCount} Completed)
          </div>
          <div style="color: #d97706; font-weight: 600; font-size: 10px;">★ ${leadCount} Project${leadCount === 1 ? '' : 's'} as Team Lead</div>
        </div>
        <div>
          <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 700;">Effort &amp; Tasks Logged</div>
          <div style="font-weight: 800; font-size: 12px; color: #059669; margin-top: 1px;">
            ${totalEffort.toFixed(1)} Total Hours Logged
          </div>
          <div style="color: #475569; font-weight: 600; font-size: 10px;">Across ${totalTasksSum} Total Milestone Tasks</div>
        </div>
      </div>

      <!-- Projects Content -->
      ${projectsHtml}

      <!-- Official Footer & Sign-off Stamp -->
      <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9.5px; color: #64748b;">
        <div>
          <div style="font-weight: 700; color: #0f172a;">RLabZ Academic Operations &amp; Project Evaluation Board</div>
          <div>This document contains certified academic software development deliverables and effort records.</div>
        </div>
        <div style="text-align: right;">
          <div style="margin-bottom: 24px; border-bottom: 1px dashed #94a3b8; width: 140px; display: inline-block;"></div>
          <div style="font-size: 9px; font-weight: 700; color: #475569;">Authorized Faculty Signature</div>
        </div>
      </div>
    `;

    const filename = projectsToExport.length === 1
      ? `Project_Dossier_${projectsToExport[0].title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      : `Project_History_Dossier_${studentName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    StudentSwal.fire({
      title: 'Generating Project Dossier PDF...',
      text: 'Please wait while your detailed project history, sprint areas, and task reports are compiled.',
      allowOutsideClick: false,
      didOpen: () => {
        StudentSwal.showLoading();
      }
    });

    try {
      const blob = await html2pdf().set({
        margin: [0.3, 0.3, 0.3, 0.3],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.pdf-page-break-before' }
      }).from(reportContainer).output('blob');

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

      StudentSwal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Project Dossier PDF Downloaded!',
        text: filename,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    } catch (err) {
      console.error('Failed to generate project history PDF:', err);
      StudentSwal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Could not generate PDF dossier. Please try again.'
      });
    }
  }

  // CSV Export Helper
  function exportProjectHistoryToCSV(projectsToExport) {
    if (!projectsToExport || projectsToExport.length === 0) {
      StudentSwal.fire({ icon: 'info', title: 'No Projects Found', text: 'There are no project records in this scope to export.' });
      return;
    }

    const allWorkLogs = getWorkLogs() || [];
    const allSprints = getSprints() || [];
    const user = currentUser || {};

    const headers = [
      'Index',
      'Project Title',
      'Student Role',
      'Status',
      'Completion Progress %',
      'Supervisor',
      'Timeline',
      'Client Info',
      'Total Modules',
      'Sprint Areas',
      'Total Tasks',
      'Logged Effort Hours',
      'Approved Hours',
      'Collaborators'
    ];

    const rows = projectsToExport.map((p, idx) => {
      const teamList = p.membersList || p.team || [];
      const myMember = teamList.find(m => m.isCurrentUser || (m.name && m.name.toLowerCase() === (user.name?.toLowerCase() || '')));
      const myRole = (myMember && myMember.roleDisplay) || (p.isTeamLead ? 'Project Lead' : (p.role || 'Developer'));
      const modulesList = (p.modulesList && p.modulesList.length > 0) ? p.modulesList : allSprints.filter(s => s.projectId === p.id);
      const moduleNames = modulesList.map(m => m.name || m.title).filter(Boolean).join('; ');
      const totalTasks = p.totalTasksCount ?? modulesList.reduce((acc, m) => acc + (m.tasks ? m.tasks.length : 0), 0);
      const pLogs = allWorkLogs.filter(l => l.project === p.title);
      const pHours = pLogs.reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);
      const pApprHours = pLogs.filter(l => (l.status || '').toLowerCase() === 'approved').reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);
      const collabs = teamList.map(m => `${m.name} (${m.roleDisplay || m.role || 'Member'})`).join('; ');

      return [
        `"${idx + 1}"`,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        `"${myRole.replace(/"/g, '""')}"`,
        `"${(p.status || '').replace(/"/g, '""')}"`,
        `"${p.progress || 0}%"`,
        `"${(p.faculty || '').replace(/"/g, '""')}"`,
        `"${(p.timeline || '').replace(/"/g, '""')}"`,
        `"${(p.clientInfo || '').replace(/"/g, '""')}"`,
        `"${modulesList.length}"`,
        `"${moduleNames.replace(/"/g, '""')}"`,
        `"${totalTasks}"`,
        `"${pHours.toFixed(1)}"`,
        `"${pApprHours.toFixed(1)}"`,
        `"${collabs.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_History_Summary_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function render() {
    const selectedProject = assignedProjects.find(p => p.id === selectedProjectId);
    const modulesData = getSprints() || [];
    const githubData = getGithub() || [];
    const workLogs = getWorkLogs() || [];

    // Lifetime KPIs for History
    const totalProjectsCount = assignedProjects.length;
    const inProgressCount = assignedProjects.filter(p => p.status === 'In Progress').length;
    const completedCount = assignedProjects.filter(p => p.status === 'Completed').length;
    const totalTasksCount = assignedProjects.reduce((acc, p) => {
      const modulesList = p.modulesList || p.modules || [];
      const count = p.totalTasksCount ?? modulesList.reduce((sum, m) => sum + (m.tasks ? m.tasks.length : 0), 0);
      return acc + count;
    }, 0);
    const leadProjectsCount = assignedProjects.filter(p => {
      const myMember = (p.membersList || []).find(m => m.isCurrentUser || (m.name && m.name.toLowerCase() === (currentUser?.name?.toLowerCase() || '')));
      return myMember ? myMember.isTeamLead : (p.role && p.role.toLowerCase().includes('lead'));
    }).length;
    const lifetimeHours = workLogs.reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);

    // Active view filtered projects
    const filteredActiveProjects = assignedProjects.filter(p => {
      if (projectStatusFilter !== 'all' && p.status !== projectStatusFilter) return false;
      if (projectSearch.trim()) {
        const q = projectSearch.toLowerCase().trim();
        const mTitle = (p.title || '').toLowerCase().includes(q);
        const mFaculty = (p.faculty || '').toLowerCase().includes(q);
        const mDesig = (p.designation || '').toLowerCase().includes(q);
        if (!mTitle && !mFaculty && !mDesig) return false;
      }
      return true;
    });
    const isProjectFilterActive = projectSearch.trim() !== '' || projectStatusFilter !== 'all';

    // History view filtered projects
    const filteredHistoryProjects = assignedProjects.filter(p => {
      if (historyStatusFilter !== 'all' && p.status !== historyStatusFilter) return false;
      
      const myMember = (p.membersList || []).find(m => m.isCurrentUser || (m.name && m.name.toLowerCase() === (currentUser?.name?.toLowerCase() || '')));
      const isLead = myMember ? myMember.isTeamLead : (p.role && p.role.toLowerCase().includes('lead'));
      if (historyRoleFilter === 'lead' && !isLead) return false;
      if (historyRoleFilter === 'developer' && isLead) return false;

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const mTitle = (p.title || '').toLowerCase().includes(q);
        const mFaculty = (p.faculty || '').toLowerCase().includes(q);
        const mDesig = (p.designation || '').toLowerCase().includes(q);
        const mRole = ((myMember && myMember.roleDisplay) || p.role || '').toLowerCase().includes(q);
        if (!mTitle && !mFaculty && !mDesig && !mRole) return false;
      }
      return true;
    });
    const isHistoryFilterActive = historySearch.trim() !== '' || historyStatusFilter !== 'all' || historyRoleFilter !== 'all';

    // Filter module data and github for selected project
    const projectModules = selectedProject ? modulesData.filter(s => s.projectId === selectedProject.id) : [];
    const projectGithub = selectedProject ? githubData.find(g => g.project === selectedProject.title) : null;

    if (!isDetailView) {
      // 1. Build Active Projects Grid HTML
      const activeProjectCardsHtml = filteredActiveProjects.map(p => {
        const teamList = p.membersList || p.team || [];
        const teamChipsHtml = teamList.map(m => {
          const isMe = m.isCurrentUser || (m.name && m.name.toLowerCase() === (currentUser?.name?.toLowerCase() || ''));
          const initial = (m.name || 'U').charAt(0).toUpperCase();
          let avatarClass = '';
          if (m.isTeamLead) {
            avatarClass = 'is-lead';
          } else if (m.role?.toLowerCase()?.includes('designer')) {
            avatarClass = 'is-designer';
          }

          return `
            <div class="student-proj-member-chip ${isMe ? 'is-me' : ''}" title="${m.name} - ${m.roleDisplay || m.role || 'Member'}">
              <div class="student-proj-member-avatar ${avatarClass}">
                ${initial}
              </div>
              <span>${m.name}</span>
              ${isMe ? `<span class="member-tag-you" style="font-size:0.6rem; padding:1px 4px;">You</span>` : ''}
              ${m.isTeamLead ? `<span class="member-tag-lead" style="font-size:0.6rem; padding:1px 4px;">Lead</span>` : ''}
            </div>
          `;
        }).join('');

        const modulesList = p.modulesList || p.modules || [];
        const totalTasks = p.totalTasksCount ?? modulesList.reduce((acc, m) => acc + (m.tasks ? m.tasks.length : 0), 0);
        const completedTasks = p.completedTasksCount ?? modulesList.reduce((acc, m) => acc + (m.tasks ? m.tasks.filter(t => t.status === 'Completed').length : 0), 0);

        return `
          <div class="student-proj-card project-summary-card" data-id="${p.id}">
            <div class="student-proj-card-top">
              <div>
                <h3 class="student-proj-card-title">${p.title}</h3>
                <div class="student-proj-card-timeline">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>Timeline: ${p.timeline || 'Active'}</span>
                </div>
              </div>
              <span class="student-badge ${p.status === 'Completed' ? 'student-badge-success' : 'student-badge-warning'}">${p.status}</span>
            </div>

            <div class="student-proj-meta-chips">
              <span class="student-badge student-badge-info" style="font-size: 0.72rem; font-weight: 700;">${p.designation}</span>
              <span class="student-proj-sup-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Supervisor: <strong>${p.faculty}</strong>
              </span>
            </div>

            <!-- Progress -->
            <div class="student-proj-progress-box">
              <div class="student-proj-progress-head">
                <span>Progress (${completedTasks}/${totalTasks} Tasks)</span>
                <span class="student-proj-progress-pct">${p.progress}%</span>
              </div>
              <div class="student-proj-progress-bar-bg">
                <div class="student-proj-progress-bar-fill" style="width: ${p.progress}%;"></div>
              </div>
            </div>

            <!-- Development Team Section -->
            <div class="student-proj-team-section">
              <div class="student-proj-team-label-row">
                <span style="display: flex; align-items: center; gap: 5px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #0284c7;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  Development Team
                </span>
                <span>${teamList.length} Member${teamList.length === 1 ? '' : 's'}</span>
              </div>
              <div class="student-proj-team-chips-wrap">
                ${teamChipsHtml || '<span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">No team members assigned</span>'}
              </div>
            </div>

            <!-- Footer -->
            <div class="student-proj-card-footer">
              <span style="font-size: 0.74rem; font-weight: 700; color: var(--text-muted);">
                ${modulesList.length} ${modulesList.length === 1 ? 'Module' : 'Modules'} • ${totalTasks} ${totalTasks === 1 ? 'Task' : 'Tasks'}
              </span>
              <button type="button" class="student-proj-view-btn btn-view-details" data-id="${p.id}">
                <span>View Details</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            </div>
          </div>
        `;
      }).join('');

      // 2. Build Student Project History Cards HTML (Professional Executive Dossier: Name, Project, Role, Module, Worked Under - Task)
      const historyProjectCardsHtml = filteredHistoryProjects.map((p, index) => {
        const teamList = p.membersList || p.team || [];
        const myMember = teamList.find(m => m.isCurrentUser || (m.name && m.name.toLowerCase() === (currentUser?.name?.toLowerCase() || '')));
        const myRole = (myMember && myMember.roleDisplay) || (p.isTeamLead ? 'Project Lead' : (p.role || 'Developer'));
        const isLead = myMember ? myMember.isTeamLead : Boolean(p.isTeamLead || (p.role && p.role.toLowerCase().includes('lead')));

        // 1. Student Name Details
        const studentName = currentUser?.name || 'Student Nova';
        const studentInitial = (studentName || 'U').charAt(0).toUpperCase();
        const studentDesignation = currentUser?.designation || p.designation || 'Active Scholar';

        // 4. Module Details
        const modulesList = (p.modulesList && p.modulesList.length > 0) ? p.modulesList : (modulesData.filter(s => s.projectId === p.id) || []);
        const moduleNames = modulesList.map(m => m.name || m.title).filter(Boolean);
        const totalTasks = p.totalTasksCount ?? modulesList.reduce((acc, m) => acc + (m.tasks ? m.tasks.length : 0), 0);
        const completedTasks = p.completedTasksCount ?? modulesList.reduce((acc, m) => acc + (m.tasks ? m.tasks.filter(t => t.status === 'Completed' || t.status === 'completed').length : 0), 0);

        // 5. Worked Under & Specific Tasks Under Supervisor
        const supervisorName = p.faculty || 'Faculty Supervisor';
        const projectTasks = [];

        modulesList.forEach(m => {
          (m.tasks || []).forEach(t => {
            const isMy = t.isMyTask || (t.assignee && t.assignee.toLowerCase() === (studentName.toLowerCase()));
            projectTasks.push({
              id: t.id || t.code || 'TSK',
              title: t.title || t.name || 'Sprint Component',
              moduleName: m.name || m.title || 'Sprint Module',
              status: t.status || 'In Progress',
              assignee: t.assignee || studentName,
              isMyTask: isMy
            });
          });
        });

        const dashData = getDashboardData();
        if (dashData && Array.isArray(dashData.tasks)) {
          const matchingDashTasks = dashData.tasks.filter(t => t.projectId === p.id || t.project === p.title);
          matchingDashTasks.forEach(t => {
            if (!projectTasks.some(existing => existing.title === t.title)) {
              projectTasks.push({
                id: t.id || t.code || 'TSK',
                title: t.title || t.name || 'Project Task',
                moduleName: t.moduleName || t.module || (moduleNames[0] || 'Core Module'),
                status: t.status || 'In Progress',
                assignee: studentName,
                isMyTask: true
              });
            }
          });
        }

        if (projectTasks.length === 0) {
          projectTasks.push({
            id: `TSK-${p.id || '01'}`,
            title: p.description && p.description !== 'No description available.'
              ? p.description
              : 'Full-cycle system development, UI views, and backend service integration',
            moduleName: moduleNames[0] || 'Core Sprint Deliverable',
            status: p.status || 'Completed',
            assignee: studentName,
            isMyTask: true
          });
        }

        // Calculate hours spent on this project from work logs
        const projectLogs = workLogs.filter(l => l.project === p.title);
        const projectHours = projectLogs.reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);
        const approvedHours = projectLogs.filter(l => (l.status || '').toLowerCase() === 'approved').reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);

        // Build Module Badges Html
        const moduleBadgesHtml = moduleNames.length > 0 ? moduleNames.map((name, mIdx) => {
          const mObj = modulesList[mIdx];
          const isDone = mObj && (mObj.status === 'Completed' || mObj.status === 'completed');
          return `
            <div class="student-history-module-chip">
              <span class="student-history-module-icon">📦</span>
              <span class="student-history-module-title">${name}</span>
              <span class="student-history-module-status ${isDone ? 'done' : 'active'}">
                ${isDone ? '✓ Completed' : '● Active'}
              </span>
            </div>
          `;
        }).join('') : `<span style="font-size: 0.8rem; color: #64748b; font-style: italic;">No specific sprint modules listed</span>`;

        // Build Tasks Rows Html
        const tasksRowsHtml = projectTasks.map((t, tIdx) => {
          const isDone = t.status === 'Completed' || t.status === 'completed' || t.status === 'Closed';
          return `
            <div class="student-history-task-row">
              <div class="student-history-task-info">
                <span class="student-history-task-bullet">▪</span>
                <span class="student-history-task-title" title="${t.title}">${t.title}</span>
                <span class="student-history-task-module-tag">${t.moduleName}</span>
              </div>
              <div class="student-history-task-meta">
                <span class="student-history-task-status ${isDone ? 'completed' : 'progress'}">
                  ${isDone ? '✓ Completed' : '● In Progress'}
                </span>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="student-history-card student-history-dossier-card" data-id="${p.id}">
            <!-- Top Bar: Record # & Status -->
            <div class="student-history-top-bar">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.78rem; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 2px 8px; border-radius: 6px; letter-spacing: 0.04em;">
                  RECORD #${index + 1}
                </span>
                <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">
                  Academic Session Record
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="student-badge ${p.status === 'Completed' ? 'student-badge-success' : 'student-badge-warning'}" style="font-size: 0.75rem; font-weight: 800; padding: 3px 10px;">
                  ${p.status === 'Completed' ? '✓ COMPLETED' : '● IN PROGRESS'}
                </span>
              </div>
            </div>

            <!-- Professional Dossier Ledger (Name -> Project -> Role -> Module -> Worked Under - Task) -->
            <div class="student-history-ledger">
              <!-- 1. NAME -->
              <div class="student-history-ledger-row">
                <div class="student-history-ledger-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span>Name</span>
                </div>
                <div class="student-history-ledger-val">
                  <div class="student-history-name-wrapper">
                    <div class="student-history-avatar-sm">${studentInitial}</div>
                    <span class="student-history-name-text">${studentName}</span>
                    <span class="student-history-user-tag">${studentDesignation}</span>
                  </div>
                </div>
              </div>

              <!-- 2. PROJECT -->
              <div class="student-history-ledger-row">
                <div class="student-history-ledger-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                  <span>Project</span>
                </div>
                <div class="student-history-ledger-val">
                  <div class="student-history-project-wrapper">
                    <span class="student-history-project-title">${p.title}</span>
                    <span class="student-history-track-badge">Track: ${p.designation}</span>
                    <span class="student-history-track-badge" style="color: #0284c7; background: #f0f9ff; border-color: #bae6fd;">
                      ⏱ ${p.timeline || 'Academic Session'}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 3. ROLE -->
              <div class="student-history-ledger-row">
                <div class="student-history-ledger-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                  <span>Role</span>
                </div>
                <div class="student-history-ledger-val">
                  <div class="student-history-role-wrapper">
                    <span class="student-history-role-chip ${isLead ? 'is-lead' : ''}">
                      ${isLead ? '★ ' : ''}${myRole}
                    </span>
                    <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">
                      ${isLead ? 'Sprint Lead & Technical Oversight' : 'Core Module Engineer & Development'}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 4. MODULE -->
              <div class="student-history-ledger-row">
                <div class="student-history-ledger-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                  <span>Module</span>
                </div>
                <div class="student-history-ledger-val">
                  <div class="student-history-modules-grid">
                    ${moduleBadgesHtml}
                  </div>
                </div>
              </div>

              <!-- 5. WORKED UNDER - TASK -->
              <div class="student-history-ledger-row student-history-worked-under-row">
                <div class="student-history-ledger-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  <span>Worked Under - Task</span>
                </div>
                <div class="student-history-ledger-val">
                  <div class="student-history-worked-under-box">
                    <!-- Supervisor Section -->
                    <div class="student-history-supervisor-bar">
                      <div class="student-history-supervisor-identity">
                        <div class="student-history-supervisor-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div>
                          <span style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Worked Under:</span>
                          <strong style="color: #0f172a; font-size: 0.92rem; margin-left: 4px;">${supervisorName}</strong>
                          <span style="font-size: 0.72rem; color: #0284c7; background: #e0f2fe; padding: 1px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px;">Faculty Supervisor &amp; Guide</span>
                        </div>
                      </div>
                      <span style="font-size: 0.74rem; color: #64748b; font-weight: 700;">
                        ${projectTasks.length} Assigned Task${projectTasks.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <!-- Tasks List Under Supervisor -->
                    <div class="student-history-tasks-table">
                      ${tasksRowsHtml}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Project History Contribution Metrics -->
            <div class="student-history-metrics-grid">
              <div class="student-history-metric-item">
                <span class="student-history-metric-lbl">Task Completion</span>
                <span class="student-history-metric-val" style="color: #0284c7;">${completedTasks} of ${totalTasks} Tasks (${p.progress}%)</span>
              </div>
              <div class="student-history-metric-item">
                <span class="student-history-metric-lbl">Logged Effort</span>
                <span class="student-history-metric-val" style="color: #059669;">${projectHours.toFixed(1)} hrs <span style="font-size: 0.75rem; font-weight: 600; color: #64748b;">(${approvedHours.toFixed(1)} approved)</span></span>
              </div>
              <div class="student-history-metric-item">
                <span class="student-history-metric-lbl">Modules Covered</span>
                <span class="student-history-metric-val">${modulesList.length} ${modulesList.length === 1 ? 'Sprint' : 'Sprints'}</span>
              </div>
              <div class="student-history-metric-item">
                <span class="student-history-metric-lbl">My Role Assignment</span>
                <span class="student-history-metric-val" style="color: ${isLead ? '#d97706' : '#475569'};">${myRole}</span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #64748b; margin-bottom: 4px;">
                <span>Overall Milestone Completion</span>
                <span style="color: ${p.status === 'Completed' ? '#059669' : '#0284c7'}; font-weight: 800;">${p.progress}%</span>
              </div>
              <div class="student-proj-progress-bar-bg" style="height: 7px;">
                <div class="student-proj-progress-bar-fill" style="width: ${p.progress}%; height: 7px; background: ${p.status === 'Completed' ? '#10b981' : 'linear-gradient(90deg, #0284c7, #38bdf8)'};"></div>
              </div>
            </div>

            <!-- Footer Action Bar -->
            <div class="student-history-footer">
              <span style="font-size: 0.78rem; color: #64748b;">
                <strong>Client / Domain:</strong> ${p.clientInfo || 'RLabZ Academic ERP'}
              </span>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="student-btn student-btn-outline student-btn-sm btn-history-download-single" data-id="${p.id}" style="font-size: 0.76rem; padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px;" title="Download comprehensive PDF dossier for this project">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>Download PDF</span>
                </button>
                <button type="button" class="student-btn student-btn-outline student-btn-sm btn-history-chat" data-title="${p.title}" style="font-size: 0.76rem; padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px;" title="Chat with Supervisor for this project">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <span>Chat Supervisor</span>
                </button>
                <button type="button" class="student-btn student-btn-outline student-btn-sm btn-history-worklogs" data-title="${p.title}" style="font-size: 0.76rem; padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px;" title="View timesheet work logs for this project">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>Work Logs (${projectHours.toFixed(1)}h)</span>
                </button>
                <button type="button" class="student-btn student-btn-primary student-btn-sm btn-view-details" data-id="${p.id}" style="font-size: 0.76rem; padding: 5px 12px; display: inline-flex; align-items: center; gap: 4px;">
                  <span>Inspect Details →</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = `
        <!-- Header Banner with View Mode Switcher -->
        <div class="student-proj-header-wrapper">
          <div class="student-proj-header-left">
            <div class="student-proj-brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <div>
              <h1 class="student-proj-title">Student Projects &amp; History</h1>
              <p class="student-proj-subtitle"></p>
            </div>
          </div>

          <!-- View Switcher Tabs: Active Projects vs. Project History -->
          <div class="student-proj-view-switcher">
            <button type="button" class="student-proj-switcher-btn ${viewMode === 'active' ? 'active' : ''}" data-view="active">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              <span>Active Projects (${assignedProjects.filter(p => p.status !== 'Completed').length})</span>
            </button>
            <button type="button" class="student-proj-switcher-btn ${viewMode === 'history' ? 'active' : ''}" data-view="history">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>📜 Project History (${assignedProjects.length})</span>
            </button>
          </div>
        </div>

        ${viewMode === 'active' ? `
          <!-- ACTIVE PROJECTS VIEW -->
          <!-- KPI Grid -->
          <div class="student-proj-kpi-grid">
            <div class="student-proj-kpi-card kpi-blue">
              <div class="student-proj-kpi-icon blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              </div>
              <div class="student-proj-kpi-info">
                <div class="student-proj-kpi-val">${totalProjectsCount}</div>
                <div class="student-proj-kpi-lbl">Assigned Projects</div>
              </div>
            </div>

            <div class="student-proj-kpi-card kpi-amber">
              <div class="student-proj-kpi-icon amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div class="student-proj-kpi-info">
                <div class="student-proj-kpi-val">${inProgressCount}</div>
                <div class="student-proj-kpi-lbl">In Progress</div>
              </div>
            </div>

            <div class="student-proj-kpi-card kpi-emerald">
              <div class="student-proj-kpi-icon emerald">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div class="student-proj-kpi-info">
                <div class="student-proj-kpi-val">${completedCount}</div>
                <div class="student-proj-kpi-lbl">Completed</div>
              </div>
            </div>

            <div class="student-proj-kpi-card kpi-indigo">
              <div class="student-proj-kpi-icon indigo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              </div>
              <div class="student-proj-kpi-info">
                <div class="student-proj-kpi-val">${totalTasksCount}</div>
                <div class="student-proj-kpi-lbl">Total Tasks</div>
              </div>
            </div>
          </div>

          <!-- Active Filter Bar -->
          <div class="student-proj-filter-bar">
            <div class="student-proj-search-wrap">
              <svg class="student-proj-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" id="project-search-input" class="student-proj-search-input" placeholder="Search projects by title, supervisor, or track..." value="${projectSearch}">
            </div>

            <div class="student-proj-filter-pills">
              <button type="button" class="student-proj-filter-pill ${projectStatusFilter === 'all' ? 'active' : ''}" data-status="all">All</button>
              <button type="button" class="student-proj-filter-pill ${projectStatusFilter === 'In Progress' ? 'active' : ''}" data-status="In Progress">In Progress</button>
              <button type="button" class="student-proj-filter-pill ${projectStatusFilter === 'Completed' ? 'active' : ''}" data-status="Completed">Completed</button>
            </div>

            ${isProjectFilterActive ? `
              <button type="button" id="btn-clear-proj-filters" class="student-filter-btn-clear" title="Reset filters">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Reset
              </button>
            ` : ''}
          </div>

          ${filteredActiveProjects.length === 0 ? `
            <div class="student-card">
              <div class="student-empty-filter" style="padding: 48px 24px;">
                <div class="student-empty-filter-icon">🔍</div>
                <div class="student-empty-filter-text">No active projects match your filter criteria</div>
                <div class="student-empty-filter-sub">Try adjusting your search query or switch to the Project History tab.</div>
                <button type="button" id="btn-empty-clear-proj" class="student-btn student-btn-outline student-btn-sm" style="margin: 0 auto;">
                  Clear Filters
                </button>
              </div>
            </div>
          ` : `
            <div class="student-proj-grid">
              ${activeProjectCardsHtml}
            </div>
          `}
        ` : `
          <!-- STUDENT PROJECT HISTORY VIEW -->
          <!-- Lifetime History KPIs -->
          <div class="student-proj-kpi-grid">
            <div class="student-proj-kpi-card kpi-blue">
              <div class="student-proj-kpi-icon blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div class="student-proj-kpi-info">
                <div class="student-proj-kpi-val">${totalProjectsCount}</div>
                <div class="student-proj-kpi-lbl">Lifetime Projects</div>
              </div>
            </div>

            <div class="student-proj-kpi-card kpi-emerald">
              <div class="student-proj-kpi-icon emerald">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div class="student-proj-kpi-info">
                <div class="student-proj-kpi-val">${completedCount}</div>
                <div class="student-proj-kpi-lbl">Completed Projects</div>
              </div>
            </div>

            <div class="student-proj-kpi-card kpi-amber">
              <div class="student-proj-kpi-icon amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
              <div class="student-proj-kpi-info">
                <div class="student-proj-kpi-val">${leadProjectsCount}</div>
                <div class="student-proj-kpi-lbl">Projects as Lead</div>
              </div>
            </div>

            <div class="student-proj-kpi-card kpi-indigo">
              <div class="student-proj-kpi-icon indigo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div class="student-proj-kpi-info">
                <div class="student-proj-kpi-val">${lifetimeHours.toFixed(1)}h</div>
                <div class="student-proj-kpi-lbl">Total Effort Logged</div>
              </div>
            </div>
          </div>

          <!-- History Filter Bar -->
          <div class="student-proj-filter-bar">
            <div class="student-proj-search-wrap">
              <svg class="student-proj-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" id="history-search-input" class="student-proj-search-input" placeholder="Search project history by title, supervisor, role, or sprints..." value="${historySearch}">
            </div>

            <div class="student-proj-filter-pills">
              <button type="button" class="student-proj-filter-pill ${historyStatusFilter === 'all' ? 'active' : ''}" data-history-status="all">All History</button>
              <button type="button" class="student-proj-filter-pill ${historyStatusFilter === 'Completed' ? 'active' : ''}" data-history-status="Completed">Completed</button>
              <button type="button" class="student-proj-filter-pill ${historyStatusFilter === 'In Progress' ? 'active' : ''}" data-history-status="In Progress">In Progress</button>
              <button type="button" class="student-proj-filter-pill ${historyRoleFilter === 'lead' ? 'active' : ''}" data-history-role="lead">★ Lead Roles</button>
            </div>

            ${isHistoryFilterActive ? `
              <button type="button" id="btn-clear-history-filters" class="student-filter-btn-clear" title="Reset history filters">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Reset
              </button>
            ` : ''}

            <!-- Download and Export History Options: All Projects vs. Project-Wise -->
            <div class="student-proj-history-actions">
              <button type="button" id="btn-download-all-projects-pdf" class="student-btn student-btn-primary student-btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-weight: 700; font-size: 0.8rem; box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);" title="Download complete history PDF of all assigned projects (clean project-wise separation)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Download All Projects (PDF)</span>
              </button>
              <button type="button" id="btn-download-project-wise-pdf" class="student-btn student-btn-outline student-btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; font-weight: 700; font-size: 0.8rem; color: #0284c7; border-color: #0284c7; background: #f0f9ff;" title="Select an individual project to download its standalone dossier">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                <span>Download Project-Wise (PDF)</span>
              </button>
              <button type="button" id="btn-download-history-csv" class="student-btn student-btn-outline student-btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; font-weight: 700; font-size: 0.8rem;" title="Export Project History Summary to CSV">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          ${filteredHistoryProjects.length === 0 ? `
            <div class="student-card">
              <div class="student-empty-filter" style="padding: 48px 24px;">
                <div class="student-empty-filter-icon">📜</div>
                <div class="student-empty-filter-text">No projects found in this history filter</div>
                <div class="student-empty-filter-sub">Try changing your search keywords or resetting filters.</div>
                <button type="button" id="btn-empty-clear-history" class="student-btn student-btn-outline student-btn-sm" style="margin: 0 auto;">
                  Reset Filters
                </button>
              </div>
            </div>
          ` : `
            <div class="student-history-grid">
              ${historyProjectCardsHtml}
            </div>
          `}
        `}
      `;
    } else {
      // Dynamic Team members list for Project Team tab
      let teamMembers = [];
      if (selectedProject) {
        teamMembers = selectedProject.membersList || [];
      }

      // Build Tab Content HTML
      let tabContentHtml = "";
      if (selectedProject) {
        if (activeTab === 'overview') {
          tabContentHtml = `
            <div class="project-tab-content">
              <div class="student-proj-overview-grid">
                <div class="student-proj-info-tile">
                  <div class="student-proj-info-icon emerald">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                  </div>
                  <div class="student-proj-info-text">
                    <span class="student-proj-info-label">Client / Sponsor</span>
                    <span class="student-proj-info-val">${selectedProject.clientInfo || 'RLabZ Academy'}</span>
                  </div>
                </div>

                <div class="student-proj-info-tile">
                  <div class="student-proj-info-icon blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
                  <div class="student-proj-info-text">
                    <span class="student-proj-info-label">Project Timeline</span>
                    <span class="student-proj-info-val">${selectedProject.timeline || 'Active'}</span>
                  </div>
                </div>

                <div class="student-proj-info-tile">
                  <div class="student-proj-info-icon amber">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <div class="student-proj-info-text">
                    <span class="student-proj-info-label">Supervisor</span>
                    <span class="student-proj-info-val" style="color: #0284c7;">${selectedProject.faculty}</span>
                  </div>
                </div>

                <div class="student-proj-info-tile">
                  <div class="student-proj-info-icon purple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  </div>
                  <div class="student-proj-info-text">
                    <span class="student-proj-info-label">Current Status</span>
                    <span class="student-proj-info-val">
                      <span class="student-badge ${selectedProject.status === 'Completed' ? 'student-badge-success' : 'student-badge-warning'}">${selectedProject.status}</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Description Scope Card -->
              <div class="student-proj-desc-card">
                <div class="student-proj-desc-head">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  <span>Project Scope & Objectives</span>
                </div>
                <p class="student-proj-desc-text">${selectedProject.description || 'No description provided.'}</p>
              </div>

              <!-- Completion Gauge Card -->
              <div class="student-proj-gauge-card">
                <div class="student-proj-gauge-head">
                  <div>
                    <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">Overall Completion Progress</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Calculated based on verified sprint task deliverables</div>
                  </div>
                  <span class="student-proj-gauge-pct">${selectedProject.progress}%</span>
                </div>
                <div class="student-proj-progress-bar-bg" style="height: 10px;">
                  <div class="student-proj-progress-bar-fill" style="width: ${selectedProject.progress}%; height: 10px;"></div>
                </div>
              </div>
            </div>
          `;
        } else if (activeTab === 'team') {
          const teamCards = teamMembers.map(m => {
            const isMe = m.isCurrentUser || (m.name && m.name.toLowerCase() === (currentUser?.name?.toLowerCase() || ''));
            let badgesHtml = '';
            if (m.isTeamLead) {
              badgesHtml += `<span class="student-proj-lead-badge">★ Team Lead</span>`;
            }
            if (isMe) {
              const rightOffset = m.isTeamLead ? '112px' : '14px';
              badgesHtml += `<span class="student-proj-you-badge" style="right: ${rightOffset};">You</span>`;
            }

            const initial = (m.name || 'U').charAt(0).toUpperCase();
            const roleName = m.roleDisplay || m.role || (m.isTeamLead ? 'Project Lead' : 'Developer');
            const avatarStyle = m.isTeamLead 
              ? 'background: linear-gradient(135deg, #d97706 0%, #b45309 100%);' 
              : (m.role?.toLowerCase()?.includes('designer') 
                ? 'background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);' 
                : '');

            return `
              <div class="student-proj-member-card ${isMe ? 'is-current-user' : ''}">
                ${badgesHtml}
                <div class="student-proj-avatar-lg" style="${avatarStyle}">
                  ${initial}
                </div>
                <div style="font-weight: 800; color: var(--text-primary); font-size: 1.05rem;">${m.name}</div>
                <div class="member-designation">${m.designation || 'Student'} Track</div>
                <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; display: flex; align-items: center; gap: 5px; margin-top: 2px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span>${roleName}</span>
                </div>
              </div>
            `;
          }).join('');

          tabContentHtml = `
            <div class="project-tab-content">
              <div class="student-rep-project-header" style="margin-bottom: 18px;">
                <div>
                  <h3 class="student-rep-project-title" style="font-size: 1.1rem;">Development Team</h3>
                  <p style="font-size: 0.82rem; color: var(--text-muted); margin: 3px 0 0 0;">Assigned peer developers, track roles, and leadership.</p>
                </div>
                <span class="student-badge student-badge-info" style="font-size: 0.75rem; font-weight: 800;">${teamMembers.length} Members</span>
              </div>
              <div class="student-proj-team-grid">
                ${teamCards}
              </div>
            </div>
          `;
        } else if (activeTab === 'modules') {
          const currentProjectModules = (selectedProject.modulesList && selectedProject.modulesList.length > 0)
            ? selectedProject.modulesList
            : projectModules;

          if (!selectedModuleName && currentProjectModules.length > 0) {
            selectedModuleName = currentProjectModules[0].name;
          }

          const foundModule = currentProjectModules.find(s => s.name === selectedModuleName);
          const moduleTasks = foundModule ? (foundModule.tasks || []) : [];

          const modulesLeftHtml = currentProjectModules.length > 0
            ? currentProjectModules.map(m => {
                const isActive = m.name === selectedModuleName;
                const mStatus = m.status || 'Todo';
                const mStatusClass = mStatus === 'Completed' ? 'student-badge-success' : (mStatus === 'In Progress' ? 'student-badge-warning' : 'student-badge-info');
                return `
                  <div class="student-proj-mod-item ${isActive ? 'active' : ''}" data-module-name="${m.name}">
                    <div class="student-proj-mod-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                      <div class="student-proj-mod-name">${m.name}</div>
                      <div style="display: flex; gap: 6px; margin-top: 4px; align-items: center;">
                        <span class="student-badge ${mStatusClass}" style="font-size: 0.65rem; padding: 1px 6px;">${mStatus}</span>
                        <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">${(m.tasks || []).length} Tasks</span>
                      </div>
                    </div>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </div>
                `;
              }).join('')
            : '<div style="color:var(--text-muted); padding: 16px;">No modules assigned to this project.</div>';

          const tasksRowsHtml = moduleTasks.length > 0 
            ? moduleTasks.map(t => {
                const isMyTask = t.isMyTask || (t.assignee && t.assignee.toLowerCase() === (currentUser?.name?.toLowerCase() || ''));
                const taskTitle = t.title || t.name;
                return `
                <div class="student-proj-task-row ${isMyTask ? 'is-my-task' : ''}">
                  <div style="display: flex; flex-direction: column; gap: 3px;">
                    <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">${taskTitle}</span>
                    <span style="font-size: 0.76rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      Assignee: <strong style="color: #334155;">${t.assignee}</strong>
                      ${isMyTask ? `<span class="member-tag-you" style="margin-left: 4px;">You</span>` : ''}
                    </span>
                  </div>
                  <span class="student-badge ${t.status === 'Completed' ? 'student-badge-success' : t.status === 'In Progress' ? 'student-badge-warning' : 'student-badge-info'}">${t.status}</span>
                </div>
              `;
            }).join('')
            : '<div style="padding: 36px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No tasks found under this module.</div>';

          tabContentHtml = `
            <div class="project-tab-content">
              <div class="student-rep-project-header" style="margin-bottom: 18px;">
                <div>
                  <h3 class="student-rep-project-title" style="font-size: 1.1rem;">Assigned Modules</h3>
                  <p style="font-size: 0.82rem; color: var(--text-muted); margin: 3px 0 0 0;">Functionalities and components allocated to your development scope. Select a module to inspect its tasks.</p>
                </div>
              </div>
              
              <div class="student-proj-modules-pane">
                <!-- Left Panel: Modules list -->
                <div class="student-proj-mod-sidebar">
                  ${modulesLeftHtml}
                </div>
                
                <!-- Right Panel: Tasks under selected module -->
                <div class="student-proj-mod-tasks-card">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                      <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">Tasks for: <strong style="color: #0284c7;">${selectedModuleName || 'None'}</strong></span>
                    </div>
                    <span class="student-badge student-badge-info" style="font-size: 0.72rem; font-weight: 800;">${moduleTasks.length} Tasks</span>
                  </div>
                  <div style="max-height: 440px; overflow-y: auto; padding-right: 4px;">
                    ${tasksRowsHtml}
                  </div>
                </div>
              </div>
            </div>
          `;
        } else if (activeTab === 'tasks') {
          // Collect all tasks across modules
          const allTasks = [];
          const currentProjectModules = (selectedProject.modulesList && selectedProject.modulesList.length > 0)
            ? selectedProject.modulesList
            : projectModules;

          currentProjectModules.forEach(s => {
            (s.tasks || []).forEach(t => {
              allTasks.push({
                ...t,
                name: t.title || t.name,
                assignee: t.assignee || 'Unassigned',
                status: t.status || 'Todo',
                moduleName: s.name,
                isMyTask: t.isMyTask || (t.assignee && t.assignee.toLowerCase() === (currentUser?.name?.toLowerCase() || ''))
              });
            });
          });

          const taskRowsHtml = allTasks.map(t => `
            <tr style="${t.isMyTask ? 'background: #f0f9ff;' : ''}">
              <td>
                <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">${t.name}</div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <span style="display: flex; align-items: center; gap: 4px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    ${t.moduleName}
                  </span>
                  ${t.branchName ? `
                    <span style="color: #4f46e5; font-weight: 600; display: inline-flex; align-items: center; gap: 3px;">
                      🌿 <code style="background: #e0e7ff; color: #4338ca; padding: 1px 6px; border-radius: 4px;">${t.branchName}</code>
                    </span>
                  ` : ''}
                  ${t.githubPrUrl ? `
                    <a href="${t.githubPrUrl}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; font-weight: 700; text-decoration: underline; display: inline-flex; align-items: center; gap: 2px;">
                      🔗 View PR
                    </a>
                  ` : ''}
                </div>
              </td>
              <td>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="student-badge student-badge-info" style="font-size: 0.78rem;">${t.assignee}</span>
                  ${t.isMyTask ? `<span class="member-tag-you">You</span>` : ''}
                </div>
              </td>
              <td style="text-align: center;"><span class="student-badge ${t.status === 'Completed' ? 'student-badge-success' : t.status === 'In Progress' ? 'student-badge-warning' : 'student-badge-danger'}">${t.status}</span></td>
            </tr>
          `).join('');

          tabContentHtml = `
            <div class="project-tab-content">
              <div class="student-rep-project-header" style="margin-bottom: 18px;">
                <div>
                  <h3 class="student-rep-project-title" style="font-size: 1.1rem;">Assigned Project Tasks</h3>
                  <p style="font-size: 0.82rem; color: var(--text-muted); margin: 3px 0 0 0;">Comprehensive list of sprint components, branch bindings, and responsibilities.</p>
                </div>
                <span class="student-badge student-badge-info" style="font-size: 0.75rem; font-weight: 800;">${allTasks.length} Total Tasks</span>
              </div>
              <div class="student-proj-table-wrap">
                <table class="student-proj-table">
                  <thead>
                    <tr>
                      <th style="width: 52%;">Task & Module</th>
                      <th style="width: 28%;">Assignee</th>
                      <th style="width: 20%; text-align: center;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${taskRowsHtml || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:32px;">No tasks found.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        } else if (activeTab === 'github') {
          tabContentHtml = `
            <div class="project-tab-content">
              <div class="student-rep-project-header" style="margin-bottom: 18px;">
                <div>
                  <h3 class="student-rep-project-title" style="font-size: 1.1rem;">GitHub Integration</h3>
                  <p style="font-size: 0.82rem; color: var(--text-muted); margin: 3px 0 0 0;">Repository synchronization and branch tracking status.</p>
                </div>
              </div>
              
              <div class="student-proj-git-card">
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid var(--border-subtle);">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-primary);"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                    <span style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary);">Repository Status</span>
                  </div>
                  ${projectGithub && projectGithub.url ? `
                    <span class="student-badge ${projectGithub.status === 'Verified' ? 'student-badge-success' : 'student-badge-warning'}" style="padding: 6px 14px; font-weight: 700; font-size: 0.8rem;">
                      ${projectGithub.status === 'Verified' ? '✓ Verified by Faculty' : '⏳ Pending Verification'}
                    </span>
                  ` : `
                    <span class="student-badge student-badge-warning" style="padding: 6px 14px; font-weight: 700; font-size: 0.8rem;">
                      No Repository Linked
                    </span>
                  `}
                </div>

                ${projectGithub && projectGithub.url ? `
                  <div class="student-proj-git-url-box">
                    <div style="font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted);">Connected Main Repository URL</div>
                    <div class="student-proj-git-url-row">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #38bdf8; flex-shrink: 0;"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
                      <a href="${projectGithub.url}" target="_blank" rel="noopener noreferrer" class="student-proj-git-url-link">
                        ${projectGithub.url}
                      </a>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px; font-size: 0.86rem;">
                    <span style="color: var(--text-muted);">Verifying Supervisor:</span>
                    <strong style="color: var(--text-primary);">${projectGithub.faculty || selectedProject.faculty || 'Unassigned'}</strong>
                  </div>
                ` : `
                  <div style="padding: 20px; background: var(--bg-canvas-light); border-radius: 12px; border: 1px dashed #cbd5e1;">
                    <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0;">
                      No main GitHub repository has been configured yet. The designated Team Lead can set the repository link in the GitHub Manager.
                    </p>
                  </div>
                `}

                <button type="button" class="student-btn student-btn-outline student-btn-sm btn-manage-git" style="width: fit-content; border-radius: 10px; padding: 8px 18px; font-weight: 700; gap: 6px;">
                  <span>Open GitHub & Branch Manager</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            </div>
          `;
        }
      }

      // Main detail container HTML
      const detailsHtml = selectedProject ? `
        <div class="student-proj-detail-hero">
          <!-- Project Detail Header -->
          <div class="student-proj-hero-top">
            <div>
              <h2 class="student-proj-hero-title">${selectedProject.title}</h2>
              <div class="student-proj-hero-meta">
                <span class="student-badge student-badge-info" style="font-size: 0.76rem; font-weight: 700;">${selectedProject.designation || 'Student Track'}</span>
                <span class="student-proj-sup-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Supervisor: <strong>${selectedProject.faculty}</strong>
                </span>
                <span class="student-proj-card-timeline">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  Timeline: <strong>${selectedProject.timeline || 'Active'}</strong>
                </span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <button type="button" class="student-btn student-btn-outline student-btn-sm btn-download-project-dossier" data-id="${selectedProject.id}" style="font-size: 0.78rem; padding: 6px 14px; display: inline-flex; align-items: center; gap: 6px; font-weight: 700; background: #ffffff;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Download Dossier (PDF)</span>
              </button>
              <span class="student-badge ${selectedProject.status === 'Completed' ? 'student-badge-success' : 'student-badge-warning'}" style="font-size: 0.82rem; padding: 6px 14px; font-weight: 700;">
                ${selectedProject.status}
              </span>
            </div>
          </div>

          <!-- Project Tab Navigation -->
          <div class="student-proj-tabs-nav">
            <button type="button" class="student-proj-tab-btn project-tab-btn ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <span>Overview</span>
            </button>
            <button type="button" class="student-proj-tab-btn project-tab-btn ${activeTab === 'team' ? 'active' : ''}" data-tab="team">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Team</span>
            </button>
            <button type="button" class="student-proj-tab-btn project-tab-btn ${activeTab === 'modules' ? 'active' : ''}" data-tab="modules">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span>Modules</span>
            </button>
            <button type="button" class="student-proj-tab-btn project-tab-btn ${activeTab === 'tasks' ? 'active' : ''}" data-tab="tasks">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              <span>Tasks</span>
            </button>
            <button type="button" class="student-proj-tab-btn project-tab-btn ${activeTab === 'github' ? 'active' : ''}" data-tab="github">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              <span>GitHub</span>
            </button>
          </div>

          <!-- Dynamic Content Outlet -->
          <div id="project-tab-outlet">
            ${tabContentHtml}
          </div>
        </div>
      ` : `
        <div class="student-card" style="display: flex; align-items: center; justify-content: center; min-height: 400px; color: var(--text-muted);">
          Select a project from the left panel to inspect details.
        </div>
      `;

      container.innerHTML = `
        <div style="display: flex; justify-content: flex-start; margin-bottom: 1.25rem;">
          <button type="button" class="student-proj-back-btn btn-back-to-cards">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Projects</span>
          </button>
        </div>

        <div id="project-details-outlet">
          ${detailsHtml}
        </div>
      `;
    }

    // Attach Event Listeners
    if (!isDetailView) {
      // Switcher Tab button handlers (Active vs History)
      container.querySelectorAll('.student-proj-switcher-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          viewMode = btn.dataset.view;
          render();
        });
      });

      if (viewMode === 'active') {
        // Search input handler
        const projSearchInput = container.querySelector('#project-search-input');
        projSearchInput?.addEventListener('input', (e) => {
          projectSearch = e.target.value;
          render();
          const newInput = container.querySelector('#project-search-input');
          if (newInput) {
            newInput.focus();
            newInput.setSelectionRange(newInput.value.length, newInput.value.length);
          }
        });

        // Status filter pills
        container.querySelectorAll('[data-status]').forEach(pill => {
          pill.addEventListener('click', () => {
            projectStatusFilter = pill.getAttribute('data-status');
            render();
          });
        });

        // Clear filters
        const clearProjFilters = () => {
          projectSearch = '';
          projectStatusFilter = 'all';
          render();
        };
        container.querySelector('#btn-clear-proj-filters')?.addEventListener('click', clearProjFilters);
        container.querySelector('#btn-empty-clear-proj')?.addEventListener('click', clearProjFilters);

        container.querySelectorAll('.btn-view-details').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedProjectId = parseInt(btn.dataset.id, 10);
            activeTab = 'overview';
            isDetailView = true;
            selectedModuleName = null;
            render();
          });
        });
        container.querySelectorAll('.project-summary-card').forEach(card => {
          card.addEventListener('click', () => {
            selectedProjectId = parseInt(card.dataset.id, 10);
            activeTab = 'overview';
            isDetailView = true;
            selectedModuleName = null;
            render();
          });
        });
      } else {
        // HISTORY VIEW LISTENERS
        // History search input handler
        const historySearchInput = container.querySelector('#history-search-input');
        historySearchInput?.addEventListener('input', (e) => {
          historySearch = e.target.value;
          render();
          const newInput = container.querySelector('#history-search-input');
          if (newInput) {
            newInput.focus();
            newInput.setSelectionRange(newInput.value.length, newInput.value.length);
          }
        });

        // History status filter pills
        container.querySelectorAll('[data-history-status]').forEach(pill => {
          pill.addEventListener('click', () => {
            historyStatusFilter = pill.getAttribute('data-history-status');
            render();
          });
        });

        // History role filter pills
        container.querySelectorAll('[data-history-role]').forEach(pill => {
          pill.addEventListener('click', () => {
            const role = pill.getAttribute('data-history-role');
            historyRoleFilter = historyRoleFilter === role ? 'all' : role;
            render();
          });
        });

        // Clear history filters
        const clearHistoryFilters = () => {
          historySearch = '';
          historyStatusFilter = 'all';
          historyRoleFilter = 'all';
          render();
        };
        container.querySelector('#btn-clear-history-filters')?.addEventListener('click', clearHistoryFilters);
        container.querySelector('#btn-empty-clear-history')?.addEventListener('click', clearHistoryFilters);

        // Inspect Details buttons in history
        container.querySelectorAll('.btn-view-details').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedProjectId = parseInt(btn.dataset.id, 10);
            activeTab = 'overview';
            isDetailView = true;
            selectedModuleName = null;
            render();
          });
        });

        // History cards click
        container.querySelectorAll('.student-history-card').forEach(card => {
          card.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('a')) return;
            selectedProjectId = parseInt(card.dataset.id, 10);
            activeTab = 'overview';
            isDetailView = true;
            selectedModuleName = null;
            render();
          });
        });

        // Download All Projects PDF
        const downloadAllProjects = () => {
          const scope = (historyStatusFilter === 'all' && historyRoleFilter === 'all' && !historySearch.trim())
            ? 'Complete Lifetime Project History (All Projects)'
            : 'Filtered Project History Selection';
          exportProjectHistoryToPDF(filteredHistoryProjects, scope);
        };
        container.querySelector('#btn-download-all-projects-pdf')?.addEventListener('click', downloadAllProjects);
        container.querySelector('#btn-download-history-pdf')?.addEventListener('click', downloadAllProjects);

        // Download Project-Wise PDF (Selector Modal)
        container.querySelector('#btn-download-project-wise-pdf')?.addEventListener('click', () => {
          const targetList = filteredHistoryProjects.length > 0 ? filteredHistoryProjects : assignedProjects;
          if (targetList.length === 0) {
            StudentSwal.fire({ icon: 'info', title: 'No Projects Available', text: 'No project history records found.' });
            return;
          }

          const optionsHtml = targetList.map(p => 
            `<option value="${p.id}">${p.title} (${p.status}) — Supervisor: ${p.faculty || 'Faculty Lead'}</option>`
          ).join('');

          StudentSwal.fire({
            title: 'Download Project-Wise Dossier',
            html: `
              <div style="text-align: left; font-size: 0.88rem; color: #475569; margin-bottom: 12px; line-height: 1.4;">
                Select a specific project from your records to download its individual certified dossier:
              </div>
              <select id="swal-select-project-dossier" style="width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.88rem; font-weight: 600; color: #0f172a; background: #f8fafc; outline: none; margin-bottom: 8px;">
                ${optionsHtml}
              </select>
              <div style="text-align: left; font-size: 0.78rem; color: #64748b;">
                Tip: You can also download any project directly using the "Download PDF" button on each card.
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Download Project PDF',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#0284c7',
            focusConfirm: false,
            preConfirm: () => {
              const sel = document.getElementById('swal-select-project-dossier');
              return sel ? parseInt(sel.value, 10) : null;
            }
          }).then((res) => {
            if (res.isConfirmed && res.value) {
              const selectedProj = assignedProjects.find(p => p.id === res.value);
              if (selectedProj) {
                exportProjectHistoryToPDF([selectedProj], `Project Dossier: ${selectedProj.title}`);
              }
            }
          });
        });

        // Export History CSV
        container.querySelector('#btn-download-history-csv')?.addEventListener('click', () => {
          exportProjectHistoryToCSV(filteredHistoryProjects);
        });

        // Single Project Download PDF buttons on history cards
        container.querySelectorAll('.btn-history-download-single').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pid = parseInt(btn.dataset.id, 10);
            const targetProj = assignedProjects.find(p => p.id === pid);
            if (targetProj) {
              exportProjectHistoryToPDF([targetProj], `Project Dossier: ${targetProj.title}`);
            }
          });
        });

        // Chat Supervisor buttons
        container.querySelectorAll('.btn-history-chat').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (router) {
              router.push('/student/chat');
            } else {
              window.location.hash = '#/student/chat';
            }
          });
        });

        // Work Logs buttons
        container.querySelectorAll('.btn-history-worklogs').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (router) {
              router.push('/student/work-logs');
            } else {
              window.location.hash = '#/student/work-logs';
            }
          });
        });
      }
    } else {
      container.querySelector('.btn-back-to-cards')?.addEventListener('click', () => {
        if (route?.params?.id && router) {
          router.push('/student/projects');
        } else {
          isDetailView = false;
          selectedProjectId = null;
          render();
        }
      });

      container.querySelector('.btn-download-project-dossier')?.addEventListener('click', () => {
        if (selectedProject) {
          exportProjectHistoryToPDF([selectedProject], `Project Dossier: ${selectedProject.title}`);
        }
      });

      container.querySelectorAll('.project-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeTab = btn.dataset.tab;
          render();
        });
      });

      container.querySelector('.btn-manage-git')?.addEventListener('click', () => {
        router.push('/student/github');
      });

      if (activeTab === 'modules') {
        container.querySelectorAll('.student-proj-mod-item').forEach(el => {
          el.addEventListener('click', () => {
            selectedModuleName = el.getAttribute('data-module-name');
            render();
          });
        });
      }
    }
  }

  render();
  return container;
}

export default StudentProjects;
