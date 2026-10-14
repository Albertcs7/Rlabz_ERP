import { API_BASE } from '@/core/config/api.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignDashboard(route, router) {
  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  let currentTab = 'projects'; // 'projects' | 'tokens' | 'components' | 'activity'
  const token = localStorage.getItem('token');

  let stats = {
    activeDesignTracks: 6,
    mockupsInReview: 7,
    designTokens: 48,
    figmaPrototypes: 6,
  };

  let projects = [
    {
      id: 1,
      title: 'Smart Campus IoT System',
      project_type: 'IoT Web Dashboard',
      status: 'in_progress',
      figma_url: 'https://www.figma.com/file/rlabz-design-system/smart-iot',
      progress_percentage: 85,
      screens_count: 18,
      lead_designer: 'Design Head',
      tags: ['Dark Mode', 'WebSockets', 'Telemetry Charts', 'Responsive']
    },
    {
      id: 2,
      title: 'Campus ERP Mobile Application',
      project_type: 'Mobile App (Flutter)',
      status: 'in_progress',
      figma_url: 'https://www.figma.com/file/rlabz-design-system/campus-erp',
      progress_percentage: 70,
      screens_count: 24,
      lead_designer: 'Design Head',
      tags: ['Mobile UI', 'Figma Wireframes', 'Biometric Flow', 'Design Tokens']
    },
    {
      id: 3,
      title: 'Automated Library Kiosk System',
      project_type: 'Touchscreen Kiosk UI',
      status: 'completed',
      figma_url: 'https://www.figma.com/file/rlabz-design-system/library-kiosk',
      progress_percentage: 100,
      screens_count: 14,
      lead_designer: 'Student Orbit',
      tags: ['Touch Interface', 'High Contrast', 'Large Target Areas', 'Slip Print UI']
    },
    {
      id: 4,
      title: 'Rajagiri ERP Executive Control Panel',
      project_type: 'Enterprise Web Portal',
      status: 'in_progress',
      figma_url: 'https://www.figma.com/file/rlabz-design-system/executive-panel',
      progress_percentage: 60,
      screens_count: 32,
      lead_designer: 'Design Head',
      tags: ['Executive KPIs', 'Audit Flow', 'Design System v2', 'Tailored Modals']
    }
  ];

  let assets = {
    colors: [
      { name: 'RLabZ Primary Emerald', hex: '#059669', token: '--primary', desc: 'Interactive buttons and active tab markers' },
      { name: 'Primary Hover Forest', hex: '#047857', token: '--primary-hover', desc: 'Hover states and active borders' },
      { name: 'Royal Billing Blue', hex: '#2563eb', token: '--accent-blue', desc: 'Financial invoices and metrics' },
      { name: 'Dark Slate Surface', hex: '#0f172a', token: '--bg-slate', desc: 'Dark theme canvas and contrasting headers' },
      { name: 'Card Surface Clean', hex: '#ffffff', token: '--bg-card', desc: 'Modular cards and elevation surfaces' },
      { name: 'Amber Warning Tag', hex: '#d97706', token: '--tag-amber', desc: 'Impending renewal alert tags' },
      { name: 'Crimson Alert Tag', hex: '#dc2626', token: '--tag-red', desc: 'Overdue task flags' },
    ],
    components: [
      { name: 'Rounded KPI Metric Card', version: 'v2.4', state: 'Production Ready', category: 'Data Display' },
      { name: 'Slide-Over Notification Drawer', version: 'v1.8', state: 'Production Ready', category: 'Overlays' },
      { name: 'Interactive Profile Tabs Sheet', version: 'v2.0', state: 'Production Ready', category: 'User Management' },
      { name: 'Financial Transaction Table Grid', version: 'v1.5', state: 'Production Ready', category: 'Data Grids' },
      { name: 'Accessible Multi-State Modal Dialog', version: 'v2.1', state: 'Production Ready', category: 'Feedback & Modals' },
    ]
  };

  let activities = [
    { id: 1, title: 'Mobile App High-Fidelity UI Screens', project: 'Campus ERP Mobile Application', author: 'Design Head', type: 'Figma Prototype', status: 'Approved' },
    { id: 2, title: 'IoT Telemetry Dark Mode Dashboard Spec', project: 'Smart Campus IoT System', author: 'Student Spark', type: 'UI Kit', status: 'In Review' },
    { id: 3, title: 'Touchscreen Kiosk Flow & Accessibility Audit', project: 'Automated Library Kiosk System', author: 'Student Orbit', type: 'UX Wireframe', status: 'Approved' },
    { id: 4, title: 'Executive Control Panel Navigation System', project: 'Rajagiri ERP Executive Control Panel', author: 'Design Head', type: 'Component Spec', status: 'Completed' }
  ];

  // Fetch live backend design data
  if (token) {
    try {
      const [dashRes, projRes, assetRes] = await Promise.all([
        fetch(`${API_BASE}/design/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/design/projects`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/design/assets`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (dashRes.ok) {
        const d = await dashRes.json();
        if (d.stats) stats = { ...stats, ...d.stats };
        if (d.activities) activities = d.activities;
      }
      if (projRes.ok) {
        const p = await projRes.json();
        if (p.data && p.data.length > 0) projects = p.data;
      }
      if (assetRes.ok) {
        const a = await assetRes.json();
        if (a.data) assets = a.data;
      }
    } catch (e) {
      console.warn('Design module using localized data:', e);
    }
  }

  function render() {
    container.innerHTML = `
      <!-- Header -->
      <div class="design-header">
        <div>
          <h1>Design Studio & Assets</h1>
          <p>Enterprise UI/UX Design System, Prototypes & Asset Governance</p>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="design-btn outline" id="btn-copy-tokens">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
            Copy Design Tokens
          </button>
          <button class="design-btn primary" id="btn-add-track">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Add Figma Prototype Track
          </button>
        </div>
      </div>

      <!-- KPI Strip -->
      <div class="design-kpi-grid">
        <div class="design-kpi-card blue">
          <div class="kpi-lbl">Active Design Tracks</div>
          <div class="kpi-num">${stats.activeDesignTracks}</div>
          <div class="kpi-sub">Across all ERP sprints</div>
        </div>
        <div class="design-kpi-card amber">
          <div class="kpi-lbl">Mockups In Review</div>
          <div class="kpi-num">${stats.mockupsInReview}</div>
          <div class="kpi-sub">Awaiting Design Head sign-off</div>
        </div>
        <div class="design-kpi-card green">
          <div class="kpi-lbl">Design System Tokens</div>
          <div class="kpi-num">${stats.designTokens || 48}</div>
          <div class="kpi-sub">Standardized CSS custom props</div>
        </div>
        <div class="design-kpi-card purple">
          <div class="kpi-lbl">Figma Prototypes</div>
          <div class="kpi-num">${stats.figmaPrototypes}</div>
          <div class="kpi-sub">Live synced deliverables</div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="design-tabs">
        <button class="design-tab-btn ${currentTab === 'projects' ? 'active' : ''}" data-tab="projects">
          UI/UX Project Tracks (${projects.length})
        </button>
        <button class="design-tab-btn ${currentTab === 'tokens' ? 'active' : ''}" data-tab="tokens">
          Design Tokens & Palette
        </button>
        <button class="design-tab-btn ${currentTab === 'components' ? 'active' : ''}" data-tab="components">
          Component Library (${assets.components?.length || 5})
        </button>
        <button class="design-tab-btn ${currentTab === 'activity' ? 'active' : ''}" data-tab="activity">
          Review Log & Activities
        </button>
      </div>

      <!-- Tab Content Outlet -->
      <div class="design-tab-content">
        ${renderTabContent()}
      </div>
    `;

    attachEvents();
  }

  function renderTabContent() {
    if (currentTab === 'projects') {
      return `
        <div class="design-projects-grid">
          ${projects.map(p => `
            <div class="design-card">
              <div class="design-card-top">
                <div class="design-card-title">${p.title}</div>
                <span class="design-type-badge">${p.project_type || 'Web App'}</span>
              </div>

              <div class="design-meta-row">
                <span>Lead: <strong>${p.lead_designer || 'Design Head'}</strong></span>
                <span>${p.screens_count || 16} Screens</span>
              </div>

              <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">
                <span>Design Sprint Progress</span>
                <span style="font-weight:700; color:var(--primary);">${p.progress_percentage || 50}%</span>
              </div>
              <div class="design-prog-bar">
                <div class="design-prog-fill" style="width: ${p.progress_percentage || 50}%;"></div>
              </div>

              <div class="design-tags-wrap">
                ${(p.tags || ['UI/UX', 'Figma', 'Tokens']).map(t => `<span class="design-pill-tag">${t}</span>`).join('')}
              </div>

              <div class="design-card-actions">
                <a href="${p.figma_url || '#'}" target="_blank" class="design-btn primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  Open in Figma
                </a>
                <button class="design-btn outline btn-review-track" data-id="${p.id}" data-title="${p.title}">
                  Submit Review
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (currentTab === 'tokens') {
      return `
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem;">Standard Color Palette</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.25rem;">
            Tailored semantic colors adhering to WCAG 2.1 AA accessibility contrast standards.
          </p>

          <div class="swatches-grid">
            ${(assets.colors || []).map(c => `
              <div class="swatch-card">
                <div class="swatch-color-preview" style="background: ${c.hex};"></div>
                <div class="swatch-info">
                  <div class="swatch-name">${c.name}</div>
                  <div class="swatch-hex">${c.hex}</div>
                  <span class="swatch-token">${c.token}</span>
                  <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 6px;">${c.desc || ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (currentTab === 'components') {
      return `
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; text-align: left;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase;">
                <th style="padding: 12px 16px;">Component Name</th>
                <th style="padding: 12px 16px;">Category</th>
                <th style="padding: 12px 16px;">Spec Version</th>
                <th style="padding: 12px 16px;">Status</th>
                <th style="padding: 12px 16px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${(assets.components || []).map(comp => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 14px 16px; font-weight: 600;">${comp.name}</td>
                  <td style="padding: 14px 16px; color: var(--text-muted);">${comp.category}</td>
                  <td style="padding: 14px 16px;"><span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${comp.version}</span></td>
                  <td style="padding: 14px 16px;"><span style="display:inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; background: rgba(5, 150, 105, 0.1); color: var(--primary);">${comp.state}</span></td>
                  <td style="padding: 14px 16px; text-align: right;">
                    <button class="design-btn outline sm btn-view-spec" data-name="${comp.name}">View Spec</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (currentTab === 'activity') {
      return `
        <div class="design-activity-list">
          ${activities.map(act => `
            <div class="design-act-item">
              <div>
                <div class="design-act-title">${act.title}</div>
                <div class="design-act-sub">Project: <strong>${act.project}</strong> • Author: ${act.author} • Type: ${act.type}</div>
              </div>
              <div>
                <span style="display:inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; background: ${act.status === 'Approved' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)'}; color: ${act.status === 'Approved' ? '#059669' : '#d97706'};">
                  ${act.status}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  function attachEvents() {
    // Tabs
    container.querySelectorAll('.design-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.getAttribute('data-tab');
        render();
      });
    });

    // Copy Tokens button
    container.querySelector('#btn-copy-tokens')?.addEventListener('click', () => {
      const tokensCss = `:root {\n  --primary: #059669;\n  --primary-hover: #047857;\n  --accent-blue: #2563eb;\n  --bg-slate: #0f172a;\n  --bg-card: #ffffff;\n  --tag-amber: #d97706;\n  --tag-red: #dc2626;\n}`;
      navigator.clipboard.writeText(tokensCss).then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Tokens Copied!',
          text: 'Design tokens CSS custom properties copied to clipboard.',
          timer: 1800,
          showConfirmButton: false
        });
      });
    });

    // Add Figma Track button
    container.querySelector('#btn-add-track')?.addEventListener('click', () => {
      Swal.fire({
        title: 'Add Design Prototype Track',
        html: `
          <div style="display:flex; flex-direction:column; gap:12px; text-align:left; font-size:0.88rem;">
            <div>
              <label style="font-weight:600;">Project Title</label>
              <input id="swal-track-title" class="swal2-input" placeholder="e.g. Healthcare Patient Portal" style="margin:4px 0; width:100%;">
            </div>
            <div>
              <label style="font-weight:600;">Figma Prototype / File URL</label>
              <input id="swal-track-url" class="swal2-input" placeholder="https://www.figma.com/file/..." style="margin:4px 0; width:100%;">
            </div>
            <div>
              <label style="font-weight:600;">Assigned Lead Designer</label>
              <input id="swal-track-lead" class="swal2-input" value="Design Head" style="margin:4px 0; width:100%;">
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Register Track',
        confirmButtonColor: '#059669',
        preConfirm: () => {
          const title = document.getElementById('swal-track-title').value.trim();
          const url = document.getElementById('swal-track-url').value.trim();
          const lead = document.getElementById('swal-track-lead').value.trim();
          if (!title) {
            Swal.showValidationMessage('Please enter a project title');
            return false;
          }
          return { title, url, lead };
        }
      }).then(res => {
        if (res.isConfirmed) {
          projects.unshift({
            id: Date.now(),
            title: res.value.title,
            project_type: 'Web & Mobile UI',
            status: 'in_progress',
            figma_url: res.value.url || 'https://www.figma.com',
            progress_percentage: 25,
            screens_count: 8,
            lead_designer: res.value.lead,
            tags: ['New Prototype', 'Design Review']
          });
          stats.activeDesignTracks += 1;
          render();
          Swal.fire({ icon: 'success', title: 'Track Added!', timer: 1500, showConfirmButton: false });
        }
      });
    });

    // Review buttons
    container.querySelectorAll('.btn-review-track').forEach(btn => {
      btn.addEventListener('click', () => {
        const title = btn.getAttribute('data-title');
        Swal.fire({
          title: `Submit Design Feedback: ${title}`,
          input: 'textarea',
          inputPlaceholder: 'Enter UI/UX review remarks, layout notes, or approval decisions...',
          showCancelButton: true,
          confirmButtonText: 'Approve & Sign Off',
          confirmButtonColor: '#059669',
          cancelButtonText: 'Request Revisions'
        }).then(result => {
          if (result.isConfirmed) {
            Swal.fire({ icon: 'success', title: 'Design Approved!', text: 'Approval logged in audit trail.', timer: 1800, showConfirmButton: false });
          } else if (result.dismiss === Swal.DismissReason.cancel && result.value) {
            Swal.fire({ icon: 'info', title: 'Revisions Requested', text: 'Comments sent to design sprint team.' });
          }
        });
      });
    });

    // View Spec
    container.querySelectorAll('.btn-view-spec').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        Swal.fire({
          title: name,
          html: `
            <div style="text-align:left; font-size:0.88rem; line-height:1.6;">
              <p><strong>Design System Specification:</strong> Built with responsive flexbox and CSS variables. Complies with accessibility guidelines.</p>
              <div style="background:#f1f5f9; padding:10px; border-radius:6px; font-family:monospace; margin-top:8px;">
                border-radius: var(--radius-lg);<br>
                box-shadow: 0 4px 16px rgba(0,0,0,0.03);<br>
                transition: transform 0.2s ease;
              </div>
            </div>
          `,
          confirmButtonColor: '#059669'
        });
      });
    });
  }

  render();
  return container;
}

export default DesignDashboard;
