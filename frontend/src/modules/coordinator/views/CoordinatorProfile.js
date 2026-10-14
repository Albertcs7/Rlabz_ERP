import { authStore } from '@/core/stores/auth.js';
import { API_BASE } from '@/core/config/api.js';
import { mountProfilePhotoEditor } from '@/core/shared/components/ProfilePhotoEditor.js';
import '../coordinator.css';

function getAuthToken() {
  return authStore?.token || localStorage.getItem('token') || localStorage.getItem('access_token') || null;
}

async function fetchProfile() {
  const token = getAuthToken();
  const resp = await fetch(`${API_BASE}/coordinator/profile`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || data.message || 'Unable to load profile.');
  return data;
}

// The header (topbar name/email) is built from the user cached at login in
// localStorage('user') / authStore.user. Update that cache with the values the
// server saved so the header is correct after the reload, without re-login.
function syncCachedUser({ name, email, phone }) {
  try {
    const cached = JSON.parse(localStorage.getItem('user') || 'null');
    if (cached) {
      const updated = { ...cached, name, email, phone };
      localStorage.setItem('user', JSON.stringify(updated));
      if (authStore) authStore.user = updated;
    }
  } catch (e) {
    console.warn('Could not update cached user details:', e);
  }
}

export async function CoordinatorProfile(route, router) {
  const container = document.createElement('div');
  container.className = 'coordinator-dashboard';

  function openModal(html) {
    const overlay = document.createElement('div');
    overlay.className = 'coordinator-modal-overlay';
    overlay.innerHTML = `<div class="coordinator-modal">${html}</div>`;
    document.body.appendChild(overlay);
    // Both the header "×" and the footer "Cancel" carry .coordinator-close-btn.
    overlay.querySelectorAll('.coordinator-close-btn').forEach((btn) => btn.addEventListener('click', () => overlay.remove()));
    return overlay;
  }

  async function putJson(url, body) {
    const token = getAuthToken();
    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  }

  async function postJson(url, body) {
    const token = getAuthToken();
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  }

  try {
    const profile = await fetchProfile();

    container.innerHTML = `
      <div class="coordinator-header">
        <div>
          <h1>My Profile</h1>
          <p>View and update your own account details.</p>
        </div>
        <button class="coord-btn coord-btn-secondary" data-action="back">Back</button>
      </div>

      <div class="coordinator-panel">
        <div class="coordinator-panel-header">
          <div>
            <h2>Profile photo</h2>
            <p>Shown on your profile. Choose an image, check the preview, then save.</p>
          </div>
        </div>
        <div id="profile-photo-slot"></div>
      </div>

      <div class="coordinator-panel">
        <div class="coordinator-panel-header">
          <div>
            <h2>Profile details</h2>
            <p>Your name, email, and phone number as stored on your account.</p>
          </div>
          <button class="coordinator-primary-btn" id="edit-profile-btn">Edit Profile Details</button>
        </div>

        <div class="coordinator-detail-list">
          <div><span>Name</span><strong>${profile.name || '—'}</strong></div>
          <div><span>Email</span><strong>${profile.email || '—'}</strong></div>
          <div><span>Phone</span><strong>${profile.phone || '—'}</strong></div>
          <div><span>Role</span><strong>${profile.role || '—'}</strong></div>
        </div>
      </div>

      <div class="coordinator-panel">
        <div class="coordinator-panel-header">
          <div>
            <h2>Password</h2>
            <p>Change your account password. Your current password is required.</p>
          </div>
          <button class="coordinator-secondary-btn" id="change-password-btn">Change Password</button>
        </div>
      </div>
    `;

    mountProfilePhotoEditor(container.querySelector('#profile-photo-slot'), { name: profile.name });

    container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      router.push('/coordinator');
    });

    container.querySelector('#edit-profile-btn')?.addEventListener('click', () => {
      const html = `
        <div class="coordinator-modal-header">
          <h2>Edit Profile Details</h2>
          <p>Update your name, email, or phone number.</p>
          <button class="coordinator-close-btn">×</button>
        </div>
        <div class="coordinator-form-grid">
          <div class="coordinator-form-group full-width"><label>Name *</label><input type="text" id="profile-name" maxlength="150" value="${profile.name || ''}" /></div>
          <div class="coordinator-form-group full-width"><label>Email *</label><input type="email" id="profile-email" maxlength="255" value="${profile.email || ''}" /><small style="color:#6b7280;">Must be your @rajagiri.edu address — it is also your login.</small></div>
          <div class="coordinator-form-group full-width"><label>Phone</label><input type="text" id="profile-phone" maxlength="20" value="${profile.phone || ''}" /></div>
        </div>
        <div id="profile-form-error" style="color:#b91c1c; margin: 0 1rem 0.5rem;"></div>
        <div class="coordinator-modal-footer">
          <button class="coordinator-secondary-btn coordinator-close-btn">Cancel</button>
          <button class="coordinator-primary-btn" id="profile-submit">Save Changes</button>
        </div>
      `;

      const overlay = openModal(html);
      overlay.querySelector('#profile-submit').addEventListener('click', async () => {
        const errorEl = overlay.querySelector('#profile-form-error');
        const name = overlay.querySelector('#profile-name').value.trim();
        const email = overlay.querySelector('#profile-email').value.trim();
        const phone = overlay.querySelector('#profile-phone').value.trim() || undefined;

        if (!name) { errorEl.textContent = 'Name is required.'; return; }
        if (!email) { errorEl.textContent = 'Email is required.'; return; }
        // Same rule as the login page — any other address could not log in.
        if (!email.endsWith('@rajagiri.edu')) {
          errorEl.textContent = 'The email must be an @rajagiri.edu address — other addresses cannot be used to log in.';
          return;
        }

        try {
          const result = await putJson(`${API_BASE}/coordinator/profile`, { name, email, phone });
          syncCachedUser(result?.data || { name, email, phone: phone ?? null });
          alert('Profile updated successfully');
          overlay.remove();
          window.location.reload();
        } catch (err) {
          errorEl.textContent = err.message || 'Failed to update profile';
        }
      });
    });

    container.querySelector('#change-password-btn')?.addEventListener('click', () => {
      const html = `
        <div class="coordinator-modal-header">
          <h2>Change Password</h2>
          <p>Enter your current password and choose a new one.</p>
          <button class="coordinator-close-btn">×</button>
        </div>
        <div class="coordinator-form-grid">
          <div class="coordinator-form-group full-width"><label>Current Password *</label><input type="password" id="pwd-current" /></div>
          <div class="coordinator-form-group full-width"><label>New Password *</label><input type="password" id="pwd-new" /></div>
          <div class="coordinator-form-group full-width"><label>Confirm New Password *</label><input type="password" id="pwd-confirm" /></div>
        </div>
        <div id="pwd-form-error" style="color:#b91c1c; margin: 0 1rem 0.5rem;"></div>
        <div class="coordinator-modal-footer">
          <button class="coordinator-secondary-btn coordinator-close-btn">Cancel</button>
          <button class="coordinator-primary-btn" id="pwd-submit">Update Password</button>
        </div>
      `;

      const overlay = openModal(html);
      overlay.querySelector('#pwd-submit').addEventListener('click', async () => {
        const errorEl = overlay.querySelector('#pwd-form-error');
        const current_password = overlay.querySelector('#pwd-current').value;
        const new_password = overlay.querySelector('#pwd-new').value;
        const confirm_password = overlay.querySelector('#pwd-confirm').value;

        if (!current_password || !new_password || !confirm_password) {
          errorEl.textContent = 'Please fill in all password fields.';
          return;
        }
        if (new_password !== confirm_password) {
          errorEl.textContent = 'New password and confirmation do not match.';
          return;
        }

        try {
          await postJson(`${API_BASE}/coordinator/change-password`, { current_password, new_password, confirm_password });
          alert('Password updated successfully');
          overlay.remove();
        } catch (err) {
          errorEl.textContent = err.message || 'Failed to update password';
        }
      });
    });

    return container;
  } catch (error) {
    container.innerHTML = `
      <div class="coordinator-panel coordinator-empty-state">
        <h2>Unable to load profile</h2>
        <p>${error.message || 'Something went wrong while loading your profile.'}</p>
      </div>
    `;
    return container;
  }
}

export default CoordinatorProfile;
