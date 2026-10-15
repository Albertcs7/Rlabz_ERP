import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
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
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <!-- Header & Search/Filter Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Approved Asset Archive &amp; Library</h2>
              <span class="fin-badge dark-green">${filtered.length} Archived</span>
            </div>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">
              Verified, approved creative deliverables preserved for direct reusability and cloning.
            </p>
          </div>

          <div class="search-filter-wrap" style="flex: 1; max-width: 760px; justify-content: flex-end;">
            <div class="fin-search-wrap" style="flex: 1; min-width: 200px;">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="asset-search-input" class="fin-input" placeholder="Search title, brand, or tags..." value="${assetSearchQuery}">
            </div>

            <select id="asset-project-filter" class="design-select">
              <option value="all" ${assetFilterProject === 'all' ? 'selected' : ''}>All Projects</option>
              ${availableProjects.map(p => `<option value="${p.id}" ${assetFilterProject == p.id ? 'selected' : ''}>${p.title}</option>`).join('')}
            </select>

            <select id="asset-work-filter" class="design-select">
              <option value="all" ${assetFilterWorkType === 'all' ? 'selected' : ''}>All Types</option>
              <option value="poster" ${assetFilterWorkType === 'poster' ? 'selected' : ''}>Poster</option>
              <option value="social_creative" ${assetFilterWorkType === 'social_creative' ? 'selected' : ''}>Social Media</option>
              <option value="video_motion" ${assetFilterWorkType === 'video_motion' ? 'selected' : ''}>Video / Reel</option>
              <option value="presentation" ${assetFilterWorkType === 'presentation' ? 'selected' : ''}>Presentation</option>
            </select>

            <select id="asset-division-filter" class="design-select">
              <option value="all" ${assetFilterDivision === 'all' ? 'selected' : ''}>All Divisions</option>
              <option value="Teaching & Academics" ${assetFilterDivision === 'Teaching & Academics' ? 'selected' : ''}>Teaching &amp; Academics</option>
              <option value="Training & Placement" ${assetFilterDivision === 'Training & Placement' ? 'selected' : ''}>Training &amp; Placement</option>
              <option value="Design & Branding" ${assetFilterDivision === 'Design & Branding' ? 'selected' : ''}>Design &amp; Branding</option>
              <option value="AI-Ops Division" ${assetFilterDivision === 'AI-Ops Division' ? 'selected' : ''}>AI-Ops Division</option>
            </select>
          </div>
        </div>

        <!-- Compact Asset Grid (Requirement 9) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;">
          ${filtered.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: #94a3b8;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📂</div>
              No approved assets match your search or filter criteria.
            </div>
          ` : filtered.map(a => `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 1px 3px rgba(0,0,0,0.03); transition: transform 0.15s ease, box-shadow 0.15s ease;">
              <!-- Compact Thumbnail Preview (110px max height) -->
              <div style="height: 110px; background: #0f172a; position: relative; overflow: hidden;">
                <img src="${a.preview_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600'}" alt="${a.title}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.95;">
                <span style="position: absolute; top: 6px; right: 6px; background: rgba(15, 23, 42, 0.85); color: #ffffff; font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 9999px; backdrop-filter: blur(4px);">
                  Reused ${a.usage_count || 0}x
                </span>
                <span style="position: absolute; bottom: 6px; left: 6px; background: rgba(15, 23, 42, 0.75); color: #cbd5e1; font-size: 0.65rem; font-weight: 600; padding: 2px 6px; border-radius: 4px;">
                  ${workTypeLabels[a.work_type] || a.work_type}
                </span>
              </div>

              <!-- Compact Body with Truncated Meta -->
              <div style="padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; flex: 1;">
                <h4 style="margin: 0; font-size: 0.88rem; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${a.title}">
                  ${a.title}
                </h4>

                <div style="font-size: 0.74rem; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
                  <span>${a.division || 'General'}</span>
                  ${a.ticket_number ? `<span style="font-family: monospace; font-weight: 700; color: #2563eb;">${a.ticket_number}</span>` : ''}
                </div>

                <div style="display: flex; gap: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                  <span class="asset-brand-badge" style="font-size: 0.68rem; padding: 1px 6px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    🎨 ${a.brand_kit_name || 'RLabZ Brand'}
                  </span>
                  ${a.project_title ? `
                    <span class="asset-project-badge" style="font-size: 0.68rem; padding: 1px 6px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      📁 ${a.project_title}
                    </span>
                  ` : ''}
                </div>

                <!-- Compact Action Area -->
                <div style="margin-top: auto; padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; gap: 4px; align-items: center;">
                  <button class="fin-btn outline sm btn-preview-asset" data-id="${a.id}" style="padding: 3px 8px; font-size: 0.72rem;" title="Quick Preview & Details">
                    Preview
                  </button>
                  <button class="fin-btn primary sm btn-clone-asset" data-id="${a.id}" style="flex: 1; justify-content: center; padding: 3px 6px; font-size: 0.72rem;">
                    Clone
                  </button>
                  ${a.deliverable_url ? `
                    <a href="${a.deliverable_url}" download target="_blank" class="fin-btn outline sm" style="padding: 3px 8px; font-size: 0.72rem;" title="Download Deliverable">
                      Export
                    </a>
                  ` : ''}
                  ${a.source_file_url ? `
                    <a href="${a.source_file_url}" download target="_blank" class="fin-btn outline sm" style="padding: 3px 6px; font-size: 0.72rem; background:#f8fafc;" title="Download Source File">
                      Source
                    </a>
                  ` : ''}
                </div>
              </div>
            </div>
          `).join('')}
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
        render();
      });
    }

    container.querySelector('#asset-project-filter')?.addEventListener('change', (e) => {
      assetFilterProject = e.target.value;
      render();
    });

    container.querySelector('#asset-work-filter')?.addEventListener('change', (e) => {
      assetFilterWorkType = e.target.value;
      render();
    });

    container.querySelector('#asset-division-filter')?.addEventListener('change', (e) => {
      assetFilterDivision = e.target.value;
      render();
    });

    // Preview Asset Modal (Expandable Secondary Details)
    container.querySelectorAll('.btn-preview-asset').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const a = assetsList.find(x => x.id == id);
        if (!a) return;

        Swal.fire({
          title: a.title,
          width: '700px',
          html: `
            <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
              <div style="background:#0f172a; border-radius:8px; overflow:hidden; max-height:360px; text-align:center;">
                <img src="${a.preview_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000'}" alt="${a.title}" style="max-height:360px; max-width:100%; object-fit:contain;">
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
                ${a.deliverable_url ? `
                  <a href="${a.deliverable_url}" download target="_blank" class="fin-btn primary sm" style="flex:1; justify-content:center;">
                    Download Deliverable
                  </a>
                ` : ''}
                ${a.source_file_url ? `
                  <a href="${a.source_file_url}" download target="_blank" class="fin-btn outline sm" style="flex:1; justify-content:center;">
                    Download Source File
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
