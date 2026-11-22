import { HttpError } from '../middleware/errors.js';
import { readAll } from '../models/readAll.js';
import { loadAnalyticsReport } from './analyticsReport.js';
import { buildRecommendationFacts } from './recommendationFacts.js';
import * as validate from './validation.js';

export async function recommendationRecords(req) {
  if (req.role !== 'admin') throw new HttpError(403, 'Administrator access required.');
  const { month, factId } = req.query;
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, 'Invalid report month.');
  if (typeof factId === 'string' && factId.startsWith('tenant:')) validate.uuid(factId.slice(7), 'tenant ID');
  else validate.choice(factId, ['property:overdue', 'property:vacancy', 'property:requests', 'property:collections'], 'recommendation');
  const { snapshot } = await loadAnalyticsReport(req, { p_month: month + '-01', p_period: 'Monthly', p_export: false });
  // A saved tenant action remains reviewable even if other accounts now rank above it.
  const factSnapshot = factId.startsWith('tenant:')
    ? { ...snapshot, late: (snapshot.late || []).filter(bill => bill.tenant_id === factId.slice(7)) }
    : snapshot;
  const fact = buildRecommendationFacts(factSnapshot, month).find(item => item.id === factId);
  const records = [];
  if (fact?.kind === 'vacancy') {
    const rooms = await readAll(() => req.db.from('rooms').select('id,room_number,status,monthly_rate,is_test,buildings(name)')
      .eq('status', 'available').eq('is_test', false).order('id'));
    for (const room of rooms.filter(room => !room.is_test && room.status === 'available')) records.push({
      id: room.id, title: `Room ${room.room_number}`, subtitle: room.buildings?.name || 'Building', status: 'Available',
      amount: Number(room.monthly_rate), amountLabel: 'Monthly rent',
    });
  } else if (fact?.kind === 'requests') {
    for (const request of snapshot.openRequests.filter(item => item.status !== 'Resolved')) records.push({
      id: request.id, title: request.subject || 'Tenant request', status: request.status,
      subtitle: request.kind === 'maintenance' ? 'Maintenance request' : 'Tenant request', createdAt: request.created_at,
    });
    for (const inquiry of snapshot.openInquiries.filter(item => item.status !== 'Resolved')) records.push({
      id: inquiry.id, title: 'Guest inquiry', subtitle: 'Guest inquiry', status: inquiry.status, createdAt: inquiry.created_at,
    });
  } else if (fact) {
    const bills = fact.kind === 'collections' ? snapshot.selected : snapshot.late;
    for (const bill of bills.filter(bill => !fact.tenantId || bill.tenant_id === fact.tenantId)) records.push({
      id: bill.id, title: `${bill.name || 'Tenant'} · ${bill.bill_type === 'utility' ? 'Utility' : 'Rent'} · ${bill.billing_period.slice(0, 7)}`,
      subtitle: bill.room, status: bill.status, dueDate: bill.due_date,
      amount: fact.kind === 'collections' ? bill.paid : bill.balance,
      amountLabel: fact.kind === 'collections' ? 'Paid toward this bill' : 'Overdue balance',
      total: bill.total, paid: bill.paid, balance: bill.balance,
    });
  }
  return { records, fact: fact ? { subject: fact.subject, reason: fact.reason, evidence: fact.evidence, page: fact.page } : null,
    checkedAt: new Date().toISOString(), financialCutoff: snapshot.cutoff };
}
