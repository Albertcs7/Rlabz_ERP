import { renderStudentSidebar, updateStudentNavbarAvatar } from './StudentSidebar.js';
import {
  fetchLiveStudentProfile,
  updateStudentPassword,
  getStudentProfilePhoto,
  saveStudentProfilePhoto,
  removeStudentProfilePhoto
} from './studentStore.js';
import { useAuthStore } from '@/core/stores/auth.js';
import { API_BASE } from '@/core/config/api.js';
import { StudentSwal, showStudentSuccess, showStudentError, showStudentWarning } from '../studentAlerts.js';
import '../student.css';

export async function StudentProfile(route, router) {
  renderStudentSidebar();

  const container = document.createElement('div');
  container.className = 'student-portal-container animate-fade-in student-profile-view';

  const authStore = useAuthStore();
  let currentUser = authStore.user || {};

  // State
  let profileData = {
    name: currentUser.name || currentUser.username || 'Student',
    email: currentUser.email || 'student@rajagiri.edu',
    role: 'Student',
    designation: currentUser.designation || 'Nova',
    department: currentUser.department || 'Computer Applications',
    course: currentUser.course || 'MCA',
    batch: currentUser.batch || '2025-2027',
    semester_text: currentUser.semester_text || (currentUser.semester ? `${currentUser.semester}th Semester` : '2nd Year / 3rd Semester'),
  };

  let showNewPassword = false;
  let showConfirmPassword = false;

  // Load initial data
  try {
    const liveProfile = await fetchLiveStudentProfile();
    if (liveProfile && liveProfile.name) {
      profileData = { ...profileData, ...liveProfile };
    }
  } catch (e) {
    console.warn('Could not load live student profile:', e);
  }

  function render() {
    const studentPhoto = getStudentProfilePhoto(currentUser) || profileData.avatar || currentUser?.avatar || null;
    const initials = (profileData.name || 'Student')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Direct password change: current password + new + confirm (no approval step).
    const passwordFormHTML = `
        <form id="password-change-form" style="display: flex; flex-direction: column; gap: 18px;">
          <div>
            <label for="current-password-input" style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              Current Password <span style="color: #ef4444;">*</span>
            </label>
            <div style="position: relative;">
              <input
                id="current-password-input"
                type="password"
                required
                autocomplete="current-password"
                placeholder="Enter your current password"
                style="width: 100%; padding: 10px 42px 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; transition: border-color 0.2s; background: #ffffff;"
              />
              <button
                type="button"
                id="toggle-current-password"
                class="password-visibility-toggle"
                data-target="current-password-input"
                aria-label="Toggle current password visibility"
                style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; display: flex; align-items: center; justify-content: center;"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
          </div>

          <div>
            <label for="new-password-input" style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              New Password <span style="color: #ef4444;">*</span>
            </label>
            <div style="position: relative;">
              <input
                id="new-password-input"
                type="${showNewPassword ? 'text' : 'password'}"
                required
                minlength="6"
                placeholder="Enter new password (min. 6 characters)"
                style="width: 100%; padding: 10px 42px 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; transition: border-color 0.2s; background: #ffffff;"
              />
              <button
                type="button"
                id="toggle-new-password"
                aria-label="Toggle new password visibility"
                style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; display: flex; align-items: center; justify-content: center;"
              >
                ${showNewPassword ? `
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ` : `
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                `}
              </button>
            </div>
            <div id="password-hint" style="font-size: 0.775rem; color: #64748b; margin-top: 4px;">
              Password must be at least 6 characters long.
            </div>
          </div>

          <div>
            <label for="confirm-password-input" style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              Confirm New Password <span style="color: #ef4444;">*</span>
            </label>
            <div style="position: relative;">
              <input
                id="confirm-password-input"
                type="${showConfirmPassword ? 'text' : 'password'}"
                required
                minlength="6"
                placeholder="Re-enter new password"
                style="width: 100%; padding: 10px 42px 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; transition: border-color 0.2s; background: #ffffff;"
              />
              <button
                type="button"
                id="toggle-confirm-password"
                aria-label="Toggle confirm password visibility"
                style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; display: flex; align-items: center; justify-content: center;"
              >
                ${showConfirmPassword ? `
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ` : `
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                `}
              </button>
            </div>
            <div id="match-error" style="display: none; font-size: 0.775rem; color: #dc2626; margin-top: 4px; font-weight: 500;">
              Passwords do not match.
            </div>
          </div>

          <div style="margin-top: 6px; display: flex; justify-content: flex-start; gap: 10px; align-items: center;">
            <button
              type="submit"
              id="btn-update-password"
              class="btn"
              style="background: #059669; color: #ffffff; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background 0.2s;"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Update Password
            </button>
            <button
              type="reset"
              id="btn-clear-password-form"
              class="btn"
              style="background: #ffffff; color: #64748b; border: 1px solid #cbd5e1; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease;"
            >
              Clear
            </button>
          </div>
        </form>
    `;

    container.innerHTML = `
      <!-- Top Page Header -->
      <div class="student-header" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <h1>Student Profile & Settings</h1>
            <p>View your profile details and manage your account password security.</p>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1.35fr; gap: 24px; align-items: start;" class="profile-settings-grid">
        
        <!-- 1. Profile Information Card -->
        <div style="background: var(--surface-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1px solid var(--border-color, #f1f5f9);">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div class="student-profile-avatar-wrapper" id="profile-avatar-wrapper" style="position: relative; width: 68px; height: 68px; border-radius: 50%; cursor: pointer; flex-shrink: 0;" title="Click to upload or change profile photo">
                ${studentPhoto ? `
                  <img src="${studentPhoto}" alt="${profileData.name}" class="student-profile-avatar-img" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);" />
                ` : `
                  <div style="width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, #059669, #047857); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 700; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25);">
                    ${initials}
                  </div>
                `}
                <div class="student-profile-avatar-overlay">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  <span>${studentPhoto ? 'Change' : 'Upload'}</span>
                </div>
                <button type="button" class="student-profile-avatar-btn" id="btn-profile-avatar-cam" title="Upload Photo" style="position: absolute; bottom: -2px; right: -2px; width: 26px; height: 26px; border-radius: 50%; background: #059669; color: #ffffff; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </button>
                <input type="file" id="profile-photo-file-input" accept="image/png, image/jpeg, image/jpg, image/webp" style="display: none;" />
              </div>

              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${profileData.name}</h3>
                  <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; border: 1px solid #bae6fd;">
                    ${profileData.designation}
                  </span>
                </div>
                <span style="font-size: 0.85rem; color: var(--text-muted); word-break: break-all;">${profileData.email}</span>
              </div>
            </div>

            <!-- Profile Photo Action Buttons -->
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 2px;">
              <button type="button" id="btn-upload-profile-photo" class="btn" style="background: #059669; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                <span>${studentPhoto ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              ${studentPhoto ? `
                <button type="button" id="btn-remove-profile-photo" class="btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s ease;" title="Remove Custom Photo">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Remove</span>
                </button>
              ` : ''}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem;">
              <span style="color: var(--text-muted); font-weight: 500;">Role:</span>
              <span style="font-weight: 600; color: var(--text-primary);">${profileData.role}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem;">
              <span style="color: var(--text-muted); font-weight: 500;">Designation:</span>
              <span style="font-weight: 700; color: #059669;">${profileData.designation}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem;">
              <span style="color: var(--text-muted); font-weight: 500;">Department:</span>
              <span style="font-weight: 600; color: var(--text-primary);">${profileData.department}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem;">
              <span style="color: var(--text-muted); font-weight: 500;">Course:</span>
              <span style="font-weight: 600; color: var(--text-primary);">${profileData.course}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem;">
              <span style="color: var(--text-muted); font-weight: 500;">Batch:</span>
              <span style="font-weight: 600; color: var(--text-primary);">${profileData.batch}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem;">
              <span style="color: var(--text-muted); font-weight: 500;">Semester:</span>
              <span style="font-weight: 600; color: var(--text-primary);">${profileData.semester_text}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; padding-top: 10px; border-top: 1px solid var(--border-color, #f1f5f9);">
              <span style="color: var(--text-muted); font-weight: 500;">Account Status:</span>
              <span style="color: #059669; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                Active
              </span>
            </div>
          </div>
        </div>

        <!-- 2. Security & Change Password Section -->
        <div style="background: var(--surface-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--border-color, #f1f5f9); flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Change Password
              </h3>
              <p style="margin: 3px 0 0 0; font-size: 0.825rem; color: var(--text-muted);">
                Update your account password. Your current password is required.
              </p>
            </div>
          </div>

          <!-- Dynamic Status & Form Content -->
          <div id="password-section-content">
            ${passwordFormHTML}
          </div>

        </div>

      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // 0. Profile Photo Upload, Preview & Removal
    const photoFileInput = container.querySelector('#profile-photo-file-input');
    const uploadPhotoBtn = container.querySelector('#btn-upload-profile-photo');
    const camPhotoBtn = container.querySelector('#btn-profile-avatar-cam');
    const avatarWrapper = container.querySelector('#profile-avatar-wrapper');

    const triggerPhotoPick = (e) => {
      e?.stopPropagation?.();
      photoFileInput?.click();
    };

    uploadPhotoBtn?.addEventListener('click', triggerPhotoPick);
    camPhotoBtn?.addEventListener('click', triggerPhotoPick);
    avatarWrapper?.addEventListener('click', triggerPhotoPick);

    photoFileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          showStudentError('Invalid File Type', 'Please select a valid image file (JPG, PNG, WEBP, or GIF).');
          photoFileInput.value = '';
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          showStudentError('File Too Large', 'Please select an image smaller than 5MB.');
          photoFileInput.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result;
          if (dataUrl) {
            StudentSwal.fire({
              title: '<span style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">Update Profile Picture</span>',
              html: `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; margin: 12px 0;">
                  <div style="width: 130px; height: 130px; border-radius: 50%; overflow: hidden; border: 4px solid #059669; box-shadow: 0 6px 20px rgba(5, 150, 105, 0.25); background: #f8fafc;">
                    <img src="${dataUrl}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>
                  <div style="font-size: 0.88rem; color: var(--text-secondary); text-align: center; max-width: 320px;">
                    Set this image as your student profile picture?
                  </div>
                </div>
              `,
              showCancelButton: true,
              confirmButtonText: 'Save Photo',
              cancelButtonText: 'Cancel',
              confirmButtonColor: '#059669',
              cancelButtonColor: '#64748b'
            }).then(async (result) => {
              if (result.isConfirmed) {
                saveStudentProfilePhoto(currentUser, dataUrl);
                if (currentUser) {
                  currentUser.avatar = dataUrl;
                  currentUser.profile_photo_path = dataUrl;
                }
                if (authStore && authStore.user) {
                  authStore.user.avatar = dataUrl;
                  authStore.user.profile_photo_path = dataUrl;
                }
                profileData.avatar = dataUrl;
                profileData.profile_photo_path = dataUrl;

                // Persist photo to backend
                try {
                  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                  if (token) {
                    await fetch(`${API_BASE}/auth/profile-photo`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ photo_url: dataUrl })
                    });
                  }
                } catch (err) {
                  console.warn('Could not persist avatar to server:', err);
                }

                StudentSwal.fire({
                  toast: true,
                  position: 'top-end',
                  icon: 'success',
                  title: 'Profile Picture Saved!',
                  text: 'Your profile photo has been updated.',
                  showConfirmButton: false,
                  timer: 2500,
                  timerProgressBar: true
                });
                render();
                updateStudentNavbarAvatar();
                try {
                  const { applyHeaderAvatar } = await import('@/core/shared/profilePhoto.js');
                  applyHeaderAvatar(document, dataUrl, profileData.name);
                } catch (e) {}
              }
              photoFileInput.value = '';
            });
          }
        };
        reader.readAsDataURL(file);
      }
    });

    container.querySelector('#btn-remove-profile-photo')?.addEventListener('click', () => {
      StudentSwal.fire({
        title: '<span style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">Remove Profile Picture?</span>',
        text: 'Your profile will revert back to the default initials avatar.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Remove',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b'
      }).then(async (res) => {
        if (res.isConfirmed) {
          // 1. Remove from backend
          try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (token) {
              await fetch(`${API_BASE}/auth/profile-photo`, {
                method: 'DELETE',
                headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
            }
          } catch (e) {
            console.warn('Could not delete photo from server:', e);
          }

          // 2. Remove from local storage
          removeStudentProfilePhoto(currentUser);

          // 3. Reset local store and user state
          if (currentUser) {
            currentUser.avatar = null;
            currentUser.profile_photo_path = null;
            delete currentUser.avatar;
            delete currentUser.profile_photo_path;
          }
          if (authStore && authStore.user) {
            authStore.user.avatar = null;
            authStore.user.profile_photo_path = null;
          }
          profileData.avatar = null;
          profileData.profile_photo_path = null;
          delete profileData.avatar;
          delete profileData.profile_photo_path;

          StudentSwal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Profile Picture Removed',
            text: 'Default initials avatar restored.',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
          });
          render();
          updateStudentNavbarAvatar();
          try {
            const { applyHeaderAvatar } = await import('@/core/shared/profilePhoto.js');
            applyHeaderAvatar(document, null, profileData.name);
          } catch (e) {}
        }
      });
    });

    // 1. Eye toggle buttons — flip the input type in place so typed values are kept
    container.querySelectorAll('#toggle-current-password, #toggle-new-password, #toggle-confirm-password').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement?.querySelector('input');
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        if (btn.id === 'toggle-new-password') showNewPassword = input.type === 'text';
        if (btn.id === 'toggle-confirm-password') showConfirmPassword = input.type === 'text';
      });
    });

    // 2. Password Form Submission
    const passwordForm = container.querySelector('#password-change-form');
    if (passwordForm) {
      const currentPassInput = container.querySelector('#current-password-input');
      const newPassInput = container.querySelector('#new-password-input');
      const confirmPassInput = container.querySelector('#confirm-password-input');
      const matchError = container.querySelector('#match-error');
      const btnUpdate = container.querySelector('#btn-update-password');

      const checkMatch = () => {
        const val1 = newPassInput?.value || '';
        const val2 = confirmPassInput?.value || '';
        if (val2 && val1 !== val2) {
          if (matchError) matchError.style.display = 'block';
          if (confirmPassInput) confirmPassInput.style.borderColor = '#ef4444';
          return false;
        } else {
          if (matchError) matchError.style.display = 'none';
          if (confirmPassInput) confirmPassInput.style.borderColor = '#cbd5e1';
          return true;
        }
      };

      if (confirmPassInput) {
        confirmPassInput.addEventListener('input', checkMatch);
      }
      if (newPassInput) {
        newPassInput.addEventListener('input', () => {
          if (confirmPassInput?.value) checkMatch();
        });
      }

      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPass = currentPassInput?.value || '';
        const newPass = (newPassInput?.value || '').trim();
        const confirmPass = (confirmPassInput?.value || '').trim();

        if (!currentPass) {
          showStudentWarning('Current Password Required', 'Please enter your current password.');
          return;
        }

        if (newPass.length < 6) {
          showStudentWarning('Password Too Short', 'Password must be at least 6 characters long.');
          return;
        }

        if (newPass !== confirmPass) {
          if (matchError) matchError.style.display = 'block';
          showStudentError('Password Mismatch', 'New password and confirmation password do not match.');
          return;
        }

        if (btnUpdate) {
          btnUpdate.disabled = true;
          btnUpdate.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
            Updating Password...
          `;
        }

        try {
          const res = await updateStudentPassword(currentPass, newPass, confirmPass);
          await showStudentSuccess('Password Changed Successfully', res.message || 'Your password has been successfully updated! You can now use your new password.');
          showNewPassword = false;
          showConfirmPassword = false;
          render();
        } catch (err) {
          showStudentError('Update Failed', err.message || 'Failed to update password.');
        } finally {
          if (btnUpdate) {
            btnUpdate.disabled = false;
            btnUpdate.textContent = 'Update Password';
          }
        }
      });
    }
  }

  render();

  return container;
}

export default StudentProfile;
