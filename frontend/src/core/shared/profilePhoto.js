import { authStore } from '@/core/stores/auth.js';
import { API_BASE, STORAGE_BASE } from '@/core/config/api.js';

/**
 * Header (topbar + profile popover) avatar for the user's server-side profile
 * photo (users.profile_photo_path, see ProfilePhotoController). Shared by
 * DashboardLayout (initial render) and ProfilePhotoEditor (after save/remove).
 */

/** Public URL for a stored relative path such as "profile_photos/abc.jpg". */
export function profilePhotoUrl(path) {
  return path ? `${STORAGE_BASE}/${String(path).replace(/^\/+/, '')}` : null;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

/** Header markup for an avatar: the photo, or the name's initial (default). */
export function headerAvatarContent(url, displayName) {
  return url
    ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(displayName || 'Profile')}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" />`
    : escapeHtml(String(displayName || 'User').charAt(0).toUpperCase());
}

/** Puts the photo (or the initial) into the topbar and popover avatars under `root`. */
export function applyHeaderAvatar(root, url, displayName) {
  const scope = root || document;
  ['#user-profile-header .avatar', '#popover-avatar'].forEach((selector) => {
    const el = scope.querySelector(selector);
    if (!el) return;
    el.innerHTML = headerAvatarContent(url, displayName);
    el.style.padding = url ? '0' : '';
    el.style.overflow = url ? 'hidden' : '';
  });
}

/**
 * Caches the URL on the logged-in user (memory + localStorage 'user') so the
 * header can show it immediately on the next render. Login replaces this user
 * object, so a cached photo never carries over to another account.
 */
export function rememberProfilePhoto(url) {
  try {
    if (authStore?.user) authStore.user = { ...authStore.user, profile_photo_url: url || null };
    const cached = JSON.parse(localStorage.getItem('user') || 'null');
    if (cached) localStorage.setItem('user', JSON.stringify({ ...cached, profile_photo_url: url || null }));
  } catch (e) {
    // Cache only — the header still updates from the server response.
  }
}

/**
 * Fetches the logged-in user's photo and applies it to the header under `root`.
 * Failures (no token, migration not run, network) leave the current avatar as is.
 */
export async function loadHeaderProfilePhoto(root, displayName) {
  const token = authStore?.token || localStorage.getItem('token') || localStorage.getItem('access_token');
  if (!token) return;
  try {
    const resp = await fetch(`${API_BASE}/auth/profile-photo`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return;
    const data = await resp.json().catch(() => null);
    if (!data || !('profile_photo_path' in data)) return;
    const url = profilePhotoUrl(data.profile_photo_path);
    rememberProfilePhoto(url);
    applyHeaderAvatar(root, url, displayName);
  } catch (e) {
    // Keep the existing avatar (initial) on any failure.
  }
}
