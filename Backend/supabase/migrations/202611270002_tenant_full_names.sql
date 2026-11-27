begin;

-- Rename only these existing seeded account holders. Their IDs, credentials,
-- contacts, leases and financial/history records remain unchanged.
do $$
declare target record;
begin
 for target in select * from (values
    ('61db7d33-3713-4bb8-a4ee-b9f1566a9f65'::uuid, 'Barrios Family', 'Ramon Barrios'),
    ('860e0a67-8732-4afa-b78a-aec8f1876fe3'::uuid, 'Corpuz Family', 'Edwin Corpuz'),
    ('ef5a1f39-2132-4278-9c4d-e3ce040d43d0'::uuid, 'Gonzales Family', 'Maribel Gonzales'),
    ('5bfbc793-b486-4a86-842f-7cefc7be392e'::uuid, 'Lagman Family', 'Noel Lagman'),
    ('372d274e-6966-4411-b6df-394643c0aecc'::uuid, 'Manalo Family', 'Lorna Manalo'),
    ('52fc3b20-9ffd-4f22-8ebe-1258dda8bbb3'::uuid, 'Maniego Family', 'Renato Maniego'),
    ('cd4a39a5-6bd1-4139-bd26-26e7cbc26889'::uuid, 'Pangan Family', 'Marissa Pangan'),
    ('6fc95e78-e7fe-4a6c-ae5d-10012088efba'::uuid, 'Quijano Family', 'Allan Quijano'),
    ('30bb1827-0ef2-4571-a7d1-f9aaada8f6e9'::uuid, 'Ramos Family', 'Teresa Ramos'),
    ('c6c6891a-eafb-4edb-8a41-0193903eceb5'::uuid, 'Sarmiento Family', 'Dennis Sarmiento'),
    ('2251b34b-0b69-44c1-b372-93d376ebc11a'::uuid, 'Sison Family', 'Arlene Sison'),
    ('c26f48ee-ae83-42b2-a054-e8306b661792'::uuid, 'Tadeo Family', 'Ruben Tadeo'),
    ('6a1cc386-979c-4cda-92ba-7f70d69dd8b9'::uuid, 'Velasco Family', 'Cecilia Velasco')
 ) as names(id, old_name, new_name)
 loop
  -- Fresh installations may not contain these seeded accounts.
  if not exists(select 1 from public.profiles where id=target.id) then
   continue;
  end if;
  perform 1 from public.profiles where id=target.id for update;
  perform 1 from public.tenant_assignments where id=target.id for update;
  perform 1 from auth.users where id=target.id for update;
  if not exists(select 1 from public.profiles where id=target.id and role='tenant'
    and full_name in (target.old_name,target.new_name))
   or not exists(select 1 from public.tenant_assignments where id=target.id
    and full_name in (target.old_name,target.new_name))
   or not exists(select 1 from auth.users where id=target.id
    and raw_user_meta_data->>'full_name' in (target.old_name,target.new_name)) then
   raise exception 'Tenant name replacement aborted: unexpected account data for %',target.id;
  end if;
  update public.profiles set full_name=target.new_name where id=target.id;
  update public.tenant_assignments set full_name=target.new_name where id=target.id;
  update auth.users set raw_user_meta_data=jsonb_set(coalesce(raw_user_meta_data,'{}'::jsonb),
    '{full_name}',to_jsonb(target.new_name),true) where id=target.id;
 end loop;
end $$;

commit;
