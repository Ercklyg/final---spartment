// Backfill Jul-Sep 2026 billing for every active lease: rent + utility per month,
// with a mixed payment matrix (paid / partial / late) to exercise billing,
// collection health and AI insights. Idempotent: existing bills are skipped.
// Run from Backend/: node supabase/seed-billing-jul-sep.mjs
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));

const MONTHS = [
  { ym: '2026-07', period: '2026-07-01', next: '2026-08-01', due: '2026-07-15', payDate: '2026-07-12', mi: 0 },
  { ym: '2026-08', period: '2026-08-01', next: '2026-09-01', due: '2026-08-15', payDate: '2026-08-12', mi: 1 },
  { ym: '2026-09', period: '2026-09-01', next: '2026-10-01', due: '2026-09-15', payDate: '2026-09-12', mi: 2 },
];
// Payment plan per tenant index (leases sorted by tenant email).
// july: all paid. august: 3 unpaid, 4 partial. september: 8 unpaid, 7 partial.
const AUG_UNPAID = new Set([0, 1, 2]);
const AUG_PARTIAL = new Set([3, 4, 5, 6]);
const SEP_UNPAID = new Set([0, 1, 2, 3, 4, 7, 8, 9]);
const SEP_PARTIAL = new Set([5, 6, 10, 11, 12, 13, 14]);

const elecFor = (idx, mi) => 600 + ((idx * 137 + mi * 251) % 501);
const waterFor = (idx, mi) => 150 + ((idx * 89 + mi * 61) % 131);
const planFor = (mi, idx) => {
  if (mi === 0) return 'paid';
  if (mi === 1) return AUG_UNPAID.has(idx) ? 'unpaid' : AUG_PARTIAL.has(idx) ? 'partial' : 'paid';
  return SEP_UNPAID.has(idx) ? 'unpaid' : SEP_PARTIAL.has(idx) ? 'partial' : 'paid';
};

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
const anonOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const adminEmail = `seed-billing-admin-${randomUUID()}@example.com`;
const adminPassword = `Aa1!${randomUUID()}`;
let adminId = null;
const adminClient = createClient(url, env.SUPABASE_ANON_KEY, anonOptions);
try {
const { data: adminData, error: adminErr } = await server.auth.admin.createUser({
  email: adminEmail, password: adminPassword, email_confirm: true, user_metadata: { full_name: 'Billing backfill admin' },
});
if (adminErr || !adminData.user) throw new Error('temp admin: ' + (adminErr?.message || 'no user'));
adminId = adminData.user.id;
const { error: roleErr } = await server.from('profiles').update({ role: 'admin' }).eq('id', adminId);
if (roleErr) throw roleErr;
const { error: signErr } = await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
if (signErr) throw new Error('temp admin login: ' + signErr.message);
const db = adminClient;

// Active leases with agreed rent (same source as Admin Billing "all tenants").
const { data: leases, error: leaseErr } = await server
  .from('leases').select('id,tenant_id,profiles(full_name),rooms(room_number,monthly_rate,buildings(name))')
  .eq('status', 'active').order('id');
if (leaseErr) throw leaseErr;
const { data: assignments, error: assignErr } = await server.from('tenant_assignments').select('id,monthly_rent');
if (assignErr) throw assignErr;
const rents = new Map(assignments.map(a => [a.id, Number(a.monthly_rent)]));
const tenants = leases.map(l => ({
  leaseId: l.id, name: l.profiles?.full_name || 'Tenant',
  rent: rents.get(l.tenant_id) ?? Number(l.rooms?.monthly_rate) ?? 6500,
})).sort((a, b) => a.name.localeCompare(b.name));
console.log(`Active leases: ${tenants.length}`);

let created = 0, skipped = 0, paid = 0, partial = 0, late = 0;
for (const m of MONTHS) {
  for (let idx = 0; idx < tenants.length; idx++) {
    const t = tenants[idx];
    const elec = elecFor(idx, m.mi);
    const water = waterFor(idx, m.mi);
    const plan = planFor(m.mi, idx);
    for (const type of ['rent', 'utility']) {
      const args = {
        p_lease: t.leaseId, p_type: type, p_period: m.period, p_due: m.due,
        p_rent: type === 'rent' ? t.rent : 0,
        p_electricity: type === 'utility' ? elec : 0,
        p_water: type === 'utility' ? water : 0,
      };
      const { error } = await db.rpc('create_bill', args);
      if (error) {
        if (error.code === '23505') { skipped++; continue; }
        throw new Error(`create_bill ${t.name} ${m.ym} ${type}: ${error.message}`);
      }
      created++;
    }
    // Fetch the two bills just created to record payments.
    const { data: bills, error: bErr } = await db.from('bills')
      .select('id,bill_type,rent_amount,electricity_amount,water_amount')
      .eq('lease_id', t.leaseId).gte('billing_period', m.period).lt('billing_period', m.next);
    if (bErr) throw bErr;
    for (const b of bills) {
      const total = Number(b.rent_amount) + Number(b.electricity_amount) + Number(b.water_amount);
      if (plan === 'unpaid') { late++; continue; }
      const amount = plan === 'partial' ? Math.round((total / 2) * 100) / 100 : total;
      const { error: pErr } = await db.rpc('record_bill_payment', {
        p_bill: b.id, p_id: randomUUID(), p_amount: amount, p_date: m.payDate,
        p_reference: `Backfill ${m.ym} ${b.bill_type}`,
      });
      if (pErr) throw new Error(`record payment ${t.name} ${m.ym} ${b.bill_type}: ${pErr.message}`);
      if (plan === 'partial') partial++; else paid++;
    }
  }
  console.log(`${m.ym}: done`);
}
console.log(`\nBILLS created=${created} skipped=${skipped}`);
console.log(`PAYMENTS paid=${paid} partial=${partial} unpaid(late)=${late}`);
console.log('DONE');
} finally {
  await adminClient.auth.signOut().catch(() => {});
  if (adminId) await server.auth.admin.deleteUser(adminId).then(
    () => console.log('Temp admin removed'),
    (e) => console.error('Temp admin cleanup needed: ' + e.message),
  );
}
