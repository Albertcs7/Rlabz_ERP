import { useAuthStore } from '@/core/stores/auth.js';
import { API_BASE } from '@/core/config/api.js';
import Swal from 'sweetalert2';
import '../userProfile.css';

export async function UserProfile(route, router) {
  const container = document.createElement('div');
  container.className = 'profile-page-shell animate-fade-in';

  const authStore = useAuthStore();
  const token = localStorage.getItem('token');

  let activeTab = 'profile'; // 'profile' | 'edit' | 'security' | 'projects'
  let showCurrentPass = false;
  let showNewPass = false;
  let showConfirmPass = false;

  let profileUser = {
    id: authStore.user?.id || 1,
    name: authStore.user?.name || authStore.user?.username || 'User',
    email: authStore.user?.email || 'user@rajagiri.edu',
    role: authStore.role || 'Member',
    phone: authStore.user?.phone || '+91 9800000001',
    bio: authStore.user?.bio || (authStore.role === 'finance'
      ? 'Corporate Finance & Budget Specialist | Enterprise Project Billing, Student Payroll & Compliance Audits'
      : (authStore.role === 'design_head'
        ? 'Lead UI/UX Designer | Human-centered design | Design Systems & Accessibility'
        : 'UI/UX Designer | Human-centered design | Design thinking | Creative changer | Accessibility | Sustainability')),
    location: authStore.user?.location || 'Kochi, Kerala, India',
    department: authStore.user?.department || (authStore.role === 'finance' ? 'Finance & Accounts' : 'Creative Design & Innovation'),
    avatar: authStore.user?.avatar || null,
    created_at: authStore.user?.created_at || '2024-03-01',
  };

  let teams = [
    { id: 1, title: 'Smart Campus IoT System', status: 'in_progress', project_type: 'IoT' },
    { id: 2, title: 'Campus ERP Mobile Application', status: 'in_progress', project_type: 'Mobile App' },
    { id: 3, title: 'Automated Library Kiosk System', status: 'completed', project_type: 'Hardware & Kiosk' },
    { id: 4, title: 'Department Design System', status: 'in_progress', project_type: 'Design System' }
  ];

  // Fetch live profile from backend if available
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const body = await res.json();
        if (body.user) {
          profileUser = { ...profileUser, ...body.user };
        }
        if (body.teams && body.teams.length > 0) {
          teams = body.teams;
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
    const isFinancePath = window.location.pathname.startsWith('/finance');
    const isDesignPath = window.location.pathname.startsWith('/design');
    const homeLabel = isFinancePath ? 'Finance Portal' : (isDesignPath ? 'Design Studio' : 'Homepage');
    const homeHref = isFinancePath ? '/finance' : (isDesignPath ? '/design' : '/');

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
            <div class="profile-avatar-wrap">
              ${profileUser.avatar
                ? `<img src="${profileUser.avatar}" alt="${profileUser.name}">`
                : `<span class="profile-avatar-fallback">${initials}</span>`
              }
              <span class="profile-avatar-badge" title="Online & Active"></span>
            </div>
            <div class="profile-hero-details">
              <h1>${profileUser.name}</h1>
              <div class="profile-hero-sub">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>Active session • Verified Rajagiri Member</span>
              </div>
              <div class="profile-hero-stats">
                <span class="profile-role-pill">${roleLabel}</span>
                <span><strong>${teams.length}</strong> Associated Projects</span>
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
          <button class="profile-tab-item ${activeTab === 'projects' ? 'active' : ''}" data-tab="projects">
            Teams & Projects (${teams.length})
          </button>
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
                  <span class="contact-info-val">${profileUser.department || 'Creative Design Studio'}</span>
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
          <p class="profile-bio-text">
            ${profileUser.bio || 'UI/UX Designer | Human-centered design | Design thinking | Creative strategist | Accessibility | Sustainability'}
          </p>
        </div>

        <!-- In Teams Section -->
        <div class="profile-card">
          <div class="profile-card-header">
            <span>In teams</span>
          </div>
          <div class="teams-list">
            ${teams.map(t => `
              <div class="team-badge-item">
                <div class="team-badge-icon">
                  ${t.title.charAt(0)}
                </div>
                <div class="team-badge-title" title="${t.title}">
                  ${t.title}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
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
                <label for="edit-avatar">Profile Photo URL (optional)</label>
                <input type="url" id="edit-avatar" value="${profileUser.avatar || ''}" placeholder="https://..." />
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
                <button type="button" class="pass-toggle-btn" id="toggle-current-pass">
                  ${showCurrentPass ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <div class="profile-field">
              <label for="new-password">New Password *</label>
              <div class="pass-field-wrap">
                <input type="${showNewPass ? 'text' : 'password'}" id="new-password" required minlength="8" placeholder="Minimum 8 characters" />
                <button type="button" class="pass-toggle-btn" id="toggle-new-pass">
                  ${showNewPass ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <div class="profile-field">
              <label for="confirm-password">Confirm New Password *</label>
              <div class="pass-field-wrap">
                <input type="${showConfirmPass ? 'text' : 'password'}" id="confirm-password" required minlength="8" placeholder="Confirm your new password" />
                <button type="button" class="pass-toggle-btn" id="toggle-confirm-pass">
                  ${showConfirmPass ? '👁️' : '🙈'}
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

    // Password visibility toggles
    container.querySelector('#toggle-current-pass')?.addEventListener('click', () => {
      showCurrentPass = !showCurrentPass;
      render();
    });
    container.querySelector('#toggle-new-pass')?.addEventListener('click', () => {
      showNewPass = !showNewPass;
      render();
    });
    container.querySelector('#toggle-confirm-pass')?.addEventListener('click', () => {
      showConfirmPass = !showConfirmPass;
      render();
    });

    // Handle Edit Profile Form Submission
    const editForm = container.querySelector('#profile-edit-form');
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = editForm.querySelector('#btn-save-profile');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const updatedData = {
          name: container.querySelector('#edit-name').value.trim(),
          phone: container.querySelector('#edit-phone').value.trim(),
          location: container.querySelector('#edit-location').value.trim(),
          department: container.querySelector('#edit-department').value.trim(),
          avatar: container.querySelector('#edit-avatar').value.trim() || null,
          bio: container.querySelector('#edit-bio').value.trim(),
        };

        try {
          if (token) {
            const res = await fetch(`${API_BASE}/auth/profile`, {
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
          }

          // Update local state and authStore
          profileUser = { ...profileUser, ...updatedData };
          if (authStore.user) {
            authStore.user.name = updatedData.name;
            authStore.user.phone = updatedData.phone;
            authStore.user.location = updatedData.location;
            authStore.user.department = updatedData.department;
            authStore.user.avatar = updatedData.avatar;
            authStore.user.bio = updatedData.bio;
            localStorage.setItem('user', JSON.stringify(authStore.user));
          }

          // Update header display if present
          const headerName = document.querySelector('#user-profile-header .user-name') || document.querySelector('#finance-user-profile-header .user-name');
          if (headerName) headerName.textContent = updatedData.name;
          const popoverName = document.querySelector('#popover-name') || document.querySelector('#finance-popover-name');
          if (popoverName) popoverName.textContent = updatedData.name;

          Swal.fire({
            icon: 'success',
            title: 'Profile Updated!',
            text: 'Your personal profile details have been saved successfully.',
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
