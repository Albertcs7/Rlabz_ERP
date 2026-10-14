import { authStore } from '@/core/stores/auth.js';
import { API_BASE } from '@/core/config/api.js';
import { profilePhotoUrl, applyHeaderAvatar, rememberProfilePhoto } from '@/core/shared/profilePhoto.js';
import './profilePhotoEditor.css';

export { profilePhotoUrl };

// Must match the backend rule in Modules\Auth\Controllers\ProfilePhotoController.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

function getAuthToken() {
  return authStore?.token || localStorage.getItem('token') || localStorage.getItem('access_token') || null;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function initialsOf(name) {
  return String(name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
}

async function photoRequest(method, body) {
  const token = getAuthToken();
  const resp = await fetch(`${API_BASE}/auth/profile-photo`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const fieldError = data?.errors?.photo?.[0];
    throw new Error(fieldError || data.error || data.message || `Request failed (${resp.status})`);
  }
  return data;
}

/**
 * Renders the current user's avatar with "Change Profile Photo": pick a JPG,
 * PNG or WebP (max 2 MB), preview it, then Save or Cancel. Nothing is
 * uploaded until Save; the saved photo is loaded from the server on mount, so
 * it persists across visits. Falls back to an initials avatar.
 *
 * onChange(url | null) is called with the server's photo once it has loaded,
 * and again after every successful save or removal.
 * layout: 'row' (default, avatar beside buttons) or 'stacked' (centered column).
 */
export function mountProfilePhotoEditor(slot, { name = '', onChange, layout = 'row' } = {}) {
  if (!slot) return;

  let savedPath = null;
  let pendingFile = null;
  let previewUrl = null;
  let busy = false;
  let loading = true;
  let message = null; // { type: 'error' | 'success', text }

  // Every time the saved photo is known or changes: update the header avatar
  // (topbar + popover) and the cached user, then let the page react.
  function photoChanged(url) {
    rememberProfilePhoto(url);
    applyHeaderAvatar(document, url, authStore?.user?.name || name);
    onChange?.(url);
  }

  function clearPending() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    pendingFile = null;
    previewUrl = null;
  }

  function render() {
    const shownUrl = previewUrl || profilePhotoUrl(savedPath);
    const avatar = shownUrl
      ? `<img src="${escapeHtml(shownUrl)}" alt="${escapeHtml(name || 'Profile')} photo" />`
      : `<span>${escapeHtml(initialsOf(name))}</span>`;

    slot.innerHTML = `
      <div class="profile-photo-editor ${layout === 'stacked' ? 'stacked' : ''}">
        <div class="profile-photo-avatar ${previewUrl ? 'is-preview' : ''}">${avatar}</div>
        <div class="profile-photo-actions">
          ${pendingFile ? `
            <span class="profile-photo-preview-note">Preview — not saved yet</span>
            <div class="profile-photo-buttons">
              <button type="button" class="profile-photo-btn primary" data-photo-action="save" ${busy ? 'disabled' : ''}>${busy ? 'Saving…' : 'Save Photo'}</button>
              <button type="button" class="profile-photo-btn" data-photo-action="cancel" ${busy ? 'disabled' : ''}>Cancel</button>
            </div>
          ` : `
            <div class="profile-photo-buttons">
              <button type="button" class="profile-photo-btn" data-photo-action="pick" ${busy || loading ? 'disabled' : ''}>Change Profile Photo</button>
              ${savedPath ? `<button type="button" class="profile-photo-btn link danger" data-photo-action="remove" ${busy ? 'disabled' : ''}>Remove Photo</button>` : ''}
            </div>
          `}
          <small class="profile-photo-hint">JPG, PNG or WebP, up to 2 MB.</small>
          ${message ? `<div class="profile-photo-message ${message.type}" role="${message.type === 'error' ? 'alert' : 'status'}">${escapeHtml(message.text)}</div>` : ''}
          <input type="file" accept="image/jpeg,image/png,image/webp" data-photo-input hidden />
        </div>
      </div>
    `;

    const input = slot.querySelector('[data-photo-input]');
    slot.querySelector('[data-photo-action="pick"]')?.addEventListener('click', () => input?.click());
    slot.querySelector('[data-photo-action="cancel"]')?.addEventListener('click', () => {
      clearPending();
      message = null;
      render();
    });
    slot.querySelector('[data-photo-action="save"]')?.addEventListener('click', save);
    slot.querySelector('[data-photo-action="remove"]')?.addEventListener('click', remove);

    input?.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!ALLOWED_TYPES.includes(file.type)) {
        message = { type: 'error', text: 'Please choose a JPG, PNG or WebP image.' };
        render();
        return;
      }
      if (file.size > MAX_BYTES) {
        message = { type: 'error', text: 'The photo must not be larger than 2 MB.' };
        render();
        return;
      }
      clearPending();
      pendingFile = file;
      previewUrl = URL.createObjectURL(file);
      message = null;
      render();
    });
  }

  async function save() {
    if (!pendingFile || busy) return;
    busy = true;
    message = null;
    render();
    try {
      const form = new FormData();
      form.append('photo', pendingFile);
      const data = await photoRequest('POST', form);
      savedPath = data.profile_photo_path || null;
      clearPending();
      message = { type: 'success', text: 'Profile photo saved.' };
      photoChanged(profilePhotoUrl(savedPath));
    } catch (err) {
      // Keep the preview so the user can retry or cancel; nothing was saved.
      message = { type: 'error', text: err.message || 'The photo could not be saved.' };
    } finally {
      busy = false;
      render();
    }
  }

  async function remove() {
    if (busy || !savedPath) return;
    if (!confirm('Remove your profile photo?')) return;
    busy = true;
    message = null;
    render();
    try {
      await photoRequest('DELETE');
      savedPath = null;
      message = { type: 'success', text: 'Profile photo removed.' };
      photoChanged(null);
    } catch (err) {
      message = { type: 'error', text: err.message || 'The photo could not be removed.' };
    } finally {
      busy = false;
      render();
    }
  }

  render();
  photoRequest('GET')
    .then((data) => {
      savedPath = data.profile_photo_path || null;
      photoChanged(profilePhotoUrl(savedPath));
    })
    .catch((err) => {
      message = { type: 'error', text: err.message || 'Could not load your profile photo.' };
    })
    .finally(() => {
      loading = false;
      render();
    });
}
