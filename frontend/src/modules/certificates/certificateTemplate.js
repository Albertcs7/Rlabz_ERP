import html2pdf from 'html2pdf.js';

const LOGO_SRC = '/assets/RlabZ_Logo.png';
// Icon-only mark (no wordmark) — used for the decorative side watermark so a
// half-crop never shows illegible cut-off text, only the swirl shape.
const WATERMARK_SRC = '/assets/RlabZ_Watermark.png';

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
 * Builds the natural-language certification sentence, in a fixed
 * PERSON → MODULE → PROJECT → UNDER/TEAM order, from real certificate fields
 * only — no hardcoded values. The original app wording is preserved
 * ("Proudly presented to ... for successfully completing ... and actively
 * contributing to the project ..."), only reordered/kept in this order and
 * with the trailing clause pointed at the real project team
 * (certificate.teamMembers — every student on project_student for this
 * project, plus module_student for this module when known; computed
 * server-side by Certificate::getTeamMembersAttribute()) instead of faculty,
 * since there is no separate "team name" field/table anywhere in the schema
 * and faculty supervision is a different, distinct relationship from "the
 * team the student worked under". "under the supervision of" was adjusted to
 * "under the project team of" since teammates don't supervise one another —
 * flagged for review.
 */
function buildCertificateSentence(certificate) {
  const teamText = Array.isArray(certificate.teamMembers) && certificate.teamMembers.length
    ? certificate.teamMembers.join(', ')
    : null;
  const underClause = teamText ? ` under the project team of ${escapeHtml(teamText)}` : '';

  if (certificate.module) {
    const moduleText = moduleClause(certificate.module);
    return `Proudly presented to <strong>${escapeHtml(certificate.student)}</strong> for successfully completing the <strong>${escapeHtml(moduleText)}</strong> and actively contributing to the project <strong>${escapeHtml(certificate.project)}</strong>${underClause}.`;
  }

  return `Proudly presented to <strong>${escapeHtml(certificate.student)}</strong> for actively contributing to the project <strong>${escapeHtml(certificate.project)}</strong>${underClause}.`;
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

/**
 * Builds the full certificate document markup (logo, title, recipient,
 * certification sentence, footer signatures, decorative watermark) shared by
 * both the coordinator preview and the student dashboard preview, so the
 * design only needs to be maintained in one place. Expects `certificate` in
 * the normalized shape used by CertificatesHome.js's normalizeCertificate():
 * { student, project, module, certificateNumber, description, date, issuer,
 * facultyNames, teamMembers, developerName }.
 */
export function buildCertificateHtml(certificate) {
  const sentence = buildCertificateSentence(certificate);
  const readableDate = formatReadableDate(certificate.date);

  return `
    <div class="certificate-sheet-inner">
      <img src="${WATERMARK_SRC}" alt="" aria-hidden="true" class="certificate-watermark" />
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
          <div class="certificate-footer-role">Director Head</div>
        </div>

        <div class="certificate-footer-center">
          <div><strong>Certificate No:</strong> ${escapeHtml(certificate.certificateNumber || '—')}</div>
          <div><strong>Issue Date:</strong> ${escapeHtml(readableDate)}</div>
        </div>

        <div class="certificate-footer-col">
          <div class="certificate-footer-line"></div>
          <div class="certificate-footer-role">Developer</div>
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
