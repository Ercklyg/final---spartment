// Live password change test. Credentials stay in memory; only a temporary account is changed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));

const env = parseEnv(readFileSync('.env', 'utf8'));
const url = env.SUPABASE_URL;
const ref = new URL(url).hostname.split('.')[0];
assert.match(ref, /^[a-z]{20}$/);
const command = `npm exec -- supabase projects api-keys --project-ref ${ref} --reveal --output json`;
const result = spawnSync('cmd.exe', ['/d', '/s', '/c', command], { encoding: 'utf8', windowsHide: true });
if (result.status !== 0) throw new Error('Could not load project credentials from signed-in CLI.');
// Never print CLI output: it contains credentials.
const output = result.stdout.slice(result.stdout.search(/[\[{]/));
const parsed = JSON.parse(output);
const keys = Array.isArray(parsed) ? parsed : parsed.api_keys || parsed.keys;
assert.ok(Array.isArray(keys), 'Unexpected API key response format');
const key = keys.find(k => k.name === 'service_role')?.api_key || keys.find(k => k.type === 'secret')?.api_key;
assert.ok(key, 'No server key available');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const server = createClient(url, key, options);
const client = () => createClient(url, env.SUPABASE_ANON_KEY, options);

const { changePassword } = await import('../models/changePassword.js');
const email = 'codex-password-test-' + crypto.randomUUID() + '@example.com';
const oldPassword = 'Aa1!' + crypto.randomUUID();
const newPassword = 'Bb2!' + crypto.randomUUID();
let userId;
const checked = (r, label) => { assert.equal(r.error, null, label + ': ' + r.error?.message); return r.data; };
try {
  userId = checked(await server.auth.admin.createUser({email,password:oldPassword,email_confirm:true,user_metadata:{full_name:'Temporary password test'}}),'Create fixture').user.id;
  const app = client();
  checked(await app.auth.signInWithPassword({email,password:oldPassword}),'Initial login');
  const sessionBefore = checked(await app.auth.getSession(),'Initial session').session.access_token;
  await assert.rejects(changePassword(app.auth,client().auth,{current:oldPassword,new:newPassword,confirm:'mismatch'}),/do not match/);
  await assert.rejects(changePassword(app.auth,client().auth,{current:oldPassword,new:'weak',confirm:'weak'}),/8?128/);
  await assert.rejects(changePassword(app.auth,client().auth,{current:oldPassword,new:oldPassword,confirm:oldPassword}),/different/);
  await assert.rejects(changePassword(app.auth,client().auth,{current:'Wrong-password1!',new:newPassword,confirm:newPassword}),/incorrect/);
  console.log('PASS: weak, mismatched, unchanged and incorrect-current passwords rejected');
  await assert.rejects(changePassword(client().auth,client().auth,{current:oldPassword,new:newPassword,confirm:newPassword}),/session expired/);
  await changePassword(app.auth,client().auth,{current:oldPassword,new:newPassword,confirm:newPassword});
  assert.equal(checked(await app.auth.getUser(),'Active user').user.id,userId);
  assert.equal(checked(await app.auth.getSession(),'Active session').session.access_token,sessionBefore);
  assert.ok((await client().auth.signInWithPassword({email,password:oldPassword})).error,'Old password must fail');
  assert.equal(checked(await client().auth.signInWithPassword({email,password:newPassword}),'New password login').user.id,userId);
  console.log('PASS: missing session rejected; password saved; old login rejected; new login works; app session preserved');
} finally {
  if(userId)checked(await server.auth.admin.deleteUser(userId),'Remove fixture');
  console.log('CLEANUP: temporary password-test account removed');
}
