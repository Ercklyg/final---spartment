begin;
create policy "Admins read notification preferences for delivery" on public.notification_preferences
 for select to authenticated using(public.is_admin());
commit;
