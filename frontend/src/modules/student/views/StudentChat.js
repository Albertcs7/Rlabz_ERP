import { renderStudentSidebar } from './StudentSidebar.js';
import { getProjects, getChatMessages, saveChatMessage, getWorkLogs, ensureDataLoaded } from './studentStore.js';
import { StudentSwal, showStudentWarning, showStudentError } from '../studentAlerts.js';
import { STORAGE_BASE } from '@/core/config/api.js';
import '../student.css';

export async function StudentChat(route, router) {
  await ensureDataLoaded();
  renderStudentSidebar();

  const container = document.createElement('div');
  container.className = 'student-portal-container animate-fade-in student-comm-view';

  const projects = getProjects() || [];

  // Default select first project
  let selectedProjectTitle = projects.length > 0 ? projects[0].title : '';
  let chatSearch = '';
  let draftMessage = '';
  let currentAttachment = null;

  function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  function render() {
    const messages = getChatMessages() || [];
    const currentProject = projects.find(p => p.title === selectedProjectTitle);

    // Filter messages for current project
    const projectMsgs = messages.filter(m => m.project === selectedProjectTitle);

    // KPI Metrics
    const totalSupervisorsCount = projects.length;
    const totalMsgsCount = messages.length;
    const projectMsgsCount = projectMsgs.length;
    const mySentCount = messages.filter(m => m.sender === 'student').length;

    // Filter project list for sidebar
    const filteredProjects = projects.filter(p => {
      if (!chatSearch.trim()) return true;
      const q = chatSearch.toLowerCase().trim();
      return (p.title || '').toLowerCase().includes(q) || (p.faculty || '').toLowerCase().includes(q);
    });

    // 1. Build chat sidebar lists (chats per project)
    const chatSidebarItems = filteredProjects.map(p => {
      const isSelected = p.title === selectedProjectTitle;
      const pMsgs = messages.filter(m => m.project === p.title);
      const initial = (p.faculty || 'S').charAt(0).toUpperCase();

      return `
        <div class="student-comm-item ${isSelected ? 'active' : ''}" data-project="${p.title}">
          <div class="student-comm-avatar">
            ${initial}
            <span class="student-comm-online-dot" title="Online Supervisor"></span>
          </div>
          <div class="student-comm-item-info">
            <div class="student-comm-item-title" title="${p.title}">${p.title}</div>
            <div class="student-comm-item-faculty">
              ${p.faculty} (Supervisor)
            </div>
          </div>
          ${pMsgs.length > 0 ? `
            <span class="student-badge student-badge-info" style="font-size: 0.65rem; padding: 2px 6px;">
              ${pMsgs.length}
            </span>
          ` : ''}
        </div>
      `;
    }).join('');

    // 2. Build message list HTML
    const messagesHtml = projectMsgs.map(m => {
      const isStudent = m.sender === 'student';
      const timeStr = new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const hasAttachment = Boolean(m.attachment && (m.attachment.url || m.attachment.dataUrl || m.attachment.name));

      return `
        <div class="student-comm-msg-wrap ${isStudent ? 'sent' : 'received'}">
          <div class="student-comm-bubble">
            ${m.text ? `
              <div style="white-space: pre-wrap; word-break: break-word; ${hasAttachment ? 'margin-bottom: 8px;' : ''}">
                ${m.text}
              </div>
            ` : ''}
            ${hasAttachment ? `
              <div class="student-comm-file-card" data-filename="${m.attachment.name || 'file'}" data-fileurl="${m.attachment.url || m.attachment.dataUrl || ''}" title="Click to download ${m.attachment.name || 'attachment'}">
                <div class="student-comm-file-icon">
                  ${(m.attachment.name || '').toLowerCase().endsWith('.pdf') ? '📄' :
            (m.attachment.name || '').toLowerCase().endsWith('.csv') || (m.attachment.name || '').toLowerCase().endsWith('.xlsx') ? '📊' :
              (m.attachment.type || '').startsWith('image/') ? '🖼️' : '📎'}
                </div>
                <div class="student-comm-file-details">
                  <div class="student-comm-file-name">${m.attachment.name || 'Attached File'}</div>
                  <div class="student-comm-file-size">${formatFileSize(m.attachment.size) || 'Ready to download'}</div>
                </div>
                <button type="button" class="student-comm-file-download-btn" title="Download">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
              </div>
            ` : ''}
          </div>
          <div class="student-comm-meta">
            ${isStudent ? `
              <span style="font-weight: 700; color: #00796B;">You</span>
              <span>•</span>
              <span>${timeStr}</span>
            ` : `
              <span style="font-weight: 700; color: #334155;">${currentProject ? currentProject.faculty : 'Supervisor'}</span>
              <span>•</span>
              <span>${timeStr}</span>
            `}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <!-- Header Banner -->
      <div class="student-comm-header-wrapper">
        <div class="student-comm-header-left">
          <div class="student-comm-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div>
            <h1 class="student-comm-title">Faculty Communication</h1>
            <p class="student-comm-subtitle"></p>
          </div>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="student-comm-kpi-grid">
        <div class="student-comm-kpi-card kpi-blue">
          <div class="student-comm-kpi-icon blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div class="student-comm-kpi-info">
            <div class="student-comm-kpi-val">${totalSupervisorsCount}</div>
            <div class="student-comm-kpi-lbl">Active Supervisors</div>
          </div>
        </div>

        <div class="student-comm-kpi-card kpi-indigo">
          <div class="student-comm-kpi-icon indigo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <div class="student-comm-kpi-info">
            <div class="student-comm-kpi-val">${totalMsgsCount}</div>
            <div class="student-comm-kpi-lbl">Total Messages</div>
          </div>
        </div>

        <div class="student-comm-kpi-card kpi-emerald">
          <div class="student-comm-kpi-icon emerald">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <div class="student-comm-kpi-info">
            <div class="student-comm-kpi-val">${mySentCount}</div>
            <div class="student-comm-kpi-lbl">Messages Sent</div>
          </div>
        </div>
      </div>

      <!-- Messenger Workspace Layout -->
      <div class="student-comm-container-card">
        <div class="student-comm-layout">
          <!-- Chat Sidebar (Left) -->
          <div class="student-comm-sidebar">
            <div class="student-comm-sidebar-head">
              <div class="student-comm-sidebar-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00796B" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <span>Project Supervisors</span>
              </div>
              <div class="student-comm-sidebar-search-wrap">
                <svg class="student-comm-sidebar-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" id="comm-search-input" class="student-comm-sidebar-search-input" placeholder="Search chats..." value="${chatSearch}">
              </div>
            </div>
            <div class="student-comm-sidebar-list">
              ${chatSidebarItems || '<div style="padding:24px 16px; text-align:center; color:var(--text-muted); font-size:0.82rem;">No active project supervisors found.</div>'}
            </div>
          </div>

          <!-- Chat Conversation Area (Right) -->
          <div class="student-comm-main">
            ${currentProject ? `
              <!-- Header -->
              <div class="student-comm-header">
                <div class="student-comm-header-user">
                  <div class="student-comm-avatar" style="width: 38px; height: 38px; font-size: 0.95rem;">
                    ${(currentProject.faculty || 'S').charAt(0).toUpperCase()}
                    <span class="student-comm-online-dot"></span>
                  </div>
                  <div>
                    <div class="student-comm-header-title">${currentProject.title}</div>
                    <div class="student-comm-header-sub">
                      Supervisor: <strong style="color: #334155;">${currentProject.faculty}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Message Stream -->
              <div class="student-comm-body" id="chat-body">
                <div class="student-comm-date-pill">Conversation History</div>
                ${messagesHtml || `
                  <div style="text-align:center; color:var(--text-muted); margin: 60px auto 0; font-size:0.88rem; max-width: 360px;">
                    <div style="font-size: 2rem; margin-bottom: 8px;">💬</div>
                    <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">No messages in this chat yet</div>
                    <div style="font-size: 0.8rem;">Start the conversation with your supervisor by sending a message or attaching a timesheet below.</div>
                  </div>
                `}
              </div>

              <!-- Quick Prompt Suggestions -->
              <div class="student-comm-quick-prompts">
     
              </div>

              <!-- Attachment Preview Bar (shown when file is chosen) -->
              <div id="chat-attachment-preview-bar" class="student-comm-attachment-preview-bar" style="${currentAttachment ? 'display:flex;' : 'display:none;'}">
                <div class="student-comm-attachment-preview-chip">
                  <span class="student-comm-chip-icon">
                    ${currentAttachment && (currentAttachment.name || '').toLowerCase().endsWith('.pdf') ? '📄' :
          currentAttachment && ((currentAttachment.name || '').toLowerCase().endsWith('.csv') || (currentAttachment.name || '').toLowerCase().endsWith('.xlsx')) ? '📊' : '📎'}
                  </span>
                  <span class="student-comm-chip-name" style="max-width: 220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${currentAttachment ? currentAttachment.name : ''}
                  </span>
                  <span class="student-comm-chip-size" style="color: #00796B; font-size: 0.75rem;">
                    (${currentAttachment ? formatFileSize(currentAttachment.size) : ''})
                  </span>
                  <button type="button" id="btn-remove-attachment" class="student-comm-chip-remove" title="Remove attachment">×</button>
                </div>
              </div>

              <!-- Footer Input -->
              <form id="chat-form" class="student-comm-footer">
                <input type="file" id="chat-file-input" style="display:none;" accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg">
                <button type="button" id="btn-attach-file" class="student-comm-attach-btn" title="Attach downloaded file (PDF, CSV, Timesheet, Docs)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                </button>
                <input type="text" id="chat-input" class="student-comm-input" placeholder="Type a message to ${currentProject.faculty} or attach a file..." value="${draftMessage}" autocomplete="off">
                <button type="submit" class="student-comm-send-btn">
                  <span>Send</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </form>
            ` : `
              <div style="display:flex; flex-direction: column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); gap: 10px;">
                <div style="font-size: 2.5rem;">📬</div>
                <div style="font-weight: 700; color: var(--text-primary);">Select a Project Chat</div>
                <div style="font-size: 0.85rem;">Choose a supervisor from the left list to open the conversation.</div>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // Scroll chat stream to bottom
    const chatBody = container.querySelector('#chat-body');
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    // Bind file download clicks on message attachment cards
    container.querySelectorAll('.student-comm-file-card').forEach(card => {
      card.addEventListener('click', (e) => {
        let fileUrl = card.getAttribute('data-fileurl');
        const filename = card.getAttribute('data-filename') || 'download';
        if (fileUrl) {
          if (fileUrl.startsWith('/storage')) {
            fileUrl = `${STORAGE_BASE}${fileUrl.replace(/^\/storage/, '')}`;
          }
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = filename;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          showStudentWarning('File Unavailable', 'This attachment does not have a valid download link.');
        }
      });
    });

    // Bind sidebar clicks
    container.querySelectorAll('.student-comm-item').forEach(el => {
      el.addEventListener('click', () => {
        selectedProjectTitle = el.getAttribute('data-project');
        render();
      });
    });

    // Bind search input
    const searchInput = container.querySelector('#comm-search-input');
    searchInput?.addEventListener('input', (e) => {
      chatSearch = e.target.value;
      render();
      const input = container.querySelector('#comm-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });

    // Bind file attachment button & input
    const fileInput = container.querySelector('#chat-file-input');
    const attachBtn = container.querySelector('#btn-attach-file');
    attachBtn?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (file.size > 15 * 1024 * 1024) {
        showStudentWarning('File Too Large', 'Please select a file smaller than 15MB.');
        fileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        currentAttachment = {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: reader.result
        };
        render();
        StudentSwal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Attached: ${file.name}`,
          showConfirmButton: false,
          timer: 2000
        });
      };
      reader.readAsDataURL(file);
    });

    // Bind remove attachment button
    const removeAttachBtn = container.querySelector('#btn-remove-attachment');
    removeAttachBtn?.addEventListener('click', () => {
      currentAttachment = null;
      if (fileInput) fileInput.value = '';
      render();
    });

    // Bind quick prompt chips
    container.querySelectorAll('.student-comm-prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-prompt');
        const input = container.querySelector('#chat-input');

        if (text === '__WORKLOG__') {
          const logs = getWorkLogs() || [];
          const projectLogs = logs.filter(l => l.project === selectedProjectTitle);
          if (projectLogs.length > 0) {
            const totalHours = projectLogs.reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);
            const approvedHours = projectLogs.filter(l => (l.status || '').toLowerCase() === 'approved').reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);
            const recentLogs = [...projectLogs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4);
            const entryLines = recentLogs.map(l => {
              const taskPart = l.taskCode ? `[${l.taskCode}] ` : '';
              return `• ${l.date}: ${taskPart}${parseFloat(l.hours || 0).toFixed(1)} hrs - ${l.description || 'Task work'}`;
            }).join('\n');
            const logMsg = `📋 Daily Work Log Summary (${selectedProjectTitle}):\n• Total Logged: ${totalHours.toFixed(1)} hrs (${approvedHours.toFixed(1)} hrs approved)\n${entryLines}\n\nPlease review my logged hours when convenient.`;
            if (input) {
              input.value = logMsg;
              draftMessage = logMsg;
              input.focus();
              StudentSwal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Work log summary loaded!',
                showConfirmButton: false,
                timer: 2000
              });
            }
          } else {
            const defaultMsg = `Hi Professor, I have logged my daily work hours on the portal for ${selectedProjectTitle}. Please review my timesheet when convenient.`;
            if (input) {
              input.value = defaultMsg;
              draftMessage = defaultMsg;
              input.focus();
            }
          }
          return;
        }

        if (input) {
          input.value = text;
          draftMessage = text;
          input.focus();
        }
      });
    });

    // Bind chat form submit
    const chatForm = container.querySelector('#chat-form');
    chatForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = container.querySelector('#chat-input');
      const text = input ? input.value.trim() : '';

      if (!selectedProjectTitle) {
        showStudentWarning('No Project Selected', 'Please select a project chat from the left panel before sending a message.');
        return;
      }

      if (!text && !currentAttachment) {
        showStudentWarning('Empty Message', 'Please type a message or attach a file before sending.');
        return;
      }

      try {
        const attachToSend = currentAttachment;
        await saveChatMessage(selectedProjectTitle, text, attachToSend);
        draftMessage = '';
        currentAttachment = null;
        if (fileInput) fileInput.value = '';
        render();
      } catch (err) {
        showStudentError('Message Failed', 'Could not send message. Please try again.');
      }
    });

    // Auto-scroll chat body so latest messages are in view
    setTimeout(() => {
      const chatBody = container.querySelector('.student-comm-body');
      if (chatBody) {
        chatBody.scrollTop = chatBody.scrollHeight;
      }
    }, 60);
  }

  render();
  return container;
}

export default StudentChat;

