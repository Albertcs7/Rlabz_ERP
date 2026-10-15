import { FinanceDashboard } from '@/modules/finance/views/FinanceDashboard.js';

// Reuses the exact same Finance Dashboard component the Finance module uses —
// same markup, same finance.css, same charts, same FinanceService API calls
// (/finance/dashboard, /finance/projects, /finance/invoices — gated only by
// auth.jwt on the backend, no role restriction, so a Coordinator's token
// already works). Not duplicated/approximated and not modified.
export async function CoordinatorFinances(route, router) {
  return await FinanceDashboard(route, router);
}

export default CoordinatorFinances;
