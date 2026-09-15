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
  container.className = 'student-portal-container animate-fade-in';

  const authStore = useAuthStore();
  const studentName = authStore.user?.name || 'Student';

  let activeCertificate = null;
  let certSearch = '';

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
    };
  }

  function render() {
    const certificates = (getCertificates() || []).map(normalizeCertificate);

    const filtered = certSearch.trim()
      ? certificates.filter((c) => {
          const q = certSearch.toLowerCase().trim();
          return (c.project || '').toLowerCase().includes(q)
            || (c.module || '').toLowerCase().includes(q)
            || (c.certificateNumber || '').toLowerCase().includes(q);
        })
      : certificates;

    const cards = filtered.map((c) => `
      <div class="cert-card-premium" data-id="${c.id}">
        <div class="cert-card-decoration"></div>
        <div class="cert-card-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin-bottom: 8px;">
            <circle cx="12" cy="8" r="7"></circle>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
          </svg>
          <span class="cert-badge-type">Project Completion Certificate</span>
        </div>
        <h3 class="cert-project-title">${escapeHtml(c.project)}</h3>

        <div class="cert-details-grid">
          <div class="cert-detail-item">
            <span class="cert-detail-lbl">Certificate No:</span>
            <span class="cert-detail-val">${escapeHtml(c.certificateNumber || '—')}</span>
          </div>
          <div class="cert-detail-item">
            <span class="cert-detail-lbl">Module:</span>
            <span class="cert-detail-val">${escapeHtml(c.module || '—')}</span>
          </div>
          <div class="cert-detail-item">
            <span class="cert-detail-lbl">Issue Date:</span>
            <span class="cert-detail-val">${escapeHtml(formatReadableDate(c.date))}</span>
          </div>
          <div class="cert-detail-item">
            <span class="cert-detail-lbl">Issued By:</span>
            <span class="cert-detail-val">${escapeHtml(c.issuer || '—')}</span>
          </div>
        </div>

        <div class="cert-actions-row">
          <button class="student-btn student-btn-primary student-btn-sm btn-view-cert" data-id="${c.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View Certificate
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="student-header">
        <h1>My Certificates</h1>
        <p>View, verify, and download official project completion certificates issued to you.</p>
      </div>

      ${certificates.length === 0 ? `
        <div class="student-card" style="text-align: center; padding: 48px 24px;">
          <div style="font-size: 3rem; margin-bottom: 16px;">🎓</div>
          <h3>No Certificates Yet</h3>
          <p style="color: var(--text-muted); max-width: 400px; margin: 8px auto 0;">
            Certificates issued to you by your coordinator will appear here once a completed module is certified.
          </p>
        </div>
      ` : `
        <div class="student-filter-bar">
          <div class="student-search-wrapper">
            <svg class="student-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="cert-search-input" class="student-search-input" placeholder="Search certificates by project, module, or certificate number..." value="${certSearch}">
          </div>
        </div>

        ${filtered.length === 0 ? `
          <div class="student-card">
            <div class="student-empty-filter">
              <div class="student-empty-filter-icon">🔍</div>
              <div class="student-empty-filter-text">No certificates match your search query</div>
            </div>
          </div>
        ` : `
          <div class="cert-grid-student">
            ${cards}
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

    container.querySelector('#cert-search-input')?.addEventListener('input', (e) => {
      certSearch = e.target.value;
      render();
      const newInput = container.querySelector('#cert-search-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    });

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

    const hideModal = () => {
      modal.style.display = 'none';
      activeCertificate = null;
    };

    closeBtn?.addEventListener('click', hideModal);
    closeActionBtn?.addEventListener('click', hideModal);
    modal?.querySelector('.cert-modal-overlay')?.addEventListener('click', hideModal);

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
