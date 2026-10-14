import '../faculty.css';
import { API_BASE } from '@/core/config/api.js';
import { showFacultySuccessPopup, showFacultyErrorPopup } from '../facultyPopup.js';

export function FacultyProfile() {
    const container = document.createElement('div');
    container.className = 'faculty-profile';

    // Retrieve currently logged-in user from localStorage as immediate baseline
    let storedUser = null;
    try {
        storedUser = JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        storedUser = null;
    }

    const token = localStorage.getItem('token');
    let facultyPhoto = localStorage.getItem('faculty_profile_photo') || storedUser?.avatar || null;
    let isEditing = false;

    // Default state derived from logged in user if available
    let facultyData = {
        name: storedUser?.name || 'Faculty Member',
        email: storedUser?.email || 'faculty@rajagiri.edu',
        phone: storedUser?.phone || '+91 484 2660605',
        role: storedUser?.role ? (storedUser.role.charAt(0).toUpperCase() + storedUser.role.slice(1)) : 'Faculty',
        department: 'Department of Computer Applications',
        designation: 'Associate Professor'
    };

    function updateTopbarAvatar(photoUrl) {
        const topbarAvatar = document.querySelector('.topbar .avatar');
        if (topbarAvatar) {
            if (photoUrl) {
                topbarAvatar.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" />`;
                topbarAvatar.style.padding = '0';
                topbarAvatar.style.overflow = 'hidden';
            } else {
                const init = (facultyData.name || 'User').charAt(0).toUpperCase();
                topbarAvatar.textContent = init;
            }
        }
        const popoverAvatar = document.querySelector('#popover-avatar');
        if (popoverAvatar) {
            if (photoUrl) {
                popoverAvatar.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" />`;
                popoverAvatar.style.padding = '0';
                popoverAvatar.style.overflow = 'hidden';
            } else {
                const init = (facultyData.name || 'User').charAt(0).toUpperCase();
                popoverAvatar.textContent = init;
            }
        }
    }

    function updateTopbarUserName(newName) {
        const topbarName = document.querySelector('.topbar .user-name');
        if (topbarName) {
            topbarName.textContent = newName;
        }
        const profileHeaderName = document.querySelector('#user-profile-header .user-name');
        if (profileHeaderName) {
            profileHeaderName.textContent = newName;
        }
    }

    function renderUI() {
        const initials = (facultyData.name || 'Faculty Member')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        container.innerHTML = `
            <div class="page-header" style="margin-bottom: 22px;">
                <h1>Faculty Profile</h1>
                <p>Personal and academic profile details.</p>
            </div>

            <div class="simple-profile-container">
                <div class="simple-profile-card">
                    
                    <div class="simple-profile-avatar-wrap">
                        <div id="avatar-display" class="simple-profile-avatar">
                            ${facultyPhoto ? `
                                <img src="${facultyPhoto}" alt="${facultyData.name}" />
                            ` : `
                                <span>${initials}</span>
                            `}
                        </div>

                        <input type="file" id="faculty-photo-file-input" accept="image/*" style="display: none;" />

                        <div style="display: flex; flex-direction: column; gap: 5px; align-items: center; width: 100%;">
                            <button type="button" id="btn-upload-photo" class="btn btn-sm" style="font-size: 0.75rem; padding: 0.32rem 0.7rem; background: #ffffff; border: 1px solid #059669; color: #059669; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; white-space: nowrap;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                ${facultyPhoto ? 'Change Photo' : 'Upload Photo'}
                            </button>

                            ${facultyPhoto ? `
                                <button type="button" id="btn-remove-photo" style="background: none; border: none; font-size: 0.72rem; color: #dc2626; cursor: pointer; text-decoration: underline; padding: 0;">
                                    Remove Photo
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <div class="simple-profile-details">
                        <div class="simple-profile-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <h2>${facultyData.name}</h2>
                                <span class="simple-profile-badge">${facultyData.role}</span>
                            </div>
                            <div>
                                <a href="/profile" id="btn-profile-settings" class="btn btn-sm" style="font-size: 0.82rem; padding: 0.42rem 0.95rem; background: #ecfdf5; border: 1px solid #059669; color: #059669; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s ease;">
                                    <span>Profile Settings & Change Password &rarr;</span>
                                </a>
                            </div>
                        </div>

                        <div class="simple-profile-grid">
                            <div class="simple-profile-field">
                                <span class="label">Full Name</span>
                                <div class="value">${facultyData.name}</div>
                            </div>

                            <div class="simple-profile-field">
                                <span class="label">Email Address</span>
                                <div class="value">${facultyData.email}</div>
                            </div>

                            <div class="simple-profile-field">
                                <span class="label">Phone Number</span>
                                <div class="value">${facultyData.phone || 'Not provided'}</div>
                            </div>

                            <div class="simple-profile-field">
                                <span class="label">Department</span>
                                <div class="value">${facultyData.department}</div>
                            </div>

                            <div class="simple-profile-field">
                                <span class="label">Designation</span>
                                <div class="value">${facultyData.designation}</div>
                            </div>

                            <div class="simple-profile-field">
                                <span class="label">Account Status</span>
                                <div class="value" style="color: #059669; display: flex; align-items: center; gap: 6px;">
                                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                                    Active
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Edit Profile Modal Overlay -->
            <div id="edit-profile-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(2px); z-index: 9999; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;">
                <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 520px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15); border: 1px solid #e2e8f0; overflow: hidden; animation: fadeInModal 0.2s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #f1f5f9; background: #f8fafc;">
                        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Edit Faculty Profile
                        </h3>
                        <button type="button" id="btn-close-edit-modal" style="background: none; border: none; font-size: 1.3rem; color: #64748b; cursor: pointer; line-height: 1;">&times;</button>
                    </div>

                    <form id="edit-profile-form" style="padding: 22px 24px;">
                        <div style="display: flex; flex-direction: column; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Full Name *</label>
                                <input type="text" id="edit-name" required value="${facultyData.name}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;" />
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Email Address *</label>
                                <input type="email" id="edit-email" required value="${facultyData.email}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;" />
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Phone Number</label>
                                <input type="text" id="edit-phone" value="${facultyData.phone || ''}" placeholder="+91 484 2660605" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;" />
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Department</label>
                                    <input type="text" id="edit-department" value="${facultyData.department}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;" />
                                </div>

                                <div>
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Designation</label>
                                    <input type="text" id="edit-designation" value="${facultyData.designation}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;" />
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; padding-top: 14px; border-top: 1px solid #f1f5f9;">
                            <button type="button" id="btn-cancel-edit" style="padding: 8px 16px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">Cancel</button>
                            <button type="submit" id="btn-save-profile" style="padding: 8px 18px; border: none; background: #059669; color: #ffffff; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Change Password Modal Overlay -->
            <div id="change-password-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(2px); z-index: 9999; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;">
                <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 480px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15); border: 1px solid #e2e8f0; overflow: hidden; animation: fadeInModal 0.2s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #f1f5f9; background: #f8fafc;">
                        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Change Faculty Password
                        </h3>
                        <button type="button" id="btn-close-pwd-modal" style="background: none; border: none; font-size: 1.3rem; color: #64748b; cursor: pointer; line-height: 1;">&times;</button>
                    </div>

                    <form id="change-password-form" style="padding: 22px 24px;">
                        <div style="display: flex; flex-direction: column; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Current Password *</label>
                                <input type="password" id="input-curr-password" required placeholder="Enter your current password" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;" autocomplete="current-password" />
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">New Password *</label>
                                <input type="password" id="input-new-password" required minlength="6" placeholder="Enter new password (min. 6 characters)" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;" autocomplete="new-password" />
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Confirm New Password *</label>
                                <input type="password" id="input-confirm-password" required minlength="6" placeholder="Re-enter new password" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box;" autocomplete="new-password" />
                            </div>
                        </div>

                        <div id="pwd-error-msg" style="display: none; margin-top: 12px; padding: 8px 12px; border-radius: 6px; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; font-size: 0.82rem;"></div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; padding-top: 14px; border-top: 1px solid #f1f5f9;">
                            <button type="button" id="btn-cancel-pwd" style="padding: 8px 16px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">Cancel</button>
                            <button type="submit" id="btn-submit-pwd" style="padding: 8px 18px; border: none; background: #0284c7; color: #ffffff; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    function setupListeners() {
        const btnUpload = container.querySelector('#btn-upload-photo');
        const fileInput = container.querySelector('#faculty-photo-file-input');
        const btnRemove = container.querySelector('#btn-remove-photo');
        const btnEdit = container.querySelector('#btn-edit-profile');
        const editModal = container.querySelector('#edit-profile-modal');
        const btnCloseModal = container.querySelector('#btn-close-edit-modal');
        const btnCancelEdit = container.querySelector('#btn-cancel-edit');
        const editForm = container.querySelector('#edit-profile-form');

        if (btnUpload && fileInput) {
            btnUpload.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    showFacultyErrorPopup('Invalid File', 'Please select a valid image file (PNG, JPG, JPEG, WEBP).');
                    return;
                }

                if (file.size > 5 * 1024 * 1024) {
                    showFacultyErrorPopup('File Too Large', 'Please select an image smaller than 5MB.');
                    return;
                }

                // Show loading state
                if (btnUpload) {
                    btnUpload.disabled = true;
                    btnUpload.innerHTML = 'Uploading...';
                }

                try {
                    const formData = new FormData();
                    formData.append('photo', file);
                    if (storedUser?.email) {
                        formData.append('email', storedUser.email);
                    }

                    const headers = {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    };

                    const res = await fetch(`${API_BASE}/faculty/profile/photo`, {
                        method: 'POST',
                        headers,
                        body: formData
                    });

                    const data = await res.json();

                    if (res.ok && (data.status === 'success' || data.photo_url || data.photo)) {
                        const finalPhotoUrl = data.photo_url || data.photo || (data.data && data.data.photo);
                        facultyPhoto = finalPhotoUrl;
                        localStorage.setItem('faculty_profile_photo', finalPhotoUrl);
                        if (storedUser) {
                            storedUser.avatar = finalPhotoUrl;
                            localStorage.setItem('user', JSON.stringify(storedUser));
                        }
                        updateTopbarAvatar(finalPhotoUrl);
                        showFacultySuccessPopup('Profile Photo Updated', 'Your profile photo has been uploaded and saved to your profile.');
                        renderUI();
                        setupListeners();
                    } else {
                        showFacultyErrorPopup('Upload Failed', data.message || data.error || 'Failed to upload profile photo to server.');
                    }
                } catch (err) {
                    console.error('Photo upload error:', err);
                    showFacultyErrorPopup('Network Error', 'Failed to connect to server to upload profile photo.');
                } finally {
                    if (btnUpload) {
                        btnUpload.disabled = false;
                        btnUpload.innerHTML = `
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                            ${facultyPhoto ? 'Change Photo' : 'Upload Photo'}
                        `;
                    }
                }
            });
        }

        if (btnRemove) {
            btnRemove.addEventListener('click', async () => {
                try {
                    const headers = {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    };
                    await fetch(`${API_BASE}/faculty/profile/photo`, {
                        method: 'DELETE',
                        headers
                    });
                } catch (err) {
                    console.warn('Could not remove photo on server:', err);
                }
                facultyPhoto = null;
                localStorage.removeItem('faculty_profile_photo');
                if (storedUser) {
                    delete storedUser.avatar;
                    localStorage.setItem('user', JSON.stringify(storedUser));
                }
                updateTopbarAvatar(null);
                showFacultySuccessPopup('Photo Removed', 'Profile photo removed. Default initials avatar restored.');
                renderUI();
                setupListeners();
            });
        }

        // Edit Profile modal handlers
        if (btnEdit && editModal) {
            btnEdit.addEventListener('click', () => {
                editModal.style.display = 'flex';
            });
        }

        if (btnCloseModal && editModal) {
            btnCloseModal.addEventListener('click', () => {
                editModal.style.display = 'none';
            });
        }

        if (btnCancelEdit && editModal) {
            btnCancelEdit.addEventListener('click', () => {
                editModal.style.display = 'none';
            });
        }

        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal) {
                    editModal.style.display = 'none';
                }
            });
        }

        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const nameInput = container.querySelector('#edit-name');
                const emailInput = container.querySelector('#edit-email');
                const phoneInput = container.querySelector('#edit-phone');
                const deptInput = container.querySelector('#edit-department');
                const desigInput = container.querySelector('#edit-designation');
                const btnSave = container.querySelector('#btn-save-profile');

                const payload = {
                    name: (nameInput?.value || '').trim(),
                    email: (emailInput?.value || '').trim(),
                    phone: (phoneInput?.value || '').trim(),
                    department: (deptInput?.value || '').trim(),
                    designation: (desigInput?.value || '').trim(),
                };

                if (!payload.name || !payload.email) {
                    showFacultyErrorPopup('Validation Error', 'Full Name and Email Address are required.');
                    return;
                }

                if (btnSave) {
                    btnSave.disabled = true;
                    btnSave.textContent = 'Saving...';
                }

                try {
                    const headers = {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    };

                    const res = await fetch(`${API_BASE}/faculty/profile`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify(payload)
                    });

                    const data = await res.json();

                    if (res.ok && (data.status === 'success' || data.name || data.data)) {
                        const updated = data.data || data;
                        facultyData.name = updated.name || payload.name;
                        facultyData.email = updated.email || payload.email;
                        facultyData.phone = updated.phone || payload.phone;
                        if (updated.department) facultyData.department = updated.department;
                        if (updated.designation) facultyData.designation = updated.designation;

                        // Persist in localStorage stored user
                        if (storedUser) {
                            storedUser.name = facultyData.name;
                            storedUser.email = facultyData.email;
                            storedUser.phone = facultyData.phone;
                            localStorage.setItem('user', JSON.stringify(storedUser));
                        }

                        updateTopbarUserName(facultyData.name);
                        showFacultySuccessPopup('Profile Updated', 'Your profile details have been successfully updated in the database.');
                        editModal.style.display = 'none';
                        renderUI();
                        setupListeners();
                    } else {
                        showFacultyErrorPopup('Update Error', data.error || data.message || 'Could not update profile details.');
                    }
                } catch (err) {
                    console.error('Failed to update faculty profile:', err);
                    showFacultyErrorPopup('Network Error', 'Failed to connect to server to update profile.');
                } finally {
                    if (btnSave) {
                        btnSave.disabled = false;
                        btnSave.textContent = 'Save Changes';
                    }
                }
            });
        }

        // Setup Change Password modal listeners
        const btnChangePwd = container.querySelector('#btn-change-password');
        const pwdModal = container.querySelector('#change-password-modal');
        const btnClosePwdModal = container.querySelector('#btn-close-pwd-modal');
        const btnCancelPwd = container.querySelector('#btn-cancel-pwd');
        const pwdForm = container.querySelector('#change-password-form');
        const pwdErrorMsg = container.querySelector('#pwd-error-msg');

        if (btnChangePwd && pwdModal) {
            btnChangePwd.addEventListener('click', () => {
                pwdModal.style.display = 'flex';
                if (pwdErrorMsg) pwdErrorMsg.style.display = 'none';
                if (pwdForm) pwdForm.reset();
                container.querySelector('#input-curr-password')?.focus();
            });
        }

        const closePwdModal = () => {
            if (pwdModal) pwdModal.style.display = 'none';
            if (pwdForm) pwdForm.reset();
            if (pwdErrorMsg) pwdErrorMsg.style.display = 'none';
        };

        if (btnClosePwdModal) btnClosePwdModal.addEventListener('click', closePwdModal);
        if (btnCancelPwd) btnCancelPwd.addEventListener('click', closePwdModal);
        if (pwdModal) {
            pwdModal.addEventListener('click', (e) => {
                if (e.target === pwdModal) closePwdModal();
            });
        }

        if (pwdForm) {
            pwdForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const currPwd = (container.querySelector('#input-curr-password')?.value || '').trim();
                const newPwd = (container.querySelector('#input-new-password')?.value || '').trim();
                const confirmPwd = (container.querySelector('#input-confirm-password')?.value || '').trim();
                const btnSubmit = container.querySelector('#btn-submit-pwd');

                if (pwdErrorMsg) pwdErrorMsg.style.display = 'none';

                if (!currPwd || !newPwd || !confirmPwd) {
                    if (pwdErrorMsg) {
                        pwdErrorMsg.textContent = 'All fields are required.';
                        pwdErrorMsg.style.display = 'block';
                    }
                    return;
                }

                if (newPwd.length < 6) {
                    if (pwdErrorMsg) {
                        pwdErrorMsg.textContent = 'New password must be at least 6 characters.';
                        pwdErrorMsg.style.display = 'block';
                    }
                    return;
                }

                if (newPwd !== confirmPwd) {
                    if (pwdErrorMsg) {
                        pwdErrorMsg.textContent = 'New password and confirmation password do not match.';
                        pwdErrorMsg.style.display = 'block';
                    }
                    return;
                }

                if (btnSubmit) {
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = 'Updating...';
                }

                try {
                    const headers = {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    };

                    const res = await fetch(`${API_BASE}/faculty/change-password`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            current_password: currPwd,
                            new_password: newPwd,
                            confirm_password: confirmPwd
                        })
                    });

                    const data = await res.json();

                    if (res.ok && (data.status === 'success' || data.success)) {
                        closePwdModal();
                        showFacultySuccessPopup('Password Changed', 'Your password has been successfully updated in the database.');
                    } else {
                        if (pwdErrorMsg) {
                            pwdErrorMsg.textContent = data.error || data.message || 'Failed to update password.';
                            pwdErrorMsg.style.display = 'block';
                        }
                    }
                } catch (err) {
                    console.error('Password change error:', err);
                    if (pwdErrorMsg) {
                        pwdErrorMsg.textContent = 'Network error while attempting to update password.';
                        pwdErrorMsg.style.display = 'block';
                    }
                } finally {
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.textContent = 'Update Password';
                    }
                }
            });
        }
    }

    // Fetch latest details from users table via API
    async function loadFacultyProfile() {
        try {
            const apiBase = API_BASE;
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            
            const queryParam = storedUser?.email ? `?email=${encodeURIComponent(storedUser.email)}` : '';
            const res = await fetch(`${apiBase}/faculty/profile${queryParam}`, { headers });
            if (res.ok) {
                const data = await res.json();
                if (data && data.name) {
                    facultyData = {
                        name: data.name,
                        email: data.email,
                        phone: data.phone || 'Not provided',
                        role: data.role || 'Faculty',
                        department: data.department || 'Department of Computer Applications',
                        designation: data.designation || 'Associate Professor'
                    };
                    if (data.photo || data.avatar) {
                        const fetchedPhoto = data.photo || data.avatar;
                        facultyPhoto = fetchedPhoto;
                        localStorage.setItem('faculty_profile_photo', fetchedPhoto);
                        if (storedUser) {
                            storedUser.avatar = fetchedPhoto;
                            localStorage.setItem('user', JSON.stringify(storedUser));
                        }
                        updateTopbarAvatar(fetchedPhoto);
                    }
                    renderUI();
                    setupListeners();
                }
            }
        } catch (err) {
            console.warn('Could not fetch faculty profile from API, using stored credentials:', err);
        }
    }

    renderUI();
    setupListeners();
    loadFacultyProfile();

    return container;
}

export default FacultyProfile;