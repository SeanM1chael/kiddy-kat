-- ONE FILE: approvals inbox (Step 18) + star gifts and Fans (Step 20).
-- Safe to run more than once.

-- Approvals from the dashboard: a grown-up's decision goes into the kid's
-- "inbox". The kid's phone carries it out the next time it syncs.
create or replace function parent_decide(p_token uuid, p_nickname text, p_decision jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_kid uuid; v_inbox jsonb;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  if p_decision->>'type' not in ('reward', 'job', 'payout') then
    return jsonb_build_object('ok', false, 'error', 'Unknown kind of decision');
  end if;
  select id into v_kid from kids where family_id = s.family_id and lower(nickname) = lower(trim(p_nickname));
  if v_kid is null then
    return jsonb_build_object('ok', false, 'error', 'Kid not found');
  end if;
  select coalesce((data->>'kiddyKatParentInbox')::jsonb, '[]'::jsonb) into v_inbox
  from kid_data where kid_id = v_kid for update;
  v_inbox := v_inbox || jsonb_build_array(p_decision || jsonb_build_object('id', gen_random_uuid(), 'at', now()));
  update kid_data set data = data || jsonb_build_object('kiddyKatParentInbox', v_inbox::text), updated_at = now()
  where kid_id = v_kid;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function parent_decide(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function parent_decide(uuid, text, jsonb) to anon;

-- Star gifts: parents gift from the dashboard; Fans (grandparents, aunts, uncles)
-- get their own login that can ONLY send stars and a cheer, with a weekly limit.

create table if not exists fans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,                    -- like "Grandma"
  pin_hash text not null,
  weekly_limit int not null default 10,  -- stars per kid per week
  failed_tries int not null default 0,
  locked_until timestamptz,
  created_at timestamptz default now()
);
create unique index if not exists fans_name on fans (family_id, lower(name));

-- Fans get their own wristbands, separate from parents and kids
create table if not exists fan_sessions (
  token uuid primary key default gen_random_uuid(),
  fan_id uuid not null references fans(id) on delete cascade,
  expires_at timestamptz default now() + interval '90 days'
);

create table if not exists star_gifts (
  id bigint generated always as identity primary key,
  family_id uuid not null references families(id) on delete cascade,
  kid_id uuid not null references kids(id) on delete cascade,
  fan_id uuid references fans(id) on delete set null,   -- empty = a parent
  from_name text not null,
  stars int not null,
  note text,
  created_at timestamptz default now()
);

alter table fans enable row level security;
alter table fan_sessions enable row level security;
alter table star_gifts enable row level security;

-- Start of this week (Monday), Pacific time
create or replace function week_start() returns timestamptz
language sql stable as $$
  select date_trunc('week', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles';
$$;

-- Internal: put a message in a kid's inbox (the phone carries it out when it syncs)
create or replace function add_to_inbox(p_kid uuid, p_item jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_inbox jsonb;
begin
  select coalesce((data->>'kiddyKatParentInbox')::jsonb, '[]'::jsonb) into v_inbox
  from kid_data where kid_id = p_kid for update;
  v_inbox := v_inbox || jsonb_build_array(p_item || jsonb_build_object('id', gen_random_uuid(), 'at', now()));
  update kid_data set data = data || jsonb_build_object('kiddyKatParentInbox', v_inbox::text), updated_at = now()
  where kid_id = p_kid;
end $$;

-- Internal: a gift, once it's allowed
create or replace function give_stars(p_family uuid, p_kid uuid, p_fan uuid, p_from text, p_stars int, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into star_gifts (family_id, kid_id, fan_id, from_name, stars, note)
  values (p_family, p_kid, p_fan, p_from, p_stars, nullif(left(trim(coalesce(p_note, '')), 80), ''));
  perform add_to_inbox(p_kid, jsonb_build_object('type', 'stars', 'stars', p_stars, 'from', p_from,
                                                 'note', nullif(left(trim(coalesce(p_note, '')), 80), '')));
end $$;

-- Parent gifts stars (1 to 50 at a time)
create or replace function parent_gift_stars(p_token uuid, p_nickname text, p_stars int, p_note text, p_from text default 'Dad') returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_kid uuid; v_from text;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  if p_stars not between 1 and 50 then
    return jsonb_build_object('ok', false, 'error', 'Gift 1 to 50 stars at a time');
  end if;
  select id into v_kid from kids where family_id = s.family_id and lower(nickname) = lower(trim(p_nickname));
  if v_kid is null then return jsonb_build_object('ok', false, 'error', 'Kid not found'); end if;
  perform give_stars(s.family_id, v_kid, null, coalesce(nullif(left(trim(p_from), 20), ''), 'Dad'), p_stars, p_note);
  return jsonb_build_object('ok', true);
end $$;

-- Parent adds, lists and removes Fans
create or replace function add_fan(p_token uuid, p_name text, p_pin text, p_weekly_limit int) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s sessions;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then return jsonb_build_object('ok', false, 'error', 'Type a name, like Grandma'); end if;
  if p_pin !~ '^[0-9]{4,6}$' then return jsonb_build_object('ok', false, 'error', 'Fan PIN must be 4 to 6 digits'); end if;
  if exists (select 1 from fans where family_id = s.family_id and lower(name) = lower(trim(p_name))) then
    return jsonb_build_object('ok', false, 'error', 'There is already a fan with that name');
  end if;
  insert into fans (family_id, name, pin_hash, weekly_limit)
  values (s.family_id, trim(p_name), crypt(p_pin, gen_salt('bf')), least(greatest(coalesce(p_weekly_limit, 10), 1), 50));
  return jsonb_build_object('ok', true);
end $$;

create or replace function list_fans(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; r jsonb;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('name', f.name, 'weekly_limit', f.weekly_limit,
           'given_this_week', (select coalesce(sum(g.stars), 0) from star_gifts g where g.fan_id = f.id and g.created_at >= week_start()))
           order by f.created_at), '[]'::jsonb)
  into r from fans f where f.family_id = s.family_id;
  return jsonb_build_object('ok', true, 'fans', r);
end $$;

create or replace function remove_fan(p_token uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  delete from fans where family_id = s.family_id and lower(name) = lower(trim(p_name));
  return jsonb_build_object('ok', true);
end $$;

-- Fan login: family code + fan name + fan PIN
create or replace function fan_login(p_code text, p_name text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare f fans; t uuid;
begin
  select f2.* into f from fans f2 join families fam on fam.id = f2.family_id
  where fam.code = upper(trim(p_code)) and lower(f2.name) = lower(trim(p_name));
  if f.id is null then return jsonb_build_object('ok', false, 'error', 'Fan not found. Check the family code and name.'); end if;
  if f.locked_until > now() then return jsonb_build_object('ok', false, 'error', 'Too many wrong tries. Wait 15 minutes.'); end if;
  if f.pin_hash <> crypt(p_pin, f.pin_hash) then
    update fans set
      locked_until = case when failed_tries + 1 >= 5 then now() + interval '15 minutes' end,
      failed_tries = case when failed_tries + 1 >= 5 then 0 else failed_tries + 1 end
    where id = f.id;
    return jsonb_build_object('ok', false, 'error', 'Wrong PIN');
  end if;
  update fans set failed_tries = 0, locked_until = null where id = f.id;
  insert into fan_sessions (fan_id) values (f.id) returning token into t;
  return jsonb_build_object('ok', true, 'token', t, 'name', f.name);
end $$;

-- What a Fan sees: just nicknames, animals, and stars left to give this week
create or replace function fan_status(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare f fans; r jsonb; v_family text;
begin
  select fans.* into f from fan_sessions fs join fans on fans.id = fs.fan_id
  where fs.token = p_token and fs.expires_at > now();
  if f.id is null then return jsonb_build_object('ok', false, 'error', 'Please log in again'); end if;
  select name into v_family from families where id = f.family_id;
  select coalesce(jsonb_agg(jsonb_build_object('nickname', k.nickname, 'animal', k.animal,
           'left', f.weekly_limit - (select coalesce(sum(g.stars), 0) from star_gifts g
                                     where g.fan_id = f.id and g.kid_id = k.id and g.created_at >= week_start()))
           order by k.created_at), '[]'::jsonb)
  into r from kids k where k.family_id = f.family_id;
  return jsonb_build_object('ok', true, 'name', f.name, 'family', v_family, 'weekly_limit', f.weekly_limit, 'kids', r);
end $$;

-- Fan sends stars (up to their weekly limit for each kid)
create or replace function fan_gift_stars(p_token uuid, p_nickname text, p_stars int, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare f fans; v_kid uuid; v_given int;
begin
  select fans.* into f from fan_sessions fs join fans on fans.id = fs.fan_id
  where fs.token = p_token and fs.expires_at > now();
  if f.id is null then return jsonb_build_object('ok', false, 'error', 'Please log in again'); end if;
  select id into v_kid from kids where family_id = f.family_id and lower(nickname) = lower(trim(p_nickname));
  if v_kid is null then return jsonb_build_object('ok', false, 'error', 'Kid not found'); end if;
  perform pg_advisory_xact_lock(hashtext(f.id::text || v_kid::text));     -- one gift at a time per fan+kid
  select coalesce(sum(stars), 0) into v_given from star_gifts
  where fan_id = f.id and kid_id = v_kid and created_at >= week_start();
  if p_stars < 1 or v_given + p_stars > f.weekly_limit then
    return jsonb_build_object('ok', false, 'error',
      format('You can send %s more this week. It starts over on Monday.', greatest(f.weekly_limit - v_given, 0)));
  end if;
  perform give_stars(f.family_id, v_kid, f.id, f.name, p_stars, p_note);
  return jsonb_build_object('ok', true, 'left', f.weekly_limit - v_given - p_stars);
end $$;

-- Dashboard now also shows each kid's gifts from the last 7 days
create or replace function family_overview(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_family text; v_kids jsonb;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  select name into v_family from families where id = s.family_id;
  select coalesce(jsonb_agg(jsonb_build_object(
           'nickname', k.nickname, 'animal', k.animal,
           'updated_at', d.updated_at, 'data', d.data,
           'gifts', (select coalesce(jsonb_agg(jsonb_build_object('from', g.from_name, 'stars', g.stars,
                                                                  'note', g.note, 'at', g.created_at)
                                               order by g.created_at desc), '[]'::jsonb)
                     from star_gifts g where g.kid_id = k.id and g.created_at > now() - interval '7 days'))
           order by k.created_at), '[]'::jsonb)
  into v_kids
  from kids k join kid_data d on d.kid_id = k.id
  where k.family_id = s.family_id;
  return jsonb_build_object('ok', true, 'family', v_family, 'kids', v_kids);
end $$;

-- Who can call what
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function parent_login(text, text), list_kids(text), add_kid(uuid, text, text, text),
                          kid_login(text, text, text), load_my_data(uuid),
                          save_my_data(uuid, jsonb, timestamptz), family_overview(uuid),
                          ai_start(uuid), ai_log(uuid, text, int),
                          parent_send_to_kid(uuid, text, text, text), parent_decide(uuid, text, jsonb),
                          parent_gift_stars(uuid, text, int, text, text),
                          add_fan(uuid, text, text, int), list_fans(uuid), remove_fan(uuid, text),
                          fan_login(text, text, text), fan_status(uuid), fan_gift_stars(uuid, text, int, text)
  to anon;

-- Tell Supabase to pick up the new functions right away
notify pgrst, 'reload schema';
