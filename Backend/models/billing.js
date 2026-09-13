import { HttpError } from '../middleware/errors.js';
import { readAll } from './readAll.js';

export const money = value => new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP' }).format(Number(value || 0));
export const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function summarizeBill(bill) {
  const totalCents = Math.round(Number(bill.rent_amount)*100)+Math.round(Number(bill.electricity_amount)*100)+Math.round(Number(bill.water_amount)*100);
  const paidCents = (bill.payments || []).reduce((sum,p)=>sum+Math.round(Number(p.amount)*100),0);
  return {...bill,total:totalCents/100,paid:paidCents/100,balance:Math.max(0,totalCents-paidCents)/100,
    displayStatus:paidCents>=totalCents?'Paid':bill.due_date<today()?'Late':paidCents>0?'Partially paid':'Pending'};
}
export async function loadBills(client) {
  const bills=await readAll(()=>client.from('bills').select('*, payments(id,amount,payment_date,reference_note), leases(tenant_id, profiles(full_name), rooms(room_number, buildings(name)))')
    .order('billing_period',{ascending:false}).order('created_at',{ascending:false}).order('id'));
  return bills.map(summarizeBill);
}

// Totals for the billing cards; keep currency arithmetic on the server in cents.
export function billingOverview(bills) {
  const totals = rows => {
    const sum = key => rows.reduce((value, bill) => value + Math.round(Number(bill[key] || 0) * 100), 0) / 100;
    return { total: sum('total'), paid: sum('paid'), balance: sum('balance'), electricity: sum('electricity_amount'), water: sum('water_amount'),
      overdue: rows.filter(bill => bill.displayStatus === 'Late').reduce((value, bill) => value + Math.round(bill.balance * 100), 0) / 100 };
  };
  const months = {};
  for (const month of new Set(bills.map(bill => bill.billing_period.slice(0, 7)))) {
    const rows = bills.filter(bill => bill.billing_period.startsWith(month));
    months[month] = { rent: totals(rows.filter(bill => bill.bill_type === 'rent')), utility: totals(rows.filter(bill => bill.bill_type === 'utility')) };
  }
  const utilityMonth = bills.filter(bill => bill.bill_type === 'utility').map(bill => bill.billing_period.slice(0, 7)).sort().at(-1) || null;
  const nextDue = bills.filter(bill => bill.balance > 0).map(bill => bill.due_date).sort()[0] || null;
  return { ...totals(bills), count: bills.length, months, utilityMonth, nextDue };
}
export async function loadBillingLeases(client) {
  async function all(table, columns, activeOnly = false) {
    return readAll(()=>{
      let query = client.from(table).select(columns).order('id');
      if (activeOnly) query = query.eq('status', 'active');
      return query;
    });
  }
  const [leases, assignments] = await Promise.all([
    all('leases', 'id,tenant_id,profiles(full_name),rooms(room_number,monthly_rate,buildings(name))', true),
    all('tenant_assignments', 'id,monthly_rent'),
  ]);
  const rents = new Map(assignments.map(assignment => [assignment.id, assignment.monthly_rent]));
  return leases.map(lease => ({ ...lease, rent: rents.get(lease.tenant_id) ?? lease.rooms?.monthly_rate }));
}

function validateBillForm(form) {
  const validDate = typeof form?.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(form.due)
    && Number.isFinite(Date.parse(form.due)) && new Date(form.due).toISOString().slice(0, 10) === form.due;
  if (!form || !['rent', 'utility'].includes(form.type) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(form.period || '') || !validDate)
    throw new HttpError(400, 'Select a bill type, billing month and valid due date.');
  if (form.type === 'utility' && form.lease === 'all')
    throw new HttpError(400, 'Select one tenant / room for a utility bill. Utility charges must be entered individually.');
  if (form.lease !== 'all' && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(form.lease || ''))
    throw new HttpError(400, form.type === 'utility' ? 'Select an active tenant / room.' : 'Select an active tenant / room or All tenants / rooms.');
  const amounts = form.type === 'utility' ? [form.electricity, form.water] : form.lease === 'all' ? [] : [form.rent];
  if (amounts.some(amount => !/^\d+(\.\d{1,2})?$/.test(String(amount)) || !Number.isFinite(Number(amount)))
    || (amounts.length && (amounts.reduce((sum, amount) => sum + Number(amount), 0) <= 0
      || amounts.reduce((sum, amount) => sum + Number(amount), 0) > 9999999999.99)))
    throw new HttpError(400, 'Enter non-negative amounts with up to two decimal places and a total greater than zero.');
}

async function insertBill(client, form) {
  const { error } = await client.rpc('create_bill', {
    p_lease: form.lease, p_type: form.type, p_period: form.period + '-01', p_due: form.due,
    p_rent: form.type === 'rent' ? Number(form.rent) : 0,
    p_electricity: form.type === 'utility' ? Number(form.electricity) : 0,
    p_water: form.type === 'utility' ? Number(form.water) : 0,
  });
  return error;
}

export async function createBill(client, form) {
  validateBillForm(form);
  if (form.lease !== 'all') {
    const error = await insertBill(client, form);
    if (error) throw new HttpError(error.code === '23505' ? 409 : 400, error.code === '23505'
      ? 'This lease already has a bill of this type for that month.' : error.message);
    return { ok: true };
  }

  const leases = await loadBillingLeases(client);
  if (!leases.length) throw new HttpError(400, 'Add a tenant with an active lease first.');
  const result = { bulk: true, created: 0, skipped: 0, failures: [] };
  // Each checked RPC creates one bill and its notification. The unique bill key
  // makes retries safe: existing bills are skipped and their amounts are preserved.
  for (const lease of leases) {
    try {
      const bill = { ...form, lease: lease.id, rent: lease.rent };
      validateBillForm(bill);
      const error = await insertBill(client, bill);
      if (error?.code === '23505') result.skipped += 1;
      else if (error) throw new Error(error.message);
      else result.created += 1;
    } catch (error) {
      result.failures.push({ lease: lease.id, name: lease.profiles?.full_name || 'Tenant',
        room: lease.rooms?.room_number || 'Unassigned', message: error.message || 'Unable to create this bill. Retry to check its status.' });
    }
  }
  return { ...result, ok: !result.failures.length,
    message: `${result.created} bill(s) created, ${result.skipped} existing bill(s) skipped, ${result.failures.length} failed.` };
}
export async function recordPayment(client,bill,form,id) {
  const {error}=await client.rpc('record_bill_payment',{p_bill:bill.id,p_id:id,p_amount:Number(form.amount),p_date:form.date,p_reference:form.reference.trim()});
  if(error)throw new HttpError(400,error.message);
}
