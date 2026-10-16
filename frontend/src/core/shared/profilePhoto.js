import { authStore } from '@/core/stores/auth.js';
import { STORAGE_BASE } from '@/core/config/api.js';

/**
 * Header (topbar + profile popover) avatar for the user's server-side profile
 * photo (users.profile_photo_path, see ProfilePhotoController) — the only
 * source of profile photos for non-student roles. Used by DashboardLayout
 * (from its /auth/profile sync), ProfilePhotoEditor and the shared /profile page.
 */

/** Public URL for a stored relative path such as "profile_photos/abc.jpg" or direct image link URL. */
export function profilePhotoUrl(path) {
  if (!path) return null;
  const str = String(path).trim();
  if (!str) return null;
  if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('data:')) {
    return str;
  }
  return `${STORAGE_BASE}/${str.replace(/^\/+/, '')}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

/** Header markup for an avatar: the photo, or the name's initial (default). */
export function headerAvatarContent(url, displayName) {
  return url
    ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(displayName || 'Profile')}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.onerror=null; this.parentNode.innerHTML='${escapeHtml(String(displayName || 'User').charAt(0).toUpperCase())}';" />`
    : escapeHtml(String(displayName || 'User').charAt(0).toUpperCase());
}

// Every header avatar spot: DashboardLayout, Finance layout, Design layout, etc.
const HEADER_AVATAR_SELECTORS = [
  '#user-profile-header .avatar',
  '#finance-user-profile-header .avatar',
  '#design-user-profile-header .avatar',
  '#design-topbar-avatar',
  '#design-popover-avatar',
  '.topbar .avatar',
  '.user-profile .avatar',
  '#popover-avatar',
  '#finance-popover-avatar',
  '.profile-popover-avatar',
].join(', ');

/**
 * Puts the photo (or the initial) into every header avatar under `root`.
 * The single implementation behind DashboardLayout's updateTopBarAvatar().
 */
export function applyHeaderAvatar(root, url, displayName) {
  const scope = root || document;
  scope.querySelectorAll(HEADER_AVATAR_SELECTORS).forEach((el) => {
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
    const cleanUrl = url ? String(url).trim() : null;
    if (authStore?.user) {
      authStore.user = {
        ...authStore.user,
        profile_photo_url: cleanUrl,
        profile_photo_path: cleanUrl,
        avatar: cleanUrl
      };
    }
    const cached = JSON.parse(localStorage.getItem('user') || 'null');
    if (cached) {
      if (cleanUrl) {
        localStorage.setItem('user', JSON.stringify({
          ...cached,
          profile_photo_url: cleanUrl,
          profile_photo_path: cleanUrl,
          avatar: cleanUrl
        }));
      } else {
        delete cached.profile_photo_url;
        delete cached.profile_photo_path;
        delete cached.avatar;
        localStorage.setItem('user', JSON.stringify({
          ...cached,
          profile_photo_url: null,
          profile_photo_path: null,
          avatar: null
        }));
      }
    }
  } catch (e) {
    // Cache only — the header still updates from the server response.
  }
}
