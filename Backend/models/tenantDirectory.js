import { loadBills } from './billing.js';
import { readAll } from './readAll.js';

function attachBilling(tenants, bills) {
  const summaries = new Map();
  for (const bill of bills) {
    const tenantId = bill.leases?.tenant_id;
    if (!tenantId) continue;
    const summary = summaries.get(tenantId) || { count: 0, balance: 0, overdue: 0, partial: false };
    const balance = Math.round(bill.balance * 100);
    summary.count += 1;
    summary.balance += balance;
    if (bill.displayStatus === 'Late') summary.overdue += balance;
    // A paid older bill must not make a new, entirely unpaid bill look partially paid.
    if (balance > 0 && bill.paid > 0) summary.partial = true;
    summaries.set(tenantId, summary);
  }
  return tenants.map(tenant => {
    const summary = summaries.get(tenant.id);
    const status = !summary ? 'No bills' : summary.balance === 0 ? 'Paid' : summary.overdue > 0 ? 'Late'
      : summary.partial ? 'Partially paid' : 'Pending';
    return { ...tenant, billing: { status, billCount: summary?.count || 0,
      balance: (summary?.balance || 0) / 100, overdue: (summary?.overdue || 0) / 100 } };
  });
}

export async function loadTenantDirectory(client) {
  const loadAssignments = () => readAll(()=>client.from('tenant_assignments').select('*,rooms(room_number,buildings(name))').eq('status','active')
    .order('created_at', { ascending: false }).order('id'));
  // Match bills across leases by tenant ID, never by name or room number.
  const [tenants, bills] = await Promise.all([loadAssignments(), loadBills(client)]);
  return attachBilling(tenants, bills);
}
