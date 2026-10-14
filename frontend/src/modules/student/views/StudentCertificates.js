import { renderStudentSidebar } from './StudentSidebar.js';
import { getCertificates, ensureDataLoaded } from './studentStore.js';
import { useAuthStore } from '@/core/stores/auth.js';
import { StudentSwal } from '../studentAlerts.js';
import { buildCertificateHtml, downloadCertificatePdf, formatReadableDate, escapeHtml } from '@/modules/certificates/certificateTemplate.js';
import '../student.css';
import '@/modules/certificates/certificates.css';

export async function StudentCertificates(route, router) {
  await ensureDataLoaded();
  renderStudentSidebar();

  const container = document.createElement('div');
  container.className = 'student-portal-container animate-fade-in student-certificates-view';

  const authStore = useAuthStore();
  const studentName = authStore.user?.name || 'Student';

  let activeCertificate = null;
  let certSearch = '';
  let certSort = 'newest'; // 'newest' | 'oldest' | 'alpha'

  // Every certificate returned by /certificates/mine belongs to the
  // authenticated student by construction (backend-scoped by JWT subject),
  // so the recipient name is always the logged-in user — no `student`
  // relation needs to be loaded for this view.
  function normalizeCertificate(cert) {
    const facultyList = Array.isArray(cert.project?.faculty) ? cert.project.faculty : [];
    return {
      id: cert.id,
      student: studentName,
      project: cert.project?.title || 'Unknown project',
      module: cert.module?.module_name || '',
      certificateNumber: cert.certificate_number,
      description: cert.description,
      date: cert.issue_date,
      issuer: cert.issuer?.name || '',
      facultyNames: facultyList.map((f) => f.name).filter(Boolean).join(' and '),
      teamMembers: Array.isArray(cert.team_members) ? cert.team_members : [],
      developerName: cert.developer_name || null,
    };
  }

  function render() {
    const certificates = (getCertificates() || []).map(normalizeCertificate);

    // KPI summary (real counts — every certificate returned by the backend is
    // already an issued record, there is no draft/pending state in the schema)
    const totalCerts = certificates.length;
    const verifiedCerts = certificates.length;
    const distinctModules = new Set(certificates.map((c) => c.module).filter(Boolean)).size;

    let filtered = certSearch.trim()
      ? certificates.filter((c) => {
          const q = certSearch.toLowerCase().trim();
          return (c.project || '').toLowerCase().includes(q)
            || (c.module || '').toLowerCase().includes(q)
            || (c.certificateNumber || '').toLowerCase().includes(q)
            || (c.facultyNames || '').toLowerCase().includes(q);
        })
      : certificates.slice();

    filtered.sort((a, b) => {
      if (certSort === 'alpha') {
        return (a.project || '').localeCompare(b.project || '');
      }
      const getDateVal = (c) => {
        const t = c.date ? new Date(c.date).getTime() : 0;
        return Number.isNaN(t) ? 0 : t;
      };
      return certSort === 'oldest' ? getDateVal(a) - getDateVal(b) : getDateVal(b) - getDateVal(a);
    });

    const isFiltersActive = certSearch.trim() !== '' || certSort !== 'newest';

    const certificateCards = filtered.map((c) => `
      <div class="student-cert-card" data-id="${c.id}">
        <div>
          <div class="student-cert-card-header">
            <span class="student-cert-seal-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
              Verified Credential
            </span>
            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; font-family: monospace;">${escapeHtml(c.certificateNumber || '—')}</span>
          </div>

          <h3 class="student-cert-card-title">${escapeHtml(c.project)}</h3>
        </div>

        <div class="student-cert-details-grid">
          <div class="student-cert-detail-box">
            <span class="student-cert-detail-lbl">Module</span>
            <span class="student-cert-detail-val">${escapeHtml(c.module || '—')}</span>
          </div>
          <div class="student-cert-detail-box">
            <span class="student-cert-detail-lbl">Issue Date</span>
            <span class="student-cert-detail-val">${escapeHtml(formatReadableDate(c.date))}</span>
          </div>
          <div class="student-cert-detail-box">
            <span class="student-cert-detail-lbl">Issued By</span>
            <span class="student-cert-detail-val">${escapeHtml(c.issuer || '—')}</span>
          </div>
          <div class="student-cert-detail-box">
            <span class="student-cert-detail-lbl">Status</span>
            <span class="student-badge student-badge-success" style="font-size: 0.7rem; padding: 2px 6px;">Verified</span>
          </div>
        </div>

        <div class="student-cert-actions-row">
          <button type="button" class="student-cert-btn-view btn-view-cert" data-id="${c.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>View Certificate</span>
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <!-- Header Banner -->
      <div class="student-cert-header-wrapper">
        <div class="student-cert-header-left">
          <div class="student-cert-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="7"></circle>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </svg>
          </div>
          <div>
            <h1 class="student-cert-title">My Certificates</h1>
            <p class="student-cert-subtitle">View, verify, and download official certificates issued to you.</p>
          </div>
        </div>
      </div>

      <!-- KPI Summary Overview -->
      <div class="student-cert-kpi-grid">
        <div class="student-cert-kpi-card kpi-sidebar-primary">
          <div class="student-cert-kpi-icon primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
          </div>
          <div class="student-cert-kpi-info">
            <div class="student-cert-kpi-val">${totalCerts}</div>
            <div class="student-cert-kpi-lbl">Earned Certificates</div>
          </div>
        </div>

        <div class="student-cert-kpi-card kpi-purple">
          <div class="student-cert-kpi-icon purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div class="student-cert-kpi-info">
            <div class="student-cert-kpi-val">${verifiedCerts}</div>
            <div class="student-cert-kpi-lbl">Verified Credentials</div>
          </div>
        </div>

        <div class="student-cert-kpi-card kpi-indigo">
          <div class="student-cert-kpi-icon indigo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          </div>
          <div class="student-cert-kpi-info">
            <div class="student-cert-kpi-val">${distinctModules}</div>
            <div class="student-cert-kpi-lbl">Modules Certified</div>
          </div>
        </div>

        <div class="student-cert-kpi-card kpi-amber">
          <div class="student-cert-kpi-icon amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div class="student-cert-kpi-info">
            <div class="student-cert-kpi-val" style="font-size: 1.15rem;">${totalCerts > 0 ? 'Active' : 'Pending'}</div>
            <div class="student-cert-kpi-lbl">Issuance Status</div>
          </div>
        </div>
      </div>

      ${certificates.length === 0 ? `
        <div style="text-align: center; padding: 56px 24px; background: var(--surface-card); border: 1px dashed var(--border-subtle); border-radius: 18px;">
          <div style="font-size: 3rem; margin-bottom: 14px;">🎓</div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 6px;">No Certificates Yet</h3>
          <p style="color: var(--text-muted); max-width: 420px; margin: 0 auto; font-size: 0.88rem; line-height: 1.5;">
            Certificates issued to you by your coordinator will appear here once a completed module is certified.
          </p>
        </div>
      ` : `
        <!-- Filter & Search Bar -->
        <div class="student-cert-filter-bar">
          <div class="student-cert-search-box">
            <svg class="student-cert-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="cert-search-input" class="student-cert-search-input" placeholder="Search certificates by project, module, or certificate number..." value="${certSearch}">
          </div>

          <select id="cert-sort-select" class="student-cert-select">
            <option value="newest" ${certSort === 'newest' ? 'selected' : ''}>Sort: Newest Issued</option>
            <option value="oldest" ${certSort === 'oldest' ? 'selected' : ''}>Sort: Oldest</option>
            <option value="alpha" ${certSort === 'alpha' ? 'selected' : ''}>Sort: Alphabetical (A-Z)</option>
          </select>

          ${isFiltersActive ? `
            <button type="button" id="btn-clear-cert-filters" class="student-cert-btn-reset" title="Reset filters">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              Reset Filters
            </button>
          ` : ''}
        </div>

        ${filtered.length === 0 ? `
          <div style="text-align: center; padding: 48px 20px; background: var(--surface-card); border: 1px dashed var(--border-subtle); border-radius: 16px;">
            <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
            <div style="font-weight: 700; color: var(--text-primary); font-size: 1rem; margin-bottom: 4px;">No certificates match your search query</div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">Try searching by a different project title or clear your filters.</div>
            <button type="button" id="btn-empty-clear-cert" class="student-btn student-btn-outline student-btn-sm" style="margin: 0 auto;">
              Clear Search
            </button>
          </div>
        ` : `
          <div class="student-cert-grid">
            ${certificateCards}
          </div>
        `}
      `}

      <!-- Certificate Preview Modal (shared certificate design) -->
      <div class="cert-modal" id="cert-preview-modal" style="display: none;">
        <div class="cert-modal-overlay"></div>
        <div class="cert-modal-content">
          <button class="cert-modal-close" id="btn-close-modal">&times;</button>
          <div class="cert-modal-body">
            <div id="student-certificate-printable" class="certificate-sheet"></div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; width: 100%;">
            <button class="student-btn student-btn-outline" id="btn-modal-close-action">Close</button>
            <button class="student-btn student-btn-outline" id="btn-modal-copy-action">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy Verification Text</span>
            </button>
            <button class="student-btn student-btn-primary" id="btn-modal-download-action">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download Certificate
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind Event Listeners
    const searchInput = container.querySelector('#cert-search-input');
    searchInput?.addEventListener('input', (e) => {
      certSearch = e.target.value;
      render();
      const newInput = container.querySelector('#cert-search-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    });

    container.querySelector('#cert-sort-select')?.addEventListener('change', (e) => {
      certSort = e.target.value;
      render();
    });

    const clearCertFilters = () => {
      certSearch = '';
      certSort = 'newest';
      render();
    };
    container.querySelector('#btn-clear-cert-filters')?.addEventListener('click', clearCertFilters);
    container.querySelector('#btn-empty-clear-cert')?.addEventListener('click', clearCertFilters);

    container.querySelectorAll('.btn-view-cert').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const cert = filtered.find((c) => c.id === id) || certificates.find((c) => c.id === id);
        if (cert) {
          activeCertificate = cert;
          showModal(cert);
        }
      });
    });

    const modal = container.querySelector('#cert-preview-modal');
    const closeBtn = container.querySelector('#btn-close-modal');
    const closeActionBtn = container.querySelector('#btn-modal-close-action');
    const downloadActionBtn = container.querySelector('#btn-modal-download-action');
    const copyActionBtn = container.querySelector('#btn-modal-copy-action');

    const hideModal = () => {
      modal.style.display = 'none';
      activeCertificate = null;
    };

    closeBtn?.addEventListener('click', hideModal);
    closeActionBtn?.addEventListener('click', hideModal);
    modal?.querySelector('.cert-modal-overlay')?.addEventListener('click', hideModal);

    copyActionBtn?.addEventListener('click', () => {
      if (!activeCertificate) return;
      const c = activeCertificate;
      const text = `RLabZ Certificate of Completion\nRecipient: ${c.student}\nProject: ${c.project}${c.module ? `\nModule: ${c.module}` : ''}\nCertificate No: ${c.certificateNumber || '—'}\nIssue Date: ${formatReadableDate(c.date)}\nIssued By: ${c.issuer || '—'}`;
      navigator.clipboard?.writeText(text).then(() => {
        StudentSwal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Verification Info Copied!',
          text: `Certificate details for "${c.project}" copied.`,
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
      });
    });

    downloadActionBtn?.addEventListener('click', async (e) => {
      if (!activeCertificate) return;
      const btn = e.currentTarget;
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Generating...';
      try {
        const printable = container.querySelector('#student-certificate-printable');
        await downloadCertificatePdf(activeCertificate, printable);
        StudentSwal.fire({
          icon: 'success',
          title: 'Certificate Downloaded!',
          text: `Certificate for "${activeCertificate.project}" downloaded successfully as PDF.`,
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        });
      } catch (err) {
        console.error('Certificate PDF generation error:', err);
        StudentSwal.fire({
          icon: 'error',
          title: 'Download Failed',
          text: 'Failed to generate PDF certificate: ' + (err.message || 'Unknown error'),
        });
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    });

    function showModal(cert) {
      const printable = container.querySelector('#student-certificate-printable');
      printable.innerHTML = buildCertificateHtml(cert);
      modal.style.display = 'flex';
    }
  }

  render();
  return container;
}

export default StudentCertificates;
