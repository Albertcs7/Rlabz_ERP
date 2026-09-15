import html2pdf from 'html2pdf.js';

const LOGO_SRC = '/assets/RlabZ_Logo.png';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

/**
 * Formats a date value (ISO timestamp, date-only string, etc.) as a readable
 * date like "1 July 2026" instead of a raw ISO string. Falls back to the
 * original value if it can't be parsed.
 */
export function formatReadableDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Appends the word "module" only if the module name doesn't already contain
 * it, avoiding duplicated wording like "Sensor Integration Module module".
 */
function moduleClause(moduleName) {
  const trimmed = String(moduleName || '').trim();
  if (!trimmed) return '';
  return /\bmodule\b/i.test(trimmed) ? trimmed : `${trimmed} module`;
}

function buildCertificateSentence(certificate) {
  const supervisionClause = certificate.facultyNames
    ? ` under the supervision of ${escapeHtml(certificate.facultyNames)} and Co-ordinators`
    : ' under the supervision of the project Co-ordinators';

  if (certificate.module) {
    const moduleText = moduleClause(certificate.module);
    return `Proudly presented to <strong>${escapeHtml(certificate.student)}</strong> for successfully completing the <strong>${escapeHtml(moduleText)}</strong> and actively contributing to the project <strong>${escapeHtml(certificate.project)}</strong>${supervisionClause}.`;
  }

  return `Proudly presented to <strong>${escapeHtml(certificate.student)}</strong> for actively contributing to the project <strong>${escapeHtml(certificate.project)}</strong>${supervisionClause}.`;
}

/**
 * Builds the full certificate document markup (logo, title, recipient,
 * sentence, footer signatures) shared by both the coordinator preview and
 * the student dashboard preview, so the design only needs to be maintained
 * in one place. Expects `certificate` in the normalized shape used by
 * CertificatesHome.js's normalizeCertificate(): { student, project, module,
 * certificateNumber, description, date, issuer, facultyNames }.
 */
export function buildCertificateHtml(certificate) {
  const sentence = buildCertificateSentence(certificate);
  const readableDate = formatReadableDate(certificate.date);

  return `
    <div class="certificate-sheet-inner">
      <img src="${LOGO_SRC}" alt="RLabZ" class="certificate-logo" />

      <div class="certificate-body">
        <div class="certificate-title">CERTIFICATE OF COMPLETION</div>
        <div class="certificate-subtitle">This is to certify that</div>
        <div class="certificate-student-name">${escapeHtml(certificate.student)}</div>
        <div class="certificate-sentence">${sentence}</div>
      </div>

      <div class="certificate-footer">
        <div class="certificate-footer-col">
          <div class="certificate-footer-line"></div>
          <div class="certificate-footer-label">${escapeHtml(certificate.facultyNames || '—')}</div>
          <div class="certificate-footer-role">Faculty / Supervisor</div>
        </div>

        <div class="certificate-footer-center">
          <div><strong>Certificate No:</strong> ${escapeHtml(certificate.certificateNumber || '—')}</div>
          <div><strong>Issue Date:</strong> ${escapeHtml(readableDate)}</div>
        </div>

        <div class="certificate-footer-col">
          <div class="certificate-footer-line"></div>
          <div class="certificate-footer-label">${escapeHtml(certificate.issuer || 'Director')}</div>
          <div class="certificate-footer-role">Director / Issuing Authority</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates and downloads the certificate PDF from an already-rendered
 * printable element (the `.certificate-sheet` wrapping buildCertificateHtml's
 * output). Same html2pdf settings previously used by the coordinator preview.
 */
export async function downloadCertificatePdf(certificate, printableElement) {
  const sanitizedStudent = String(certificate.student || 'Student').replace(/\s+/g, '_');
  const sanitizedSubject = String(certificate.module || certificate.project || 'Certificate').replace(/\s+/g, '_');
  const filename = `Certificate_${sanitizedStudent}_${sanitizedSubject}.pdf`;

  await html2pdf().set({
    margin: 0.2,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['avoid-all'] },
  }).from(printableElement).save();
}
