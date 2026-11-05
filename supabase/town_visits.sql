-- =====================================================================
-- Step 45: 🏙️ Kat Town family visits
-- Brothers and sisters can visit each other's Kat Town (look only) and
-- send a preset reaction (❤️ 🤩 😂 🏆), once per sibling per day.
-- OFF until a grown-up turns it on in the dashboard (Family settings).
-- Only kids in the same family; grown-ups (eagle) have no town.
-- Safe to run more than once.
-- =====================================================================
alter table families add column if not exists town_visits boolean not null default false;

create table if not exists town_reactions (
  from_kid uuid not null references kids(id) on delete cascade,
  to_kid uuid not null references kids(id) on delete cascade,
  day date not null,
  reaction text not null,
  created_at timestamptz default now(),
  primary key (from_kid, to_kid, day));
alter table town_reactions enable row level security;

-- Read a saved value that should be JSON; bad or missing data gives null instead of an error
create or replace function safe_jsonb(p text) returns jsonb
language plpgsql immutable as $$
begin
  return p::jsonb;
exception when others then
  return null;
end $$;

-- Dashboard: is it on?
create or replace function parent_get_town_visits(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  return jsonb_build_object('ok', true, 'on', (select town_visits from families where id = s.family_id));
end $$;

-- Dashboard: turn it on or off
create or replace function parent_set_town_visits(p_token uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  update families set town_visits = coalesce(p_on, false) where id = s.family_id;
  return jsonb_build_object('ok', true, 'on', coalesce(p_on, false));
end $$;

-- A kid's phone: my brothers' and sisters' towns (only the parts needed to draw them)
create or replace function family_towns(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_on boolean;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is null then
    return jsonb_build_object('ok', false, 'error', 'Please log in again');
  end if;
  select town_visits into v_on from families where id = s.family_id;
  if not coalesce(v_on, false) then
    return jsonb_build_object('ok', true, 'on', false, 'towns', '[]'::jsonb);
  end if;
  return jsonb_build_object('ok', true, 'on', true, 'towns', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'nickname', k.nickname,
      'animal', k.animal,
      'avatar', t.town->'avatar',
      'built', coalesce(t.town->'built', '[]'::jsonb),
      'room', coalesce(t.town->'room', '{}'::jsonb),
      'reacted', exists (select 1 from town_reactions r where r.from_kid = s.kid_id and r.to_kid = k.id
                         and r.day = (now() at time zone 'America/Los_Angeles')::date)
    ) order by k.created_at), '[]'::jsonb)
    from kids k
    join kid_data d on d.kid_id = k.id
    cross join lateral (select safe_jsonb(d.data->>'kiddyKatTown') as town) t
    where k.family_id = s.family_id and k.id <> s.kid_id and k.animal <> 'eagle'
      and t.town is not null and jsonb_typeof(t.town->'avatar') = 'object'));
end $$;

-- A kid's phone: send a preset reaction to a brother or sister's town
create or replace function town_react(p_token uuid, p_to text, p_reaction text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_from text; v_to uuid; v_on boolean; v_day date;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is null then
    return jsonb_build_object('ok', false, 'error', 'Please log in again');
  end if;
  select town_visits into v_on from families where id = s.family_id;
  if not coalesce(v_on, false) then
    return jsonb_build_object('ok', false, 'error', 'Family visits are off. Ask a grown-up to turn them on.');
  end if;
  if p_reaction not in ('love', 'wow', 'fun', 'best') then
    return jsonb_build_object('ok', false, 'error', 'Pick a reaction');
  end if;
  select nickname into v_from from kids where id = s.kid_id;
  select id into v_to from kids
  where family_id = s.family_id and lower(nickname) = lower(btrim(coalesce(p_to, ''))) and id <> s.kid_id and animal <> 'eagle';
  if v_to is null then return jsonb_build_object('ok', false, 'error', 'Pick a brother or sister'); end if;
  v_day := (now() at time zone 'America/Los_Angeles')::date;
  insert into town_reactions (from_kid, to_kid, day, reaction) values (s.kid_id, v_to, v_day, p_reaction)
  on conflict do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'You already sent a reaction to this town today. Come back tomorrow!');
  end if;
  perform add_to_inbox(v_to, jsonb_build_object('type', 'townvisit', 'from', v_from, 'reaction', p_reaction));
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function safe_jsonb(text), parent_get_town_visits(uuid), parent_set_town_visits(uuid, boolean),
                           family_towns(uuid), town_react(uuid, text, text) from public;
grant execute on function parent_get_town_visits(uuid), parent_set_town_visits(uuid, boolean),
                          family_towns(uuid), town_react(uuid, text, text) to anon;

notify pgrst, 'reload schema';
