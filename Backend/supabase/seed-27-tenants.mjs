// Seed 27 REAL tenants: creates auth.users + profiles + tenant_assignments + leases.
// Same result as Admin > Add Tenant 27 times, but bulk via service_role.
// Run from Backend/: node supabase/seed-27-tenants.mjs
// Credentials (with passwords) are written to supabase/.temp/ (gitignored) - share privately, then delete.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));

const TENANTS = [
  // 14 solo - full real names
  { name: 'Rodel Maghirang', email: 'rodel.maghirang@spartment.ph', phone: '0917 555 0110', emergencyName: 'Lorna Maghirang', emergencyPhone: '0918 555 0110', relationship: 'Spouse' },
  { name: 'Marilou Sapungan', email: 'marilou.sapungan@spartment.ph', phone: '0917 555 0111', emergencyName: 'Ramon Sapungan', emergencyPhone: '0918 555 0111', relationship: 'Spouse' },
  { name: 'Jomar Baluyot', email: 'jomar.baluyot@spartment.ph', phone: '0917 555 0112', emergencyName: 'Nenita Baluyot', emergencyPhone: '0918 555 0112', relationship: 'Parent' },
  { name: 'Analyn Dizon', email: 'analyn.dizon@spartment.ph', phone: '0917 555 0113', emergencyName: 'Paolo Dizon', emergencyPhone: '0918 555 0113', relationship: 'Sibling' },
  { name: 'Efren Cunanan', email: 'efren.cunanan@spartment.ph', phone: '0917 555 0114', emergencyName: 'Mila Cunanan', emergencyPhone: '0918 555 0114', relationship: 'Spouse' },
  { name: 'Jenelyn Paguio', email: 'jenelyn.paguio@spartment.ph', phone: '0917 555 0115', emergencyName: 'Rico Paguio', emergencyPhone: '0918 555 0115', relationship: 'Sibling' },
  { name: 'Dennis Galang', email: 'dennis.galang@spartment.ph', phone: '0917 555 0116', emergencyName: 'Corazon Galang', emergencyPhone: '0918 555 0116', relationship: 'Parent' },
  { name: 'Rowena Lansang', email: 'rowena.lansang@spartment.ph', phone: '0917 555 0117', emergencyName: 'Joey Lansang', emergencyPhone: '0918 555 0117', relationship: 'Spouse' },
  { name: 'Allan David', email: 'allan.david@spartment.ph', phone: '0917 555 0118', emergencyName: 'Gemma David', emergencyPhone: '0918 555 0118', relationship: 'Spouse' },
  { name: 'Michelle Agustin', email: 'michelle.agustin@spartment.ph', phone: '0917 555 0119', emergencyName: 'Rona Agustin', emergencyPhone: '0918 555 0119', relationship: 'Sibling' },
  { name: 'Rommel Torres', email: 'rommel.torres@spartment.ph', phone: '0917 555 0120', emergencyName: 'Divina Torres', emergencyPhone: '0918 555 0120', relationship: 'Spouse' },
  { name: 'Liza Marquez', email: 'liza.marquez@spartment.ph', phone: '0917 555 0121', emergencyName: 'Nestor Marquez', emergencyPhone: '0918 555 0121', relationship: 'Parent' },
  { name: 'Joel Pineda', email: 'joel.pineda@spartment.ph', phone: '0917 555 0122', emergencyName: 'Aiza Pineda', emergencyPhone: '0918 555 0122', relationship: 'Spouse' },
  { name: 'Joy Cruz', email: 'joy.cruz@spartment.ph', phone: '0917 555 0123', emergencyName: 'Ben Cruz', emergencyPhone: '0918 555 0123', relationship: 'Sibling' },
  // 13 family - surname family as account name
  { name: 'Manalo Family', email: 'manalo.family@spartment.ph', phone: '0917 555 0124', emergencyName: 'Roberto Manalo', emergencyPhone: '0918 555 0124', relationship: 'Parent' },
  { name: 'Velasco Family', email: 'velasco.family@spartment.ph', phone: '0917 555 0125', emergencyName: 'Imelda Velasco', emergencyPhone: '0918 555 0125', relationship: 'Parent' },
  { name: 'Sarmiento Family', email: 'sarmiento.family@spartment.ph', phone: '0917 555 0126', emergencyName: 'Eddie Sarmiento', emergencyPhone: '0918 555 0126', relationship: 'Sibling' },
  { name: 'Pangan Family', email: 'pangan.family@spartment.ph', phone: '0917 555 0127', emergencyName: 'Lilia Pangan', emergencyPhone: '0918 555 0127', relationship: 'Parent' },
  { name: 'Quijano Family', email: 'quijano.family@spartment.ph', phone: '0917 555 0128', emergencyName: 'Marco Quijano', emergencyPhone: '0918 555 0128', relationship: 'Sibling' },
  { name: 'Sison Family', email: 'sison.family@spartment.ph', phone: '0917 555 0129', emergencyName: 'Teodora Sison', emergencyPhone: '0918 555 0129', relationship: 'Parent' },
  { name: 'Corpuz Family', email: 'corpuz.family@spartment.ph', phone: '0917 555 0130', emergencyName: 'Arnold Corpuz', emergencyPhone: '0918 555 0130', relationship: 'Sibling' },
  { name: 'Maniego Family', email: 'maniego.family@spartment.ph', phone: '0917 555 0131', emergencyName: 'Sofia Maniego', emergencyPhone: '0918 555 0131', relationship: 'Spouse' },
  { name: 'Tadeo Family', email: 'tadeo.family@spartment.ph', phone: '0917 555 0132', emergencyName: 'Domingo Tadeo', emergencyPhone: '0918 555 0132', relationship: 'Parent' },
  { name: 'Barrios Family', email: 'barrios.family@spartment.ph', phone: '0917 555 0133', emergencyName: 'Nadia Barrios', emergencyPhone: '0918 555 0133', relationship: 'Sibling' },
  { name: 'Lagman Family', email: 'lagman.family@spartment.ph', phone: '0917 555 0134', emergencyName: 'Pedro Lagman', emergencyPhone: '0918 555 0134', relationship: 'Parent' },
  { name: 'Gonzales Family', email: 'gonzales.family@spartment.ph', phone: '0917 555 0135', emergencyName: 'Rhea Gonzales', emergencyPhone: '0918 555 0135', relationship: 'Spouse' },
  { name: 'Ramos Family', email: 'ramos.family@spartment.ph', phone: '0917 555 0136', emergencyName: 'Felix Ramos', emergencyPhone: '0918 555 0136', relationship: 'Sibling' },
];

const makePassword = () => 'Aa1!' + randomBytes(16).toString('hex');
const MOVE_IN = '2026-10-15';

const env = parseEnv(readFileSync('.env', 'utf8'));
const url = env.SUPABASE_URL;
const ref = new URL(url).hostname.split('.')[0];
const command = `npm exec -- supabase projects api-keys --project-ref ${ref} --reveal --output json`;
const result = spawnSync('cmd.exe', ['/d', '/s', '/c', command], { encoding: 'utf8', windowsHide: true });
if (result.status !== 0) throw new Error('Could not load project credentials from signed-in CLI.');
const output = result.stdout.slice(result.stdout.search(/[\[{]/));
const parsed = JSON.parse(output);
const keys = Array.isArray(parsed) ? parsed : parsed.api_keys || parsed.keys;
const key = keys.find(k => k.name === 'service_role')?.api_key || keys.find(k => k.type === 'secret')?.api_key;
if (!key) throw new Error('No server key available');
const server = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: rooms, error: roomsError } = await server
  .from('rooms')
  .select('id,room_number,floor,monthly_rate,status,buildings(name)')
  .eq('status', 'available')
  .order('room_number')
  .order('id');
if (roomsError) throw roomsError;
console.log(`Available rooms: ${rooms.length}`);
if (rooms.length < TENANTS.length) {
  throw new Error(`Need ${TENANTS.length} available rooms but only ${rooms.length} found. Create more rooms first.`);
}

const created = [];
let roomIdx = 0;
for (const t of TENANTS) {
  const room = rooms[roomIdx];
  const password = makePassword();
  const rent = Number(room.monthly_rate) > 0 ? Number(room.monthly_rate) : 6500;
  const account = {
    name: t.name, email: t.email.toLowerCase(), phone: t.phone,
    room: room.id, rent, moveIn: MOVE_IN, leaseEnd: '',
    emergencyName: t.emergencyName, emergencyPhone: t.emergencyPhone, relationship: t.relationship,
  };
  // 1. auth user (same as create-tenant function)
  const { data, error } = await server.auth.admin.createUser({
    email: account.email, password, email_confirm: true,
    user_metadata: { full_name: account.name }, app_metadata: { role: 'tenant' },
  });
  if (error || !data.user) {
    console.error(`SKIP ${t.email}: ${error?.message || 'no user'}`);
    continue;
  }
  // 2. profiles + assignment + lease (same RPC the function uses)
  const { error: saveError } = await server.rpc('finish_tenant_account', { account_id: data.user.id, account });
  if (saveError) {
    console.error(`ROLLBACK ${t.email}: ${saveError.message}`);
    await server.auth.admin.deleteUser(data.user.id);
    continue;
  }
  created.push({ id: data.user.id, name: t.name, email: t.email, phone: t.phone, room_number: room.room_number, building: room.buildings?.name, room_id: room.id, rent, password });
  console.log(`OK ${created.length}/${TENANTS.length} ${t.name} <${t.email}> -> ${room.buildings?.name} / ${room.room_number}`);
  roomIdx++;
}

mkdirSync('supabase/.temp', { recursive: true });
writeFileSync('supabase/.temp/seed-27-tenants.credentials.json', JSON.stringify(created, null, 2));
console.log(`\nDONE: ${created.length}/${TENANTS.length} created. Credentials (with passwords) saved to supabase/.temp/seed-27-tenants.credentials.json - share privately then delete.`);
if (created.length !== TENANTS.length) process.exitCode = 1;
