import { readAll } from './readAll.js';
import { loadBills, money, today } from './billing.js';

const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
const rank = { High: 0, Normal: 1, Informational: 2 };

export function sortNotices(items) {
  return items.sort((a, b) => rank[a.priority] - rank[b.priority]
    || (a.deadline && b.deadline ? a.deadline.localeCompare(b.deadline)
      : a.deadline ? -1 : b.deadline ? 1 : (b.createdAt || '').localeCompare(a.createdAt || ''))
    || a.id.localeCompare(b.id));
}

export function buildAdminNotifications({ bills, leases, rooms, requests, inquiries }, asOf = today()) {
  const notices = [];
  for (const bill of bills) {
    const name = bill.leases?.profiles?.full_name || 'Tenant';
    const room = bill.leases?.rooms;
    const location = room ? `${room.buildings?.name || 'Building'} / ${room.room_number}` : 'Unassigned';
    const days = daysBetween(asOf, bill.due_date);
    if (bill.balance > 0 && days <= 7) notices.push({
      id: `bill:${bill.id}`, category: 'Payments', priority: days < 0 ? 'High' : 'Normal',
      title: days < 0 ? 'Late payment alert' : days === 0 ? 'Payment due today' : 'Upcoming payment',
      text: `${name} · ${location} · ${money(bill.balance)} remaining`,
      deadline: bill.due_date, time: `Due ${bill.due_date}`,
    });
    for (const payment of bill.payments || []) {
      const age = daysBetween(payment.payment_date, asOf);
      if (age >= 0 && age <= 7) notices.push({
        id: `payment:${payment.id}`, category: 'Payments', priority: 'Informational',
        title: 'Payment recorded', text: `${name} · ${money(payment.amount)} received`,
        createdAt: payment.payment_date, time: payment.payment_date,
      });
    }
  }
  for (const lease of leases) {
    if (lease.status !== 'active' || !lease.lease_end_date) continue;
    const days = daysBetween(asOf, lease.lease_end_date);
    if (days > 30) continue;
    notices.push({ id: `lease:${lease.id}`, category: 'Leases', priority: days <= 7 ? 'High' : 'Normal',
      title: days < 0 ? 'Lease end date passed' : 'Lease expiration approaching',
      text: `${lease.profiles?.full_name || 'Tenant'} · Room ${lease.rooms?.room_number || 'Unassigned'} · Review renewal or move-out`,
      deadline: lease.lease_end_date, time: `Lease ends ${lease.lease_end_date}` });
  }
  for (const request of requests) {
    if (request.status === 'Resolved') continue;
    notices.push({ id: `request:${request.id}`, category: 'Requests',
      priority: ['Urgent', 'High'].includes(request.priority) ? 'High' : 'Normal',
      title: request.kind === 'maintenance' ? 'Maintenance request' : 'Tenant request',
      text: request.subject, createdAt: request.created_at, time: request.status });
  }
  for (const room of rooms) {
    if (room.status !== 'available') continue;
    notices.push({ id: `room:${room.id}`, category: 'Rooms', priority: 'Informational',
      title: 'Room available', text: `${room.buildings?.name || 'Building'} / ${room.room_number} · ${money(room.monthly_rate)} per month`,
      createdAt: room.updated_at || room.created_at, time: 'Ready for assignment' });
  }
  for (const inquiry of inquiries) {
    if (inquiry.status === 'Resolved') continue;
    notices.push({ id: `inquiry:${inquiry.id}`, category: 'Inquiries', priority: 'Informational',
      title: 'Guest inquiry', text: 'A guest inquiry is awaiting review.',
      createdAt: inquiry.created_at, time: inquiry.created_at.slice(0, 10) });
  }
  return sortNotices(notices);
}

export async function loadAdminNotifications(client) {
  const all = (table, columns) => readAll(() => client.from(table).select(columns).order('id'));
  const [bills, leases, rooms, requests, inquiries] = await Promise.all([
    loadBills(client),
    all('leases', 'id,status,lease_end_date,profiles(full_name),rooms(room_number)'),
    all('rooms', '*,buildings(name)'),
    all('tenant_requests', 'id,kind,status,priority,subject,created_at'),
    all('inquiries', 'id,status,created_at'),
  ]);
  return buildAdminNotifications({ bills, leases, rooms, requests, inquiries });
}
