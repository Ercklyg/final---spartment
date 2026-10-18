// Pay October 2026 in full for 2 tenants who already settled everything
// Jul-Sep, making them all-paid consistent payers for the insight spotlight.
// Run from Backend/: node supabase/pay-oct-consistent.mjs
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));

const env = parseEnv(readFileSync('.env', 'utf8'));
const url = env.SUPABASE_URL;
const ref = new URL(url).hostname.split('.')[0];
const command = `npm exec -- supabase projects api-keys --project-ref ${ref} --reveal --output json`;
const result = spawnSync('cmd.exe', ['/d', '/s', '/c', command], { encoding: 'utf8', windowsHide: true });
if (result.status !== 0) throw new Error('Could not load project credentials');
const output = result.stdout.slice(result.stdout.search(/[\[{]/));
const parsed = JSON.parse(output);
const keys = Array.isArray(parsed) ? parsed : parsed.api_keys || parsed.keys;
const key = keys.find(k => k.name === 'service_role')?.api_key || keys.find(k => k.type === 'secret')?.api_key;
const server = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const adminEmail = `seed-consistent-admin-${randomUUID()}@example.com`;
const adminPassword = `Aa1!${randomUUID()}`;
let adminId = null;
const adminClient = createClient(url, env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
try {
  const { data: adminData, error: adminErr } = await server.auth.admin.createUser({
    email: adminEmail, password: adminPassword, email_confirm: true, user_metadata: { full_name: 'Consistent payer admin' },
  });
  if (adminErr || !adminData.user) throw new Error('temp admin: ' + (adminErr?.message || 'no user'));
  adminId = adminData.user.id;
  const { error: roleErr } = await server.from('profiles').update({ role: 'admin' }).eq('id', adminId);
  if (roleErr) throw roleErr;
  const { error: signErr } = await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (signErr) throw new Error('temp admin login: ' + signErr.message);
  const db = adminClient;

  // Find tenants with zero unpaid/partial across Jul-Sep bills.
  const { data: leases } = await server.from('leases').select('id,tenant_id,profiles(full_name)').eq('status', 'active');
  const { data: bills } = await server.from('bills').select('id,lease_id,billing_period,rent_amount,electricity_amount,water_amount').gte('billing_period', '2026-07-01').lt('billing_period', '2026-10-01');
  const { data: payments } = await server.from('payments').select('bill_id,amount').in('bill_id', bills.map(b => b.id));
  const paidBy = new Map();
  for (const p of payments) paidBy.set(p.bill_id, (paidBy.get(p.bill_id) || 0) + Number(p.amount));
  const tenantOf = new Map(leases.map(l => [l.id, l.profiles?.full_name || 'Tenant']));
  const bad = new Set();
  for (const b of bills) {
    const total = Number(b.rent_amount) + Number(b.electricity_amount) + Number(b.water_amount);
    if ((paidBy.get(b.id) || 0) < total - 0.005) bad.add(tenantOf.get(b.lease_id));
  }
  const clean = [...new Set(tenantOf.values())].filter(n => !bad.has(n)).sort().slice(0, 2);
  console.log('Consistent candidates: ' + clean.join(', '));
  if (clean.length < 2) throw new Error('Need 2 fully-settled tenants, found ' + clean.length);

  for (const name of clean) {
    const lease = leases.find(l => (l.profiles?.full_name || 'Tenant') === name);
    const { data: oct } = await db.from('bills').select('id,bill_type,rent_amount,electricity_amount,water_amount').eq('lease_id', lease.id).gte('billing_period', '2026-10-01').lt('billing_period', '2026-11-01');
    for (const b of oct) {
      const total = Number(b.rent_amount) + Number(b.electricity_amount) + Number(b.water_amount);
      const { error: pErr } = await db.rpc('record_bill_payment', {
        p_bill: b.id, p_id: randomUUID(), p_amount: total, p_date: '2026-10-10',
        p_reference: 'Consistent payer reward month',
      });
      if (pErr) throw new Error(`pay ${name} ${b.bill_type}: ${pErr.message}`);
      console.log(`PAID Oct ${b.bill_type} for ${name}: ${total}`);
    }
  }
  console.log('DONE');
} finally {
  await adminClient.auth.signOut().catch(() => {});
  if (adminId) await server.auth.admin.deleteUser(adminId).then(
    () => console.log('Temp admin removed'),
    (e) => console.error('Temp admin cleanup needed: ' + e.message),
  );
}
