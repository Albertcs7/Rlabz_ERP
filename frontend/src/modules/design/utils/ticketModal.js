import { API_BASE } from '@/core/config/api.js';
import { useRouter } from '@/core/router/index.js';
import Swal from 'sweetalert2';
import '../design.css';

export function getStatusBadge(status) {
  const map = {
    'New': 'blue',
    'Assigned': 'purple',
    'In Progress': 'indigo',
    'Submitted': 'warning',
    'In Review': 'warning',
    'Revision': 'danger',
    'Approved': 'success',
    'Closed': 'neutral',
    'On Hold': 'neutral',
    'Cancelled': 'danger'
  };
  return `<span class="fin-badge ${map[status] || 'neutral'}">${status}</span>`;
}

export function getPriorityBadge(priority) {
  const map = {
    'normal': 'neutral',
    'high': 'warning',
    'urgent': 'danger'
  };
  return `<span class="fin-badge ${map[priority] || 'neutral'}" style="text-transform:uppercase;">${priority}</span>`;
}

export function getBallBadge(ball) {
  const b = ball || 'requester';
  return `<span class="design-ball-pill ${b}">● ${b.replace('_', ' ').toUpperCase()}</span>`;
}

/**
 * Open the complete Ticket Studio as a dedicated full-page view
 */
export async function openTicketStudioModal(ticketId, onUpdate) {
  try {
    const router = useRouter();
    if (router && typeof router.push === 'function') {
      router.push(`/design/tickets/${ticketId}`);
      return;
    }
  } catch (e) {
    console.warn('Router push fallback:', e);
  }
  window.location.href = `/design/tickets/${ticketId}`;
}
