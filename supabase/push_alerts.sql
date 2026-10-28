-- Push alerts: devices that turned on alerts, and the checks before sending one.
-- Only the kiddy-push cloud function (with the secret service key) can read devices
-- and send. The app can only add or remove its own device. Safe to run more than once.

create table if not exists push_devices (
  id bigint generated always as identity primary key,
  family_id uuid not null references families(id) on delete cascade,
  kid_id uuid references kids(id) on delete cascade,     -- empty = a grown-up's device
  endpoint text unique not null,                          -- the phone's private alert address
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);
alter table push_devices enable row level security;

create table if not exists push_log (
  id bigint generated always as identity primary key,
  family_id uuid not null references families(id) on delete cascade,
  created_at timestamptz default now()
);
alter table push_log enable row level security;

-- This device wants alerts (kid or grown-up login)
create or replace function save_push(p_token uuid, p_sub jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null then return jsonb_build_object('ok', false, 'error', 'Please log in again'); end if;
  if coalesce(p_sub->>'endpoint', '') !~ '^https://' or p_sub->'keys'->>'p256dh' is null or p_sub->'keys'->>'auth' is null then
    return jsonb_build_object('ok', false, 'error', 'That device can''t get alerts');
  end if;
  insert into push_devices (family_id, kid_id, endpoint, p256dh, auth)
  values (s.family_id, s.kid_id, p_sub->>'endpoint', p_sub->'keys'->>'p256dh', p_sub->'keys'->>'auth')
  on conflict (endpoint) do update set family_id = excluded.family_id, kid_id = excluded.kid_id,
    p256dh = excluded.p256dh, auth = excluded.auth;
  return jsonb_build_object('ok', true);
end $$;

-- This device doesn't want alerts anymore
create or replace function remove_push(p_endpoint text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  delete from push_devices where endpoint = p_endpoint;
  return jsonb_build_object('ok', true);
end $$;

-- For the kiddy-push function only: who is sending, and which devices get it.
-- p_to = 'parents' or 'kid:<nickname>'. Kids can alert grown-ups or a sibling;
-- grown-ups and fans can alert a kid. At most 40 alerts an hour per family.
create or replace function push_prepare(p_token uuid, p_to text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_fan fans; v_family uuid; v_from text; v_sender_kid uuid; v_target_kid uuid; v_targets jsonb;
  v_hour numeric := extract(hour from now() at time zone 'America/Los_Angeles')
                    + extract(minute from now() at time zone 'America/Los_Angeles') / 60.0;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is not null then
    v_family := s.family_id;
    v_sender_kid := s.kid_id;
    if s.kid_id is null then v_from := 'grown-up';
    else select nickname into v_from from kids where id = s.kid_id; end if;
  else
    select fans.* into v_fan from fan_sessions fs join fans on fans.id = fs.fan_id
    where fs.token = p_token and fs.expires_at > now();
    if v_fan.id is null then return jsonb_build_object('ok', false, 'error', 'Please log in again'); end if;
    v_family := v_fan.family_id;
    v_from := v_fan.name;
  end if;

  if (select count(*) from push_log where family_id = v_family and created_at > now() - interval '1 hour') >= 40 then
    return jsonb_build_object('ok', false, 'error', 'Too many alerts this hour');
  end if;

  if p_to = 'parents' then
    if v_sender_kid is null then return jsonb_build_object('ok', false, 'error', 'Only kids alert grown-ups'); end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
    into v_targets from push_devices where family_id = v_family and kid_id is null;
  elsif p_to like 'kid:%' then
    select id into v_target_kid from kids where family_id = v_family and lower(nickname) = lower(trim(substr(p_to, 5)));
    if v_target_kid is null then return jsonb_build_object('ok', false, 'error', 'Kid not found'); end if;
    if v_target_kid = v_sender_kid then return jsonb_build_object('ok', false, 'error', 'Not to yourself'); end if;
    if v_hour >= 21 or v_hour < 6.5 then                      -- quiet hours for kids
      return jsonb_build_object('ok', true, 'quiet', true, 'targets', '[]'::jsonb, 'from', v_from);
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
    into v_targets from push_devices where kid_id = v_target_kid;
  else
    return jsonb_build_object('ok', false, 'error', 'Unknown target');
  end if;

  insert into push_log (family_id) values (v_family);
  delete from push_log where created_at < now() - interval '1 day';
  return jsonb_build_object('ok', true, 'from', v_from, 'sender', case when v_sender_kid is null then 'adult' else 'kid' end,
                            'targets', v_targets);
end $$;

-- For the kiddy-push function only: forget devices whose alert address stopped working
create or replace function push_forget(p_ids bigint[]) returns void
language sql security definer set search_path = public as $$
  delete from push_devices where id = any(p_ids);
$$;

revoke execute on function save_push(uuid, jsonb), remove_push(text), push_prepare(uuid, text), push_forget(bigint[])
  from public, anon, authenticated;
grant execute on function save_push(uuid, jsonb), remove_push(text) to anon;
grant execute on function push_prepare(uuid, text), push_forget(bigint[]) to service_role;

notify pgrst, 'reload schema';
