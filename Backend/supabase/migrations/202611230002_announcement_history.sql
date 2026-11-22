begin;
alter table public.announcements add column revision integer not null default 1;
alter table public.notifications add column announcement_revision integer not null default 1;

create or replace function public.post_announcement(p_id uuid, p_title text, p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare announcement public.announcements; recipients integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(66341023);
  if p_id is null or p_title is null or p_message is null
    or length(btrim(p_title)) not between 1 and 150 or length(btrim(p_message)) not between 1 and 5000
    or p_title !~ '[^[:space:]]' or p_message !~ '[^[:space:]]'
    then raise exception 'Invalid announcement text' using errcode = '22023'; end if;

  insert into public.announcements(id, title, message, author_id)
  values(p_id, btrim(p_title), btrim(p_message), auth.uid())
  on conflict(id) do nothing returning * into announcement;
  if not found then
    select * into announcement from public.announcements where id = p_id for update;
    if not found then raise exception 'Announcement not found' using errcode = 'P0002'; end if;
    if announcement.author_id <> auth.uid() or announcement.title <> btrim(p_title)
      or announcement.message <> btrim(p_message) then
      raise exception 'Announcement submission already used' using errcode = '23505';
    end if;
    return to_jsonb(announcement);
  end if;

  insert into public.notifications(tenant_id, title, message, kind, source_id)
  select a.id, announcement.title, announcement.message, 'announcement', announcement.id
  from public.tenant_assignments a join public.profiles p on p.id = a.id
  where a.status = 'active' and p.role = 'tenant';
  get diagnostics recipients = row_count;
  if recipients = 0 then raise exception 'No current tenants to notify' using errcode = 'P0001'; end if;
  update public.announcements set recipient_count = recipients where id = p_id returning * into announcement;
  return to_jsonb(announcement);
end $$;

create or replace function public.edit_announcement(p_id uuid, p_title text, p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare announcement public.announcements;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(66341023);
  if p_title is null or p_message is null or length(btrim(p_title)) not between 1 and 150
    or length(btrim(p_message)) not between 1 and 5000
    or p_title !~ '[^[:space:]]' or p_message !~ '[^[:space:]]' then
    raise exception 'Invalid announcement text' using errcode = '22023';
  end if;
  select * into announcement from public.announcements where id = p_id for update;
  if not found then raise exception 'Announcement not found' using errcode = 'P0002'; end if;
  if announcement.title = btrim(p_title) and announcement.message = btrim(p_message) then
    return to_jsonb(announcement);
  end if;
  update public.announcements set title = btrim(p_title), message = btrim(p_message), updated_at = now(), revision = revision + 1
    where id = p_id returning * into announcement;
  update public.notifications set title = announcement.title, message = announcement.message,
    is_read = false, seen_at = null, acknowledged_at = null, announcement_revision = announcement.revision
    where kind = 'announcement' and source_id = p_id
      and exists(select 1 from public.tenant_assignments a where a.id=tenant_id and a.status='active');
  return to_jsonb(announcement);
end $$;

create or replace function public.delete_announcement(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(66341023);
  perform id from public.announcements where id = p_id for update;
  if not found then raise exception 'Announcement not found' using errcode = 'P0002'; end if;
  delete from public.notifications where kind = 'announcement' and source_id = p_id;
  delete from public.announcements where id = p_id;
  return jsonb_build_object('ok', true, 'id', p_id);
end $$;

revoke all on function public.post_announcement(uuid,text,text) from public, anon;
revoke all on function public.edit_announcement(uuid,text,text) from public, anon;
revoke all on function public.delete_announcement(uuid) from public, anon;
grant execute on function public.post_announcement(uuid,text,text) to authenticated;
grant execute on function public.edit_announcement(uuid,text,text) to authenticated;
grant execute on function public.delete_announcement(uuid) to authenticated;

-- Internal synchronization shares the publication lock. Never expose this
-- SECURITY DEFINER helper to browser roles or accept their recipient IDs.
create function public.sync_announcement_history(p_tenant uuid default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(66341023);
  insert into public.notifications(tenant_id,title,message,kind,source_id,created_at,announcement_revision)
  select t.id,a.title,a.message,'announcement',a.id,a.created_at,a.revision
  from public.tenant_assignments t join public.profiles p on p.id=t.id
  cross join public.announcements a
  where t.status='active' and p.role='tenant' and (p_tenant is null or t.id=p_tenant)
  on conflict(tenant_id,source_id) where kind='announcement' do update
    set title=excluded.title,message=excluded.message,announcement_revision=excluded.announcement_revision,
      is_read=false,seen_at=null,acknowledged_at=null
    where public.notifications.announcement_revision<>excluded.announcement_revision
      or public.notifications.title<>excluded.title or public.notifications.message<>excluded.message;
  update public.announcements a set recipient_count=(
    select count(*) from public.notifications n where n.kind='announcement' and n.source_id=a.id
  );
end $$;
revoke all on function public.sync_announcement_history(uuid) from public,anon,authenticated;

create function public.tenant_announcement_history() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status='active' then perform public.sync_announcement_history(new.id); end if;
  return new;
end $$;
revoke all on function public.tenant_announcement_history() from public,anon,authenticated;
create trigger tenant_announcement_history after insert or update of status on public.tenant_assignments
for each row execute function public.tenant_announcement_history();

-- Fill existing gaps, including active test accounts. Test status deliberately
-- does not affect tenant communication. Existing unchanged read states survive.
select public.sync_announcement_history();
notify pgrst, 'reload schema';
commit;
