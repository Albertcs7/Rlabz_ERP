import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import { renderPagination, setupPaginationListeners } from '../utils/pagination.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignReports(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let reportData = null;
  let searchQuery = '';
  let currentPage = 1;
  const itemsPerPage = 8;

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
      const res = await fetch(`${API_BASE}/design/reports`, { headers }).then(r => r.ok ? r.json() : null);
      if (res && res.status === 'success') {
        reportData = res;
      }
    } catch (e) {
      console.error('Error loading design reports:', e);
    }
    render();
  }

  function exportCSV() {
    if (!reportData) return;
    const m = reportData.metrics || {};
    const divData = reportData.byDivision || {};
    const turnData = reportData.turnaroundByType || {};
    const revData = reportData.revisionsByRequester || [];

    let csv = 'RLabZ ERP - Design Operations & SLA Performance Report\n';
    csv += `Generated At,${new Date().toISOString()}\n\n`;

    csv += 'KEY SLA METRICS\n';
    csv += `On-Time Delivery Rate,${m.onTimePercentage || 0}%\n`;
    csv += `Average Revision Rounds,${m.avgRevisionRounds || 0}\n`;
    csv += `Total Requests,${m.totalRequests || 0}\n`;
    csv += `Active Pipeline Requests,${m.activeRequests || 0}\n\n`;

    csv += 'TURNAROUND TIME BY WORK TYPE (DAYS)\n';
    csv += 'Work Type,Average Days\n';
    Object.entries(turnData).forEach(([k, v]) => {
      csv += `"${k.replace('_', ' ').toUpperCase()}",${v}\n`;
    });
    csv += '\n';

    csv += 'VOLUME BY REQUESTING DIVISION\n';
    csv += 'Division,Requests Count\n';
    Object.entries(divData).forEach(([k, v]) => {
      csv += `"${k}",${v}\n`;
    });
    csv += '\n';

    csv += 'REVISION DRIVERS BY REQUESTER\n';
    csv += 'Requester,Tickets Raised,Total Revisions,Avg Revisions/Ticket\n';
    revData.forEach(r => {
      const avg = r.tickets_raised > 0 ? (r.total_revisions / r.tickets_raised).toFixed(1) : '0';
      csv += `"${r.name}",${r.tickets_raised},${r.total_revisions},${avg}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `design_sla_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast('CSV Export downloaded successfully');
  }

  function printPDF() {
    window.print();
  }

  function render() {
    const m = reportData?.metrics || {
      onTimePercentage: 88,
      avgRevisionRounds: 1.4,
      totalRequests: 0,
      activeRequests: 0
    };

    const byDiv = reportData?.byDivision || {};
    const turnaround = reportData?.turnaroundByType || {};
    const allRequesters = (reportData?.revisionsByRequester || []).filter(r => {
      if (!searchQuery) return true;
      return (r.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    });

    const totalRequesters = allRequesters.length;
    const maxPages = Math.ceil(totalRequesters / itemsPerPage) || 1;
    if (currentPage > maxPages) currentPage = maxPages;
    const requesters = allRequesters.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const maxTurnaround = Math.max(...Object.values(turnaround).map(Number), 5);
    const maxDivCount = Math.max(...Object.values(byDiv).map(Number), 5);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Page Header & Action Controls -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Design Operations &amp; SLA Reports</h2>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">
                Turnaround analysis, on-time delivery percentages, revision velocity, and division volume metrics.
              </p>
            </div>

            <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
              <button id="export-csv-btn" class="fin-btn" style="padding: 0.5rem 0.9rem; font-size: 0.82rem; background: #059669; color: #ffffff; border: none; font-weight: 600;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export CSV
              </button>
              <button id="print-pdf-btn" class="fin-btn" style="padding: 0.5rem 0.9rem; font-size: 0.82rem; background: #f8fafc; border: 1px solid #cbd5e1; color: #334155; font-weight: 600;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print / Save PDF
              </button>
              <button id="refresh-reports-btn" class="fin-btn" style="padding: 0.5rem 0.9rem; font-size: 0.82rem; background: #f8fafc; border: 1px solid #cbd5e1; color: #334155;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- 4 Key SLA Metric Cards (Finance Pattern) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">On-Time Delivery Rate</div>
            <div style="font-size: 2rem; font-weight: 900; color: #059669; margin: 0.35rem 0;">${m.onTimePercentage}%</div>
            <div style="font-size: 0.78rem; color: #64748b;">Against committed designer dates</div>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Avg Revision Rounds</div>
            <div style="font-size: 2rem; font-weight: 900; color: #d97706; margin: 0.35rem 0;">${m.avgRevisionRounds}</div>
            <div style="font-size: 0.78rem; color: #64748b;">Target: &le; 1.5 rounds per ticket</div>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Historical Volume</div>
            <div style="font-size: 2rem; font-weight: 900; color: #0284c7; margin: 0.35rem 0;">${m.totalRequests}</div>
            <div style="font-size: 0.78rem; color: #64748b;">All created design briefs</div>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Active Workload Pipeline</div>
            <div style="font-size: 2rem; font-weight: 900; color: #7c3aed; margin: 0.35rem 0;">${m.activeRequests}</div>
            <div style="font-size: 0.78rem; color: #64748b;">In progress, review, or queued</div>
          </div>
        </div>

        <!-- 2 Side-by-Side Breakdown Charts -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 1.25rem;">
          <!-- Turnaround by Work Type -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.05rem; font-weight: 800; color: #0f172a;">Average Turnaround Time</h3>
            <p style="margin: 0 0 1.25rem 0; font-size: 0.82rem; color: #64748b;">Average turnaround duration from creation to sign-off (in calendar days):</p>

            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${Object.entries(turnaround).map(([type, days]) => {
                const label = type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
                const pct = maxTurnaround > 0 ? Math.min(100, Math.round((days / maxTurnaround) * 100)) : 10;
                return `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 600; color: #334155; margin-bottom: 4px;">
                      <span>${label}</span>
                      <span style="font-weight: 800; color: #0f172a;">${days} Days</span>
                    </div>
                    <div style="height: 10px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
                      <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #00bfa5, #059669); border-radius: 9999px;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Volume by Requesting Division -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.05rem; font-weight: 800; color: #0f172a;">Request Volume by Division</h3>
            <p style="margin: 0 0 1.25rem 0; font-size: 0.82rem; color: #64748b;">Distribution of design requests raised across academic &amp; institutional units:</p>

            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${Object.entries(byDiv).length === 0 ? `
                <div style="color: #94a3b8; font-size: 0.85rem; padding: 1rem 0;">No division data recorded yet.</div>
              ` : Object.entries(byDiv).map(([divName, count]) => {
                const pct = maxDivCount > 0 ? Math.min(100, Math.round((count / maxDivCount) * 100)) : 10;
                return `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 600; color: #334155; margin-bottom: 4px;">
                      <span style="text-transform: capitalize;">${divName}</span>
                      <span style="font-weight: 800; color: #0f172a;">${count} Requests</span>
                    </div>
                    <div style="height: 10px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
                      <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #3b82f6, #6366f1); border-radius: 9999px;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Requester Revision Drivers Table with Finance Search Bar -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a;">Revision Analysis by Requester</h3>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.84rem;">
                Identifies which departments or requesters generate multiple revision loops to optimize initial briefing clarity.
              </p>
            </div>

            <!-- Finance-styled Search Bar -->
            <div class="fin-search-wrap" style="min-width: 260px;">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="requester-search-input" class="fin-input" placeholder="Search requesters..." value="${searchQuery}">
            </div>
          </div>

          <table class="design-data-table">
            <thead>
              <tr>
                <th>Requester Name</th>
                <th>Tickets Raised</th>
                <th>Total Revision Cycles</th>
                <th>Avg Revisions / Ticket</th>
                <th>Revision Velocity</th>
              </tr>
            </thead>
            <tbody>
              ${requesters.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align: center; padding: 2rem; color: #94a3b8;">
                    No requester revision data matches your query.
                  </td>
                </tr>
              ` : requesters.map(r => {
                const avg = r.tickets_raised > 0 ? (r.total_revisions / r.tickets_raised).toFixed(1) : '0.0';
                const isHigh = parseFloat(avg) > 2.0;
                return `
                  <tr>
                    <td style="font-weight: 700; color: #0f172a;">${r.name || 'Unknown'}</td>
                    <td><span style="font-weight: 600;">${r.tickets_raised}</span> tickets</td>
                    <td><span style="font-weight: 700; color: #d97706;">${r.total_revisions}</span> revisions</td>
                    <td style="font-weight: 800; color: ${isHigh ? '#e11d48' : '#059669'};">${avg}</td>
                    <td>
                      ${isHigh ? `
                        <span style="background: #ffe4e6; color: #e11d48; font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 4px;">
                          High Revision Driver
                        </span>
                      ` : `
                        <span style="background: #dcfce7; color: #16a34a; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 4px;">
                          Within SLA Target
                        </span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div id="requesters-pagination-container">
            ${renderPagination(totalRequesters, currentPage, itemsPerPage)}
          </div>
        </div>
      </div>
    `;

    // Bind event listeners
    const searchInput = container.querySelector('#requester-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      render();
      const el = container.querySelector('#requester-search-input');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });

    setupPaginationListeners(container.querySelector('#requesters-pagination-container'), (newPage) => {
      currentPage = newPage;
      render();
    });

    const exportBtn = container.querySelector('#export-csv-btn');
    exportBtn?.addEventListener('click', exportCSV);

    const printBtn = container.querySelector('#print-pdf-btn');
    printBtn?.addEventListener('click', printPDF);

    const refreshBtn = container.querySelector('#refresh-reports-btn');
    refreshBtn?.addEventListener('click', () => {
      loadData();
      toast('Reports data refreshed');
    });
  }

  await loadData();
  return container;
}
