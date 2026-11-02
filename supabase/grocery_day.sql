-- =====================================================================
-- Step 40: 🛒 Grocery day reminder
-- A grown-up picks a grocery day and time on the dashboard. That morning,
-- grown-ups' devices get an alert with everything the kids marked
-- 🟡 low or 🔴 out in 🧴 My supplies. Safe to run more than once.
-- =====================================================================
alter table families add column if not exists grocery_day smallint check (grocery_day between 0 and 6);   -- 0 = Sunday
alter table families add column if not exists grocery_time text;      -- like '09:00'
alter table families add column if not exists grocery_tz text;        -- like 'America/Los_Angeles'

-- The dashboard reads the setting
create or replace function parent_get_grocery(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; f families;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  select * into f from families where id = s.family_id;
  return jsonb_build_object('ok', true, 'day', f.grocery_day, 'time', coalesce(f.grocery_time, '09:00'));
end $$;

-- The dashboard saves the setting (p_day null = reminder off)
create or replace function parent_set_grocery(p_token uuid, p_day int, p_time text, p_tz text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  if p_day is not null and (p_day < 0 or p_day > 6) then
    return jsonb_build_object('ok', false, 'error', 'Pick a day');
  end if;
  if coalesce(p_time, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    return jsonb_build_object('ok', false, 'error', 'Pick a time');
  end if;
  update families set grocery_day = p_day, grocery_time = p_time,
                      grocery_tz = left(regexp_replace(coalesce(p_tz, ''), '[^A-Za-z0-9_/+-]', '', 'g'), 60)
  where id = s.family_id;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function parent_get_grocery(uuid), parent_set_grocery(uuid, int, text, text) from public;
grant execute on function parent_get_grocery(uuid), parent_set_grocery(uuid, int, text, text) to anon;

-- For the timer only: families with a grocery day, what the kids need, and grown-ups' devices
create or replace function timer_grocery(p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or p_key <> (select key from timer_key where id = 1) then
    return jsonb_build_object('ok', false, 'error', 'Wrong timer key');
  end if;
  return jsonb_build_object('ok', true, 'families', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'marker', (select k.id from kids k where k.family_id = f.id order by k.created_at limit 1),
      'day', f.grocery_day,
      'time', f.grocery_time,
      'tz', f.grocery_tz,
      'items', (select coalesce(jsonb_agg(jsonb_build_object('nickname', k.nickname, 'name', i->>'name', 'status', i->>'status')), '[]'::jsonb)
                from kids k join kid_data d on d.kid_id = k.id
                cross join lateral jsonb_array_elements(
                  case when jsonb_typeof((d.data->>'kiddyKatSupplies')::jsonb) = 'array'
                       then (d.data->>'kiddyKatSupplies')::jsonb else '[]'::jsonb end) i
                where k.family_id = f.id and i->>'status' in ('low', 'out')),
      'parentDevices', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)), '[]'::jsonb)
                        from push_devices p where p.family_id = f.id and p.kid_id is null),
      -- Grown-ups in career mode (🦅), used when no dashboard has alerts on
      'eagleDevices', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)), '[]'::jsonb)
                       from push_devices p join kids k on k.id = p.kid_id where k.family_id = f.id and k.animal = 'eagle')
    )), '[]'::jsonb)
    from families f
    where f.grocery_day is not null and exists (select 1 from kids k where k.family_id = f.id)));
end $$;

revoke execute on function timer_grocery(text) from public, anon, authenticated;
grant execute on function timer_grocery(text) to service_role;

notify pgrst, 'reload schema';
