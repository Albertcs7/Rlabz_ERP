import { useAuthStore } from '@/core/stores/auth.js';
import { API_BASE } from '@/core/config/api.js';
import Swal from 'sweetalert2';
import { renderStudentSidebar, updateStudentNavbarAvatar, updateTopBarAvatar } from '@/modules/student/views/StudentSidebar.js';
import { getStudentProfilePhoto, saveStudentProfilePhoto, removeStudentProfilePhoto } from '@/modules/student/views/studentStore.js';
import { profilePhotoUrl } from '@/core/shared/profilePhoto.js';
import { mountProfilePhotoEditor } from '@/core/shared/components/ProfilePhotoEditor.js';
import '../userProfile.css';

export async function UserProfile(route, router) {
  const container = document.createElement('div');
  container.className = 'profile-page-shell animate-fade-in';

  const authStore = useAuthStore();
  if (authStore.role === 'student' || window.location.pathname.startsWith('/student')) {
    renderStudentSidebar();
  }
  const token = localStorage.getItem('token');

  let activeTab = 'profile'; // 'profile' | 'edit' | 'security' | 'projects'
  let showCurrentPass = false;
  let showNewPass = false;
  let showConfirmPass = false;

  function getEyeIcon(isVisible) {
    if (isVisible) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pass-eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="4"></circle></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pass-eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="23" x2="23" y2="1"></line></svg>`;
  }

  const isStudentRole = authStore.role === 'student' || window.location.pathname.startsWith('/student');
  const studentInitialPhoto = isStudentRole ? getStudentProfilePhoto(authStore.user) : null;

  let profileUser = {
    id: authStore.user?.id || 1,
    name: authStore.user?.name || authStore.user?.username || 'User',
    email: authStore.user?.email || 'user@rajagiri.edu',
    role: authStore.role || 'Member',
    phone: authStore.user?.phone || '',
    bio: authStore.user?.bio || '',
    location: authStore.user?.location || 'Kochi, Kerala, India',
    department: authStore.user?.department || (authStore.role === 'finance' ? 'Finance & Accounts' : ''),
    // Students keep their existing photo source; every other role uses only the
    // server-side profile photo (users.profile_photo_path), never users.avatar.
    avatar: isStudentRole
      ? (studentInitialPhoto || authStore.user?.avatar || null)
      : (authStore.user?.profile_photo_url || null),
    created_at: authStore.user?.created_at || null,
  };

  let teams = [];

  // Fetch live profile from backend if available
  if (token) {
    try {
      const endpoint = isStudentRole ? `${API_BASE}/student/profile` : `${API_BASE}/auth/profile`;
      const res = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const body = await res.json();
        const liveUser = body.user || body;
        if (liveUser && liveUser.name) {
          profileUser = { ...profileUser, ...liveUser };
          if (studentInitialPhoto) {
            profileUser.avatar = studentInitialPhoto;
          }
          if (!isStudentRole) {
            profileUser.avatar = 'profile_photo_path' in liveUser
              ? profilePhotoUrl(liveUser.profile_photo_path)
              : (authStore.user?.profile_photo_url || null);
          }
        }
        if (body.user?.role !== 'finance' && body.teams && body.teams.length > 0) {
          teams = body.teams;
        } else if (Array.isArray(body.projects) && body.projects.length > 0) {
          teams = body.projects;
        } else {
          teams = [];
        }
      }
    } catch (e) {
      console.warn('Could not fetch live profile:', e);
    }
  }

  function getInitials(name) {
    return (name || 'User')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function render() {
    const roleLabel = (profileUser.role || 'Member').replace('_', ' ').toUpperCase();
    const initials = getInitials(profileUser.name);
    const joinDate = profileUser.created_at ? new Date(profileUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'March, 2024';
    const isStudent = authStore.role === 'student' || window.location.pathname.startsWith('/student');
    const isFinancePath = window.location.pathname.startsWith('/finance');
    const isDesignPath = window.location.pathname.startsWith('/design');
    const homeLabel = isStudent ? 'Student Portal' : (isFinancePath ? 'Finance Portal' : (isDesignPath ? 'Design Studio' : 'Homepage'));
    const homeHref = isStudent ? '/student' : (isFinancePath ? '/finance' : (isDesignPath ? '/design' : '/'));

    container.innerHTML = `
      <!-- Breadcrumb -->
      <div class="profile-breadcrumb">
        <a href="${homeHref}" data-link>${homeLabel}</a>
        <span class="sep">/</span>
        <span>My Profile & Security</span>
      </div>

      <!-- Hero Profile Header -->
      <div class="profile-hero-card">
        <div class="profile-hero-top">
          <div class="profile-hero-user">
            <div class="profile-avatar-container" style="position: relative; width: 90px; height: 90px; flex-shrink: 0;">
              <div class="profile-avatar-wrap" id="user-avatar-wrap" title="Click to change photo in Edit Details" style="cursor: pointer; width: 100%; height: 100%;">
                ${profileUser.avatar
                  ? `<img src="${profileUser.avatar}" alt="${profileUser.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><span class="profile-avatar-fallback" style="display:none;">${initials}</span>`
                  : `<span class="profile-avatar-fallback">${initials}</span>`
                }
                <span class="profile-avatar-badge" title="Online & Active"></span>
              </div>
              <button type="button" class="profile-avatar-camera-btn" id="btn-hero-cam" title="Change Profile Photo (Edit Details)" style="position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; border-radius: 50%; background: #009688; color: #fff; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.18); padding: 0; z-index: 2;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              </button>
            </div>
            <input type="file" id="hero-avatar-file-input" accept="image/png, image/jpeg, image/jpg, image/webp" style="display: none;" />
            <div class="profile-hero-details">
              <h1>${profileUser.name}</h1>
              <div class="profile-hero-sub">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>Active session • Verified Rajagiri Member</span>
              </div>
              <div class="profile-hero-stats">
                <span class="profile-role-pill">${roleLabel}</span>
                ${profileUser.role === 'finance'
                  ? `<span><strong>All Projects</strong> (Finance Scope)</span>`
                  : `<span><strong>${teams.length}</strong> Associated Projects</span>`
                }
                <span><strong>Active</strong> Status</span>
              </div>
            </div>
          </div>

          <div class="profile-hero-actions">
            <button class="prof-btn primary" id="btn-hero-edit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              ${activeTab === 'edit' ? 'Viewing Form' : 'Edit Profile'}
            </button>
            <button class="prof-btn secondary" id="btn-hero-security">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Change Password
            </button>
          </div>
        </div>

        <!-- Navigation Tabs Bar -->
        <div class="profile-tabs-bar">
          <button class="profile-tab-item ${activeTab === 'profile' ? 'active' : ''}" data-tab="profile">
            Profile Overview
          </button>
          <button class="profile-tab-item ${activeTab === 'edit' ? 'active' : ''}" data-tab="edit">
            Edit Details
          </button>
          <button class="profile-tab-item ${activeTab === 'security' ? 'active' : ''}" data-tab="security">
            Security & Password
          </button>
          ${profileUser.role !== 'finance' ? `
            <button class="profile-tab-item ${activeTab === 'projects' ? 'active' : ''}" data-tab="projects">
              Teams & Projects (${teams.length})
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Main Body 2-Column Grid -->
      <div class="profile-main-grid">
        <!-- Left Column: Dynamic Content -->
        <div class="profile-left-col">
          ${renderTabContent()}
        </div>

        <!-- Right Column: Contact Information -->
        <div class="profile-right-col">
          <div class="profile-card">
            <div class="profile-card-header">
              <span>Contact information</span>
            </div>

            <div class="contact-info-list">
              <div class="contact-info-row">
                <div class="contact-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <div class="contact-info-content">
                  <span class="contact-info-label">Location</span>
                  <span class="contact-info-val">${profileUser.location || 'Kochi, Kerala, India'}</span>
                </div>
              </div>

              <div class="contact-info-row">
                <div class="contact-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22.01"></line><line x1="15" y1="22" x2="15" y2="22.01"></line><line x1="12" y1="18" x2="12" y2="18.01"></line></svg>
                </div>
                <div class="contact-info-content">
                  <span class="contact-info-label">Department</span>
                  <span class="contact-info-val">${profileUser.department || (profileUser.role === 'finance' ? 'Finance & Accounts' : 'General')}</span>
                </div>
              </div>

              <div class="contact-info-row">
                <div class="contact-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <div class="contact-info-content">
                  <span class="contact-info-label">Email Address</span>
                  <span class="contact-info-val">${profileUser.email}</span>
                </div>
              </div>

              <div class="contact-info-row">
                <div class="contact-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <div class="contact-info-content">
                  <span class="contact-info-label">Phone</span>
                  <span class="contact-info-val">${profileUser.phone || '+91 9800000010'}</span>
                </div>
              </div>
            </div>

            <div class="contact-footer-note">
              On RLabZ from ${joinDate}
            </div>
          </div>
        </div>
      </div>
    `;

    attachEvents();
  }

  function renderTabContent() {
    if (activeTab === 'profile') {
      return `
        <!-- About User Section -->
        <div class="profile-card">
          <div class="profile-card-header">
            <span>About user</span>
            <button class="prof-btn secondary" id="btn-quick-edit" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;">
              Edit Bio
            </button>
          </div>
          <p class="profile-bio-text" style="${!profileUser.bio ? 'color: var(--text-muted); font-style: italic;' : ''}">
            ${profileUser.bio ? profileUser.bio : 'No biography provided yet. Click "Edit Bio" to add your professional background.'}
          </p>
        </div>

        ${profileUser.role !== 'finance' ? `
          <!-- In Teams Section -->
          <div class="profile-card">
            <div class="profile-card-header">
              <span>In teams</span>
            </div>
            <div class="teams-list">
              ${teams.length > 0 ? teams.map(t => `
                <div class="team-badge-item">
                  <div class="team-badge-icon">
                    ${(t.title || 'P').charAt(0)}
                  </div>
                  <div class="team-badge-title" title="${t.title}">
                    ${t.title}
                  </div>
                </div>
              `).join('') : '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">No active teams assigned.</div>'}
            </div>
          </div>
        ` : ''}
      `;
    }

    if (activeTab === 'edit') {
      return `
        <div class="profile-card">
          <div class="profile-card-header">
            <span>Edit Profile Details</span>
          </div>
          <form id="profile-edit-form">
            <div class="profile-form-grid">
              <div class="profile-field">
                <label for="edit-name">Full Name *</label>
                <input type="text" id="edit-name" value="${profileUser.name}" required />
              </div>

              <div class="profile-field">
                <label for="edit-phone">Phone Number</label>
                <input type="text" id="edit-phone" value="${profileUser.phone || ''}" />
              </div>

              <div class="profile-field">
                <label for="edit-location">Location</label>
                <input type="text" id="edit-location" value="${profileUser.location || 'Kochi, Kerala, India'}" />
              </div>

              <div class="profile-field">
                <label for="edit-department">Department / Team</label>
                <input type="text" id="edit-department" value="${profileUser.department || ''}" />
              </div>

              <div class="profile-field form-group-full">
                <label for="edit-avatar">Profile Photo (Image Link or File Upload)</label>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                  <input type="text" id="edit-avatar" value="${profileUser.avatar || ''}" placeholder="Paste image URL (https://...) or upload an image file..." style="flex: 1; min-width: 220px;" />
                  <button type="button" class="prof-btn secondary" id="btn-browse-photo" style="display: inline-flex; align-items: center; gap: 6px; padding: 0.55rem 0.95rem; font-size: 0.82rem; white-space: nowrap;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Upload Image
                  </button>
                  ${profileUser.avatar ? `
                    <button type="button" class="prof-btn secondary" id="btn-remove-avatar-edit" style="color: #dc2626; border-color: #fecaca; padding: 0.55rem 0.95rem; font-size: 0.82rem; white-space: nowrap;">
                      Remove Photo
                    </button>
                  ` : ''}
                </div>
                <small style="color: var(--text-muted, #64748b); font-size: 0.75rem; margin-top: 4px;">Paste any web image link (e.g. Unsplash, GitHub avatar, Google profile) or upload a file directly.</small>
              </div>

              <div class="profile-field form-group-full">
                <label for="edit-bio">About User / Bio</label>
                <textarea id="edit-bio" rows="4">${profileUser.bio || ''}</textarea>
              </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 1.25rem;">
              <button type="submit" class="prof-btn primary" id="btn-save-profile">
                Save Changes
              </button>
              <button type="button" class="prof-btn secondary" id="btn-cancel-edit">
                Cancel
              </button>
            </div>
          </form>
        </div>
      `;
    }

    if (activeTab === 'security') {
      return `
        <div class="profile-card">
          <div class="profile-card-header">
            <span>Change Password Securely</span>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.25rem;">
            Ensure your account is using a long, random password to stay secure. All password updates are cryptographically hashed and logged.
          </p>

          <form id="change-password-form">
            <div class="profile-field">
              <label for="current-password">Current Password *</label>
              <div class="pass-field-wrap">
                <input type="${showCurrentPass ? 'text' : 'password'}" id="current-password" required placeholder="Enter current password" />
                <button type="button" class="pass-toggle-btn" id="toggle-current-pass" title="${showCurrentPass ? 'Hide password' : 'Show password'}">
                  ${getEyeIcon(showCurrentPass)}
                </button>
              </div>
            </div>

            <div class="profile-field">
              <label for="new-password">New Password *</label>
              <div class="pass-field-wrap">
                <input type="${showNewPass ? 'text' : 'password'}" id="new-password" required minlength="8" placeholder="Minimum 8 characters" />
                <button type="button" class="pass-toggle-btn" id="toggle-new-pass" title="${showNewPass ? 'Hide password' : 'Show password'}">
                  ${getEyeIcon(showNewPass)}
                </button>
              </div>
            </div>

            <div class="profile-field">
              <label for="confirm-password">Confirm New Password *</label>
              <div class="pass-field-wrap">
                <input type="${showConfirmPass ? 'text' : 'password'}" id="confirm-password" required minlength="8" placeholder="Confirm your new password" />
                <button type="button" class="pass-toggle-btn" id="toggle-confirm-pass" title="${showConfirmPass ? 'Hide password' : 'Show password'}">
                  ${getEyeIcon(showConfirmPass)}
                </button>
              </div>
            </div>

            <div class="security-checklist">
              <strong>Password Security Requirements:</strong>
              <ul>
                <li>Must be at least 8 characters long</li>
                <li>Cannot be identical to your current password</li>
                <li>Confirmation password must match exactly</li>
              </ul>
            </div>

            <div style="margin-top: 1.5rem;">
              <button type="submit" class="prof-btn primary" id="btn-submit-password">
                Update Password Securely
              </button>
            </div>
          </form>
        </div>
      `;
    }

    if (activeTab === 'projects') {
      return `
        <div class="profile-card">
          <div class="profile-card-header">
            <span>Associated Projects & Teams</span>
          </div>
          <div class="teams-list">
            ${teams.map(t => `
              <div class="team-badge-item" style="padding: 1rem;">
                <div class="team-badge-icon" style="width: 40px; height: 40px; font-size: 1rem;">
                  ${t.title.charAt(0)}
                </div>
                <div>
                  <div class="team-badge-title" style="font-size: 0.95rem; font-weight: 700;">
                    ${t.title}
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                    Type: ${t.project_type || 'Web Application'} • Status: <span style="text-transform: capitalize; color: var(--primary); font-weight: 600;">${t.status || 'Active'}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  function attachEvents() {
    // Tab switching
    container.querySelectorAll('.profile-tab-item').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        render();
      });
    });

    // Hero buttons
    container.querySelector('#btn-hero-edit')?.addEventListener('click', () => {
      activeTab = 'edit';
      render();
    });

    container.querySelector('#btn-hero-security')?.addEventListener('click', () => {
      activeTab = 'security';
      render();
    });

    container.querySelector('#btn-quick-edit')?.addEventListener('click', () => {
      activeTab = 'edit';
      render();
    });

    container.querySelector('#btn-cancel-edit')?.addEventListener('click', () => {
      activeTab = 'profile';
      render();
    });

    // Password visibility toggles (inline toggle to preserve user typing)
    const toggleCurrent = container.querySelector('#toggle-current-pass');
    if (toggleCurrent) {
      toggleCurrent.addEventListener('click', () => {
        showCurrentPass = !showCurrentPass;
        const input = container.querySelector('#current-password');
        if (input) input.type = showCurrentPass ? 'text' : 'password';
        toggleCurrent.innerHTML = getEyeIcon(showCurrentPass);
        toggleCurrent.title = showCurrentPass ? 'Hide password' : 'Show password';
      });
    }

    const toggleNew = container.querySelector('#toggle-new-pass');
    if (toggleNew) {
      toggleNew.addEventListener('click', () => {
        showNewPass = !showNewPass;
        const input = container.querySelector('#new-password');
        if (input) input.type = showNewPass ? 'text' : 'password';
        toggleNew.innerHTML = getEyeIcon(showNewPass);
        toggleNew.title = showNewPass ? 'Hide password' : 'Show password';
      });
    }

    const toggleConfirm = container.querySelector('#toggle-confirm-pass');
    if (toggleConfirm) {
      toggleConfirm.addEventListener('click', () => {
        showConfirmPass = !showConfirmPass;
        const input = container.querySelector('#confirm-password');
        if (input) input.type = showConfirmPass ? 'text' : 'password';
        toggleConfirm.innerHTML = getEyeIcon(showConfirmPass);
        toggleConfirm.title = showConfirmPass ? 'Hide password' : 'Show password';
      });
    }

    // Non-student roles: the shared, validated uploader (POST /api/auth/profile-photo
    // → users.profile_photo_path). It also refreshes the header avatar itself.
    if (!isStudentRole) {
      mountProfilePhotoEditor(container.querySelector('#profile-photo-slot'), {
        name: profileUser.name,
        layout: 'stacked',
        onChange: (url) => { profileUser.avatar = url; },
      });
    }

    // Quick Profile Photo Upload Handler
    async function applyProfilePhoto(photoDataUrl) {
      profileUser.avatar = photoDataUrl;
      rememberProfilePhoto(photoDataUrl);
      if (authStore.user) {
        authStore.user.avatar = photoDataUrl;
        authStore.user.profile_photo_url = photoDataUrl;
        localStorage.setItem('user', JSON.stringify(authStore.user));
      }

      if (authStore.role === 'student' || window.location.pathname.startsWith('/student')) {
        if (photoDataUrl) {
          saveStudentProfilePhoto(authStore.user, photoDataUrl);
        } else {
          removeStudentProfilePhoto(authStore.user);
        }
      }

      // Sync topbar & popover avatars immediately
      applyHeaderAvatar(document, photoDataUrl, profileUser.name);
      updateTopBarAvatar(photoDataUrl, profileUser.name);
      updateStudentNavbarAvatar();

      // Persist to backend
      if (token) {
        try {
          if (photoDataUrl) {
            await fetch(`${API_BASE}/auth/profile-photo`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ photo_url: photoDataUrl })
            });
          } else {
            await fetch(`${API_BASE}/auth/profile-photo`, {
              method: 'DELETE',
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
          }
        } catch (err) {
          console.warn('Could not persist avatar to server:', err);
        }
      }

      render();
    }

    const fileInput = container.querySelector('#hero-avatar-file-input');
    const triggerUpload = () => fileInput?.click();

    container.querySelector('#user-avatar-wrap')?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerUpload();
    });

    container.querySelector('#btn-hero-cam')?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerUpload();
    });

    container.querySelector('#btn-browse-photo')?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerUpload();
    });

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
          Swal.fire({ icon: 'warning', title: 'File Too Large', text: 'Please choose an image under 5MB.' });
          fileInput.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target.result;
          await applyProfilePhoto(dataUrl);
          Swal.fire({
            icon: 'success',
            title: 'Profile Picture Updated!',
            text: 'Your new photo has been updated in the topbar and profile.',
            timer: 2000,
            showConfirmButton: false
          });
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
      });
    }

    container.querySelector('#btn-remove-avatar-edit')?.addEventListener('click', async () => {
      await applyProfilePhoto(null);
      Swal.fire({
        icon: 'success',
        title: 'Profile Picture Removed',
        text: 'Default initials avatar restored.',
        timer: 1500,
        showConfirmButton: false
      });
    });

    // Handle Edit Profile Form Submission
    const editForm = container.querySelector('#profile-edit-form');
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = editForm.querySelector('#btn-save-profile');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const avatarVal = container.querySelector('#edit-avatar')?.value.trim() || null;
        const updatedData = {
          name: container.querySelector('#edit-name').value.trim(),
          phone: container.querySelector('#edit-phone').value.trim(),
          location: container.querySelector('#edit-location').value.trim(),
          department: container.querySelector('#edit-department').value.trim(),
          bio: container.querySelector('#edit-bio').value.trim(),
          avatar: avatarVal,
          photo_url: avatarVal,
        };

        try {
          if (token) {
            const endpoint = authStore.role === 'student' ? `${API_BASE}/student/profile` : `${API_BASE}/auth/profile`;
            const res = await fetch(endpoint, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(updatedData)
            });

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.message || 'Failed to update profile.');
            }

            // Also persist to /api/auth/profile-photo if photo_url changed
            if (avatarVal !== profileUser.avatar) {
              if (avatarVal) {
                await fetch(`${API_BASE}/auth/profile-photo`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ photo_url: avatarVal })
                }).catch(() => {});
              } else {
                await fetch(`${API_BASE}/auth/profile-photo`, {
                  method: 'DELETE',
                  headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                  }
                }).catch(() => {});
              }
            }
          }

          // Update local state and authStore
          profileUser = { ...profileUser, ...updatedData, avatar: avatarVal };
          rememberProfilePhoto(avatarVal);
          if (authStore.user) {
            authStore.user.name = updatedData.name;
            authStore.user.phone = updatedData.phone;
            authStore.user.location = updatedData.location;
            authStore.user.department = updatedData.department;
            authStore.user.avatar = avatarVal;
            authStore.user.profile_photo_url = avatarVal;
            authStore.user.bio = updatedData.bio;
            localStorage.setItem('user', JSON.stringify(authStore.user));
          }

          // Update scoped student photo storage
          if (authStore.role === 'student' || window.location.pathname.startsWith('/student')) {
            if (updatedData.avatar) {
              saveStudentProfilePhoto(authStore.user, updatedData.avatar);
            } else {
              removeStudentProfilePhoto(authStore.user);
            }
          }

          // Update header display if present
          applyHeaderAvatar(document, avatarVal, updatedData.name);
          updateTopBarAvatar(avatarVal, updatedData.name);
          updateStudentNavbarAvatar();

          Swal.fire({
            icon: 'success',
            title: 'Profile Updated!',
            text: 'Your personal profile details and topbar photo have been updated successfully.',
            timer: 2000,
            showConfirmButton: false
          });

          activeTab = 'profile';
          render();
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: err.message || 'Could not save profile changes.'
          });
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Changes';
        }
      });
    }

    // Handle Password Change Form Submission
    const passForm = container.querySelector('#change-password-form');
    if (passForm) {
      passForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const curPass = container.querySelector('#current-password').value;
        const newPass = container.querySelector('#new-password').value;
        const confPass = container.querySelector('#confirm-password').value;

        if (newPass.length < 8) {
          Swal.fire({ icon: 'warning', title: 'Weak Password', text: 'New password must be at least 8 characters long.' });
          return;
        }

        if (newPass !== confPass) {
          Swal.fire({ icon: 'error', title: 'Mismatch', text: 'New password and confirmation password do not match.' });
          return;
        }

        const submitBtn = passForm.querySelector('#btn-submit-password');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        try {
          if (token) {
            const res = await fetch(`${API_BASE}/auth/change-password`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                current_password: curPass,
                new_password: newPass,
                confirm_password: confPass
              })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(data.error || data.message || 'Failed to change password.');
            }
          }

          Swal.fire({
            icon: 'success',
            title: 'Password Changed!',
            text: 'Your password has been securely updated. Please use your new password next time you log in.',
            confirmButtonColor: '#059669'
          });

          passForm.reset();
          activeTab = 'profile';
          render();
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Password Change Failed',
            text: err.message || 'Please check your current password and try again.'
          });
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Password Securely';
        }
      });
    }
  }

  render();
  return container;
}

export default UserProfile;
