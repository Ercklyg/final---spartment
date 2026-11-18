import test,{before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const tenant='11111111-1111-4111-8111-111111111111';
const admin='22222222-2222-4222-8222-222222222222';
const other='33333333-3333-4333-8333-333333333333';
const requestId='44444444-4444-4444-8444-444444444444';
const attachmentId='55555555-5555-4555-8555-555555555555';
let db;
before(async()=>{
 db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
  create schema auth;create schema storage;
  create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.sub',true),'')::uuid$$;
  create table public.profiles(id uuid primary key,role text);
  create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
  create table public.tenant_requests(id uuid primary key,tenant_id uuid,kind text,status text);
  alter table public.tenant_requests enable row level security;
  grant select on public.tenant_requests to authenticated;
  create policy participants on public.tenant_requests for select to authenticated using(tenant_id=auth.uid() or public.is_admin());
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;
  grant usage on schema auth,storage to authenticated,anon;
  grant select,insert,delete on storage.objects to authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;`);
 await db.exec(await readFile(new URL('../supabase/migrations/202611010002_maintenance_attachments.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/202611190002_resolved_maintenance_attachments.sql',import.meta.url),'utf8'));
});
beforeEach(async()=>{
 await db.exec('reset role;truncate public.maintenance_attachments,public.tenant_requests,public.profiles,storage.objects cascade;');
 await db.query("insert into public.profiles values($1,'tenant'),($2,'admin'),($3,'tenant')",[tenant,admin,other]);
 await db.query("insert into public.tenant_requests values($1,$2,'maintenance','New')",[requestId,tenant]);
 await as(tenant);
});
after(async()=>{await db?.close();});
async function as(id,role='authenticated'){
 await db.exec(`reset role;set role ${role};`);
 await db.query("select set_config('request.jwt.sub',$1,false)",[id]);
}
async function status(value){await db.exec('reset role');await db.query('update public.tenant_requests set status=$1 where id=$2',[value,requestId]);await as(tenant);}
const path=()=>`${requestId}/${attachmentId}.pdf`;
const store=()=>db.query("insert into storage.objects(bucket_id,name) values('maintenance-attachments',$1)",[path()]);
const register=()=>db.query('select public.register_maintenance_attachment($1,$2,$3,$4,$5,$6)',[attachmentId,requestId,path(),'evidence.pdf','application/pdf',100]);

test('resolved requests reject direct storage uploads and direct attachment registration',async()=>{
 await status('Resolved');
 await assert.rejects(store(),/row-level security/);
 await assert.rejects(register(),/maintenance request has been resolved/);
 assert.equal((await db.query('select * from public.maintenance_attachments')).rows.length,0);
});

test('existing files and metadata remain readable after resolution',async()=>{
 await store();await register();await status('Resolved');
 assert.equal((await db.query('select * from public.maintenance_attachments')).rows.length,1);
 assert.equal((await db.query('select * from storage.objects')).rows.length,1);
 await assert.rejects(register(),/maintenance request has been resolved/);
});

test('an upload that started before resolution cannot be registered afterward and remains eligible for cleanup',async()=>{
 await store();await status('Resolved');
 await assert.rejects(register(),/maintenance request has been resolved/);
 await db.query('delete from storage.objects where name=$1',[path()]);
 assert.equal((await db.query('select * from storage.objects')).rows.length,0);
});

test('reopening maintenance restores upload permission without deleting the request history',async()=>{
 await status('Resolved');await status('In progress');
 await store();await register();
 assert.equal((await db.query('select * from public.maintenance_attachments')).rows.length,1);
});

test('unrelated tenants and anonymous users cannot upload or register files',async()=>{
 await as(other);await assert.rejects(store(),/row-level security/);await assert.rejects(register(),/not found/);
 await as('','anon');await assert.rejects(store(),/permission denied/);await assert.rejects(register(),/permission denied/);
});

test('administrator access cannot bypass a resolved request while old files remain readable',async()=>{
 await store();await register();await status('Resolved');await as(admin);
 assert.equal((await db.query('select * from public.maintenance_attachments')).rows.length,1);
 await assert.rejects(store(),/row-level security/);await assert.rejects(register(),/maintenance request has been resolved/);
});
