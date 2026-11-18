-- Publish and maintain the announcement and its recipient notifications atomically.
create table public.announcements (
  id uuid primary key,
  title text not null check (length(btrim(title)) between 1 and 150 and title ~ '[^[:space:]]'),
  message text not null check (length(btrim(message)) between 1 and 5000 and message ~ '[^[:space:]]'),
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  recipient_count integer not null default 0 check (recipient_count >= 0)
);
create index announcements_created_idx on public.announcements(created_at desc, id);
alter table public.announcements enable row level security;
revoke all on public.announcements from public, anon, authenticated;
grant select on public.announcements to authenticated;
grant all on public.announcements to service_role;
create policy announcements_admin_read on public.announcements for select to authenticated
  using (public.is_admin());

create unique index notifications_one_announcement_per_tenant
  on public.notifications(tenant_id, source_id) where kind = 'announcement';

create function public.post_announcement(p_id uuid, p_title text, p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare announcement public.announcements; recipients integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
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

create function public.edit_announcement(p_id uuid, p_title text, p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare announcement public.announcements;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
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
  update public.announcements set title = btrim(p_title), message = btrim(p_message), updated_at = now()
    where id = p_id returning * into announcement;
  update public.notifications set title = announcement.title, message = announcement.message,
    is_read = false, seen_at = null, acknowledged_at = null
    where kind = 'announcement' and source_id = p_id;
  return to_jsonb(announcement);
end $$;

create function public.delete_announcement(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
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
