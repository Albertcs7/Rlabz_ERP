import { renderStudentSidebar } from './StudentSidebar.js';
import { getProjects, getWorkLogs, saveWorkLog, getProjectTasks, ensureDataLoaded } from './studentStore.js';
import { StudentSwal, showStudentSuccess, showStudentError, showStudentWarning } from '../studentAlerts.js';
import { useAuthStore } from '@/core/stores/auth.js';
import html2pdf from 'html2pdf.js';
import '../student.css';

export async function StudentWorkLogs(route, router) {
  await ensureDataLoaded();
  renderStudentSidebar();

  const container = document.createElement('div');
  container.className = 'student-portal-container animate-fade-in student-worklogs-view';

  // Form & Filter State
  const todayStr = new Date().toISOString().split('T')[0];
  let formProjectId = '';
  let formTaskId = '';
  let availableTasks = [];
  let loadingTasks = false;
  let formDate = todayStr;
  let formHours = '';
  let formDescription = '';
  let formSubmitting = false;

  let logSearch = '';
  let logProjectFilter = 'all'; // 'all' or project title
  let logStatusFilter = 'all';  // 'all' | 'approved' | 'pending' | 'rejected'

  function exportLogsToCSV(logsToExport, projectTitle) {
    const headers = ['Date', 'Project', 'Task Code', 'Task Title', 'Hours', 'Description', 'Status'];
    const rows = logsToExport.map(l => [
      `"${l.date || ''}"`,
      `"${(l.project || '').replace(/"/g, '""')}"`,
      `"${(l.taskCode || '').replace(/"/g, '""')}"`,
      `"${(l.taskTitle || '').replace(/"/g, '""')}"`,
      `"${parseFloat(l.hours || 0).toFixed(1)}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${(l.status || 'pending').toUpperCase()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = projectTitle && projectTitle !== 'all' && projectTitle !== 'All Assigned Projects'
      ? `WorkLogs_${projectTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${todayStr}.csv`
      : `WorkLogs_AllProjects_${todayStr}.csv`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function exportLogsToPDF(logsToExport, scopeTitle) {
    const authStore = useAuthStore();
    const user = authStore.user || {};
    const studentName = user.name || user.username || 'Student';
    const designation = user.designation || 'Nova';
    const totalHours = logsToExport.reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);
    const approvedHours = logsToExport.filter(l => (l.status || '').toLowerCase() === 'approved').reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);

    const reportContainer = document.createElement('div');
    reportContainer.style.padding = '24px 30px';
    reportContainer.style.background = '#ffffff';
    reportContainer.style.color = '#0f172a';
    reportContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    const rowsHtml = logsToExport.map((l, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 10px; font-size: 11px; font-weight: 600;">${l.date || '—'}</td>
        <td style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #00796B;">${l.project || '—'}</td>
        <td style="padding: 8px 10px; font-size: 11px;">
          <span style="font-weight: 700; color: #1e293b;">${l.taskCode || '—'}</span>
          ${l.taskTitle ? `<div style="font-size: 10px; color: #64748b;">${l.taskTitle}</div>` : ''}
        </td>
        <td style="padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: center;">${parseFloat(l.hours || 0).toFixed(1)} hrs</td>
        <td style="padding: 8px 10px; font-size: 10.5px; color: #334155; line-height: 1.35;">${l.description || '—'}</td>
        <td style="padding: 8px 10px; font-size: 10px; text-align: center;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; ${
            (l.status || '').toLowerCase() === 'approved' ? 'background: #dcfce7; color: #166534;' :
            (l.status || '').toLowerCase() === 'rejected' ? 'background: #fee2e2; color: #991b1b;' :
            'background: #fef3c7; color: #92400e;'
          }">
            ${(l.status || 'PENDING').toUpperCase()}
          </span>
        </td>
      </tr>
    `).join('');

    reportContainer.innerHTML = `
      <div style="border-bottom: 2px solid #00796B; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">RLABZ ACADEMIC ERP</h1>
          <div style="font-size: 13px; font-weight: 700; color: #00796B; margin-top: 2px;">Student Daily Work Log &amp; Timesheet Report</div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #64748b;">
          <div><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</div>
          <div><strong>Scope:</strong> ${scopeTitle}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; font-size: 11.5px;">
        <div>
          <span style="color: #64748b;">Student:</span>
          <strong style="color: #0f172a; margin-left: 4px;">${studentName}</strong>
        </div>
        <div>
          <span style="color: #64748b;">Designation / Track:</span>
          <strong style="color: #00796B; margin-left: 4px;">${designation}</strong>
        </div>
        <div>
          <span style="color: #64748b;">Total Logged Hours:</span>
          <strong style="color: #059669; margin-left: 4px;">${totalHours.toFixed(1)} hrs</strong> (${approvedHours.toFixed(1)} approved)
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em;">
            <th style="padding: 8px 10px; width: 14%;">Date</th>
            <th style="padding: 8px 10px; width: 18%;">Project</th>
            <th style="padding: 8px 10px; width: 20%;">Task</th>
            <th style="padding: 8px 10px; width: 10%; text-align: center;">Hours</th>
            <th style="padding: 8px 10px; width: 28%;">Description</th>
            <th style="padding: 8px 10px; width: 10%; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">No work logs recorded in this scope.</td></tr>'}
        </tbody>
      </table>

      <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
        <span>Generated by RLabZ ERP — Student Timesheet Verification</span>
        <span>Official Student Portal Export</span>
      </div>
    `;

    const filename = scopeTitle && scopeTitle !== 'all' && scopeTitle !== 'All Assigned Projects'
      ? `WorkLogs_${scopeTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${todayStr}.pdf`
      : `WorkLogs_AllProjects_${todayStr}.pdf`;

    StudentSwal.fire({
      title: 'Generating PDF...',
      text: 'Please wait while your timesheet report is being generated.',
      allowOutsideClick: false,
      didOpen: () => {
        StudentSwal.showLoading();
      }
    });

    try {
      const blob = await html2pdf().set({
        margin: [0.35, 0.35, 0.35, 0.35],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
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
        title: 'PDF Downloaded!',
        text: filename,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true
      });
    } catch (err) {
      console.error('Work log PDF generation error:', err);
      showStudentError('PDF Generation Failed', 'Could not generate timesheet PDF. You can also export as CSV.');
    }
  }

  function openDownloadModal() {
    const projects = getProjects() || [];
    const logs = getWorkLogs() || [];

    const projectOptionsModal = projects.map(p => `
      <option value="${p.title}" ${logProjectFilter === p.title ? 'selected' : ''}>📁 ${p.title}</option>
    `).join('');

    StudentSwal.fire({
      title: '<span style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">📥 Download Daily Work Logs</span>',
      html: `
        <div style="display: flex; flex-direction: column; gap: 14px; text-align: left; margin: 12px 0;">
          <div>
            <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 5px;">
              1. Select Scope (Project-wise or All Projects):
            </label>
            <select id="modal-dl-project" style="width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.88rem; background: #ffffff; color: var(--text-primary);">
              <option value="all" ${logProjectFilter === 'all' ? 'selected' : ''}>🌐 All Projects Together (Full Timesheet)</option>
              ${projectOptionsModal}
            </select>
          </div>

          <div>
            <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 5px;">
              2. Status Filter:
            </label>
            <select id="modal-dl-status" style="width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.88rem; background: #ffffff; color: var(--text-primary);">
              <option value="all">All Entries (Approved, Pending &amp; Rejected)</option>
              <option value="approved">Approved Hours Only</option>
              <option value="pending">Pending Review Only</option>
            </select>
          </div>

          <div style="margin-top: 4px;">
            <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 8px;">
              3. Choose Export Format:
            </label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <button type="button" id="modal-btn-dl-pdf" class="btn" style="background: linear-gradient(135deg, #00897B, #00695C); color: #ffffff; border: none; padding: 11px 14px; border-radius: 8px; font-weight: 700; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 8px rgba(0, 150, 136, 0.25); transition: background 0.2s;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                <span>PDF Timesheet</span>
              </button>
              <button type="button" id="modal-btn-dl-csv" class="btn" style="background: #059669; color: #ffffff; border: none; padding: 11px 14px; border-radius: 8px; font-weight: 700; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25); transition: background 0.2s;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>CSV / Excel</span>
              </button>
            </div>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#64748b',
      didOpen: () => {
        const modalEl = StudentSwal.getPopup();
        const selProject = modalEl.querySelector('#modal-dl-project');
        const selStatus = modalEl.querySelector('#modal-dl-status');
        const btnPdf = modalEl.querySelector('#modal-btn-dl-pdf');
        const btnCsv = modalEl.querySelector('#modal-btn-dl-csv');

        const getSelectedLogs = () => {
          const proj = selProject?.value || 'all';
          const status = selStatus?.value || 'all';
          return {
            selectedProject: proj,
            selectedStatus: status,
            logs: logs.filter(l => {
              if (proj !== 'all' && l.project !== proj) return false;
              if (status !== 'all' && (l.status || 'pending').toLowerCase() !== status) return false;
              return true;
            })
          };
        };

        btnPdf?.addEventListener('click', async () => {
          const { selectedProject, logs: exportList } = getSelectedLogs();
          if (!exportList.length) {
            showStudentWarning('No Logs Found', 'There are no work log entries for the selected project and filters.');
            return;
          }
          StudentSwal.close();
          await exportLogsToPDF(exportList, selectedProject === 'all' ? 'All Assigned Projects' : selectedProject);
        });

        btnCsv?.addEventListener('click', () => {
          const { selectedProject, logs: exportList } = getSelectedLogs();
          if (!exportList.length) {
            showStudentWarning('No Logs Found', 'There are no work log entries for the selected project and filters.');
            return;
          }
          StudentSwal.close();
          exportLogsToCSV(exportList, selectedProject === 'all' ? 'All Assigned Projects' : selectedProject);
          StudentSwal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'CSV Downloaded!',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
          });
        });
      }
    });
  }

  async function handleProjectSelection(projectId) {
    formProjectId = projectId;
    formTaskId = '';
    availableTasks = [];
    if (!projectId) {
      render();
      return;
    }

    loadingTasks = true;
    render();

    try {
      availableTasks = await getProjectTasks(projectId);
    } catch (err) {
      console.error('Error fetching project tasks for work log:', err);
      availableTasks = [];
    } finally {
      loadingTasks = false;
      render();
    }
  }

  function render() {
    const projects = getProjects() || [];
    const logs = getWorkLogs() || [];

    // Filter Options for Form & Header
    const projectOptionsHtml = projects.map(p => `
      <option value="${p.id}" ${String(formProjectId) === String(p.id) ? 'selected' : ''}>${p.title}</option>
    `).join('');

    const logProjectFilterOptions = projects.map(p => `
      <option value="${p.title}" ${logProjectFilter === p.title ? 'selected' : ''}>${p.title}</option>
    `).join('');

    // Scoped logs for KPI metrics (depends on selected project filter)
    const scopeLogs = logProjectFilter === 'all' 
      ? logs 
      : logs.filter(l => l.project === logProjectFilter);

    // Filtered Work Logs for Table (includes search & status)
    const filteredLogs = scopeLogs.filter(l => {
      if (logStatusFilter !== 'all') {
        const s = (l.status || 'pending').toLowerCase();
        if (s !== logStatusFilter.toLowerCase()) return false;
      }
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase().trim();
        const matchDesc = (l.description || '').toLowerCase().includes(q);
        const matchProj = (l.project || '').toLowerCase().includes(q);
        const matchDate = (l.date || '').toLowerCase().includes(q);
        const matchTask = (l.taskTitle || l.taskCode || '').toLowerCase().includes(q);
        if (!matchDesc && !matchProj && !matchDate && !matchTask) return false;
      }
      return true;
    });

    const isFiltersActive = logSearch.trim() !== '' || logProjectFilter !== 'all' || logStatusFilter !== 'all';
    
    // KPI Calculations (Dynamically reflect the chosen project scope)
    const scopeTotalHours = scopeLogs.reduce((sum, log) => sum + parseFloat(log.hours || 0), 0);
    const scopeTotalEntries = scopeLogs.length;
    const scopeApprovedHours = scopeLogs
      .filter(l => (l.status || '').toLowerCase() === 'approved')
      .reduce((sum, log) => sum + parseFloat(log.hours || 0), 0);
    const scopePendingCount = scopeLogs.filter(l => (l.status || 'pending').toLowerCase() === 'pending').length;

    const filteredHours = filteredLogs.reduce((sum, log) => sum + parseFloat(log.hours || 0), 0);
    const scopeBadgeLabel = logProjectFilter === 'all' ? 'All Projects' : logProjectFilter;

    const logRowsHtml = filteredLogs.map(l => {
      const status = (l.status || 'pending').toLowerCase();
      let statusClass = 'pending';
      if (status === 'approved') statusClass = 'approved';
      else if (status === 'rejected') statusClass = 'rejected';

      return `
        <tr>
          <td>
            <div class="student-wl-proj-title">${l.project}</div>
            <div class="student-wl-date-sub">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline; vertical-align:middle;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${l.date}
            </div>
          </td>
          <td>
            ${l.taskCode ? `
              <span class="student-wl-task-code">${l.taskCode}</span>
              <div class="student-wl-task-title">${l.taskTitle || 'Assigned Task'}</div>
            ` : `
              <span style="color: var(--text-secondary); font-size: 0.82rem; font-weight:600;">${l.taskId ? 'Task #' + l.taskId : 'General Project Effort'}</span>
            `}
          </td>
          <td>
            <div class="student-wl-hours-val">
              ${parseFloat(l.hours || 0).toFixed(1)} hrs
            </div>
          </td>
          <td>
            <div class="student-wl-desc-text">${l.description || 'No work description provided.'}</div>
          </td>
          <td style="text-align: center;">
            <span class="student-wl-status-badge ${statusClass}">
              ${statusClass === 'approved' ? `
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ` : statusClass === 'pending' ? `
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ` : `
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              `}
              ${status.toUpperCase()}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <!-- Header Banner with Project Scope Selector -->
      <div class="student-wl-header-wrapper">
        <div class="student-wl-header-left">
          <div class="student-wl-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div>
            <h1 class="student-wl-title">Daily Work Logs</h1>
            <p class="student-wl-subtitle"></p>
          </div>
        </div>

        <!-- Scope Project Switcher & Action Buttons -->
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div class="student-wl-project-selector">
            <span class="student-wl-select-label">Project Scope:</span>
            <select id="header-scope-select" class="student-wl-header-select">
              <option value="all" ${logProjectFilter === 'all' ? 'selected' : ''}>All Assigned Projects</option>
              ${logProjectFilterOptions}
            </select>
          </div>
          <button type="button" id="btn-open-download-modal" class="student-btn student-btn-primary" style="font-size: 0.82rem; font-weight: 700; padding: 7px 14px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(0, 150, 136, 0.25);" title="Download Daily Work Logs (Project-wise or All Projects Combined)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Download Work Logs</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards (Dynamic to Project Scope) -->
      <div class="student-wl-kpi-grid">
        <div class="student-wl-kpi-card kpi-sidebar-primary">
          <div class="student-wl-kpi-icon primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <div class="student-wl-kpi-info">
            <div class="student-wl-kpi-val">${scopeTotalHours.toFixed(1)} hrs</div>
            <div class="student-wl-kpi-lbl">Total Logged <span style="font-size: 0.68rem; font-weight:500; text-transform:none; color:var(--text-muted);">(${scopeBadgeLabel})</span></div>
          </div>
        </div>

        <div class="student-wl-kpi-card kpi-purple">
          <div class="student-wl-kpi-icon purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </div>
          <div class="student-wl-kpi-info">
            <div class="student-wl-kpi-val">${scopeTotalEntries}</div>
            <div class="student-wl-kpi-lbl">Total Entries <span style="font-size: 0.68rem; font-weight:500; text-transform:none; color:var(--text-muted);">(${scopeBadgeLabel})</span></div>
          </div>
        </div>

        <div class="student-wl-kpi-card kpi-indigo">
          <div class="student-wl-kpi-icon indigo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div class="student-wl-kpi-info">
            <div class="student-wl-kpi-val">${scopeApprovedHours.toFixed(1)} hrs</div>
            <div class="student-wl-kpi-lbl">Approved Effort <span style="font-size: 0.68rem; font-weight:500; text-transform:none; color:var(--text-muted);">(${scopeBadgeLabel})</span></div>
          </div>
        </div>

        <div class="student-wl-kpi-card kpi-amber">
          <div class="student-wl-kpi-icon amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <div class="student-wl-kpi-info">
            <div class="student-wl-kpi-val">${scopePendingCount}</div>
            <div class="student-wl-kpi-lbl">Pending Review <span style="font-size: 0.68rem; font-weight:500; text-transform:none; color:var(--text-muted);">(${scopeBadgeLabel})</span></div>
          </div>
        </div>
      </div>

      <!-- 2-Column Split: Log Form (Left) & Log History (Right) -->
      <div class="student-wl-split-layout">
        <!-- Work Log Submission Form Card -->
        <div class="student-wl-form-card">
          <h3 class="student-wl-form-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00796B" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Log Working Hours
          </h3>

          <form id="worklog-form">
            <!-- 1. Select Project -->
            <div class="student-wl-form-group">
              <label for="log-project">Project <span style="color:#dc2626;">*</span></label>
              <select id="log-project" class="student-wl-select" required>
                <option value="" disabled ${!formProjectId ? 'selected' : ''}>-- Select Project --</option>
                ${projectOptionsHtml}
              </select>
            </div>

            <!-- 2. Select Assigned Task -->
            <div class="student-wl-form-group">
              <label for="log-task">
                <span>Assigned Task</span> <span style="color:#dc2626;">*</span>
              </label>
              <select id="log-task" class="student-wl-select" ${!formProjectId || loadingTasks ? 'disabled' : ''} required>
                ${loadingTasks ? `
                  <option value="">Loading your assigned tasks...</option>
                ` : !formProjectId ? `
                  <option value="">-- Select a project first --</option>
                ` : availableTasks.length === 0 ? `
                  <option value="">-- No active tasks assigned to you --</option>
                ` : `
                  <option value="">-- Select Assigned Task --</option>
                  ${availableTasks.map(t => `
                    <option value="${t.id}" ${String(formTaskId) === String(t.id) ? 'selected' : ''}>
                      ${t.isRework ? '[Rework Required] ' : ''}${t.code} — ${t.title} (${t.status})
                    </option>
                  `).join('')}
                `}
              </select>

              ${formProjectId && !loadingTasks && availableTasks.length === 0 ? `
                <div style="font-size: 0.74rem; color: #b45309; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>No active tasks assigned to you for this project. Completed tasks are hidden.</span>
                </div>
              ` : ''}
            </div>

            <!-- 3. Work Date -->
            <div class="student-wl-form-group">
              <label for="log-date">Work Date <span style="color:#dc2626;">*</span></label>
              <input type="date" id="log-date" class="student-wl-input" value="${formDate}" required>
            </div>

            <!-- 4. Hours Worked -->
            <div class="student-wl-form-group">
              <label for="log-hours">
                <span>Hours Worked</span> <span style="color:#dc2626;">*</span>
              </label>
              <input type="number" id="log-hours" class="student-wl-input" min="0.5" max="24" step="0.5" placeholder="e.g. 4.5" value="${formHours}" required>
  
            </div>

            <!-- 5. Work Description -->
            <div class="student-wl-form-group">
              <label for="log-desc">Work Description <span style="color:#dc2626;">*</span></label>
              <textarea id="log-desc" class="student-wl-textarea" placeholder="Briefly describe what tasks you implemented during these hours..." required>${formDescription}</textarea>
            </div>

            <button type="submit" id="btn-submit-worklog" class="student-wl-btn-submit" ${formSubmitting || (formProjectId && availableTasks.length === 0) ? 'disabled' : ''}>
              ${formSubmitting ? `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
                <span>Submitting Entry...</span>
              ` : `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Submit Log Entry</span>
              `}
            </button>
          </form>
        </div>

        <!-- Work Logs List Table Card -->
        <div class="student-wl-history-card">
          <div class="student-wl-history-header">
            <h3 class="student-wl-history-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00796B" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              Daily Log History
            </h3>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <button type="button" id="btn-table-download-csv" class="student-btn student-btn-outline student-btn-sm" style="font-size: 0.75rem; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px;" title="Export currently filtered table view as CSV">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>CSV</span>
              </button>
              <button type="button" id="btn-table-download-pdf" class="student-btn student-btn-outline student-btn-sm" style="font-size: 0.75rem; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px;" title="Export currently filtered table view as PDF Timesheet">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                <span>PDF</span>
              </button>
              <span class="student-badge student-badge-success" style="font-size: 0.78rem; font-weight: 800;">
                Filtered: ${filteredHours.toFixed(1)} hrs
              </span>
              <span class="student-badge student-badge-info" style="font-size: 0.78rem; font-weight: 800;">
                Scope Total: ${scopeTotalHours.toFixed(1)} hrs
              </span>
            </div>
          </div>

          <!-- Work Logs Filter Bar -->
          <div class="student-wl-filter-bar">
            <div class="student-wl-search-wrap">
              <svg class="student-wl-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="log-search-input" class="student-wl-search-input" placeholder="Search task, project, or description..." value="${logSearch}">
            </div>

            <select id="log-proj-filter" class="student-wl-select-filter">
              <option value="all" ${logProjectFilter === 'all' ? 'selected' : ''}>All Projects</option>
              ${logProjectFilterOptions}
            </select>

            <select id="log-status-filter" class="student-wl-select-filter">
              <option value="all" ${logStatusFilter === 'all' ? 'selected' : ''}>All Status</option>
              <option value="approved" ${logStatusFilter === 'approved' ? 'selected' : ''}>Approved</option>
              <option value="pending" ${logStatusFilter === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="rejected" ${logStatusFilter === 'rejected' ? 'selected' : ''}>Rejected</option>
            </select>

            ${isFiltersActive ? `
              <button type="button" id="btn-clear-log-filters" class="student-wl-btn-reset" title="Reset all filters">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Reset
              </button>
            ` : ''}
          </div>

          <!-- Table Wrap -->
          <div class="student-wl-table-wrap">
            <table class="student-wl-table">
              <thead>
                <tr>
                  <th style="width: 22%;">Date &amp; Project</th>
                  <th style="width: 26%;">Assigned Task</th>
                  <th style="width: 12%;">Hours</th>
                  <th style="width: 28%;">Description</th>
                  <th style="width: 12%; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${logRowsHtml || `
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 36px 20px;">
                      <div style="font-size: 1.75rem; margin-bottom: 6px;">⏰</div>
                      <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">No work log entries found</div>
                      <div style="font-size: 0.78rem; color: var(--text-muted);">Use the form on the left to record your daily working hours.</div>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    setupListeners();
  }

  function setupListeners() {
    const searchInput = container.querySelector('#log-search-input');
    searchInput?.addEventListener('input', (e) => {
      logSearch = e.target.value;
      render();
      const input = container.querySelector('#log-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });

    // Download Work Logs Modal & Quick Export Buttons
    container.querySelector('#btn-open-download-modal')?.addEventListener('click', () => {
      openDownloadModal();
    });

    container.querySelector('#btn-table-download-csv')?.addEventListener('click', () => {
      if (!filteredLogs.length) {
        showStudentWarning('No Logs to Export', 'There are no work log entries in the current filtered view.');
        return;
      }
      exportLogsToCSV(filteredLogs, scopeBadgeLabel);
      StudentSwal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Filtered CSV Downloaded!',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true
      });
    });

    container.querySelector('#btn-table-download-pdf')?.addEventListener('click', async () => {
      if (!filteredLogs.length) {
        showStudentWarning('No Logs to Export', 'There are no work log entries in the current filtered view.');
        return;
      }
      await exportLogsToPDF(filteredLogs, scopeBadgeLabel);
    });

    // Top Header Project Scope Switcher
    container.querySelector('#header-scope-select')?.addEventListener('change', (e) => {
      const selectedProj = e.target.value;
      logProjectFilter = selectedProj;
      
      // Auto-set the form's project if a specific project is selected
      const projects = getProjects() || [];
      if (selectedProj !== 'all') {
        const found = projects.find(p => p.title === selectedProj);
        if (found) {
          handleProjectSelection(found.id);
          return;
        }
      }
      render();
    });

    // Table Filter Project Dropdown
    container.querySelector('#log-proj-filter')?.addEventListener('change', (e) => {
      logProjectFilter = e.target.value;
      render();
    });

    container.querySelector('#log-status-filter')?.addEventListener('change', (e) => {
      logStatusFilter = e.target.value;
      render();
    });

    container.querySelector('#btn-clear-log-filters')?.addEventListener('click', () => {
      logSearch = '';
      logProjectFilter = 'all';
      logStatusFilter = 'all';
      render();
    });

    const projectSelect = container.querySelector('#log-project');
    projectSelect?.addEventListener('change', (e) => {
      handleProjectSelection(e.target.value);
    });

    const taskSelect = container.querySelector('#log-task');
    taskSelect?.addEventListener('change', (e) => {
      formTaskId = e.target.value;
    });

    const dateInput = container.querySelector('#log-date');
    dateInput?.addEventListener('change', (e) => {
      formDate = e.target.value;
    });

    const hoursInput = container.querySelector('#log-hours');
    hoursInput?.addEventListener('input', (e) => {
      formHours = e.target.value;
    });

    // Quick hour chips
    container.querySelectorAll('.btn-quick-hour').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.getAttribute('data-val');
        formHours = val;
        const hInp = container.querySelector('#log-hours');
        if (hInp) hInp.value = val;
      });
    });

    const descInput = container.querySelector('#log-desc');
    descInput?.addEventListener('input', (e) => {
      formDescription = e.target.value;
    });

    const workLogForm = container.querySelector('#worklog-form');
    workLogForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const projectId = formProjectId;
      const taskId = container.querySelector('#log-task')?.value || formTaskId;
      const date = container.querySelector('#log-date').value;
      const hours = container.querySelector('#log-hours').value;
      const description = container.querySelector('#log-desc').value.trim();

      if (!projectId) {
        StudentSwal.fire({
          icon: 'warning',
          title: 'Project Required',
          text: 'Please select a project.',
          confirmButtonColor: '#00796B'
        });
        return;
      }

      if (!taskId) {
        StudentSwal.fire({
          icon: 'warning',
          title: 'Task Required',
          text: 'Please select an assigned task.',
          confirmButtonColor: '#00796B'
        });
        return;
      }

      formSubmitting = true;
      render();

      try {
        await saveWorkLog({ projectId, taskId, date, hours, description });
        formHours = '';
        formDescription = '';
        formTaskId = '';
        formSubmitting = false;
        render();

        StudentSwal.fire({
          icon: 'success',
          title: 'Logged Successfully',
          text: `Logged ${hours} hours for task.`,
          confirmButtonColor: '#00796B'
        });
      } catch (err) {
        formSubmitting = false;
        render();
        StudentSwal.fire({
          icon: 'error',
          title: 'Error Logging Hours',
          text: err.message || 'Failed to submit work log.',
          confirmButtonColor: '#00796B'
        });
      }
    });
  }

  render();
  return container;
}

export default StudentWorkLogs;
