import { renderStudentSidebar } from './StudentSidebar.js';
import {
  getMeetings,
  ensureDataLoaded
} from './studentStore.js';
import { StudentSwal, showStudentSuccess } from '../studentAlerts.js';
import '../student.css';

function ucfirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toIsoDate(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return s;
}

function formatDateReadable(isoStr) {
  if (!isoStr) return '';
  const s = String(isoStr).trim();
  const d = new Date(s.includes('T') ? s : `${s}T00:00:00`);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return isoStr;
}

export async function StudentMeetings(route, router) {
  await ensureDataLoaded(true);
  renderStudentSidebar();

  const container = document.createElement('div');
  container.className = 'student-portal-container animate-fade-in student-meetings-view';

  // 1. Retrieve real meetings directly from database
  const rawMeetings = getMeetings() || [];

  // Helper to get today's YYYY-MM-DD
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 2. Normalize DB meetings
  const allEvents = rawMeetings.map(m => {
    const rawStatus = (m.raw_status || m.status || 'scheduled').toLowerCase().trim();
    const isCompleted = rawStatus === 'completed' || m.is_completed === true;
    const isCancelled = rawStatus === 'cancelled' || m.is_cancelled === true;
    const isUpcoming = rawStatus === 'scheduled' || rawStatus === 'upcoming' || (!isCompleted && !isCancelled);
    const meetId = m.id ? (String(m.id).startsWith('meet-') ? String(m.id) : `meet-${m.id}`) : `meet-${Math.random()}`;
    const isoDate = toIsoDate(m.date || m.scheduled_at || todayStr);
    const formattedDate = m.formatted_date || formatDateReadable(isoDate);

    return {
      id: meetId,
      source_id: m.source_id || m.id,
      category: 'meeting',
      category_label: 'Project Review / Meeting',
      title: m.title || 'Project Meeting',
      project: m.project || 'Academic Project',
      projectId: m.projectId || m.project_id,
      date: isoDate,
      formatted_date: formattedDate,
      time: m.time || '14:00',
      status: isCompleted ? 'Completed' : (isCancelled ? 'Cancelled' : 'Upcoming'),
      raw_status: rawStatus,
      is_completed: isCompleted,
      is_cancelled: isCancelled,
      is_upcoming: isUpcoming,
      location: m.location || 'Google Meet',
      meeting_link: m.meeting_link || m.meetingLink || (m.location && m.location.includes('http') ? m.location : null),
      agenda: m.agenda || '',
      description: m.description || m.agenda || 'Scheduled standup and project evaluation session with faculty supervisor.',
      notes: m.notes || '',
      meeting_notes: m.meeting_notes || null,
      minutes: m.minutes || (m.meeting_notes ? m.meeting_notes.minutes : null),
      important_decisions: m.important_decisions || (m.meeting_notes ? m.meeting_notes.important_decisions : null),
      participants: Array.isArray(m.participants) ? m.participants : [],
      assigned_by: m.scheduled_by || m.assigned_by || 'Faculty Supervisor',
      scheduled_by: m.scheduled_by || m.assigned_by || 'Faculty Supervisor',
      badge_color: isCompleted ? 'emerald' : (isCancelled ? 'rose' : 'teal')
    };
  });

  // Default focus on August 2026 meeting so Aug 5 and Aug 11 are directly visible and highlighted on load
  const defaultMeet = allEvents.find(e => e.date && e.date.startsWith('2026-08')) || allEvents[0] || null;
  const nextActivityDate = defaultMeet ? `${defaultMeet.date}` : 'None';

  // State
  let searchQuery = '';
  let statusFilter = 'all';   // 'all' | 'completed' | 'upcoming' | 'cancelled'
  let projectFilter = 'all';
  let dateFilter = null;
  let selectedEventId = defaultMeet ? defaultMeet.id : null;

  // Calendar tracking
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth(); // 0=Jan .. 11=Dec

  if (defaultMeet && defaultMeet.date) {
    const parts = defaultMeet.date.split('-').map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      currentYear = parts[0];
      currentMonth = parts[1] - 1; // 0-indexed: 7 = August
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function render() {
    // 1. Calculate KPI Metrics across real DB meetings
    const totalCount = allEvents.length;
    const completedCount = allEvents.filter(e => e.is_completed).length;
    const upcomingCount = allEvents.filter(e => e.is_upcoming).length;
    const cancelledCount = allEvents.filter(e => e.is_cancelled).length;

    // 2. Filter events
    const filteredEvents = allEvents.filter(e => {
      // Status filter
      if (statusFilter === 'completed' && !e.is_completed) return false;
      if (statusFilter === 'upcoming' && !e.is_upcoming) return false;
      if (statusFilter === 'cancelled' && !e.is_cancelled) return false;

      // Project filter
      if (projectFilter !== 'all' && e.project !== projectFilter) {
        return false;
      }
      // Date filter from calendar day click
      if (dateFilter && e.date !== dateFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = (e.title || '').toLowerCase().includes(q);
        const inProject = (e.project || '').toLowerCase().includes(q);
        const inDesc = (e.description || '').toLowerCase().includes(q);
        const inNotes = (e.notes || '').toLowerCase().includes(q);
        const inAssignee = (e.assigned_by || '').toLowerCase().includes(q);
        const inPart = (e.participants || []).some(p => (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q));
        if (!inTitle && !inProject && !inDesc && !inNotes && !inAssignee && !inPart) {
          return false;
        }
      }
      return true;
    });

    // Auto-select fallback if selectedEvent is not in filtered list
    let selectedEvent = allEvents.find(e => e.id === selectedEventId);
    if (!selectedEvent && filteredEvents.length > 0) {
      selectedEvent = filteredEvents[0];
      selectedEventId = selectedEvent.id;
    } else if (filteredEvents.length > 0 && !filteredEvents.some(e => e.id === selectedEventId)) {
      selectedEvent = filteredEvents[0];
      selectedEventId = selectedEvent.id;
    }

    // 3. Calendar Grid Generator for currentMonth / currentYear
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun .. 6=Sat
    const startDayOffset = firstDayIndex;
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysArray = [];

    for (let i = 0; i < startDayOffset; i++) {
      daysArray.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      daysArray.push(d);
    }

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(h => `
      <div class="student-cal-day-header">${h}</div>
    `).join('');

    const monthEventsCount = allEvents.filter(e => {
      if (!e.date) return false;
      const parts = e.date.split('-');
      return parseInt(parts[0], 10) === currentYear && parseInt(parts[1], 10) === (currentMonth + 1);
    }).length;

    const dayCells = daysArray.map(day => {
      if (day === null) {
        return `<div class="student-cal-day-cell empty"></div>`;
      }

      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = allEvents.filter(e => e.date === dateStr);
      const hasEvents = dayEvents.length > 0;
      const hasCompleted = dayEvents.some(e => e.is_completed);
      const hasUpcoming = dayEvents.some(e => e.is_upcoming);
      const hasCancelled = dayEvents.some(e => e.is_cancelled);

      const isToday = (
        currentYear === now.getFullYear() &&
        currentMonth === now.getMonth() &&
        day === now.getDate()
      );
      const isDateFiltered = (dateFilter === dateStr) || (!dateFilter && selectedEvent && selectedEvent.date === dateStr);

      const cellClasses = ['student-cal-day-cell'];
      if (hasEvents) {
        cellClasses.push('has-events');
        if (hasCompleted) {
          cellClasses.push('has-completed-meeting');
        } else if (hasUpcoming) {
          cellClasses.push('has-upcoming-meeting');
        } else if (hasCancelled) {
          cellClasses.push('has-cancelled-meeting');
        }
      }
      if (isToday) cellClasses.push('today');
      if (isDateFiltered) cellClasses.push('active-selected');

      let tooltipText = '';
      if (hasEvents) {
        const statusLabel = hasCompleted ? 'Completed' : (hasUpcoming ? 'Upcoming' : 'Cancelled');
        tooltipText = `${dayEvents.map(e => e.title).join(', ')} (${statusLabel} on ${dateStr})`;
      } else if (isToday) {
        tooltipText = 'Today (No meetings scheduled)';
      }

      // High-visibility meeting badge pill inside day cell
      let meetingPillHtml = '';
      if (hasEvents) {
        if (hasCompleted) {
          meetingPillHtml = `
            <div class="student-cal-meeting-indicator">
              <span class="student-cal-badge-pill pill-completed" title="Completed Session">
                <span>✓ ${dayEvents.length > 1 ? `${dayEvents.length} Done` : 'Done'}</span>
              </span>
            </div>
          `;
        } else if (hasUpcoming) {
          meetingPillHtml = `
            <div class="student-cal-meeting-indicator">
              <span class="student-cal-badge-pill pill-upcoming" title="Upcoming Scheduled Meeting">
                <span class="student-cal-glow-dot"></span>
                <span>${dayEvents.length > 1 ? `${dayEvents.length} Meets` : 'Meet'}</span>
              </span>
            </div>
          `;
        } else if (hasCancelled) {
          meetingPillHtml = `
            <div class="student-cal-meeting-indicator">
              <span class="student-cal-badge-pill pill-cancelled" title="Cancelled Meeting">
                <span>✕ ${dayEvents.length > 1 ? `${dayEvents.length} Off` : 'Off'}</span>
              </span>
            </div>
          `;
        }
      }

      return `
        <div class="${cellClasses.join(' ')}" data-date="${dateStr}" data-day="${day}" title="${tooltipText}">
          <span class="student-cal-day-number">${day}</span>
          ${meetingPillHtml}
        </div>
      `;
    }).join('');

    // 4. Project Filter Dropdown Options
    const uniqueProjects = Array.from(new Set(allEvents.map(e => e.project).filter(Boolean)));
    const projectFilterOptions = uniqueProjects.map(p => `
      <option value="${p}" ${projectFilter === p ? 'selected' : ''}>${p}</option>
    `).join('');

    const isFiltersActive = searchQuery.trim() !== '' || statusFilter !== 'all' || projectFilter !== 'all' || dateFilter !== null;

    // 5. Meeting Cards List HTML
    const activityCardsHtml = filteredEvents.map(e => {
      const isSelected = e.id === selectedEventId;
      const isGoogleMeet = (e.location && e.location.toLowerCase().includes('google meet')) || Boolean(e.meeting_link);
      const participantCount = e.participants ? e.participants.length : 0;
      const hasNotes = Boolean(e.meeting_notes || (e.notes && e.is_completed));

      let statusBadgeHtml = '';
      if (e.is_cancelled) {
        statusBadgeHtml = `
          <span class="student-event-status-badge cancelled" style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:2px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">
            ✕ Cancelled
          </span>
        `;
      } else if (e.is_completed) {
        statusBadgeHtml = `
          <span class="student-event-status-badge completed">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Completed
          </span>
        `;
      } else {
        statusBadgeHtml = `
          <span class="student-event-status-badge upcoming">
            <span class="student-status-pulse amber"></span>
            Upcoming
          </span>
        `;
      }

      return `
        <div class="student-event-item cat-meeting ${e.is_cancelled ? 'is-cancelled' : ''} ${e.is_completed ? 'is-completed' : ''} ${isSelected ? 'active-selected' : ''}" data-id="${e.id}">
          <div class="student-event-item-body">
            <div class="student-event-item-top-row">
              <span class="student-event-cat-tag cat-meeting" style="background:#E0F2F1; color:#00796B; border:1px solid #B2DFDB;">
                ${e.project}
              </span>
              ${hasNotes ? `<span style="font-size:0.7rem; font-weight:700; color:#166534; background:#dcfce7; padding:2px 6px; border-radius:6px;">📝 Minutes Available</span>` : ''}
            </div>
            <div class="student-event-item-title">
              ${e.title}
            </div>
            <div class="student-event-item-meta">
              <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${e.formatted_date || e.date}
              </span>
              <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                ${e.time}
              </span>
              ${participantCount > 0 ? `
                <span title="${participantCount} participants">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                  ${participantCount} people
                </span>
              ` : ''}
              ${isGoogleMeet ? `
                <span style="color: #00796B; font-weight: 700;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                  Meet
                </span>
              ` : ''}
            </div>
          </div>
          <div class="student-event-item-right">
            ${statusBadgeHtml}
          </div>
        </div>
      `;
    }).join('');

    // 6. Selected Activity Detailed Workspace
    let detailsHtml = '';
    if (selectedEvent) {
      const meetRawUrl = selectedEvent.meeting_link || selectedEvent.meetingLink || '';
      const isGoogleMeet = (selectedEvent.location && selectedEvent.location.toLowerCase().includes('google meet')) || Boolean(meetRawUrl);
      const meetHref = meetRawUrl.startsWith('http') ? meetRawUrl : (meetRawUrl ? `https://${meetRawUrl}` : 'https://meet.google.com');
      const fullDateStr = selectedEvent.formatted_date || selectedEvent.date;

      // Participants list
      const participants = selectedEvent.participants || [];
      const participantsHtml = participants.length > 0 ? `
        <div class="student-meet-section-card">
          <div class="student-meet-section-header">
            <div class="student-meet-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00796B" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Meeting Participants &amp; Attendance Roster
            </div>
            <span class="student-badge student-badge-info" style="font-size: 0.72rem; font-weight: 700;">
              ${participants.length} Participant${participants.length > 1 ? 's' : ''}
            </span>
          </div>

          <div class="student-meet-participants-grid">
            ${participants.map(p => {
              const initial = (p.name || 'U').charAt(0).toUpperCase();
              const statusClass = (p.attendance_status || 'invited').toLowerCase();
              return `
                <div class="student-meet-participant-card">
                  <div class="student-meet-participant-avatar">${initial}</div>
                  <div class="student-meet-participant-info">
                    <div class="student-meet-participant-name" title="${p.name}">${p.name}</div>
                    <div class="student-meet-participant-role">
                      <span>${p.role ? ucfirst(p.role) : 'Member'}</span>
                      <span>•</span>
                      <span class="student-meet-att-badge ${statusClass}">
                        ${statusClass === 'attended' ? '✓ Attended' : (statusClass === 'absent' ? '✕ Absent' : '✉ Invited')}
                      </span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : `
        <div class="student-meet-section-card">
          <div class="student-meet-section-header">
            <div class="student-meet-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00796B" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
              Meeting Participants
            </div>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">
            Invited: Project Team Members and Assigned Faculty Supervisor.
          </div>
        </div>
      `;

      // Meeting Notes & Minutes (from meeting_notes table)
      const mNotes = selectedEvent.meeting_notes;
      const minutesText = mNotes ? mNotes.minutes : (selectedEvent.minutes || null);
      const decisionsText = mNotes ? mNotes.important_decisions : (selectedEvent.important_decisions || null);
      const hasAnyNotes = Boolean(minutesText || decisionsText);

      const meetingNotesHtml = hasAnyNotes ? `
        <div class="student-meet-section-card">
          <div class="student-meet-section-header">
            <div class="student-meet-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Official Meeting Notes &amp; Minutes (from meeting_notes)
            </div>
            <span class="student-badge student-badge-success" style="font-size: 0.72rem; font-weight: 700;">
              ✓ Verified Sign-off
            </span>
          </div>

          <div class="student-meet-notes-grid">
            ${minutesText ? `
              <div class="student-meet-minutes-box">
                <div class="student-meet-box-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                  Discussion Minutes &amp; Evaluation
                </div>
                <div class="student-meet-box-content">${minutesText}</div>
              </div>
            ` : ''}

            ${decisionsText ? `
              <div class="student-meet-decisions-box">
                <div class="student-meet-box-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  Important Decisions &amp; Action Items
                </div>
                <div class="student-meet-box-content">${decisionsText}</div>
              </div>
            ` : ''}

            ${mNotes && (mNotes.uploaded_by || mNotes.uploaded_on) ? `
              <div class="student-meet-notes-meta">
                <span>Recorded by: <strong>${mNotes.uploaded_by || 'Faculty Supervisor'}</strong></span>
                ${mNotes.uploaded_on ? `<span>• Published: ${mNotes.uploaded_on}</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      ` : `
        <div class="student-meet-section-card">
          <div class="student-meet-section-header">
            <div class="student-meet-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00796B" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              Meeting Notes &amp; Minutes
            </div>
            <span class="student-badge student-badge-info" style="font-size: 0.72rem;">Pending Completion</span>
          </div>
          <div style="font-size: 0.84rem; color: var(--text-muted); line-height: 1.5;">
            ${selectedEvent.is_completed 
              ? 'No additional written minutes were filed in the meeting_notes table for this session.' 
              : `This meeting is scheduled for <strong>${fullDateStr}</strong>. The faculty supervisor will record official minutes and important decisions in the database upon conclusion of the session.`}
          </div>
        </div>
      `;

      detailsHtml = `
        <div class="student-meet-detail-card">
          <!-- Detail Header Banner -->
          <div class="student-meet-detail-header">
            <div>
              <div class="student-meet-detail-badges">
                <span class="student-event-cat-tag cat-meeting" style="background:#E0F2F1; color:#00796B; border:1px solid #B2DFDB;">
                  ${selectedEvent.project}
                </span>
                <span class="student-badge ${selectedEvent.is_completed ? 'student-badge-success' : (selectedEvent.is_overdue ? 'student-badge-danger' : 'student-badge-warning')}">
                  ${selectedEvent.status}
                </span>
              </div>
              <h2 class="student-meet-detail-title">${selectedEvent.title}</h2>
            </div>
          </div>

          <!-- Alert Context Banner -->
          ${selectedEvent.is_cancelled ? `
            <div class="student-cal-alert-banner alert-overdue" style="background:#fee2e2; border-color:#fca5a5; color:#991b1b;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              <div>
                <strong>Cancelled Session:</strong> This review meeting was cancelled.
              </div>
            </div>
          ` : (selectedEvent.is_completed ? `
            <div class="student-cal-alert-banner alert-completed">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <div>
                <strong>Session Completed:</strong> Official minutes and attendance records verified on <strong>${fullDateStr}</strong>.
              </div>
            </div>
          ` : `
            <div class="student-cal-alert-banner alert-upcoming">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <div>
                <strong>Upcoming Meeting:</strong> Scheduled for <strong>${fullDateStr} at ${selectedEvent.time}</strong>.
              </div>
            </div>
          `)}

          <!-- 3-Column Meta Information Grid -->
          <div class="student-meet-meta-grid">
            <div class="student-meet-meta-box">
              <div class="student-meet-meta-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <div class="student-meet-meta-info">
                <span class="student-meet-meta-label">Date</span>
                <span class="student-meet-meta-val">${fullDateStr}</span>
              </div>
            </div>

            <div class="student-meet-meta-box">
              <div class="student-meet-meta-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div class="student-meet-meta-info">
                <span class="student-meet-meta-label">Time</span>
                <span class="student-meet-meta-val">${selectedEvent.time}</span>
              </div>
            </div>

            <div class="student-meet-meta-box">
              <div class="student-meet-meta-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <div class="student-meet-meta-info">
                <span class="student-meet-meta-label">Supervisor / Assigner</span>
                <span class="student-meet-meta-val">${selectedEvent.assigned_by || 'Faculty Supervisor'}</span>
              </div>
            </div>
          </div>

          <!-- Video Conference Action Banner (If Online Google Meet) -->
          ${isGoogleMeet ? `
            <div class="student-meet-call-banner">
              <div class="student-meet-call-info">
                <div class="student-meet-call-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                </div>
                <div>
                  <h4 class="student-meet-call-title">Google Meet Video Conference</h4>
                  <div class="student-meet-call-sub">${meetRawUrl || 'Online Video Meeting Room'}</div>
                </div>
              </div>
              <div class="student-meet-call-actions">
                <button type="button" class="student-meet-btn-copy btn-copy-meet-link" data-url="${meetHref}" title="Copy Google Meet Link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  Copy Link
                </button>
                <a href="${meetHref}" target="_blank" rel="noopener noreferrer" class="student-meet-btn-join student-meet-link" data-title="${selectedEvent.title}">
                  <span>Join Video Call</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              </div>
            </div>
          ` : (selectedEvent.location ? `
            <div class="student-meet-venue-card">
              <div class="student-meet-venue-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
              <div>
                <div class="student-meet-venue-title">Location &amp; In-Person Venue</div>
                <div class="student-meet-venue-desc">${selectedEvent.location}</div>
              </div>
            </div>
          ` : '')}

          <!-- Agenda / Supervisor Instructions Section -->
          ${selectedEvent.agenda ? `
            <div class="student-meet-notes-section">
              <div class="student-meet-notes-header">
                <div class="student-meet-notes-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00796B" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  Meeting Agenda &amp; Supervisor Instructions
                </div>
              </div>
              <div class="student-meet-notes-body">
                ${selectedEvent.agenda}
              </div>
            </div>
          ` : ''}

          <!-- Meeting Participants & Attendance Roster -->
          ${participantsHtml}

          <!-- Meeting Notes & Minutes (from meeting_notes) -->
          ${meetingNotesHtml}
        </div>
      `;
    } else {
      detailsHtml = `
        <div class="student-meet-empty-detail">
          <div class="student-meet-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div class="student-meet-empty-title">
            ${dateFilter ? `No Meetings on ${formatDateReadable(dateFilter)}` : 'No Meeting Selected'}
          </div>
          <div class="student-meet-empty-desc">
            ${dateFilter 
              ? `There are no project review meetings scheduled on this date. Click another highlighted date or reset the date filter.` 
              : `Choose a highlighted date on the calendar or click a meeting from the roster to view supervisor agenda, official meeting minutes, and attendee roster.`}
          </div>
          ${dateFilter ? `
            <button type="button" id="btn-empty-reset-date" class="student-btn student-btn-outline student-btn-sm" style="margin-top: 14px; font-size: 0.8rem;">
              View All Scheduled Meetings
            </button>
          ` : ''}
        </div>
      `;
    }

    // 7. Master Markup
    container.innerHTML = `
      <!-- Header Banner -->
      <div class="student-meet-header-wrapper">
        <div class="student-meet-header-left">
          <div class="student-meet-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div>
            <h1 class="student-meet-title">Project Meetings &amp; Academic Schedule</h1>
            <p class="student-meet-subtitle"></p>
          </div>
        </div>
      </div>

      <!-- KPI Metrics Overview Grid -->
      <div class="student-meet-kpi-grid">
        <div class="student-meet-kpi-card kpi-blue" title="Total project review meetings">
          <div class="student-meet-kpi-icon blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div class="student-meet-kpi-info">
            <div class="student-meet-kpi-val">${totalCount}</div>
            <div class="student-meet-kpi-lbl">Total Meetings</div>
          </div>
        </div>

        <div class="student-meet-kpi-card kpi-indigo" title="Upcoming scheduled review meetings">
          <div class="student-meet-kpi-icon indigo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <div class="student-meet-kpi-info">
            <div class="student-meet-kpi-val">${upcomingCount}</div>
            <div class="student-meet-kpi-lbl">Upcoming Meetings</div>
          </div>
        </div>

        <div class="student-meet-kpi-card kpi-emerald" title="Completed meetings with recorded minutes">
          <div class="student-meet-kpi-icon emerald">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div class="student-meet-kpi-info">
            <div class="student-meet-kpi-val">${completedCount}</div>
            <div class="student-meet-kpi-lbl">Completed Sessions</div>
          </div>
        </div>

        <div class="student-meet-kpi-card kpi-amber" title="Next upcoming meeting date">
          <div class="student-meet-kpi-icon amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <div class="student-meet-kpi-info">
            <div class="student-meet-kpi-val" style="font-size: 1.05rem;">${nextActivityDate}</div>
            <div class="student-meet-kpi-lbl">Next Scheduled</div>
          </div>
        </div>
      </div>

      <!-- Controls & Search Filter Bar -->
      <div class="student-meet-filter-bar">
        <!-- Search Input -->
        <div class="student-meet-search-box">
          <svg class="student-meet-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="meet-search-input" class="student-meet-search-input" placeholder="Search by topic, project, supervisor, attendee..." value="${searchQuery}">
        </div>

        <!-- Status Filter Select -->
        <select id="cal-status-filter" class="student-meet-select">
          <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Statuses (${totalCount})</option>
          <option value="completed" ${statusFilter === 'completed' ? 'selected' : ''}>Completed Sessions (${completedCount})</option>
          <option value="upcoming" ${statusFilter === 'upcoming' ? 'selected' : ''}>Upcoming Scheduled (${upcomingCount})</option>
          <option value="cancelled" ${statusFilter === 'cancelled' ? 'selected' : ''}>Cancelled Meetings (${cancelledCount})</option>
        </select>

        <!-- Project Filter Dropdown -->
        <select id="meet-proj-filter" class="student-meet-select">
          <option value="all" ${projectFilter === 'all' ? 'selected' : ''}>All Projects</option>
          ${projectFilterOptions}
        </select>

        ${isFiltersActive ? `
          <button type="button" id="btn-clear-meet-filters" class="student-btn student-btn-outline student-btn-sm" style="font-size: 0.78rem; padding: 6px 12px; height: 38px;">
            ${dateFilter ? `Reset Date (${formatDateReadable(dateFilter)})` : 'Reset Filters'}
          </button>
        ` : ''}
      </div>

      <!-- Modern Responsive 2-Column Split Layout -->
      <div class="student-meet-grid-layout">
        <!-- Left Panel: Calendar & Meetings List -->
        <div class="student-meet-sidebar-col">
          <!-- Interactive Monthly Calendar Card -->
          <div class="student-cal-card">
            <div class="student-cal-header">
              <div class="student-cal-title-wrap">
                <span class="student-cal-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00796B" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  ${monthNames[currentMonth]} ${currentYear}
                </span>
                ${monthEventsCount > 0 ? `
                  <span class="student-cal-month-badge" title="${monthEventsCount} meeting(s) scheduled this month">
                    ${monthEventsCount} ${monthEventsCount === 1 ? 'Meeting' : 'Meetings'}
                  </span>
                ` : ''}
              </div>
              <div class="student-cal-nav">
                <button type="button" class="student-cal-btn-nav" id="btn-prev-month" title="Previous Month">‹</button>
                <button type="button" class="student-cal-btn-today" id="btn-today-month" title="Jump to Current Month">Today</button>
                <button type="button" class="student-cal-btn-nav" id="btn-next-month" title="Next Month">›</button>
              </div>
            </div>
            
            <div class="student-cal-grid">
              ${dayHeaders}
              ${dayCells}
            </div>

            <!-- Calendar Status Indicators Legend -->
            <div class="student-cal-legend">
              <div class="student-cal-legend-item" title="Completed session recorded in database">
                <span class="student-cal-legend-swatch swatch-completed"></span>
                <span>Completed</span>
              </div>
              <div class="student-cal-legend-item" title="Upcoming scheduled review meeting">
                <span class="student-cal-legend-swatch swatch-upcoming"></span>
                <span>Upcoming</span>
              </div>
              <div class="student-cal-legend-item" title="Cancelled session">
                <span class="student-cal-legend-swatch swatch-cancelled"></span>
                <span>Cancelled</span>
              </div>
            </div>
          </div>

          <!-- DB Meetings List Card -->
          <div class="student-meet-list-card">
            <div class="student-meet-list-header">
              <div class="student-meet-list-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                ${dateFilter ? `Meetings on ${formatDateReadable(dateFilter)}` : 'Meetings Roster'}
              </div>
              <span class="student-badge student-badge-info" style="font-size: 0.72rem; font-weight: 800;">
                ${filteredEvents.length} found
              </span>
            </div>

            ${dateFilter ? `
              <div class="student-meet-active-tag">
                <span>Filtered Date: <strong>${formatDateReadable(dateFilter)}</strong></span>
                <button type="button" id="btn-remove-date-filter" style="background: none; border: none; color: #00796B; font-weight: 800; cursor: pointer; font-size: 0.75rem;">Clear Date Filter</button>
              </div>
            ` : ''}

            <!-- Meeting Cards List -->
            <div class="student-meet-list-scroll">
              ${activityCardsHtml || `
                <div style="text-align: center; padding: 32px 14px; background: var(--bg-canvas-light); border: 1px dashed var(--border-subtle); border-radius: 12px;">
                  <div style="font-size: 1.6rem; margin-bottom: 6px;">📅</div>
                  <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary); margin-bottom: 4px;">No Meetings Scheduled</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 10px;">
                    ${dateFilter ? `No project meetings on ${formatDateReadable(dateFilter)}.` : 'No meetings match your filter criteria.'}
                  </div>
                  <button type="button" id="btn-empty-clear-meets" class="student-btn student-btn-outline student-btn-sm" style="font-size: 0.75rem; padding: 4px 12px; margin: 0 auto;">
                    Reset Filters
                  </button>
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- Right Panel: Meeting Dossier Outlet -->
        <div id="meeting-details-outlet">
          ${detailsHtml}
        </div>
      </div>
    `;

    // -------------------------------------------------------------
    // EVENT BINDINGS
    // -------------------------------------------------------------

    // Search input handler
    const searchInput = container.querySelector('#meet-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
      const newInput = container.querySelector('#meet-search-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    });

    // Status filter dropdown
    container.querySelector('#cal-status-filter')?.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      render();
    });

    // Project select filter
    container.querySelector('#meet-proj-filter')?.addEventListener('change', (e) => {
      projectFilter = e.target.value;
      render();
    });

    // Clear filters handler
    const handleClearAll = () => {
      searchQuery = '';
      statusFilter = 'all';
      projectFilter = 'all';
      dateFilter = null;
      render();
    };

    container.querySelector('#btn-clear-meet-filters')?.addEventListener('click', handleClearAll);
    container.querySelector('#btn-remove-date-filter')?.addEventListener('click', () => {
      dateFilter = null;
      render();
    });
    container.querySelector('#btn-empty-clear-meets')?.addEventListener('click', handleClearAll);
    container.querySelector('#btn-empty-reset-date')?.addEventListener('click', () => {
      dateFilter = null;
      render();
    });

    // Month Navigation
    container.querySelector('#btn-prev-month')?.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      render();
    });

    container.querySelector('#btn-next-month')?.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      render();
    });

    container.querySelector('#btn-today-month')?.addEventListener('click', () => {
      currentYear = now.getFullYear();
      currentMonth = now.getMonth();
      dateFilter = todayStr;
      render();
    });

    // Calendar Day click: Filter by clicked date
    container.querySelectorAll('.student-cal-day-cell[data-date]').forEach(el => {
      el.addEventListener('click', () => {
        const clickedDate = el.getAttribute('data-date');
        if (dateFilter === clickedDate) {
          dateFilter = null;
        } else {
          dateFilter = clickedDate;
          const firstOnDate = allEvents.find(e => e.date === clickedDate);
          if (firstOnDate) {
            selectedEventId = firstOnDate.id;
          }
        }
        render();
      });
    });

    // Meeting Card click in roster list
    container.querySelectorAll('.student-event-item').forEach(el => {
      el.addEventListener('click', () => {
        selectedEventId = el.getAttribute('data-id');
        const ev = allEvents.find(e => e.id === selectedEventId);
        if (ev && ev.date) {
          dateFilter = ev.date;
          const [ey, em] = ev.date.split('-').map(Number);
          if (ey && em) {
            currentYear = ey;
            currentMonth = em - 1;
          }
        }
        render();
      });
    });

    // Copy Google Meet link button
    container.querySelectorAll('.btn-copy-meet-link').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.getAttribute('data-url');
        if (!url) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
          }
          StudentSwal.fire({
            icon: 'success',
            title: 'Meeting Link Copied!',
            text: 'Google Meet link copied to clipboard.',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
          });
        } catch (err) {
          showStudentSuccess('Link Copied', 'Meeting link copied to clipboard.');
        }
      });
    });

    // Google Meet Call Link with Confirmation
    container.querySelectorAll('.student-meet-link').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const targetUrl = link.getAttribute('href');
        const meetTitle = link.getAttribute('data-title') || 'this session';

        const result = await StudentSwal.fire({
          title: 'Join Video Conference?',
          text: `You are about to launch Google Meet for "${meetTitle}".`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Join Call',
          cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed && targetUrl) {
          window.open(targetUrl, '_blank');
        }
      });
    });
  }

  render();
  return container;
}

export default StudentMeetings;
