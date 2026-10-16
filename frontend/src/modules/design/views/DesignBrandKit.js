import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignBrandKit(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let brandKitData = null;
  let selectedBrandKitKey = 'rlabz_core';
  let brandSearchQuery = '';

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
      const res = await fetch(`${API_BASE}/design/brand-kit`, { headers });
      if (res.ok) {
        brandKitData = await res.json();
      }
    } catch (e) {
      console.error('Error loading brand kit:', e);
    }
    render();
  }

  function render() {
    const kits = (brandKitData && brandKitData.brandKits) ? brandKitData.brandKits : [];
    const b = kits.find(k => k.id === selectedBrandKitKey) || kits[0] || brandKitData || {
      id: 'rlabz_core',
      name: 'RLabZ Core Platform Brand Kit',
      description: 'Default master brand kit for RLabZ internal digital products and student portal initiatives.',
      applicable_entity: 'RLabZ Academy / Digital Platforms',
      institution_or_client: 'RLabZ Foundation / Rajagiri',
      brandingPortalUrl: 'https://branding.rlabz.rajagiri.edu',
      brandColors: [],
      typography: [],
      guidelines: [],
      downloadableKits: [],
      is_active: true
    };

    const isCoreKit = (b.id === 'rlabz_core' || b.slug === 'rlabz_core');

    const filteredColors = (b.brandColors || []).filter(c => {
      if (!brandSearchQuery) return true;
      const q = brandSearchQuery.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.hex || '').toLowerCase().includes(q) || (c.usage || '').toLowerCase().includes(q);
    });

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <!-- Top Header & Search Bar -->
        <div style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Multi-Brand Kits &amp; Guidelines Library</h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">
              Maintain verified brand standards for RLabZ and external institutional clients. Link assets to briefs and deliverables.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div class="fin-search-wrap" style="min-width: 240px;">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="brand-search-input" class="fin-input" placeholder="Search brand tokens or assets..." value="${brandSearchQuery}">
            </div>

            <button class="fin-btn primary" id="btn-add-brand-kit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              + Add Brand Kit
            </button>
          </div>
        </div>

        <!-- Kit Selector Switcher Pills -->
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1.5rem;">
          ${kits.map(k => `
            <button class="brand-kit-pill ${k.id === selectedBrandKitKey ? 'active' : ''}" data-kit-id="${k.id}">
              <span>🎨</span>
              <span>${k.name}</span>
              ${k.is_active === false ? '<span style="font-size:0.68rem; opacity:0.8; margin-left:4px;">(Inactive)</span>' : ''}
            </button>
          `).join('')}
        </div>

        <!-- Active Brand Kit Banner & Governance Controls -->
        <div style="background: linear-gradient(135deg, #064e3b, #059669); color: #ffffff; border-radius: 14px; padding: 1.75rem; margin-bottom: 1.5rem; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1.25rem;">
          <div style="flex: 1; min-width: 280px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.5rem; flex-wrap: wrap;">
              <span style="background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 9999px; font-size: 0.74rem; font-weight: 700; text-transform: uppercase;">
                ${isCoreKit ? 'Default Master Brand Kit' : 'Institutional / Client Brand'}
              </span>
              <span style="background: ${b.is_active !== false ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.4)'}; padding: 3px 10px; border-radius: 9999px; font-size: 0.74rem; font-weight: 700;">
                ${b.is_active !== false ? '● Active' : '● Inactive'}
              </span>
              <span style="font-size: 0.78rem; opacity: 0.9;">
                Client/Institution: <strong>${b.institution_or_client || b.applicable_entity || 'RLabZ Global'}</strong>
              </span>
            </div>
            <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0 0 0.35rem 0;">${b.name}</h2>
            <p style="opacity: 0.92; margin: 0 0 0.75rem 0; font-size: 0.88rem; max-width: 680px; line-height: 1.45;">
              ${b.description || 'Verified brand assets, guidelines, and digital standards.'}
            </p>
            <div style="font-size: 0.78rem; opacity: 0.85;">
              Associated Entity: <strong>${b.applicable_entity || 'All Academic & Research Divisions'}</strong>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${b.brandingPortalUrl ? `
                <a href="${b.brandingPortalUrl}" target="_blank" class="design-btn" style="background: #ffffff; color: #065f46; font-weight: 700; padding: 0.55rem 1rem; font-size: 0.82rem;">
                  Official Branding Portal ↗
                </a>
              ` : ''}
              <button class="design-btn" id="btn-edit-active-brand" style="background: rgba(255,255,255,0.2); color: #ffffff; border: 1px solid rgba(255,255,255,0.3); font-weight: 600; padding: 0.55rem 1rem; font-size: 0.82rem;">
                ✏️ Edit Guidelines
              </button>
              ${!isCoreKit ? `
                <button class="design-btn" id="btn-toggle-active-status" style="background: ${b.is_active !== false ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}; color: #ffffff; border: 1px solid rgba(255,255,255,0.3); font-weight: 600; padding: 0.55rem 1rem; font-size: 0.82rem;">
                  ${b.is_active !== false ? 'Deactivate Kit' : 'Activate Kit'}
                </button>
              ` : ''}
            </div>
            <div style="font-size: 0.72rem; opacity: 0.75; text-align: right;">
              ${isCoreKit ? 'Master RLabZ brand kit is system protected' : 'External client identity kit'}
            </div>
          </div>
        </div>

        <!-- Official Branding Reference Notice -->
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; font-size: 0.8rem; color: #475569; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>🌐</span>
            <span><strong>RLabZ Reference Web:</strong> The official reference website is <a href="https://branding.rlabz.rajagiri.edu" target="_blank" style="color:#059669; font-weight:700;">branding.rlabz.rajagiri.edu</a>. The system stores complete in-ERP color swatches, typography, rules, and downloadable asset packs below.</span>
          </div>
          <span class="fin-badge neutral">Multi-Brand Enabled</span>
        </div>

        <!-- Color Swatches Grid -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: #0f172a;">Verified Brand Color Palette</h3>
          <span style="font-size: 0.8rem; color: #64748b;">${filteredColors.length} Approved Swatches</span>
        </div>

        <div class="brand-swatches-grid">
          ${filteredColors.map(c => `
            <div class="brand-swatch-box">
              <div class="swatch-color-header" style="background: ${c.hex};"></div>
              <div class="swatch-info-body">
                <div class="swatch-name">${c.name}</div>
                <div class="swatch-hex">${c.hex} · ${c.token || 'Hex'}</div>
                <p style="font-size: 0.75rem; color: #64748b; margin: 0.35rem 0 0 0;">${c.usage}</p>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Typography Guidelines -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0 0 1rem 0; color: #0f172a;">Typography Scale &amp; Rules</h3>
          <div style="display: grid; gap: 1rem;">
            ${(b.typography || []).map(ty => `
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem; flex-wrap: wrap; gap: 8px;">
                <div>
                  <strong style="color: #0f172a;">${ty.label}</strong>
                  <div style="font-size: 0.8rem; color: #64748b;">${ty.family} (${ty.weights})</div>
                </div>
                <span style="font-size: 0.8rem; color: #059669; font-weight: 600;">${ty.usage}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Logo Usage Rules & Guidelines -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0 0 1rem 0; color: #0f172a;">Logo Usage Rules &amp; Creative Do's / Don'ts</h3>
          ${(b.guidelines && b.guidelines.length > 0) ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
              ${b.guidelines.map(g => {
                const topic = (typeof g === 'object' && g && g.topic) ? g.topic : 'Brand Standard';
                const rule = (typeof g === 'object' && g && g.rule) ? g.rule : (typeof g === 'string' ? g : '');
                return `
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.85rem; color: #0f172a; margin-bottom: 4px;">
                      <span>📌</span>
                      <span>${topic}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #475569; line-height: 1.45;">${rule}</div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 1.5rem; text-align: center; color: #64748b; font-size: 0.85rem;">
              No specific usage rules recorded for this brand kit yet.
            </div>
          `}
        </div>

        <!-- Downloadable Master Kits -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0 0 1rem 0; color: #0f172a;">Downloadable Official Asset Packages</h3>
          ${(b.downloadableKits && b.downloadableKits.length > 0) ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
              ${b.downloadableKits.map(k => {
                const title = (typeof k === 'object' && k && k.title) ? k.title : (typeof k === 'string' ? k : 'Official Asset Package');
                const format = (typeof k === 'object' && k && k.format) ? k.format : '';
                const fileSize = (typeof k === 'object' && k && k.file_size) ? k.file_size : '';
                const meta = [format, fileSize].filter(Boolean).join(' · ') || 'Digital Asset';
                const isAvailable = Boolean(typeof k === 'object' && k && k.is_available && k.url);
                const note = (typeof k === 'object' && k && k.note) ? k.note : '';
                const url = (typeof k === 'object' && k && k.url) ? k.url : null;

                return `
                  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                        <h4 style="margin: 0 0 0.35rem 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">${title}</h4>
                        ${isAvailable ? `<span class="fin-badge success">Verified</span>` : `<span class="fin-badge neutral">Available Soon</span>`}
                      </div>
                      <p style="font-size: 0.78rem; color: #64748b; margin: 0;">${meta}</p>
                      ${note ? `<div style="font-size: 0.72rem; color: #d97706; margin-top: 5px; font-weight: 600;">${note}</div>` : ''}
                    </div>
                    ${isAvailable && url ? `
                      <a href="${url}" download target="_blank" class="fin-btn primary sm" style="margin-top: 1rem; width: 100%; text-align: center; justify-content: center; text-decoration: none;">
                        Download Asset Package
                      </a>
                    ` : `
                      <button disabled class="fin-btn outline sm" style="margin-top: 1rem; width: 100%; opacity: 0.6; cursor: not-allowed; justify-content: center;">
                        Pending Upload
                      </button>
                    `}
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 2rem; text-align: center; color: #64748b; font-size: 0.85rem;">
              No downloadable official asset packages uploaded for this brand kit yet.
            </div>
          `}
        </div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    container.querySelectorAll('.brand-kit-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedBrandKitKey = btn.dataset.kitId;
        render();
      });
    });

    const searchInp = container.querySelector('#brand-search-input');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        brandSearchQuery = e.target.value;
        render();
      });
    }

    // + Add Brand Kit Modal
    const addBtn = container.querySelector('#btn-add-brand-kit');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        const { value: formValues } = await Swal.fire({
          title: 'Add New Brand Kit',
          width: '650px',
          html: `
            <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
              <div>
                <label style="font-size:0.8rem; font-weight:700;">Brand Kit Name <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <input id="swal-bk-name" class="swal2-input" placeholder="e.g. Acme Health Client Brand Kit" style="margin:0; width:100%;">
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                  <label style="font-size:0.8rem; font-weight:700;">Institution / External Client <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <input id="swal-bk-client" class="swal2-input" placeholder="e.g. Acme Health Solutions" style="margin:0; width:100%;">
                </div>
                <div>
                  <label style="font-size:0.8rem; font-weight:700;">Applicable Entity / Division</label>
                  <input id="swal-bk-entity" class="swal2-input" placeholder="e.g. Healthcare & Training" style="margin:0; width:100%;">
                </div>
              </div>
              <div>
                <label style="font-size:0.8rem; font-weight:700;">Official Branding Portal URL</label>
                <input id="swal-bk-portal" class="swal2-input" placeholder="https://branding.client.com" style="margin:0; width:100%;">
              </div>
              <div>
                <label style="font-size:0.8rem; font-weight:700;">Brand Description / Overview</label>
                <textarea id="swal-bk-desc" class="swal2-textarea" placeholder="Describe the identity guidelines, tone of voice, and visual character..." style="margin:0; width:100%; height:70px;"></textarea>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                  <label style="font-size:0.8rem; font-weight:700;">Primary Brand Color (Hex)</label>
                  <input id="swal-bk-color1" class="swal2-input" value="#1E3A8A" placeholder="#1E3A8A" style="margin:0; width:100%;">
                </div>
                <div>
                  <label style="font-size:0.8rem; font-weight:700;">Secondary Accent Color (Hex)</label>
                  <input id="swal-bk-color2" class="swal2-input" value="#3B82F6" placeholder="#3B82F6" style="margin:0; width:100%;">
                </div>
              </div>
            </div>
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Create Brand Kit',
          confirmButtonColor: '#059669',
          preConfirm: () => {
            const name = document.getElementById('swal-bk-name').value.trim();
            const client = document.getElementById('swal-bk-client').value.trim();
            const portal = document.getElementById('swal-bk-portal').value.trim();

            if (!name) {
              Swal.showValidationMessage('Brand Kit Name is required');
              return false;
            }
            if (portal && !portal.match(/^https?:\/\//i)) {
              Swal.showValidationMessage('Branding portal URL must be a valid URL starting with http:// or https://');
              return false;
            }

            const color1 = document.getElementById('swal-bk-color1').value.trim() || '#1E3A8A';
            const color2 = document.getElementById('swal-bk-color2').value.trim() || '#3B82F6';

            return {
              name,
              institution_or_client: client || 'Internal / RLabZ',
              applicable_entity: document.getElementById('swal-bk-entity').value.trim() || client || 'RLabZ Global',
              branding_portal_url: portal || null,
              description: document.getElementById('swal-bk-desc').value.trim() || 'Custom institutional brand guidelines and assets.',
              brand_colors: [
                { name: 'Primary Identity', hex: color1, token: 'Primary', usage: 'Dominant headers, key brand buttons, and hero elements' },
                { name: 'Secondary Accent', hex: color2, token: 'Accent', usage: 'Supporting highlights, badges, and background patterns' },
                { name: 'Pure White', hex: '#FFFFFF', token: 'Surface', usage: 'Card backgrounds and high-contrast typography' }
              ],
              typography: [
                { label: 'Display & Headlines', family: 'Plus Jakarta Sans', weights: '700 Bold, 800 ExtraBold', usage: 'Cover titles and advertising slogans' },
                { label: 'Body Copy & Paragraphs', family: 'Inter', weights: '400 Regular, 500 Medium', usage: 'Standard documentation and editorial reading' }
              ],
              guidelines: [
                { topic: 'Logo Isolation', rule: 'Maintain minimum 20% clearspace around the primary logo at all times.' },
                { topic: 'Color Consistency', rule: 'Only use verified hex tokens in production deliverables.' }
              ],
              downloadable_kits: [
                { title: 'Vector Logos & Marks (.SVG, .AI)', format: 'Vector Pack', file_size: '4.2 MB', is_available: true, url: '#' }
              ]
            };
          }
        });

        if (formValues) {
          try {
            const res = await fetch(`${API_BASE}/design/brand-kits`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(formValues)
            });
            const data = await res.json();
            if (data.status === 'success') {
              toast(data.message, 'success');
              selectedBrandKitKey = data.kit_id;
              await loadData();
            } else {
              toast(data.message || 'Error creating brand kit', 'error');
            }
          } catch (e) {
            console.error(e);
            toast('Network error creating brand kit', 'error');
          }
        }
      });
    }

    // Edit Active Brand Kit
    const editBtn = container.querySelector('#btn-edit-active-brand');
    if (editBtn) {
      editBtn.addEventListener('click', async () => {
        const kits = (brandKitData && brandKitData.brandKits) ? brandKitData.brandKits : [];
        const currentKit = kits.find(k => k.id === selectedBrandKitKey) || kits[0];
        if (!currentKit) return;

        const { value: formValues } = await Swal.fire({
          title: `Edit ${currentKit.name}`,
          width: '650px',
          html: `
            <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
              <div>
                <label style="font-size:0.8rem; font-weight:700;">Brand Kit Name</label>
                <input id="swal-edit-name" class="swal2-input" value="${currentKit.name || ''}" style="margin:0; width:100%;">
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                  <label style="font-size:0.8rem; font-weight:700;">Institution / External Client</label>
                  <input id="swal-edit-client" class="swal2-input" value="${currentKit.institution_or_client || currentKit.applicable_entity || ''}" style="margin:0; width:100%;">
                </div>
                <div>
                  <label style="font-size:0.8rem; font-weight:700;">Applicable Entity / Division</label>
                  <input id="swal-edit-entity" class="swal2-input" value="${currentKit.applicable_entity || ''}" style="margin:0; width:100%;">
                </div>
              </div>
              <div>
                <label style="font-size:0.8rem; font-weight:700;">Official Branding Portal URL</label>
                <input id="swal-edit-portal" class="swal2-input" value="${currentKit.brandingPortalUrl || ''}" style="margin:0; width:100%;">
              </div>
              <div>
                <label style="font-size:0.8rem; font-weight:700;">Description &amp; Guidelines Summary</label>
                <textarea id="swal-edit-desc" class="swal2-textarea" style="margin:0; width:100%; height:75px;">${currentKit.description || ''}</textarea>
              </div>
            </div>
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Save Changes',
          confirmButtonColor: '#059669',
          preConfirm: () => {
            const name = document.getElementById('swal-edit-name').value.trim();
            const portal = document.getElementById('swal-edit-portal').value.trim();
            if (!name) {
              Swal.showValidationMessage('Brand Kit Name is required');
              return false;
            }
            if (portal && !portal.match(/^https?:\/\//i)) {
              Swal.showValidationMessage('Branding portal URL must be a valid URL starting with http:// or https://');
              return false;
            }
            return {
              name,
              institution_or_client: document.getElementById('swal-edit-client').value.trim(),
              applicable_entity: document.getElementById('swal-edit-entity').value.trim(),
              branding_portal_url: portal || null,
              description: document.getElementById('swal-edit-desc').value.trim()
            };
          }
        });

        if (formValues) {
          try {
            const res = await fetch(`${API_BASE}/design/brand-kits/${currentKit.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(formValues)
            });
            const data = await res.json();
            if (data.status === 'success') {
              toast(data.message, 'success');
              await loadData();
            } else {
              toast(data.message || 'Error updating brand kit', 'error');
            }
          } catch (e) {
            console.error(e);
            toast('Network error updating brand kit', 'error');
          }
        }
      });
    }

    // Toggle Brand Kit Active/Inactive Status
    const toggleBtn = container.querySelector('#btn-toggle-active-status');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', async () => {
        const kits = (brandKitData && brandKitData.brandKits) ? brandKitData.brandKits : [];
        const currentKit = kits.find(k => k.id === selectedBrandKitKey) || kits[0];
        if (!currentKit) return;

        try {
          const res = await fetch(`${API_BASE}/design/brand-kits/${currentKit.id}/status`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.status === 'success') {
            toast(data.message, 'success');
            await loadData();
          } else {
            toast(data.message || 'Failed to toggle status', 'error');
          }
        } catch (e) {
          console.error(e);
          toast('Network error toggling status', 'error');
        }
      });
    }
  }

  await loadData();
  return container;
}

export default DesignBrandKit;
