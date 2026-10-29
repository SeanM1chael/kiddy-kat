-- ===== Step 34: Timed alerts (school-morning countdown + bedtime reminder) =====
-- Every 5 minutes a scheduler inside Supabase calls the kiddy-timer cloud function.
-- Safe to run more than once.

-- One row per alert sent, so each alert goes out at most once per kid per day
create table if not exists timer_sent (
  kid_id uuid not null references kids(id) on delete cascade,
  kind text not null,                 -- 'morning15', 'morning5', 'late', 'bedtime'
  day date not null,
  primary key (kid_id, kind, day)
);
alter table timer_sent enable row level security;

-- A random key only the scheduler knows. The database makes it; nobody copies it anywhere.
create table if not exists timer_key (id int primary key check (id = 1), key text not null);
alter table timer_key enable row level security;
insert into timer_key (id, key) values (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')) on conflict (id) do nothing;

drop function if exists timer_kids();
drop function if exists timer_mark(uuid, text, date);

-- Kids with a leave time or bedtime, what the timer needs to decide, and who to alert
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
      'kidDevices', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)), '[]'::jsonb)
                     from push_devices p where p.kid_id = k.id),
      'parentDevices', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)), '[]'::jsonb)
                        from push_devices p where p.family_id = k.family_id and p.kid_id is null)
    )), '[]'::jsonb)
    from kids k join kid_data d on d.kid_id = k.id
    where coalesce(d.data->>'kiddyKatLeaveTime', '') <> '' or coalesce(d.data->>'kiddyKatBedTime', '') <> ''));
end $$;

-- Marks an alert as sent. True only the first time each day, so nothing repeats.
create or replace function timer_mark(p_key text, p_kid uuid, p_kind text, p_day date) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or p_key <> (select key from timer_key where id = 1) then return false; end if;
  delete from timer_sent where day < current_date - 7;
  insert into timer_sent (kid_id, kind, day) values (p_kid, p_kind, p_day) on conflict do nothing;
  return found;
end $$;

revoke execute on function timer_kids(text), timer_mark(text, uuid, text, date) from public, anon, authenticated;
grant execute on function timer_kids(text), timer_mark(text, uuid, text, date) to service_role;

-- ===== The scheduler: every 5 minutes, call kiddy-timer with the key =====
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule('kiddy-timer', '*/5 * * * *', $job$
  select net.http_post(
    url := 'https://kugusjgprgvhhajifhhy.supabase.co/functions/v1/kiddy-timer',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-timer-key', (select key from public.timer_key where id = 1)),
    body := '{}'::jsonb
  );
$job$);

notify pgrst, 'reload schema';
