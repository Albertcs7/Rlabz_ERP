import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import { renderPagination, setupPaginationListeners } from '../utils/pagination.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignAssets(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let assetsList = [];
  let availableProjects = [];

  let assetSearchQuery = '';
  let assetFilterProject = 'all';
  let assetFilterWorkType = 'all';
  let assetFilterDivision = 'all';
  let currentPage = 1;
  const itemsPerPage = 6;

  const workTypeLabels = {
    poster: 'Poster / Graphic',
    social_creative: 'Social Media',
    video_motion: 'Video / Motion',
    presentation: 'Presentation',
    other: 'Other Work'
  };

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
      const [assetRes, brandRes] = await Promise.all([
        fetch(`${API_BASE}/design/assets`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/design/brand-kit`, { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (assetRes && assetRes.status === 'success') assetsList = assetRes.data || [];
      if (brandRes && brandRes.status === 'success') availableProjects = brandRes.availableProjects || [];
    } catch (e) {
      console.error('Error loading assets:', e);
    }
    render();
  }

  function render() {
    const filtered = assetsList.filter(a => {
      if (assetFilterProject !== 'all' && a.project_id != assetFilterProject) return false;
      if (assetFilterWorkType !== 'all' && a.work_type !== assetFilterWorkType) return false;
      if (assetFilterDivision !== 'all' && a.division !== assetFilterDivision) return false;
      if (assetSearchQuery) {
        const q = assetSearchQuery.toLowerCase();
        const tags = (a.tags || []).join(' ').toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          (a.project_title && a.project_title.toLowerCase().includes(q)) ||
          (a.brand_kit_name && a.brand_kit_name.toLowerCase().includes(q)) ||
          tags.includes(q)
        );
      }
      return true;
    });

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03); width: 100%; box-sizing: border-box;">
        <!-- Header -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h2 style="margin: 0; font-size: 1.45rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">Approved Asset Archive &amp; Library</h2>
              <span class="fin-badge dark-green" style="font-weight: 700; font-size: 0.78rem;">${filtered.length} Archived</span>
            </div>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">
              Verified, approved creative deliverables preserved for direct reusability and cloning.
            </p>
          </div>
        </div>

        <!-- Full-Width Filter & Search Toolbar -->
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 1.5rem; width: 100%; box-sizing: border-box;">
          <div class="fin-search-wrap" style="flex: 2; min-width: 220px;">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="asset-search-input" class="fin-input" style="width: 100%; background: #ffffff;" placeholder="Search title, brand, or tags..." value="${assetSearchQuery}">
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap; flex: 3; min-width: 320px;">
            <select id="asset-project-filter" class="design-select" style="flex: 1; min-width: 130px; background: #ffffff;">
              <option value="all" ${assetFilterProject === 'all' ? 'selected' : ''}>All Projects</option>
              ${availableProjects.map(p => `<option value="${p.id}" ${assetFilterProject == p.id ? 'selected' : ''}>${p.title}</option>`).join('')}
            </select>

            <select id="asset-work-filter" class="design-select" style="flex: 1; min-width: 120px; background: #ffffff;">
              <option value="all" ${assetFilterWorkType === 'all' ? 'selected' : ''}>All Types</option>
              <option value="poster" ${assetFilterWorkType === 'poster' ? 'selected' : ''}>Poster</option>
              <option value="social_creative" ${assetFilterWorkType === 'social_creative' ? 'selected' : ''}>Social Media</option>
              <option value="video_motion" ${assetFilterWorkType === 'video_motion' ? 'selected' : ''}>Video / Reel</option>
              <option value="presentation" ${assetFilterWorkType === 'presentation' ? 'selected' : ''}>Presentation</option>
            </select>

            <select id="asset-division-filter" class="design-select" style="flex: 1; min-width: 130px; background: #ffffff;">
              <option value="all" ${assetFilterDivision === 'all' ? 'selected' : ''}>All Divisions</option>
              <option value="Teaching & Academics" ${assetFilterDivision === 'Teaching & Academics' ? 'selected' : ''}>Teaching &amp; Academics</option>
              <option value="Training & Placement" ${assetFilterDivision === 'Training & Placement' ? 'selected' : ''}>Training &amp; Placement</option>
              <option value="Design & Branding" ${assetFilterDivision === 'Design & Branding' ? 'selected' : ''}>Design &amp; Branding</option>
              <option value="AI-Ops Division" ${assetFilterDivision === 'AI-Ops Division' ? 'selected' : ''}>AI-Ops Division</option>
            </select>
          </div>
        </div>

        <!-- Responsive Full-Width Asset Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; width: 100%; box-sizing: border-box;">
          ${filtered.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: #94a3b8; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📂</div>
              <strong style="color: #475569; display: block; margin-bottom: 4px;">No approved assets match your criteria</strong>
              <span style="font-size: 0.85rem;">Try modifying your search query or selecting a different project/type filter.</span>
            </div>
          ` : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(a => `
            <div class="fin-asset-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease; width: 100%; box-sizing: border-box;">
              <!-- Card Thumbnail Preview (175px height, object-fit: cover, elegant overlays) -->
              <div style="height: 175px; background: #0f172a; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                <img src="${a.preview_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600'}" alt="${a.title}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600';" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.95; transition: transform 0.3s ease;">
                <span style="position: absolute; top: 10px; right: 10px; background: rgba(15, 23, 42, 0.85); color: #ffffff; font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 9999px; backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.15);">
                  Reused ${a.usage_count || 0}x
                </span>
                <span style="position: absolute; bottom: 10px; left: 10px; background: rgba(15, 23, 42, 0.8); color: #e2e8f0; font-size: 0.68rem; font-weight: 600; padding: 3px 8px; border-radius: 5px; backdrop-filter: blur(4px);">
                  ${workTypeLabels[a.work_type] || a.work_type}
                </span>
              </div>

              <!-- Card Body with Meta -->
              <div style="padding: 14px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
                <h4 style="margin: 0; font-size: 0.92rem; font-weight: 700; color: #0f172a; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${a.title}">
                  ${a.title}
                </h4>

                <div style="font-size: 0.76rem; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
                  <span>${a.division || 'General'}</span>
                  ${a.ticket_number ? `<span style="font-family: monospace; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 1px 6px; border-radius: 4px;">${a.ticket_number}</span>` : ''}
                </div>

                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  <span class="asset-brand-badge" style="font-size: 0.7rem; padding: 2px 7px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    🎨 ${a.brand_kit_name || 'RLabZ Brand'}
                  </span>
                  ${a.project_title ? `
                    <span class="asset-project-badge" style="font-size: 0.7rem; padding: 2px 7px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      📁 ${a.project_title}
                    </span>
                  ` : ''}
                </div>

                <!-- Clean Card Action Area -->
                <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; gap: 8px; align-items: center;">
                  <button class="fin-btn outline sm btn-preview-asset" data-id="${a.id}" style="padding: 5px 10px; font-size: 0.76rem;" title="Quick Preview & Details">
                    Preview
                  </button>
                  <button class="fin-btn primary sm btn-clone-asset" data-id="${a.id}" style="flex: 1; justify-content: center; padding: 5px 10px; font-size: 0.76rem;">
                    Clone
                  </button>
                  ${(a.deliverable_url || a.source_file_url) ? `
                    <a href="${a.deliverable_url || a.source_file_url}" download target="_blank" class="fin-btn outline sm" style="padding: 5px 10px; font-size: 0.76rem; text-decoration: none;" title="Export Deliverable">
                      Export
                    </a>
                  ` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <div id="assets-pagination-container" style="margin-top: 1.5rem;">
          ${renderPagination(filtered.length, currentPage, itemsPerPage)}
        </div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    const searchInp = container.querySelector('#asset-search-input');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        assetSearchQuery = e.target.value;
        currentPage = 1;
        render();
      });
    }

    container.querySelector('#asset-project-filter')?.addEventListener('change', (e) => {
      assetFilterProject = e.target.value;
      currentPage = 1;
      render();
    });

    container.querySelector('#asset-work-filter')?.addEventListener('change', (e) => {
      assetFilterWorkType = e.target.value;
      currentPage = 1;
      render();
    });

    container.querySelector('#asset-division-filter')?.addEventListener('change', (e) => {
      assetFilterDivision = e.target.value;
      currentPage = 1;
      render();
    });

    // Pagination
    setupPaginationListeners(container.querySelector('#assets-pagination-container'), (page) => {
      currentPage = page;
      render();
    });

    // Preview Asset Modal (Expandable Secondary Details)
    container.querySelectorAll('.btn-preview-asset').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const a = assetsList.find(x => x.id == id);
        if (!a) return;

        const isVideo = a.work_type === 'video_motion' || (a.deliverable_url && a.deliverable_url.match(/\.(mp4|webm|mov|ogg|m4v)$/i)) || (a.preview_url && a.preview_url.match(/\.(mp4|webm|mov|ogg|m4v)$/i));
        const mediaSource = a.preview_url || a.deliverable_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000';

        Swal.fire({
          title: a.title,
          width: '700px',
          html: `
            <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
              <div style="background:#0f172a; border-radius:8px; overflow:hidden; max-height:360px; min-height:180px; display:flex; align-items:center; justify-content:center; text-align:center;">
                ${isVideo ? `
                  <video src="${mediaSource}" controls autoplay style="max-height:360px; max-width:100%; object-fit:contain; border-radius:6px;"></video>
                ` : `
                  <img src="${mediaSource}" alt="${a.title}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';" style="max-height:360px; max-width:100%; object-fit:contain;">
                `}
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.82rem; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                <div><strong>Work Type:</strong> ${workTypeLabels[a.work_type] || a.work_type}</div>
                <div><strong>Division:</strong> ${a.division || 'General'}</div>
                <div><strong>Brand Kit:</strong> ${a.brand_kit_name || 'RLabZ'}</div>
                <div><strong>Project:</strong> ${a.project_title || 'General'}</div>
                <div><strong>Source Ticket:</strong> ${a.ticket_number || 'Direct Archive'}</div>
                <div><strong>Reuse Count:</strong> ${a.usage_count || 0} times</div>
              </div>
              <div>
                <label style="font-size:0.8rem; font-weight:700;">Tags & Keywords</label>
                <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
                  ${(a.tags || []).map(t => `<span class="skill-tag-pill">${t}</span>`).join('')}
                </div>
              </div>
              <div style="display:flex; gap:8px; margin-top:8px;">
                ${(a.deliverable_url || a.source_file_url) ? `
                  <a href="${a.deliverable_url || a.source_file_url}" download target="_blank" class="fin-btn primary sm" style="flex:1; justify-content:center;">
                    Export Deliverable File
                  </a>
                ` : ''}
              </div>
            </div>
          `,
          showCloseButton: true,
          showConfirmButton: false
        });
      });
    });

    // Clone Asset to Request
    container.querySelectorAll('.btn-clone-asset').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          const res = await fetch(`${API_BASE}/design/assets/${id}/clone`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.status === 'success') {
            toast(data.message, 'success');
            // Save cloned brief to sessionStorage and navigate to Design Requests page
            sessionStorage.setItem('rlabz_cloned_brief', JSON.stringify(data.clonedBrief));
            router.push('/design/requests');
          }
        } catch (e) {
          console.error(e);
        }
      });
    });
  }

  await loadData();
  return container;
}

export default DesignAssets;
