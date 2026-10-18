// October 2026 current-month billing for every active lease: rent + utility,
// no payments (current bills stay Pending until tenants pay).
// Idempotent: existing bills are skipped. Run from Backend/:
// node supabase/seed-billing-oct.mjs
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));

const PERIOD = '2026-10-01';
const DUE = '2026-10-15';
const MI = 3;
const elecFor = idx => 600 + ((idx * 137 + MI * 251) % 501);
const waterFor = idx => 150 + ((idx * 89 + MI * 61) % 131);

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

const adminEmail = `seed-oct-admin-${randomUUID()}@example.com`;
const adminPassword = `Aa1!${randomUUID()}`;
let adminId = null;
const adminClient = createClient(url, env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
try {
  const { data: adminData, error: adminErr } = await server.auth.admin.createUser({
    email: adminEmail, password: adminPassword, email_confirm: true, user_metadata: { full_name: 'October billing admin' },
  });
  if (adminErr || !adminData.user) throw new Error('temp admin: ' + (adminErr?.message || 'no user'));
  adminId = adminData.user.id;
  const { error: roleErr } = await server.from('profiles').update({ role: 'admin' }).eq('id', adminId);
  if (roleErr) throw roleErr;
  const { error: signErr } = await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (signErr) throw new Error('temp admin login: ' + signErr.message);
  const db = adminClient;

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

  let created = 0, skipped = 0;
  for (let idx = 0; idx < tenants.length; idx++) {
    const t = tenants[idx];
    for (const type of ['rent', 'utility']) {
      const { error } = await db.rpc('create_bill', {
        p_lease: t.leaseId, p_type: type, p_period: PERIOD, p_due: DUE,
        p_rent: type === 'rent' ? t.rent : 0,
        p_electricity: type === 'utility' ? elecFor(idx) : 0,
        p_water: type === 'utility' ? waterFor(idx) : 0,
      });
      if (error) {
        if (error.code === '23505') { skipped++; continue; }
        throw new Error(`create_bill ${t.name} ${type}: ${error.message}`);
      }
      created++;
    }
  }
  console.log(`OCTOBER created=${created} skipped=${skipped} (no payments: current bills stay Pending)`);
  console.log('DONE');
} finally {
  await adminClient.auth.signOut().catch(() => {});
  if (adminId) await server.auth.admin.deleteUser(adminId).then(
    () => console.log('Temp admin removed'),
    (e) => console.error('Temp admin cleanup needed: ' + e.message),
  );
}
