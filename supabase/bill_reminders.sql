-- =====================================================================
-- Step 39: 🧾 Bill reminders for grown-ups (career mode)
-- The timer can now also see each grown-up's bill schedule (_bills):
-- names, how often, due day and paid dates. Amounts never leave the phone.
-- Same as step 34's timer_kids, plus 'bills' and grown-ups with bills.
-- =====================================================================
create or replace function timer_kids(p_key text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_key is null or p_key <> (select key from timer_key where id = 1) then
    return jsonb_build_object('ok', false, 'error', 'Wrong timer key');
  end if;
  return jsonb_build_object('ok', true, 'kids', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', k.id,
      'nickname', k.nickname,
      'leave', d.data->>'kiddyKatLeaveTime',
      'bed', d.data->>'kiddyKatBedTime',
      'tz', d.data->>'_tz',
      'today', d.data->>'_today',
      'tasks', d.data->>'_tasks',
      'bills', d.data->>'_bills',
      'kidDevices', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)), '[]'::jsonb)
                     from push_devices p where p.kid_id = k.id),
      'parentDevices', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)), '[]'::jsonb)
                        from push_devices p where p.family_id = k.family_id and p.kid_id is null)
    )), '[]'::jsonb)
    from kids k join kid_data d on d.kid_id = k.id
    where coalesce(d.data->>'kiddyKatLeaveTime', '') <> '' or coalesce(d.data->>'kiddyKatBedTime', '') <> ''
       or coalesce(d.data->>'_bills', '[]') <> '[]'));
end $$;

revoke execute on function timer_kids(text) from public, anon, authenticated;
grant execute on function timer_kids(text) to service_role;

notify pgrst, 'reload schema';
