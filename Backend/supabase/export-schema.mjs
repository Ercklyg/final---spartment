// Export public schema metadata only through the already signed-in Supabase CLI.
// Never exports application records, Auth users, passwords or credentials.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const sql=`
with statements as (
 select 10 as section, t.typname as name,
 format('CREATE TYPE public.%I AS ENUM (%s);',t.typname,string_agg(quote_literal(e.enumlabel),', ' order by e.enumsortorder)) as ddl
 from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace
 where n.nspname='public' group by t.typname
 union all
 select 20,c.relname,format('CREATE TABLE public.%I (%s);',c.relname,
 string_agg(format('%I %s%s%s',a.attname,format_type(a.atttypid,a.atttypmod),
 case when a.attgenerated<>'' then ' GENERATED ALWAYS AS ('||pg_get_expr(d.adbin,d.adrelid)||') STORED'
      when d.adbin is not null then ' DEFAULT '||pg_get_expr(d.adbin,d.adrelid) else '' end,
 case when a.attnotnull then ' NOT NULL' else '' end),E',\n  ' order by a.attnum))
 from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid
 left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
 where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped group by c.relname
 union all
 select 30,c.relname||'.'||con.conname,format('ALTER TABLE public.%I ADD CONSTRAINT %I %s;',c.relname,con.conname,pg_get_constraintdef(con.oid))
 from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and con.contype in ('p','u','c')
 union all
 select 40,c.relname||'.'||con.conname,format('ALTER TABLE public.%I ADD CONSTRAINT %I %s;',c.relname,con.conname,pg_get_constraintdef(con.oid))
 from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and con.contype='f'
 union all
 select 50,c.relname||'.'||i.indexrelid::text,pg_get_indexdef(i.indexrelid)||';'
 from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and not exists(select 1 from pg_constraint co where co.conindid=i.indexrelid)
 union all
 select 60,p.proname||p.oid::text,pg_get_functiondef(p.oid)||';'
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'
 and not exists(select 1 from pg_depend d where d.objid=p.oid and d.classid='pg_proc'::regclass and d.deptype='e')
 union all
 select 70,c.relname||'.'||t.tgname,pg_get_triggerdef(t.oid)||';'
 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
 where not t.tgisinternal and (n.nspname='public' or (n.nspname='auth' and c.relname='users' and t.tgfoid in(select p.oid from pg_proc p join pg_namespace pn on pn.oid=p.pronamespace where pn.nspname='public')))
 union all
 select 80,c.relname,format('ALTER TABLE public.%I %s ROW LEVEL SECURITY;',c.relname,case when c.relrowsecurity then 'ENABLE' else 'DISABLE' end)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'
 union all
 select 90,tablename||'.'||policyname,format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',policyname,tablename,permissive,cmd,
 array_to_string(array(select case when r='public' then 'public' else quote_ident(r) end from unnest(roles::text[]) r),','),
 case when qual is not null then ' USING ('||qual||')' else '' end,case when with_check is not null then ' WITH CHECK ('||with_check||')' else '' end)
 from pg_policies where schemaname='public'
 union all
 select 100,'revoke tables','REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public, anon, authenticated, service_role;'
 union all
 select 101,'revoke functions','REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public, anon, authenticated, service_role;'
 union all
 select 110,table_name||grantee||privilege_type,format('GRANT %s ON public.%I TO %I;',privilege_type,table_name,grantee)
 from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role','PUBLIC')
 union all
 select 120,table_name||column_name||grantee||privilege_type,format('GRANT %s (%I) ON public.%I TO %I;',privilege_type,column_name,table_name,grantee)
 from information_schema.column_privileges where table_schema='public' and grantee in ('anon','authenticated','service_role','PUBLIC')
 union all
 select 130,p.proname||p.oid::text||a.grantee::text,
 format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO %s;',p.proname,pg_get_function_identity_arguments(p.oid),case when a.grantee=0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
 where n.nspname='public' and p.prokind='f' and a.privilege_type='EXECUTE'
 and (a.grantee=0 or pg_get_userbyid(a.grantee) in ('anon','authenticated','service_role'))
 and not exists(select 1 from pg_depend d where d.objid=p.oid and d.classid='pg_proc'::regclass and d.deptype='e')
)
select ddl from statements order by section,name;`;
const result=spawnSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--linked',sql],{encoding:'utf8',windowsHide:true,maxBuffer:10*1024*1024});
if(result.status!==0)throw new Error('Schema export failed: '+result.stderr);
const data=JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
if(!Array.isArray(data.rows)||!data.rows.length)throw new Error('Schema export returned no definitions');
const header='-- Fresh Supabase projects only. Do not run over an existing application schema.\n-- Snapshot includes migrations 202609130001 through 202609130009; no user data.\nBEGIN;\nSET LOCAL search_path = public, extensions;\nSET LOCAL check_function_bodies = false;\nGRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;\nALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM public, anon, authenticated;\nALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM public, anon, authenticated;\n\n';
writeFileSync('supabase/schema.sql',header+data.rows.map(row=>row.ddl).join('\n\n')+'\n\nCOMMIT;\n');
console.log('Exported '+data.rows.length+' schema definitions to Backend/supabase/schema.sql (no records).');
