// One-off removal: full delete of a tenant with no bills.
// Usage from Backend/: node supabase/remove-tenant.mjs allan.david@spartment.ph
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const targetEmail = (process.argv[2] || '').toLowerCase();
if (!targetEmail) throw new Error('Provide email: node supabase/remove-tenant.mjs <email>');

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

const { data: assignment, error: aErr } = await server.from('tenant_assignments').select('id,full_name,email,room_id,rooms(room_number,buildings(name))').ilike('email', targetEmail).maybeSingle();
if (aErr) throw aErr;
if (!assignment) throw new Error(`No tenant_assignments row for ${targetEmail}`);
console.log(`Found: ${assignment.full_name} <${assignment.email}> id=${assignment.id} room=${assignment.rooms?.buildings?.name} / ${assignment.rooms?.room_number}`);

const { data: leases, error: lErr } = await server.from('leases').select('id,status,room_id').eq('tenant_id', assignment.id);
if (lErr) throw lErr;
console.log(`Leases: ${leases.length} (${leases.map(l => l.status).join(',') || 'none'})`);
for (const lease of leases) {
  const { data: bills, error: bErr } = await server.from('bills').select('id').eq('lease_id', lease.id).limit(1);
  if (bErr) throw bErr;
  if (bills.length) throw new Error(`Blocked: lease ${lease.id} has bills. Use move-out instead to preserve history.`);
}
if (leases.length) {
  const { error: delLeaseErr } = await server.from('leases').delete().eq('tenant_id', assignment.id);
  if (delLeaseErr) throw delLeaseErr;
  console.log(`Deleted ${leases.length} lease(s)`);
}
const { error: delUserErr } = await server.auth.admin.deleteUser(assignment.id);
if (delUserErr) throw delUserErr;
console.log('Deleted auth user (cascades profile + assignment, frees room)');

const credPath = 'supabase/.temp/seed-27-tenants.credentials.json';
if (existsSync(credPath)) {
  const creds = JSON.parse(readFileSync(credPath, 'utf8'));
  const kept = creds.filter(c => c.email.toLowerCase() !== targetEmail);
  if (kept.length !== creds.length) {
    writeFileSync(credPath, JSON.stringify(kept, null, 2));
    console.log('Removed entry from credentials file');
  }
}
const { data: check } = await server.from('tenant_assignments').select('id').eq('id', assignment.id).maybeSingle();
console.log('Assignment gone: ' + (!check));
const { data: room } = await server.from('rooms').select('room_number,status,buildings(name)').eq('id', assignment.room_id).single();
console.log(`Room now: ${room?.buildings?.name} / ${room?.room_number} = ${room?.status}`);
